import {
  ApiError,
  usable,
  type Claims,
  type Dependencies,
  type Document,
  type Profile,
} from "./types";
const uidPattern = /^[A-Za-z0-9_-]{1,128}$/;
const requestPattern =
  /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
export function publicProfile(data: Document): Profile {
  return {
    uid: String(data.uid),
    email: String(data.email),
    displayName: String(data.displayName),
    role: data.role === "admin" ? "admin" : "employee",
    active: data.active === true,
    validAfter: Number(data.validAfter),
    createdAt: String(data.createdAt),
    updatedAt: String(data.updatedAt),
    passwordSetupRequired: data.passwordSetupRequired === true,
    setupEmailStatus:
      typeof data.setupEmailStatus === "string"
        ? data.setupEmailStatus
        : "not_sent",
    setupEmailError:
      typeof data.setupEmailError === "string" ? data.setupEmailError : "",
  };
}
export function createService(deps: Dependencies) {
  async function authenticate(token: string) {
    const claims = await deps.verify(token);
    const [account, profile] = await Promise.all([
      deps.identity.lookup(claims.uid),
      deps.db.get("users/" + claims.uid),
    ]);
    if (
      account.disabled ||
      claims.authTime < account.validSince ||
      !usable(profile, claims) ||
      account.email.toLowerCase() !== claims.email.toLowerCase() ||
      String(profile.email).toLowerCase() !== claims.email.toLowerCase()
    )
      throw new ApiError("access_disabled", 403);
    if (profile.passwordSetupRequired === true) {
      await deps.db.transaction(async (tx) => {
        const latest = await tx.get("users/" + claims.uid);
        if (usable(latest, claims) && latest.passwordSetupRequired === true)
          tx.put("users/" + claims.uid, {
            ...latest,
            passwordSetupRequired: false,
          });
      });
      profile.passwordSetupRequired = false;
    }
    return { claims, profile: publicProfile(profile) };
  }
  async function adminTransaction<T>(
    claims: Claims,
    fn: (
      tx: Parameters<Parameters<Dependencies["db"]["transaction"]>[0]>[0],
    ) => Promise<T>,
  ) {
    return deps.db.transaction(async (tx) => {
      const actor = await tx.get("users/" + claims.uid);
      if (!usable(actor, claims) || actor.role !== "admin")
        throw new ApiError("admin_required");
      return fn(tx);
    });
  }
  async function mutate(claims: Claims, input: Document, callerIp = "") {
    const { action, uid, requestId } = input;
    if (
      !["role", "disable", "reset", "name"].includes(String(action)) ||
      typeof uid !== "string" ||
      !uidPattern.test(uid) ||
      typeof requestId !== "string" ||
      !requestPattern.test(requestId) ||
      Object.keys(input).some(
        (k) =>
          !["action", "uid", "requestId", "role", "displayName"].includes(k),
      )
    )
      throw new ApiError("invalid_request", 400);
    const allowed =
      action === "name"
        ? ["action", "uid", "requestId", "displayName"]
        : action === "role"
          ? ["action", "uid", "requestId", "role"]
          : ["action", "uid", "requestId"];
    if (Object.keys(input).some((key) => !allowed.includes(key)))
      throw new ApiError("invalid_request", 400);
    if (action === "name")
      return rename(claims, uid, requestId, input.displayName);
    if (
      action === "role" &&
      !["admin", "employee"].includes(String(input.role))
    )
      throw new ApiError("invalid_request", 400);
    if (action === "reset" && !/^[0-9a-fA-F.:]{3,45}$/.test(callerIp))
      throw new ApiError("invalid_request", 400);
    const operation = "auditEvents/" + requestId;
    const result = await adminTransaction(claims, async (tx) => {
      const [target, control, existing] = await Promise.all([
        tx.get("users/" + uid),
        tx.get("accessControl/admins"),
        tx.get(operation),
      ]);
      if (
        !target ||
        !control ||
        !Number.isInteger(control.activeAdminCount) ||
        Number(control.activeAdminCount) < 1
      )
        throw new ApiError("configuration", 503);
      if (existing) {
        if (
          existing.actorUid !== claims.uid ||
          existing.targetUid !== uid ||
          existing.action !== action ||
          (action === "role" && existing.role !== input.role)
        )
          throw new ApiError("request_conflict", 409);
        return { target, completed: existing.status === "completed" };
      }
      if (target.active !== true) throw new ApiError("access_disabled");
      const now = new Date().toISOString();
      if (action !== "reset") {
        const nextRole = action === "disable" ? "employee" : input.role;
        const nextActive = action !== "disable";
        const before =
          target.active === true && target.role === "admin" ? 1 : 0;
        const after = nextActive && nextRole === "admin" ? 1 : 0;
        const count = Number(control.activeAdminCount) + after - before;
        if (count < 1) throw new ApiError("last_admin", 409);
        tx.put("users/" + uid, {
          ...target,
          role: nextRole,
          active: nextActive,
          updatedAt: now,
          ...(action === "disable"
            ? { validAfter: Math.floor(Date.now() / 1000) + 1 }
            : {}),
        });
        tx.put("accessControl/admins", {
          activeAdminCount: count,
          updatedAt: now,
        });
      }
      tx.put(operation, {
        actorUid: claims.uid,
        targetUid: uid,
        action,
        ...(action === "role" ? { role: input.role } : {}),
        status: action === "role" ? "completed" : "pending",
        createdAt: now,
      });
      return { target, completed: action === "role" };
    });
    if (!result.completed) {
      // Disable is idempotent. Reset email is deliberately never silently retried after ambiguity.
      if (action === "disable") await deps.identity.disable(uid);
      else if (action === "reset") {
        const claimed = await adminTransaction(claims, async (tx) => {
          const op = await tx.get(operation);
          if (!op || !["pending", "failed"].includes(String(op.status)))
            return false;
          tx.put(operation, { ...op, status: "attempting" });
          return true;
        });
        if (!claimed) throw new ApiError("outcome_unknown", 409);
        await sendAndRecord(
          operation,
          uid,
          String(result.target.email),
          callerIp,
        );
      }
      if (action !== "reset")
        await deps.db.transaction(async (tx) => {
          const op = await tx.get(operation);
          if (op)
            tx.put(operation, {
              ...op,
              status: "completed",
              completedAt: new Date().toISOString(),
            });
        });
    }
    return { completed: true };
  }
  function validName(value: unknown): value is string {
    return (
      typeof value === "string" &&
      value.trim().length > 0 &&
      value.length <= 120 &&
      !/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/.test(value)
    );
  }
  async function rename(
    claims: Claims,
    uid: string,
    requestId: string,
    value: unknown,
  ) {
    if (!validName(value)) throw new ApiError("invalid_name", 400);
    const displayName = value.trim(),
      operation = "auditEvents/" + requestId;
    await adminTransaction(claims, async (tx) => {
      const target = await tx.get("users/" + uid),
        op = await tx.get(operation);
      if (!target) throw new ApiError("not_found", 404);
      if (
        op &&
        (op.actorUid !== claims.uid ||
          op.targetUid !== uid ||
          op.action !== "name" ||
          op.displayName !== displayName)
      )
        throw new ApiError("request_conflict", 409);
      tx.put("users/" + uid, {
        ...target,
        displayName,
        updatedAt: new Date().toISOString(),
      });
      tx.put(operation, {
        actorUid: claims.uid,
        targetUid: uid,
        action: "name",
        displayName,
        status: "pending",
        createdAt: op?.createdAt || new Date().toISOString(),
      });
    });
    try {
      let consistent = false;
      // No provider side effects inside a retried Firestore transaction.
      for (let attempt = 0; attempt < 4; attempt++) {
        const latest = await deps.db.get("users/" + uid);
        if (!latest) throw new Error("missing profile");
        await deps.identity.rename(uid, String(latest.displayName));
        const after = await deps.db.get("users/" + uid);
        if (after?.displayName === latest.displayName) {
          consistent = true;
          break;
        }
      }
      if (!consistent) throw new Error("concurrent name change");
      await deps.db.transaction(async (tx) => {
        const op = await tx.get(operation);
        if (op)
          tx.put(operation, {
            ...op,
            status: "completed",
            completedAt: new Date().toISOString(),
          });
      });
      return { completed: true };
    } catch {
      throw new ApiError("name_auth_pending", 503);
    }
  }
  async function sendAndRecord(
    operation: string,
    uid: string,
    email: string,
    callerIp: string,
  ) {
    let error: unknown;
    try {
      const account = await deps.identity.lookup(uid);
      if (
        account.disabled ||
        account.email.toLowerCase() !== email.toLowerCase()
      )
        throw new ApiError("email_account_missing", 409);
      await deps.identity.reset(email, callerIp);
    } catch (caught) {
      error = caught;
    }
    const code =
      error instanceof ApiError ? error.code : "email_outcome_unknown";
    const status = !error
      ? "accepted"
      : code === "email_outcome_unknown"
        ? "unknown"
        : "failed";
    await deps.db.transaction(async (tx) => {
      const [op, target] = await Promise.all([
        tx.get(operation),
        tx.get("users/" + uid),
      ]);
      if (op)
        tx.put(operation, {
          ...op,
          status:
            status === "accepted"
              ? "completed"
              : status === "failed"
                ? "failed"
                : "attempting",
          error: status === "accepted" ? "" : code,
          completedAt: new Date().toISOString(),
        });
      if (target)
        tx.put("users/" + uid, {
          ...target,
          setupEmailStatus: status,
          setupEmailError: status === "accepted" ? "" : code,
        });
    });
    if (error) throw error;
  }
  async function createEmployee(
    claims: Claims,
    input: Document,
    callerIp = "",
  ) {
    if (
      Object.keys(input).some(
        (k) => !["requestId", "email", "displayName"].includes(k),
      ) ||
      typeof input.requestId !== "string" ||
      !requestPattern.test(input.requestId) ||
      typeof input.email !== "string" ||
      input.email.length > 160 ||
      !/^[^\s@<>\r\n]+@[^\s@<>\r\n]+\.[^\s@<>\r\n]+$/.test(input.email) ||
      !validName(input.displayName)
    )
      throw new ApiError("invalid_request", 400);
    const uid = "emp-" + input.requestId,
      path = "users/" + uid,
      operation = "auditEvents/" + input.requestId;
    const email = input.email.trim().toLowerCase(),
      displayName = input.displayName.trim();
    const registered = await deps.identity.lookupEmail(email);
    if (registered && registered.uid !== uid)
      throw new ApiError("email_exists", 409);
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(email),
    );
    const reservation =
      "accessControl/employee-" +
      Array.from(new Uint8Array(digest), (b) =>
        b.toString(16).padStart(2, "0"),
      ).join("");
    const completed = await adminTransaction(claims, async (tx) => {
      const existing = await tx.get(operation);
      const target = await tx.get(path);
      const reserved = await tx.get(reservation);
      if (reserved && reserved.uid !== uid)
        throw new ApiError("email_exists", 409);
      if (existing) {
        if (
          existing.actorUid !== claims.uid ||
          existing.action !== "create" ||
          target?.email !== email ||
          (existing.displayName !== displayName &&
            target?.displayName !== displayName)
        )
          throw new ApiError("request_conflict", 409);
        return existing.status === "completed";
      }
      const now = new Date().toISOString();
      tx.put(reservation, { uid, createdAt: now });
      tx.put(path, {
        uid,
        email,
        displayName,
        role: "employee",
        active: false,
        passwordSetupRequired: true,
        setupEmailStatus: "not_sent",
        validAfter: 0,
        createdAt: now,
        updatedAt: now,
      });
      tx.put(operation, {
        actorUid: claims.uid,
        targetUid: uid,
        action: "create",
        displayName,
        status: "pending",
        createdAt: now,
      });
      return false;
    });
    if (!completed) {
      await deps.identity.create(uid, email, displayName);
      await adminTransaction(claims, async (tx) => {
        const target = await tx.get(path),
          op = await tx.get(operation);
        if (!target || !op) throw new ApiError("configuration", 503);
        tx.put(path, {
          ...target,
          active: true,
          updatedAt: new Date().toISOString(),
        });
        tx.put(operation, {
          ...op,
          status: "completed",
          completedAt: new Date().toISOString(),
        });
      });
    }
    const emailOperation = "auditEvents/" + input.requestId + "-setup";
    const shouldSend = await adminTransaction(claims, async (tx) => {
      const op = await tx.get(emailOperation);
      const reservedTarget = await tx.get(path);
      if (op) return false;
      if (!reservedTarget || reservedTarget.active !== true)
        throw new ApiError("access_disabled");
      tx.put(emailOperation, {
        actorUid: claims.uid,
        targetUid: uid,
        action: "setup",
        status: "attempting",
        createdAt: new Date().toISOString(),
      });
      tx.put(path, {
        ...reservedTarget,
        setupEmailStatus: "unknown",
        setupEmailError: "email_outcome_unknown",
      });
      return true;
    });
    if (shouldSend) {
      try {
        await sendAndRecord(emailOperation, uid, email, callerIp);
      } catch {
        /* The account is preserved and the exact partial outcome is returned. */
      }
    }
    const target = await deps.db.get(path);
    return {
      uid,
      completed: true,
      setupEmail: {
        status:
          target?.setupEmailStatus === "not_sent"
            ? "unknown"
            : target?.setupEmailStatus || "unknown",
        error: target?.setupEmailError || "",
      },
    };
  }
  return { authenticate, mutate, createEmployee };
}
