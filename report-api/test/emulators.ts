// TEST ONLY. Never imported by the Worker or frontend. All network calls stay local.
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { exportPKCS8, generateKeyPair } from "jose";
import { googleServices } from "../google";
import { ApiError, type Dependencies } from "../types";
export const projectId = "demo-kh-tech-report";
if (
  process.env.FIREBASE_AUTH_EMULATOR_HOST !== "127.0.0.1:9099" ||
  process.env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:8085"
)
  throw new Error(
    "Local emulators required; real projects are forbidden in tests.",
  );
const app = getApps()[0] || initializeApp({ projectId });
export const auth = getAuth(app),
  db = getFirestore(app);
export const fixturePassword = "Emulator-only_42!";
export async function seed() {
  await fetch(
    `http://127.0.0.1:9099/emulator/v1/projects/${projectId}/accounts`,
    { method: "DELETE" },
  );
  await fetch(
    `http://127.0.0.1:8085/emulator/v1/projects/${projectId}/databases/(default)/documents`,
    { method: "DELETE" },
  );
  for (const [uid, role, active] of [
    ["admin", "admin", true],
    ["admin2", "admin", true],
    ["employee", "employee", true],
    ["other", "employee", true],
    ["disabled", "employee", false],
  ] as const) {
    await auth.createUser({
      uid,
      email: uid + "@example.test",
      password: fixturePassword,
      displayName: uid,
      disabled: !active,
    });
    await db
      .doc("users/" + uid)
      .set({
        uid,
        email: uid + "@example.test",
        displayName: uid,
        role,
        active,
        validAfter: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
  }
  await auth.createUser({
    uid: "outsider",
    email: "outsider@example.test",
    password: fixturePassword,
  });
  await db
    .doc("accessControl/admins")
    .set({ activeAdminCount: 2, updatedAt: new Date().toISOString() });
}
export async function login(uid: string, password = fixturePassword) {
  const response = await fetch(
    "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=emulator",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: uid + "@example.test",
        password,
        returnSecureToken: true,
      }),
    },
  );
  const result = (await response.json()) as any;
  if (!response.ok) throw new Error(result.error?.message || "login");
  return result.idToken as string;
}
export async function dependencies(): Promise<Dependencies> {
  const pair = await generateKeyPair("RS256", { extractable: true });
  const serviceAccount = JSON.stringify({
    type: "service_account",
    project_id: projectId,
    client_email: "test@demo-kh-tech-report.iam.gserviceaccount.com",
    private_key: await exportPKCS8(pair.privateKey),
  });
  const transport: typeof fetch = async (input, init) => {
    const remote = new URL(String(input));
    if (remote.href === "https://oauth2.googleapis.com/token")
      return Response.json({ access_token: "emulator-only", expires_in: 3600 });
    let local: string;
    if (remote.hostname === "firestore.googleapis.com")
      local = "http://127.0.0.1:8085" + remote.pathname + remote.search;
    else if (remote.hostname === "identitytoolkit.googleapis.com")
      local =
        "http://127.0.0.1:9099/identitytoolkit.googleapis.com" +
        remote.pathname +
        remote.search;
    else throw new Error("Forbidden non-emulator transport");
    const headers = new Headers(init?.headers);
    headers.set("Authorization", "Bearer owner");
    return fetch(local, { ...init, headers });
  };
  return {
    ...googleServices({ projectId, serviceAccount }, transport),
    rate: async () => true,
    verify: async (token) => {
      try {
        const claims = await auth.verifyIdToken(token);
        return {
          uid: claims.uid,
          email: claims.email || "",
          authTime: claims.auth_time,
        };
      } catch {
        throw new ApiError("invalid_session", 401);
      }
    },
  };
}
