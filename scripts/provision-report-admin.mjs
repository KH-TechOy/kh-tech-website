import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
export async function provisionFirstAdmin(db, auth, uid) {
  const account = await auth.getUser(uid);
  if (
    account.disabled ||
    !account.email ||
    !account.providerData.some((p) => p.providerId === "password")
  )
    throw new Error(
      "An enabled individual email/password account is required.",
    );
  await db.runTransaction(async (tx) => {
    const control = await tx.get(db.doc("accessControl/admins"));
    const users = await tx.get(db.collection("users").limit(1));
    if (control.exists || !users.empty)
      throw new Error(
        "Already initialized. Use the authenticated admin application; bootstrap is refused.",
      );
    const now = new Date().toISOString();
    tx.create(db.doc("users/" + uid), {
      uid,
      email: account.email.toLowerCase(),
      displayName: account.displayName || account.email,
      role: "admin",
      active: true,
      validAfter: 0,
      createdAt: now,
      updatedAt: now,
    });
    tx.create(db.doc("accessControl/admins"), {
      activeAdminCount: 1,
      updatedAt: now,
    });
    tx.create(db.doc("auditEvents/" + randomUUID()), {
      actorUid: "operator-bootstrap",
      targetUid: uid,
      action: "initial-admin",
      status: "completed",
      createdAt: now,
    });
  });
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const [projectId, uid, ...extra] = process.argv.slice(2);
  if (
    extra.length ||
    !projectId ||
    !uid ||
    !/^[a-z][a-z0-9-]{4,62}$/.test(projectId) ||
    !/^[A-Za-z0-9_-]{1,128}$/.test(uid) ||
    projectId.startsWith("demo-") ||
    process.env.FIRESTORE_EMULATOR_HOST ||
    process.env.FIREBASE_AUTH_EMULATOR_HOST
  ) {
    console.error(
      "Usage: node scripts/provision-report-admin.mjs REAL_PROJECT_ID EXISTING_AUTH_UID (operator ADC required)",
    );
    process.exitCode = 1;
  } else
    try {
      const app = initializeApp({
        projectId,
        credential: applicationDefault(),
      });
      await provisionFirstAdmin(getFirestore(app), getAuth(app), uid);
      console.log(
        "Initial administrator provisioned. Bootstrap is now closed.",
      );
    } catch {
      console.error(
        "Provisioning refused or unavailable. Check operator IAM, existing initialization and account in the Firebase Console. No credentials are printed.",
      );
      process.exitCode = 1;
    }
}
