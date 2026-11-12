export type Role = "admin" | "employee";
export type Profile = {
  uid: string;
  email: string;
  displayName: string;
  role: Role;
  active: boolean;
  validAfter: number;
  createdAt: string;
  updatedAt: string;
  passwordSetupRequired?: boolean;
  setupEmailStatus?: string;
  setupEmailError?: string;
};
export type Claims = { uid: string; authTime: number; email: string };
export type Account = {
  uid: string;
  email: string;
  disabled: boolean;
  validSince: number;
  displayName?: string;
};
export type Value =
  null | string | number | boolean | Value[] | { [key: string]: Value };
export type Document = Record<string, Value>;
export interface Database {
  get(path: string, tx?: string): Promise<Document | null>;
  list(
    collection: string,
    limit: number,
    pageToken?: string,
  ): Promise<{ documents: Document[]; nextPageToken?: string }>;
  transaction<T>(
    fn: (tx: {
      get(path: string): Promise<Document | null>;
      put(path: string, data: Document): void;
      delete?(path: string): void;
    }) => Promise<T>,
    maxAttempts?: number,
  ): Promise<T>;
}
export interface Identity {
  lookup(uid: string): Promise<Account>;
  lookupEmail(email: string): Promise<Account | null>;
  create(uid: string, email: string, displayName: string): Promise<void>;
  disable(uid: string): Promise<void>;
  reset(email: string, callerIp: string): Promise<void>;
  rename(uid: string, displayName: string): Promise<void>;
}
export interface Dependencies {
  db: Database;
  identity: Identity;
  verify(token: string): Promise<Claims>;
  rate(uid: string, kind?: 'work'): Promise<boolean>;
  archive?: import('./archive').ArchiveConfig;
}
export class ApiError extends Error {
  constructor(
    public code: string,
    public status = 403,
  ) {
    super(code);
  }
}
export function usable(
  data: Document | null,
  claims: Claims,
): data is Document & Profile {
  return (
    !!data &&
    data.uid === claims.uid &&
    data.active === true &&
    ["admin", "employee"].includes(String(data.role)) &&
    typeof data.validAfter === "number" &&
    claims.authTime >= data.validAfter
  );
}
