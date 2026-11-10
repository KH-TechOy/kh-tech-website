import { expect, test, vi } from "vitest";
import { sessionDraftStorage } from "./drafts";
test("isolates retained employee drafts and a closed adapter rejects late writes", () => {
  const data = new Map<string, string>();
  const storage = new Proxy(
    {
      getItem: (k: string) => data.get(k) || null,
      setItem: (k: string, v: string) => data.set(k, v),
      removeItem: (k: string) => data.delete(k),
    },
    {
      ownKeys: () => [...data.keys()],
      getOwnPropertyDescriptor: () => ({
        enumerable: true,
        configurable: true,
      }),
    },
  );
  vi.stubGlobal("sessionStorage", storage);
  const one = sessionDraftStorage("one"),
    two = sessionDraftStorage("two");
  one.setItem("kht-report-draft", "private");
  expect(two.getItem("kht-report-draft")).toBeNull();
  one.close();
  expect(() => one.setItem("kht-report-draft", "late")).toThrow("closed");
  expect(one.getItem("kht-report-draft")).toBeNull();
  expect(data.get("kht-report2:one:kht-report-draft")).toBe("private");
  two.setItem("kht-report-draft", "draft");
  data.set("unrelated", "keep");
  two.removeItem("kht-report-draft");
  expect(data.get("kht-report2:one:kht-report-draft")).toBe("private");
  expect(data.get("unrelated")).toBe("keep");
  vi.unstubAllGlobals();
});
