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
      !["role", "disable", "reset"].includes(String(action)) ||
      typeof uid !== "string" ||
      !uidPattern.test(uid) ||
      typeof requestId !== "string" ||
      !requestPattern.test(requestId) ||
      Object.keys(input).some(
        (k) => !["action", "uid", "requestId", "role"].includes(k),
      )
    )
      throw new ApiError("invalid_request", 400);
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
          if (!op || op.status !== "pending") return false;
          tx.put(operation, { ...op, status: "attempting" });
          return true;
        });
        if (!claimed) throw new ApiError("outcome_unknown", 409);
        await deps.identity.reset(String(result.target.email), callerIp);
      }
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
  async function createEmployee(claims: Claims, input: Document) {
    if (
      Object.keys(input).some(
        (k) => !["requestId", "email", "displayName"].includes(k),
      ) ||
      typeof input.requestId !== "string" ||
      !requestPattern.test(input.requestId) ||
      typeof input.email !== "string" ||
      input.email.length > 160 ||
      !/^[^\s@<>\r\n]+@[^\s@<>\r\n]+\.[^\s@<>\r\n]+$/.test(input.email) ||
      typeof input.displayName !== "string" ||
      !input.displayName.trim() ||
      input.displayName.length > 120 ||
      /[\u0000-\u001f\u007f]/.test(input.displayName)
    )
      throw new ApiError("invalid_request", 400);
    const uid = "emp-" + input.requestId,
      path = "users/" + uid,
      operation = "auditEvents/" + input.requestId;
    const email = input.email.trim().toLowerCase(),
      displayName = input.displayName.trim();
    const completed = await adminTransaction(claims, async (tx) => {
      const existing = await tx.get(operation);
      const target = await tx.get(path);
      if (existing) {
        if (
          existing.actorUid !== claims.uid ||
          existing.action !== "create" ||
          target?.email !== email ||
          target?.displayName !== displayName
        )
          throw new ApiError("request_conflict", 409);
        return existing.status === "completed";
      }
      const now = new Date().toISOString();
      tx.put(path, {
        uid,
        email,
        displayName,
        role: "employee",
        active: false,
        validAfter: 0,
        createdAt: now,
        updatedAt: now,
      });
      tx.put(operation, {
        actorUid: claims.uid,
        targetUid: uid,
        action: "create",
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
    // Password is random, discarded and never returned. A separate audited reset sends the invitation.
    return { uid, completed: true };
  }
  return { authenticate, mutate, createEmployee };
}
