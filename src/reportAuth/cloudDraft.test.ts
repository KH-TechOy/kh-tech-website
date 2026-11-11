import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { createDraftSession } from "./draftSession";
import { createCloudDraft, cloudText, type CloudTransport } from "./cloudDraft";
import { emptyReport, type ReportState } from "../reportModel";
import { emptyBilling, type WorkReport } from "../reportWorkModel";

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("navigator", { onLine: true });
});

test("Firestore map field ordering does not create phantom edits or extra autosaves", () => {
  const state = emptyReport();
  state.billing = emptyBilling();
  const reordered = {
    ...state,
    form: Object.fromEntries(Object.entries(state.form).reverse()),
    billing: Object.fromEntries(Object.entries(state.billing).reverse()),
  } as ReportState;
  expect(cloudText(reordered)).toBe(cloudText(state));
});

test("a definite contention abort with unchanged server revision resumes autosave without dropping input", async () => {
  const f = fixture();
  await f.cloud.start();
  f.session.update((s) => ({ ...s, form: { ...s.form, customer: "Alku" } }));
  await f.cloud.save();
  const original = f.transport.save;
  f.transport.save = vi
    .fn()
    .mockRejectedValueOnce({ code: "revision_conflict" })
    .mockImplementation(original);
  f.session.update((s) => ({
    ...s,
    form: { ...s.form, notes: "Uusin sisältö" },
  }));
  await f.cloud.save();
  await vi.advanceTimersByTimeAsync(2100);
  expect(f.session.getSnapshot().state.form.notes).toBe("Uusin sisältö");
  expect(f.remote()?.form.notes).toBe("Uusin sisältö");
  expect(f.cloud.getSnapshot().status).toBe("saved");
  f.cloud.stop();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
function fixture() {
  const memory = new Map<string, string>();
  const storage = {
    getItem: (k: string) => memory.get(k) || null,
    setItem: (k: string, v: string) => {
      memory.set(k, v);
    },
    removeItem: (k: string) => {
      memory.delete(k);
    },
  };
  const session = createDraftSession(storage);
  let remote: WorkReport | null = null;
  const transport: CloudTransport = {
    load: vi.fn(async () => remote),
    save: vi.fn(
      async (revision: number, requestId: string, state: ReportState) => {
        if (remote && remote.revision !== revision)
          throw { code: "revision_conflict" };
        const form = structuredClone(state.form);
        form.materials = form.materials.map((row) => ({
          ...row,
          rowId: row.rowId || crypto.randomUUID(),
          unitPriceCents: row.unitPriceCents || 0,
        }));
        remote = {
          id: state.id,
          schemaVersion: 2,
          ownerUid: "employee",
          assignedTo: [],
          status: "IN_PROGRESS",
          title: state.form.customer,
          form,
          billing: state.billing || emptyBilling(),
          revision: revision + 1,
          lastMutation: requestId,
          schedule: "",
          quotationReference: "",
          workOrderId: "",
          comment: "",
          createdAt: "",
          updatedAt: "",
          updatedBy: "employee",
        };
        return remote;
      },
    ),
  };
  const cloud = createCloudDraft(session, transport, storage);
  return {
    session,
    cloud,
    transport,
    storage,
    remote: () => remote,
    setRemote: (value: WorkReport) => {
      remote = value;
    },
  };
}
test("debounced cloud save keeps immediate input, local recovery and stable report identity", async () => {
  const f = fixture();
  await f.cloud.start();
  f.session.update((s) => ({
    ...s,
    form: { ...s.form, customer: "Asiakas", notes: "Uusin teksti" },
  }));
  await vi.advanceTimersByTimeAsync(1999);
  expect(f.transport.save).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1);
  expect(f.session.getSnapshot().state.form.notes).toBe("Uusin teksti");
  expect(f.remote()?.revision).toBe(1);
  expect(f.remote()?.id).toBe(f.session.getSnapshot().state.id);
  expect(f.cloud.getSnapshot().status).toBe("saved");
  expect(f.storage.getItem("kht-report-draft")).toContain("Uusin teksti");
  f.cloud.stop();
});
test("save response never replaces text typed while a request is pending", async () => {
  const f = fixture();
  await f.cloud.start();
  let release!: () => void;
  const original = f.transport.save;
  f.transport.save = vi.fn(async (revision, requestId, state) => {
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    return original(revision, requestId, state);
  });
  f.session.update((s) => ({ ...s, form: { ...s.form, customer: "A" } }));
  const saving = f.cloud.save();
  f.session.update((s) => ({
    ...s,
    form: { ...s.form, customer: "AB", description: "Uudempi" },
  }));
  release();
  await saving;
  expect(f.session.getSnapshot().state.form.customer).toBe("AB");
  expect(f.cloud.getSnapshot().status).toBe("dirty");
  f.transport.save = original;
  await f.cloud.save();
  expect(f.remote()?.form.description).toBe("Uudempi");
  expect(f.cloud.getSnapshot().status).toBe("saved");
  f.cloud.stop();
});
test("higher remote revision conflicts with dirty input and clean snapshots apply in realtime", async () => {
  const f = fixture();
  await f.cloud.start();
  f.session.update((s) => ({ ...s, form: { ...s.form, customer: "Alku" } }));
  await f.cloud.save();
  const remote = {
    ...f.remote()!,
    revision: 2,
    lastMutation: "other",
    form: { ...f.remote()!.form, notes: "Toinen käyttäjä" },
  };
  await f.cloud.receive(remote);
  expect(f.session.getSnapshot().state.form.notes).toBe("Toinen käyttäjä");
  f.session.update((s) => ({
    ...s,
    form: { ...s.form, notes: "Oma keskeneräinen" },
  }));
  const concurrent = {
    ...remote,
    revision: 3,
    form: { ...remote.form, notes: "Uusi pilvessä" },
  };
  f.setRemote(concurrent);
  await f.cloud.receive(concurrent);
  expect(f.cloud.getSnapshot().status).toBe("conflict");
  expect(f.session.getSnapshot().state.form.notes).toBe("Oma keskeneräinen");
  expect(await f.cloud.save()).toBe(false);
  await f.cloud.resolve(true);
  expect(f.remote()?.form.notes).toBe("Oma keskeneräinen");
  expect(f.remote()?.revision).toBe(4);
  f.cloud.stop();
});
test("offline edits survive failures and ambiguous retry retains the original request payload", async () => {
  const f = fixture();
  await f.cloud.start();
  f.session.update((s) => ({ ...s, form: { ...s.form, customer: "Alku" } }));
  const original = f.transport.save;
  f.transport.save = vi.fn(async () => {
    throw { code: "network" };
  });
  await f.cloud.save();
  const first = vi.mocked(f.transport.save).mock.calls[0];
  f.session.update((s) => ({
    ...s,
    form: { ...s.form, customer: "Uusin offline" },
  }));
  f.transport.save = vi.fn(original);
  await f.cloud.save();
  expect(vi.mocked(f.transport.save).mock.calls[0][1]).toBe(first[1]);
  expect(vi.mocked(f.transport.save).mock.calls[0][2].form.customer).toBe(
    "Alku",
  );
  expect(f.session.getSnapshot().state.form.customer).toBe("Uusin offline");
  await f.cloud.save();
  expect(f.remote()?.form.customer).toBe("Uusin offline");
  f.cloud.stop();
});
test("reload with unacknowledged input cannot hydrate from an older cloud snapshot", async () => {
  const f = fixture();
  await f.cloud.start();
  f.session.update((s) => ({ ...s, form: { ...s.form, customer: "Alku" } }));
  await f.cloud.save();
  f.session.update((s) => ({
    ...s,
    form: { ...s.form, notes: "Offline säilynyt" },
  }));
  f.session.flush();
  f.cloud.stop();
  const restored = createDraftSession(f.storage),
    cloud = createCloudDraft(restored, f.transport, f.storage);
  await cloud.start();
  expect(restored.getSnapshot().state.form.notes).toBe("Offline säilynyt");
  expect(cloud.getSnapshot().status).toBe("dirty");
  cloud.stop();
});
test("an existing A.1 draft conflicts rather than disappearing on first cloud adoption", async () => {
  const f = fixture();
  await f.cloud.start();
  f.session.update((s) => ({
    ...s,
    form: { ...s.form, customer: "Pilviasiakas" },
  }));
  await f.cloud.save();
  f.cloud.stop();
  const isolated = createDraftSession();
  isolated.update({
    ...emptyReport(),
    form: { ...emptyReport().form, customer: "Paikallinen A.1" },
  });
  const cloud = createCloudDraft(isolated, f.transport, {
    getItem: () => null,
    setItem: () => {},
  });
  await cloud.start();
  expect(cloud.getSnapshot().status).toBe("conflict");
  expect(isolated.getSnapshot().state.form.customer).toBe("Paikallinen A.1");
  cloud.stop();
});

test("a failed checkpoint and unavailable cloud never delete locally recoverable input", async () => {
  const f = fixture();
  f.cloud.stop();
  const cloud = createCloudDraft(f.session, f.transport, {
    getItem: () => null,
    setItem: () => {
      throw new Error("quota");
    },
  });
  await cloud.start();
  f.session.update((s) => ({
    ...s,
    form: { ...s.form, notes: "Vain paikallinen palautuskopio" },
  }));
  await cloud.save();
  expect(cloud.getSnapshot().status).toBe("error");
  expect(f.session.getSnapshot().state.form.notes).toBe(
    "Vain paikallinen palautuskopio",
  );
  expect(f.session.flush()).toBe(true);
  cloud.stop();
});

test("edits made while a conflict choice is loading are never overwritten", async () => {
  const f = fixture();
  await f.cloud.start();
  f.session.update((s) => ({ ...s, form: { ...s.form, customer: "Oma" } }));
  await f.cloud.save();
  f.session.update((s) => ({
    ...s,
    form: { ...s.form, notes: "Paikallinen" },
  }));
  const remote = {
    ...f.remote()!,
    revision: 2,
    lastMutation: "other",
    form: { ...f.remote()!.form, notes: "Pilvessä" },
  };
  f.setRemote(remote);
  await f.cloud.receive(remote);
  let release!: (value: WorkReport) => void;
  f.transport.load = () =>
    new Promise((resolve) => {
      release = resolve;
    });
  const resolving = f.cloud.resolve(false);
  f.session.update((s) => ({
    ...s,
    form: { ...s.form, notes: "Valinnan aikana kirjoitettu" },
  }));
  release(remote);
  await resolving;
  expect(f.session.getSnapshot().state.form.notes).toBe(
    "Valinnan aikana kirjoitettu",
  );
  expect(f.cloud.getSnapshot().status).toBe("conflict");
  f.cloud.stop();
});

test("authorization revocation stops cloud access and a late response cannot reopen the editor", async () => {
  const f = fixture();
  await f.cloud.start();
  let reject!: (reason: unknown) => void;
  f.transport.save = () =>
    new Promise((_, fail) => {
      reject = fail;
    });
  f.session.update((s) => ({
    ...s,
    form: { ...s.form, notes: "Palautettava oma teksti" },
  }));
  const pending = f.cloud.save();
  f.cloud.lockAccess("report_forbidden");
  reject({ code: "network" });
  await pending;
  expect(f.cloud.getSnapshot()).toMatchObject({
    status: "locked",
    error: "report_forbidden",
  });
  expect(f.session.getSnapshot().state.form.notes).toBe(
    "Palautettava oma teksti",
  );
  f.cloud.stop();
});
