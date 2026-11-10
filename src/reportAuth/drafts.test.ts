import { expect, test, vi } from "vitest";
import { sessionDraftStorage, clearSessionDrafts } from "./drafts";
test("isolates employee drafts and blocks a late editor flush after logout", () => {
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
  one.setItem("kht-report-draft", "late");
  expect(data.size).toBe(0);
  two.setItem("kht-report-draft", "draft");
  data.set("unrelated", "keep");
  clearSessionDrafts();
  expect([...data.entries()]).toEqual([["unrelated", "keep"]]);
  vi.unstubAllGlobals();
});
