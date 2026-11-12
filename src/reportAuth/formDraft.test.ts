import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { createFormDraft, formDraft } from "./formDraft";
let values: Map<string, string>;
let store: Pick<Storage, "getItem" | "setItem" | "removeItem">;
const blank = () => ({
  customer: "",
  description: "",
  assignedTo: ["admin"],
  operation: { id: "fixed-operation", revision: 0 },
});
beforeEach(() => {
  vi.useFakeTimers();
  values = new Map();
  store = {
    getItem: (key) => values.get(key) ?? null,
    setItem: vi.fn((key, value) => {
      values.set(key, value);
    }),
    removeItem: (key) => {
      values.delete(key);
    },
  };
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
test("input updates immediately, multiple fields survive debounce and persistence never resets memory", () => {
  const draft = createFormDraft("admin:new", blank, store);
  draft.update((v) => ({ ...v, customer: "Asiakas" }));
  draft.update((v) => ({ ...v, description: "Uudempi pitkä teksti" }));
  expect(draft.getSnapshot().status).toBe("dirty");
  expect(draft.getSnapshot().value.customer).toBe("Asiakas");
  vi.advanceTimersByTime(1999);
  expect(store.setItem).not.toHaveBeenCalled();
  vi.advanceTimersByTime(1);
  expect(store.setItem).toHaveBeenCalledTimes(1);
  expect(draft.getSnapshot().status).toBe("saved");
  expect(draft.getSnapshot().value.description).toBe("Uudempi pitkä teksti");
  expect(
    createFormDraft("admin:new", blank, store).getSnapshot().value,
  ).toEqual(draft.getSnapshot().value);
});
test("UID and form identities isolate drafts; remount initialization cannot replace newer unsaved text", () => {
  vi.stubGlobal("sessionStorage", store);
  const admin = formDraft("unit-admin-identity", "new-order", blank);
  admin.update((v) => ({ ...v, customer: "Vain ylläpitäjä" }));
  expect(
    formDraft("unit-admin-identity", "new-order", () => ({
      ...blank(),
      customer: "Old server value",
    })),
  ).toBe(admin);
  expect(
    formDraft("unit-employee-identity", "new-order", blank).getSnapshot().value
      .customer,
  ).toBe("");
  expect(
    formDraft("unit-admin-identity", "edit-another-order", blank).getSnapshot()
      .value.customer,
  ).toBe("");
});
test("quota errors preserve all input, then explicit retry persists the current text", () => {
  let fail = true;
  const draft = createFormDraft("admin:catalog", blank, {
    ...store,
    setItem(key, value) {
      if (fail) throw Error("quota");
      store.setItem(key, value);
    },
  });
  draft.update((v) => ({ ...v, customer: "Säilytä" }));
  expect(draft.flush()).toBe(false);
  draft.update((v) => ({ ...v, description: "Uusin" }));
  expect(draft.getSnapshot().status).toBe("dirty");
  fail = false;
  expect(draft.flush()).toBe(true);
  expect(draft.getSnapshot().value).toMatchObject({
    customer: "Säilytä",
    description: "Uusin",
  });
});
test("corrupt saved data is not overwritten, and explicit discard unlocks a fresh form", () => {
  values.set("broken", "{not-json");
  const draft = createFormDraft("broken", blank, store);
  draft.update((v) => ({ ...v, customer: "Still in memory" }));
  expect(draft.flush()).toBe(false);
  expect(values.get("broken")).toBe("{not-json");
  expect(draft.getSnapshot().readFailed).toBe(true);
  expect(draft.clear()).toBe(true);
  expect(draft.getSnapshot().readFailed).toBe(false);
  expect(values.has("broken")).toBe(false);
});
test("a stale success callback cannot clear newer input; confirmed success clears only that form", () => {
  const draft = createFormDraft("one", blank, store),
    other = createFormDraft("two", blank, store);
  draft.update((v) => ({ ...v, customer: "Submitted" }));
  const revision = draft.getSnapshot().revision;
  draft.update((v) => ({ ...v, description: "Newer unsaved input" }));
  expect(draft.clear(blank(), revision)).toBe(false);
  expect(draft.getSnapshot().value.description).toBe("Newer unsaved input");
  other.update((v) => ({ ...v, customer: "Keep other form" }));
  other.flush();
  expect(draft.clear()).toBe(true);
  expect(other.getSnapshot().value.customer).toBe("Keep other form");
  expect(values.has("two")).toBe(true);
});
test("failed deletion does not reset input or silently pretend discard succeeded", () => {
  const draft = createFormDraft("one", blank, {
    ...store,
    removeItem() {
      throw Error("blocked");
    },
  });
  draft.update((v) => ({ ...v, customer: "Preserve" }));
  expect(draft.clear()).toBe(false);
  expect(draft.getSnapshot().value.customer).toBe("Preserve");
  expect(draft.getSnapshot().status).toBe("error");
});
test("unknown stored fields and wrong form shapes fail closed instead of restoring credentials or stale schemas", () => {
  values.set(
    "unknown",
    JSON.stringify({
      version: 1,
      value: { ...blank(), password: "must-not-restore" },
    }),
  );
  const draft = createFormDraft("unknown", blank, store);
  expect(draft.getSnapshot().readFailed).toBe(true);
  expect(draft.getSnapshot().value).toEqual(blank());
  expect(draft.flush()).toBe(false);
});

test("reopening a successfully saved form uses the latest server baseline, while unfinished input still wins", () => {
  vi.stubGlobal("sessionStorage", store);
  const uid = "unit-pristine-activation",
    id = "order-existing";
  const draft = formDraft(uid, id, blank);
  draft.update((v) => ({ ...v, description: "Unfinished local text" }));
  formDraft(uid, id, () => ({
    ...blank(),
    description: "New server text",
    operation: { id: "fixed-operation", revision: 2 },
  }));
  expect(draft.getSnapshot().value.description).toBe("Unfinished local text");
  draft.clear();
  expect(draft.getSnapshot().value.description).toBe("New server text");
  formDraft(uid, id, () => ({
    ...blank(),
    description: "Confirmed server result",
    operation: { id: "fixed-operation", revision: 3 },
  }));
  expect(draft.getSnapshot().value.description).toBe("Confirmed server result");
  expect(draft.getSnapshot().value.operation.revision).toBe(3);
  expect(draft.getSnapshot().hasDraft).toBe(false);
});
