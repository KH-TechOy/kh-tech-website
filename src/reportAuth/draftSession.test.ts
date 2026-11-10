import { afterEach, expect, test, vi } from "vitest";
import { createDraftSession } from "./draftSession";
import { sessionDraftStorage } from "./drafts";
import { readReport } from "../reportModel";
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
const mockStorage = () => {
  const data = new Map<string, string>();
  let blocked = false;
  const storage = {
    getItem: (key: string) => data.get(key) || null,
    removeItem: (key: string) => data.delete(key),
    setItem: vi.fn((key: string, value: string) => {
      if (blocked) throw new DOMException("full", "QuotaExceededError");
      data.set(key, value);
    }),
  };
  return {
    storage,
    data,
    block: (value: boolean) => {
      blocked = value;
    },
  };
};
test("debounces changes for two seconds; save completion never replaces live form state or its ID", () => {
  vi.useFakeTimers();
  const mock = mockStorage(),
    session = createDraftSession(mock.storage);
  const id = session.getSnapshot().state.id;
  session.update((s) => ({ ...s, form: { ...s.form, customer: "Tomi" } }));
  vi.advanceTimersByTime(1500);
  session.update((s) => ({
    ...s,
    form: {
      ...s.form,
      address: "Uusin osoite",
      description: "Kesken oleva työ",
    },
  }));
  const latest = session.getSnapshot().state;
  vi.advanceTimersByTime(1999);
  expect(mock.storage.setItem).not.toHaveBeenCalled();
  expect(session.getSnapshot().status).toBe("dirty");
  vi.advanceTimersByTime(1);
  expect(session.getSnapshot()).toMatchObject({
    status: "saved",
    state: { id, form: { customer: "Tomi", address: "Uusin osoite" } },
  });
  expect(session.getSnapshot().state).toBe(latest);
});
test("manual save reads newest input even if more is typed after saving starts", async () => {
  vi.useFakeTimers();
  const mock = mockStorage(),
    session = createDraftSession(mock.storage);
  session.update((s) => ({ ...s, form: { ...s.form, customer: "Old" } }));
  const saving = session.save();
  expect(session.getSnapshot().status).toBe("saving");
  session.update((s) => ({ ...s, form: { ...s.form, customer: "Newest" } }));
  await vi.advanceTimersByTimeAsync(0);
  expect(await saving).toBe(true);
  expect(readReport(mock.storage).form.customer).toBe("Newest");
  expect(session.getSnapshot().state.form.customer).toBe("Newest");
});
test("persistence failure, subscription changes and retry preserve all unsaved input", () => {
  vi.useFakeTimers();
  const mock = mockStorage(),
    session = createDraftSession(mock.storage);
  mock.block(true);
  const unsubscribe = session.subscribe(() => {});
  session.update((s) => ({
    ...s,
    form: {
      ...s.form,
      customer: "Ei saa kadota",
      materials: [{ name: "Liitin", quantity: "2", unit: "kpl" }],
    },
  }));
  vi.advanceTimersByTime(2000);
  expect(session.getSnapshot().status).toBe("error");
  unsubscribe();
  session.subscribe(() => {});
  expect(session.getSnapshot().state.form.materials[0].name).toBe("Liitin");
  mock.block(false);
  expect(session.flush()).toBe(true);
  expect(readReport(mock.storage).form.customer).toBe("Ei saa kadota");
});
test("per-user atomic snapshot restores the ID and keeps previous saved draft when the next write fails", () => {
  vi.useFakeTimers();
  const mock = mockStorage();
  vi.stubGlobal("sessionStorage", mock.storage);
  const first = createDraftSession(sessionDraftStorage("one"));
  first.update((s) => ({ ...s, form: { ...s.form, customer: "One" } }));
  first.flush();
  const id = first.getSnapshot().state.id;
  expect(
    createDraftSession(sessionDraftStorage("two")).getSnapshot().state.form
      .customer,
  ).toBe("");
  mock.block(true);
  first.update((s) => ({
    ...s,
    form: { ...s.form, customer: "Newest unsaved" },
  }));
  expect(first.flush()).toBe(false);
  expect(first.getSnapshot().state.form.customer).toBe("Newest unsaved");
  mock.block(false);
  expect(
    createDraftSession(sessionDraftStorage("one")).getSnapshot().state,
  ).toMatchObject({ id, form: { customer: "One" } });
  first.flush();
  expect(
    createDraftSession(sessionDraftStorage("one")).getSnapshot().state.form
      .customer,
  ).toBe("Newest unsaved");
});
test("legacy import refuses to overwrite input changed while authorization was checked", () => {
  vi.useFakeTimers();
  const session = createDraftSession(mockStorage().storage),
    revision = session.getSnapshot().revision,
    old = session.getSnapshot().state;
  session.update((s) => ({ ...s, form: { ...s.form, customer: "New input" } }));
  expect(() => session.replace(old, revision)).toThrow("Luonnos muuttui");
  expect(session.getSnapshot().state.form.customer).toBe("New input");
});

test("unreadable or corrupt draft is never overwritten until replacement is explicitly allowed", () => {
  vi.useFakeTimers();
  let writes = 0;
  const storage = {
    getItem: () => {
      throw new Error("read blocked");
    },
    setItem: () => {
      writes++;
    },
    removeItem: () => {
      writes++;
    },
  };
  const session = createDraftSession(storage);
  expect(session.getSnapshot()).toMatchObject({
    status: "error",
    readFailed: true,
  });
  session.update((s) => ({
    ...s,
    form: { ...s.form, customer: "New unsaved" },
  }));
  vi.advanceTimersByTime(2000);
  expect(writes).toBe(0);
  expect(session.flush()).toBe(false);
  session.allowReplacementAfterReadFailure();
  expect(session.flush()).toBe(true);
  expect(writes).toBe(2);
  expect(session.getSnapshot().state.form.customer).toBe("New unsaved");
  const corrupt = createDraftSession({
    ...storage,
    getItem: () => "{bad JSON",
  });
  expect(corrupt.getSnapshot().readFailed).toBe(true);
  expect(corrupt.flush()).toBe(false);
});
