import { initializeApp } from "firebase/app";
import {
  initializeAuth,
  browserSessionPersistence,
  connectAuthEmulator,
} from "firebase/auth";
import {
  initializeFirestore,
  memoryLocalCache,
  connectFirestoreEmulator,
} from "firebase/firestore";
import {
  projectId,
  apiKey,
  appId,
  localEmulators,
  reportConfigured,
} from "./configuration";
export { reportApi, reportConfigured } from "./configuration";
function create() {
  const app = initializeApp(
    {
      projectId,
      apiKey,
      appId,
      authDomain:
        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
        projectId + ".firebaseapp.com",
    },
    "kh-tech-report",
  );
  const auth = initializeAuth(app, { persistence: browserSessionPersistence });
  const db = initializeFirestore(app, { localCache: memoryLocalCache() });
  if (localEmulators) {
    if (
      !projectId.startsWith("demo-") ||
      !["localhost", "127.0.0.1"].includes(location.hostname)
    )
      throw new Error("Emulator configuration must use a local demo project.");
    connectAuthEmulator(auth, "http://127.0.0.1:9099", {
      disableWarnings: true,
    });
    connectFirestoreEmulator(db, "127.0.0.1", 8085);
  }
  return { auth, db };
}
export const reportFirebase = reportConfigured ? create() : null;
