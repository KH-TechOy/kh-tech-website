import { beforeAll, expect, test, vi } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { emptyReport } from "../src/reportModel";
import {
  makePortable,
  portableText,
  parsePortable,
  sha256,
} from "../src/reportArchive";
import { billingTotals } from "../src/reportWorkModel";
import { buildFinalPdf } from "../src/finalPdf";
import { relayPacket, callRelay, signRelay } from "../report-api/archiveRelay";
import {
  createRelayHarness,
  fixtureRelayUrl,
  fixtureRelaySecret,
} from "./test/harness.mjs";
const config = { relayUrl: fixtureRelayUrl, secret: fixtureRelaySecret };
vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 });
export function approvedFixture() {
  const base = emptyReport();
  return {
    ...base,
    id: "KHT-20261112-ABCDEF",
    schemaVersion: 3 as const,
    ownerUid: "admin",
    assignedTo: ["employee"],
    title: "Synteettinen asiakas",
    status: "APPROVED" as const,
    revision: 5,
    form: {
      ...base.form,
      date: "2026-11-12",
      customer: "Synteettinen asiakas",
      address: "Testikatu 1",
      worker: "Testitekijä",
      description: "Testiraportti",
      hours: "2",
      materials: [
        { name: "Liitin", quantity: "2", unit: "kpl", unitPriceCents: 2500 },
      ],
    },
    operations: {
      travelKm: 10,
      otherCents: 1600,
      otherDescription: "Testikulut",
    },
    billing: {
      hourRateCents: 10000,
      travelKm: 10,
      travelRateCents: 100,
      otherCents: 1600,
      otherDescription: "Testikulut",
      vatBasisPoints: 2550,
    },
    signature: {
      version: 1 as const,
      strokes: [{ points: [100, 200, 1200, 1800, 2300, 1200] }],
      confirmedAt: "2026-11-12T09:00:00.000Z",
      recordedAt: "2026-11-12T09:00:01.000Z",
      context: {
        reportId: "KHT-20261112-ABCDEF",
        customer: "Synteettinen asiakas",
        date: "2026-11-12",
      },
    },
    approval: {
      at: "2026-11-12T10:00:00.000Z",
      displayAt: "12.11.2026 12:00",
      byName: "Tomi",
      revision: 5,
    },
    quotationReference: "",
    schedule: "",
    workOrderId: "KHT-20261112-ABCDEF",
    comment: "Tarkastettu",
    createdAt: "2026-11-12T08:00:00.000Z",
    updatedAt: "2026-11-12T10:00:00.000Z",
    updatedBy: "admin",
    lastMutation: crypto.randomUUID(),
  };
}
beforeAll(() => {
  execFileSync(process.execPath, ["scripts/build-report-relay.mjs"], {
    stdio: "pipe",
  });
});
test("permit validity uses one clock reading even if the millisecond changes while constructing the request", async () => {
  const now = Date.now(),
    clock = vi
      .spyOn(Date, "now")
      .mockReturnValueOnce(now)
      .mockReturnValueOnce(now + 1);
  try {
    const packet = await relayPacket(config, {
      action: "status",
      operationId: "single-clock-safety-0001",
    });
    expect(packet.payload.expiresAt - packet.payload.issuedAt).toBe(300000);
  } finally {
    clock.mockRestore();
  }
});

test("portable approval includes exact signature/totals, detects tampering/version changes, and excludes authentication data", async () => {
  const portable = await makePortable(approvedFixture());
  expect(portable.totals).toMatchObject({
    net: 27600,
    vat: 7038,
    gross: 34638,
  });
  const text = portableText(portable);
  expect(text).not.toMatch(
    /ownerUid|assignedTo|updatedBy|lastMutation|purchaseCents|password|accessToken/,
  );
  expect((await parsePortable(text)).report.signature).toEqual(
    portable.report.signature,
  );
  await expect(
    parsePortable(text.replace("Testikatu 1", "Muutettu osoite")),
  ).rejects.toThrow("archive_integrity");
  await expect(
    parsePortable(text.replace('"version":1', '"version":9')),
  ).rejects.toThrow();
});
test("same trusted generator produces byte-identical final PDFs in browser-like Node and restricted GAS V8 without DOM/Intl/fetch", async () => {
  const portable = await makePortable(approvedFixture()),
    h = createRelayHarness();
  const expected = new Uint8Array(
    buildFinalPdf(portable).output("arraybuffer"),
  );
  const result = await callRelay(
    { ...config, fetcher: h.fetcher },
    {
      action: "prepare",
      operationId: "fixture-prepare-0001",
      portable: portableText(portable),
    },
  );
  expect(result.error).toBeUndefined();
  expect(result.status).toBe("PREPARED");
  expect(result.pdfSha256).toBe(await sha256(expected));
  expect(result.portableSha256).toBe(await sha256(portableText(portable)));
  expect(h.state.mailbox).toHaveLength(0);
  expect(expected.byteLength).toBeLessThan(2000000);
});
test("dedicated relay authenticates, fixes recipient, and deduplicates MailApp acceptance without claiming receipt", async () => {
  const h = createRelayHarness(),
    portable = await makePortable(approvedFixture()),
    body = {
      action: "archive",
      operationId: "fixture-send-0001",
      portable: portableText(portable),
    };
  const packet = await relayPacket(config, body);
  expect(h.post({ ...packet, signature: "0".repeat(64) })).toEqual({
    error: "unauthorized",
  });
  const result = await callRelay({ ...config, fetcher: h.fetcher }, body);
  expect(result.status).toBe("SENT_UNVERIFIED");
  await callRelay({ ...config, fetcher: h.fetcher }, body);
  expect(h.state.mailbox).toHaveLength(1);
  expect(h.state.mailbox[0].to).toBe("khtech.site@gmail.com");
  expect(h.state.mailbox[0].attachments.map((a) => a.getName())).toEqual([
    "KHT-20261112-ABCDEF_r5.pdf",
    "KHT-20261112-ABCDEF_r5.khtreport",
  ]);
});
test("quota failure is safely retryable, but an ambiguous side effect or lost acknowledgement never resends", async () => {
  const p = await makePortable(approvedFixture()),
    h = createRelayHarness();
  h.state.quota = 0;
  expect(
    (
      await callRelay(
        { ...config, fetcher: h.fetcher },
        {
          action: "archive",
          operationId: "quota-safe-attempt-1",
          portable: portableText(p),
        },
      )
    ).status,
  ).toBe("FAILED");
  expect(h.state.mailbox).toHaveLength(0);
  h.state.quota = 100;
  h.state.throwAfterSend = true;
  const body = {
    action: "archive",
    operationId: "ambiguous-attempt-1",
    portable: portableText(p),
  };
  expect(
    (await callRelay({ ...config, fetcher: h.fetcher }, body)).status,
  ).toBe("OUTCOME_UNKNOWN");
  h.state.throwAfterSend = false;
  await callRelay({ ...config, fetcher: h.fetcher }, body);
  expect(h.state.mailbox).toHaveLength(1);
  h.state.failAcceptedRecord = true;
  const second = { ...body, operationId: "journal-write-lost-1" };
  expect(
    (await callRelay({ ...config, fetcher: h.fetcher }, second)).status,
  ).toBe("OUTCOME_UNKNOWN");
  await callRelay({ ...config, fetcher: h.fetcher }, second);
  expect(h.state.mailbox).toHaveLength(2);
});
test("expired permits and recipient injection cannot send, and conflicting retries cannot erase a durable send marker", async () => {
  const h = createRelayHarness(),
    p = await makePortable(approvedFixture()),
    body = {
      action: "archive",
      operationId: "protected-record-0001",
      portable: portableText(p),
    };
  await callRelay({ ...config, fetcher: h.fetcher }, body);
  const before = h.props.get("op:" + body.operationId);
  await callRelay(
    { ...config, fetcher: h.fetcher },
    { ...body, portable: portableText(p) + " " },
  );
  expect(h.props.get("op:" + body.operationId)).toBe(before);
  expect(
    (
      await callRelay(
        { ...config, fetcher: h.fetcher },
        {
          ...body,
          operationId: "bad-destination-0001",
          recipient: "attacker@example.test",
        },
      )
    ).status,
  ).toBe("FAILED");
  expect(h.state.mailbox).toHaveLength(1);
  expect(billingTotals(p.report.form, p.report.billing).gross).toBe(34638);
  const expired = await relayPacket(config, {
    ...body,
    operationId: "expired-request-0001",
  });
  expired.payload.issuedAt = Date.now() - 600000;
  expired.payload.expiresAt = Date.now() - 300000;
  expired.signature = await signRelay(fixtureRelaySecret, expired.payload);
  expect(h.post(expired)).toEqual({ error: "unauthorized" });
  expect(h.state.mailbox).toHaveLength(1);
});
test("photo attachment identity, dimensions and format are validated by the actual relay code before MailApp", async () => {
  const bytes = readFileSync("e2e/fixtures/before.jpg"),
    h = createRelayHarness();
  const manifest = [
    {
      sha256: await sha256(bytes),
      bytes: bytes.length,
      width: 1,
      height: 1,
      mime: "image/jpeg",
      category: "before",
    },
  ];
  const packet = await relayPacket(config, {
    action: "photos",
    operationId: "invalid-photo-size-0001",
    reportId: "KHT-20261112-ABCDEF",
    revision: 5,
    manifest,
  });
  expect(
    h.post({ ...packet, photos: [bytes.toString("base64")] }).payload,
  ).toMatchObject({ status: "FAILED", error: "photo_dimensions" });
  expect(h.state.mailbox).toHaveLength(0);
  const damaged = await relayPacket(config, {
    action: "photos",
    operationId: "invalid-photo-bytes-0001",
    reportId: "KHT-20261112-ABCDEF",
    revision: 5,
    manifest,
  });
  expect(
    h.post({
      ...damaged,
      photos: [Buffer.from("not an image").toString("base64")],
    }).payload.status,
  ).toBe("FAILED");
  expect(h.state.mailbox).toHaveLength(0);
});
