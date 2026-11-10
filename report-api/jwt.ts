import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";
import { ApiError, type Claims } from "./types";
const googleKeys = createRemoteJWKSet(
  new URL(
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com",
  ),
  { timeoutDuration: 8000, cacheMaxAge: 3_600_000, cooldownDuration: 30_000 },
);
export function firebaseVerifier(
  projectId: string,
  keys: JWTVerifyGetKey = googleKeys,
) {
  return async (token: string): Promise<Claims> => {
    try {
      const { payload } = await jwtVerify(token, keys, {
        algorithms: ["RS256"],
        issuer: "https://securetoken.google.com/" + projectId,
        audience: projectId,
        requiredClaims: ["exp", "iat", "sub", "auth_time"],
      });
      const now = Math.floor(Date.now() / 1000);
      if (
        typeof payload.sub !== "string" ||
        !/^[A-Za-z0-9_-]{1,128}$/.test(payload.sub) ||
        typeof payload.auth_time !== "number" ||
        !Number.isInteger(payload.auth_time) ||
        payload.auth_time < 0 ||
        payload.auth_time > now ||
        typeof payload.iat !== "number" ||
        payload.iat > now ||
        typeof payload.email !== "string" ||
        (payload.firebase as any)?.sign_in_provider !== "password"
      )
        throw new Error("claims");
      return {
        uid: payload.sub,
        authTime: payload.auth_time,
        email: payload.email,
      };
    } catch {
      throw new ApiError("invalid_session", 401);
    }
  };
}
