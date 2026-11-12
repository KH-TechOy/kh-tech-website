import {
  ApiError,
  usable,
  type Claims,
  type Database,
  type Document,
} from "./types";
import {
  makePortable,
  parsePortable,
  portableText,
  sha256,
  type ArchiveStatus,
} from "../src/reportArchive";
import { readWork, publicReport, type FullReport } from "./workStorage";
import { retentionWindow } from "../src/reportRetention";
import {
  callRelay,
  relayPacket,
  relayReady,
  type RelayConfig,
  type RelayResult,
} from "./archiveRelay";
export type ArchiveConfig = RelayConfig & {
  deletionEnabled?: boolean;
  retentionDays?: number;
  policyVersion?: string;
};
const idPattern = /^KHT-\d{8}-[A-F0-9]{6}$/,
  hashPattern = /^[a-f0-9]{64}$/;
function fail(code = "invalid_request", status = 400): never {
  throw new ApiError(code, status);
}
const doc = (v: unknown) => v as Document;
const statusMap: Record<RelayResult["status"], ArchiveStatus> = {
  PREPARED: "ARCHIVE_PENDING",
  SENT_UNVERIFIED: "ARCHIVE_SENT_UNVERIFIED",
  FAILED: "ARCHIVE_FAILED",
  OUTCOME_UNKNOWN: "ARCHIVE_OUTCOME_UNKNOWN",
};
export function archiveService(db: Database, config: ArchiveConfig = {}) {
  const actor = async (
    tx: Parameters<Parameters<Database["transaction"]>[0]>[0],
    claims: Claims,
    admin = true,
  ) => {
    const p = await tx.get("users/" + claims.uid);
    if (!usable(p, claims)) fail("access_disabled", 403);
    if (admin && p.role !== "admin") fail("admin_required", 403);
    return p;
  };
  const permitted = (r: FullReport, claims: Claims, role: string) => {
    if (
      role !== "admin" &&
      r.ownerUid !== claims.uid &&
      !r.assignedTo.includes(claims.uid)
    )
      fail("report_forbidden", 403);
  };
  const snapshot = async (claims: Claims, id: string, admin = true) =>
    db.transaction(async (tx) => {
      const p = await actor(tx, claims, admin),
        read = await readWork(tx, id);
      if (!read.report) fail("not_found", 404);
      permitted(read.report!, claims, p.role);
      return {
        ...read,
        profile: p,
        metadata: await tx.get("archiveMetadata/" + id),
      };
    }, 1);
  async function updateResult(
    claims: Claims,
    id: string,
    operationId: string,
    result: RelayResult,
    photo = false,
  ) {
    return db.transaction(async (tx) => {
      await actor(tx, claims, !photo);
      const meta = await tx.get("archiveMetadata/" + id);
      if (!meta) return null;
      if (photo) {
        const read = await readWork(tx, id);
        if (!read.report) fail("not_found", 404);
        const p = await tx.get("users/" + claims.uid);
        permitted(read.report!, claims, String(p?.role));
      }
      const target = (photo ? meta.photo : meta) as any;
      if (target?.operationId !== operationId) return meta;
      if (target.status === "ARCHIVE_CONFIRMED") {
        if (
          !photo &&
          result.status === "SENT_UNVERIFIED" &&
          result.snapshotHash === meta.snapshotHash &&
          result.portableSha256 === meta.expectedPortableHash &&
          result.pdfSha256 === meta.pdfSha256
        ) {
          const next = {
            ...meta,
            deliveryResolved: true,
            deliveryUncertain: false,
          };
          tx.put("archiveMetadata/" + id, doc(next));
          return next;
        }
        return meta;
      }
      const outcome: any = {
        ...target,
        status: statusMap[result.status],
        updatedAt: new Date().toISOString(),
        error: result.error || "",
      };
      if (!photo) {
        outcome.deliveryUncertain = result.status === "OUTCOME_UNKNOWN";
        if (
          result.status === "SENT_UNVERIFIED" &&
          (!result.pdfSha256 ||
            !hashPattern.test(result.pdfSha256) ||
            result.portableSha256 !== meta.expectedPortableHash ||
            result.snapshotHash !== meta.snapshotHash)
        ) {
          outcome.status = "ARCHIVE_OUTCOME_UNKNOWN";
          outcome.deliveryUncertain = true;
          outcome.error = "archive_integrity";
        }
      }
      if (
        !photo &&
        result.pdfSha256 &&
        result.portableSha256 &&
        result.snapshotHash === meta.snapshotHash &&
        hashPattern.test(result.pdfSha256) &&
        result.portableSha256 === meta.expectedPortableHash
      ) {
        outcome.pdfSha256 = result.pdfSha256;
        outcome.portableSha256 = result.portableSha256;
      }
      if (photo && Array.isArray(result.photoHashes))
        outcome.photoHashes = result.photoHashes;
      const next = photo ? { ...meta, photo: outcome } : outcome;
      tx.put("archiveMetadata/" + id, doc(next));
      return next;
    }, 1);
  }
  return async (claims: Claims, input: Document) => {
    const action = String(input.action || ""),
      id = String(input.id || "");
    const allowed: Record<string, string[]> = {
      capabilities: ["action"],
      snapshot: ["action", "id"],
      prepare: ["action", "id", "revision"],
      send: ["action", "id", "revision"],
      status: ["action", "id"],
      confirm: [
        "action",
        "id",
        "revision",
        "pdfSha256",
        "portableSha256",
        "receiptMethod",
        "confirmationId",
        "recoverable",
      ],
      confirmPhotos: [
        "action",
        "id",
        "photoHashes",
        "confirmationId",
        "recoverable",
      ],
      delete: [
        "action",
        "id",
        "revision",
        "confirmationId",
        "recoverable",
        "policyVersion",
      ],
      copy: ["action", "id", "targetId", "requestId"],
      import: ["action", "id", "targetId", "requestId", "portable"],
      photoPermit: ["action", "id", "manifest"],
      photoStatus: ["action", "id"],
    };
    if (
      !allowed[action] ||
      Object.keys(input).some((k) => !allowed[action].includes(k))
    )
      fail();
    if (action === "capabilities")
      return db.transaction(async (tx) => {
        const p = await actor(tx, claims, false);
        return {
          relayConfigured: relayReady(config),
          canDelete:
            p.role === "admin" &&
            !!config.deletionEnabled &&
            Number.isInteger(config.retentionDays) &&
            config.retentionDays! >= 0 &&
            config.retentionDays! <= 36500 &&
            !!config.policyVersion,
          policyVersion: p.role === "admin" ? config.policyVersion || "" : "",
          retentionDays:
            p.role === "admin" ? (config.retentionDays ?? null) : null,
        };
      }, 1);
    if (!idPattern.test(id)) fail();
    const photo = action.startsWith("photo");
    const loaded =
      action === "import"
        ? await db.transaction(
            async (tx) => ({
              raw: null,
              report: null,
              finance: null,
              profile: await actor(tx, claims),
              metadata: await tx.get("archiveMetadata/" + id),
            }),
            1,
          )
        : await snapshot(claims, id, !photo);
    const r = loaded.report!;
    if (action === "copy" || action === "import") {
      if (
        !idPattern.test(String(input.targetId)) ||
        input.targetId === id ||
        typeof input.requestId !== "string" ||
        !/^[a-f0-9-]{36}$/.test(input.requestId)
      )
        fail();
      const portable =
        action === "import"
          ? await parsePortable(String(input.portable || ""))
          : await makePortable(r);
      if (portable.report.id !== id) fail("archive_integrity");
      const sourceHash = portable.integrity.value;
      return db.transaction(async (tx) => {
        await actor(tx, claims);
        const target = String(input.targetId),
          existing = await tx.get("reports/" + target);
        if ((await tx.get("archiveMetadata/" + target))?.removedAt)
          fail("report_archived", 410);
        if (existing) {
          const financial = await tx.get("reportFinances/" + target);
          if (
            existing.lastMutation === input.requestId &&
            (existing.source as any)?.reportId === id &&
            financial?.sourceHash === sourceHash
          )
            return { id: target };
          fail("revision_conflict", 409);
        }
        const now = new Date().toISOString(),
          s = portable.report;
        const copy: FullReport = {
          id: target,
          schemaVersion: 3,
          ownerUid: claims.uid,
          assignedTo: [claims.uid],
          title: s.form.customer,
          status: "NEW",
          revision: 1,
          form: { ...s.form, acknowledgement: "" },
          operations: s.operations,
          billing: s.billing,
          signature: null,
          source: { reportId: id, revision: s.revision },
          schedule: s.schedule,
          quotationReference: s.quotationReference,
          workOrderId: target,
          comment: "",
          createdAt: now,
          updatedAt: now,
          updatedBy: claims.uid,
          lastMutation: String(input.requestId),
        };
        tx.put("reports/" + target, doc(publicReport(copy)));
        tx.put(
          "reportFinances/" + target,
          doc({
            id: target,
            billing: copy.billing,
            revision: 1,
            lastMutation: input.requestId,
            fingerprint: "",
            sourceHash,
          }),
        );
        tx.put(
          "workOrders/" + target,
          doc({
            schemaVersion: 3,
            id: target,
            reportId: target,
            ownerUid: claims.uid,
            assignedTo: [claims.uid],
            title: copy.title,
            address: copy.form.address,
            workDate: copy.form.date,
            schedule: copy.schedule,
            quotationReference: copy.quotationReference,
            status: copy.status,
            createdAt: now,
            updatedAt: now,
          }),
        );
        tx.put(
          "auditEvents/copy-" + target,
          doc({
            action: "copy",
            actorUid: claims.uid,
            targetId: target,
            sourceId: id,
            sourceRevision: s.revision,
            createdAt: now,
          }),
        );
        return { id: target };
      }, 2);
    }
    if (photo) {
      if (action === "photoStatus") {
        const target = (loaded.metadata?.photo || null) as any;
        if (!target) return { status: null };
        let result: RelayResult;
        try {
          result = await callRelay(config, {
            action: "status",
            operationId: target.operationId,
          });
        } catch {
          result = {
            operationId: target.operationId,
            status: "OUTCOME_UNKNOWN",
          };
        }
        const meta = await updateResult(
          claims,
          id,
          target.operationId,
          result,
          true,
        );
        return {
          status: (meta?.photo as any)?.status || "ARCHIVE_OUTCOME_UNKNOWN",
          error: (meta?.photo as any)?.error || "",
        };
      }
      if (!["PENDING_REVIEW", "APPROVED"].includes(r.status))
        fail("photo_report_not_ready", 409);
      if (!relayReady(config)) fail("archive_not_configured", 503);
      const manifest = input.manifest as any;
      if (
        !Array.isArray(manifest) ||
        !manifest.length ||
        manifest.length > 6 ||
        new Set(manifest.map((m) => m.sha256)).size !== manifest.length
      )
        fail("photo_limits");
      let total = 0;
      for (const m of manifest) {
        if (
          !m ||
          Object.keys(m).some(
            (k) =>
              ![
                "sha256",
                "bytes",
                "width",
                "height",
                "mime",
                "category",
              ].includes(k),
          ) ||
          !hashPattern.test(m.sha256) ||
          !Number.isInteger(m.bytes) ||
          m.bytes < 32 ||
          m.bytes > 1200000 ||
          !Number.isInteger(m.width) ||
          !Number.isInteger(m.height) ||
          m.width < 1 ||
          m.height < 1 ||
          m.width > 2000 ||
          m.height > 2000 ||
          !["image/jpeg", "image/png"].includes(m.mime) ||
          !["before", "during", "after"].includes(m.category)
        )
          fail("photo_limits");
        total += m.bytes;
      }
      if (total > 2000000) fail("photo_limits");
      const previous = loaded.metadata?.photo as any;
      if (previous && !["ARCHIVE_FAILED"].includes(previous.status))
        fail("photo_outcome_requires_check", 409);
      const operationId = id + "-photos-" + crypto.randomUUID();
      const packet = await relayPacket(config, {
        action: "photos",
        operationId,
        reportId: id,
        revision: r.revision,
        manifest,
      });
      await db.transaction(async (tx) => {
        const p = await actor(tx, claims, false),
          read = await readWork(tx, id);
        if (!read.report) fail("not_found", 404);
        permitted(read.report!, claims, p.role);
        if (
          read.report!.revision !== r.revision ||
          !["PENDING_REVIEW", "APPROVED"].includes(read.report!.status)
        )
          fail("revision_conflict", 409);
        const meta = await tx.get("archiveMetadata/" + id),
          existing = meta?.photo as any;
        if (existing && existing.status !== "ARCHIVE_FAILED")
          fail("photo_outcome_requires_check", 409);
        tx.put(
          "archiveMetadata/" + id,
          doc({
            ...meta,
            photo: {
              operationId,
              status: "ARCHIVE_SENDING",
              createdAt: new Date().toISOString(),
              expiresAt: packet.payload.expiresAt,
              manifest,
            },
          }),
        );
      }, 2);
      return { relayUrl: config.relayUrl, packet };
    }
    if (action === "confirmPhotos") {
      const meta = loaded.metadata,
        target = meta?.photo as any;
      const hashes = input.photoHashes;
      if (
        !target ||
        !Array.isArray(hashes) ||
        input.confirmationId !== id ||
        input.recoverable !== true ||
        hashes.length !== target.manifest?.length ||
        hashes.some((h) => typeof h !== "string" || !hashPattern.test(h)) ||
        JSON.stringify([...hashes].sort()) !==
          JSON.stringify(target.manifest.map((m: any) => m.sha256).sort())
      )
        fail("archive_receipt_invalid", 409);
      // Seal the relay operation before resolving a timeout: a delayed request must never send afterwards.
      const sealed = await callRelay(config, {
        action: "receipt",
        operationId: target.operationId,
      });
      if (sealed.status !== "PREPARED") fail("archive_delete_blocked", 409);
      return db.transaction(async (tx) => {
        await actor(tx, claims);
        const latest = await tx.get("archiveMetadata/" + id),
          p = latest?.photo as any;
        if (p?.operationId !== target.operationId)
          fail("revision_conflict", 409);
        const next = {
          ...latest,
          photo: {
            ...p,
            status: "ARCHIVE_CONFIRMED",
            receipt: {
              at: new Date().toISOString(),
              byUid: claims.uid,
              photoHashes: hashes,
            },
          },
        };
        tx.put("archiveMetadata/" + id, doc(next));
        return { archive: next };
      }, 2);
    }
    if (r.status !== "APPROVED" || !r.approval)
      fail("approved_snapshot_required", 409);
    const portable = await makePortable(r),
      expectedPortableHash = await sha256(portableText(portable));
    if (loaded.finance?.snapshotHash !== portable.integrity.value)
      fail("archive_integrity", 409);
    if (action === "snapshot") return { portable, archive: loaded.metadata };
    if (
      ["prepare", "send", "confirm", "delete"].includes(action) &&
      input.revision !== r.revision
    )
      fail("revision_conflict", 409);
    if (action === "confirm")
      return db
        .transaction(async (tx) => {
          await actor(tx, claims);
          const current = await readWork(tx, id),
            meta = await tx.get("archiveMetadata/" + id);
          if (
            !current.report ||
            current.report.status !== "APPROVED" ||
            current.report.revision !== r.revision ||
            meta?.snapshotHash !== portable.integrity.value
          )
            fail("revision_conflict", 409);
          if (
            input.confirmationId !== id ||
            input.recoverable !== true ||
            !["mailbox", "download"].includes(String(input.receiptMethod)) ||
            !meta?.pdfSha256 ||
            input.pdfSha256 !== meta.pdfSha256 ||
            input.portableSha256 !== expectedPortableHash ||
            meta.status === "ARCHIVE_SENDING"
          )
            fail("archive_receipt_invalid", 409);
          // Repeated confirmation must not rewrite the original receipt or audit history.
          if (meta.status === "ARCHIVE_CONFIRMED") {
            if (!meta.receipt) fail("archive_integrity", 409);
            return { archive: meta };
          }
          const unresolved =
            meta.status === "ARCHIVE_OUTCOME_UNKNOWN" ||
            meta.deliveryUncertain === true;
          const next = {
            ...meta,
            status: "ARCHIVE_CONFIRMED",
            receipt: {
              at: new Date().toISOString(),
              byUid: claims.uid,
              method: input.receiptMethod,
              pdfSha256: input.pdfSha256,
              portableSha256: input.portableSha256,
            },
            deliveryUncertain: unresolved,
            deliveryResolved: !unresolved,
          };
          tx.put("archiveMetadata/" + id, doc(next));
          tx.put(
            "auditEvents/receipt-" + id + "-" + r.revision,
            doc({
              action: "archive_confirmed",
              actorUid: claims.uid,
              targetId: id,
              revision: r.revision,
              createdAt: new Date().toISOString(),
            }),
          );
          return { archive: next };
        }, 2)
        .then(async (result) => {
          const meta: Document = result.archive;
          if (meta.operationId) {
            try {
              const sealed = await callRelay(config, {
                action: "receipt",
                operationId: meta.operationId,
              });
              if (sealed.status === "PREPARED") {
                return db.transaction(async (tx) => {
                  await actor(tx, claims);
                  const latest = await tx.get("archiveMetadata/" + id);
                  if (latest?.status !== "ARCHIVE_CONFIRMED") return result;
                  const next = { ...latest, deliveryResolved: true };
                  tx.put("archiveMetadata/" + id, doc(next));
                  return { archive: next };
                }, 1);
              }
            } catch {
              /* Receipt is saved, but unresolved delivery continues to block deletion. */
            }
          }
          return result;
        });
    if (action === "delete")
      return db.transaction(async (tx) => {
        await actor(tx, claims);
        const current = await readWork(tx, id),
          meta = await tx.get("archiveMetadata/" + id),
          now = new Date().toISOString(),
          photos = meta?.photo as any;
        if (
          !config.deletionEnabled ||
          !config.policyVersion ||
          !Number.isInteger(config.retentionDays) ||
          config.retentionDays! < 0 ||
          config.retentionDays! > 36500
        )
          fail("retention_not_configured", 409);
        if (
          !current.report ||
          current.report.status !== "APPROVED" ||
          current.report.revision !== r.revision ||
          input.confirmationId !== id ||
          input.recoverable !== true ||
          input.policyVersion !== config.policyVersion ||
          meta?.status !== "ARCHIVE_CONFIRMED" ||
          meta.deliveryResolved !== true ||
          !meta.receipt ||
          meta.snapshotHash !== portable.integrity.value ||
          (photos &&
            [
              "ARCHIVE_PENDING",
              "ARCHIVE_SENDING",
              "ARCHIVE_OUTCOME_UNKNOWN",
            ].includes(photos.status))
        )
          fail("archive_delete_blocked", 409);
        const retention = retentionWindow(r.approval!.at, config.retentionDays);
        if (!retention) fail("archive_integrity", 409);
        if (!retention.eligible) fail("retention_period", 409);
        if (!tx.delete) fail("delete_not_supported", 503);
        tx.delete!("reports/" + id);
        tx.delete!("reportFinances/" + id);
        tx.delete!("workOrders/" + id);
        const kept = {
          id,
          revision: r.revision,
          approval: r.approval,
          ...(current.finance?.approvedByUid
            ? { approvedByUid: current.finance.approvedByUid }
            : {}),
          status: "ARCHIVE_CONFIRMED",
          snapshotHash: portable.integrity.value,
          pdfSha256: meta.pdfSha256,
          portableSha256: meta.portableSha256,
          receipt: meta.receipt,
          deliveryResolved: true,
          removedAt: now,
          removedBy: claims.uid,
          policyVersion: config.policyVersion,
        };
        tx.put("archiveMetadata/" + id, doc(kept));
        tx.put(
          "auditEvents/archive-delete-" + id + "-" + r.revision,
          doc({
            action: "archive_delete",
            actorUid: claims.uid,
            targetId: id,
            revision: r.revision,
            policyVersion: config.policyVersion,
            createdAt: now,
          }),
        );
        return { removed: true };
      }, 4);
    if (action === "status") {
      const meta = loaded.metadata;
      if (!meta?.operationId) return { archive: meta };
      let result: RelayResult;
      try {
        result = await callRelay(config, {
          action: "status",
          operationId: meta.operationId,
        });
      } catch {
        result = {
          operationId: String(meta.operationId),
          status: "OUTCOME_UNKNOWN",
        };
      }
      return {
        archive: await updateResult(
          claims,
          id,
          String(meta.operationId),
          result,
        ),
      };
    }
    if (!relayReady(config)) fail("archive_not_configured", 503);
    if (action === "prepare") {
      const result = await callRelay(config, {
        action: "prepare",
        operationId: id + "-prepare-" + r.revision,
        portable: portableText(portable),
      });
      if (
        result.status !== "PREPARED" ||
        result.snapshotHash !== portable.integrity.value ||
        result.portableSha256 !== expectedPortableHash ||
        !hashPattern.test(result.pdfSha256 || "")
      )
        fail("archive_integrity", 409);
      return db.transaction(async (tx) => {
        await actor(tx, claims);
        const meta = await tx.get("archiveMetadata/" + id);
        if (
          meta?.pdfSha256 &&
          meta.pdfSha256 !== result.pdfSha256 &&
          [
            "ARCHIVE_SENT_UNVERIFIED",
            "ARCHIVE_CONFIRMED",
            "ARCHIVE_OUTCOME_UNKNOWN",
          ].includes(String(meta.status))
        )
          fail("archive_integrity", 409);
        const next = {
          ...meta,
          id,
          revision: r.revision,
          snapshotHash: portable.integrity.value,
          expectedPortableHash,
          pdfSha256: result.pdfSha256!,
          portableSha256: expectedPortableHash,
          status: meta?.status || "ARCHIVE_PENDING",
        };
        tx.put("archiveMetadata/" + id, doc(next));
        return { archive: next };
      }, 2);
    }
    if (action !== "send") fail();
    const staged = await db.transaction(async (tx) => {
      await actor(tx, claims);
      const current = await readWork(tx, id),
        meta = await tx.get("archiveMetadata/" + id);
      if (
        !current.report ||
        current.report.revision !== r.revision ||
        current.report.status !== "APPROVED"
      )
        fail("revision_conflict", 409);
      if (
        meta &&
        [
          "ARCHIVE_SENDING",
          "ARCHIVE_SENT_UNVERIFIED",
          "ARCHIVE_CONFIRMED",
          "ARCHIVE_OUTCOME_UNKNOWN",
        ].includes(String(meta.status))
      )
        return { send: false, meta };
      const attempt = Number(meta?.attempt || 0) + 1,
        operationId = id + "-r" + r.revision + "-a" + attempt;
      const next = {
        ...meta,
        id,
        revision: r.revision,
        snapshotHash: portable.integrity.value,
        expectedPortableHash,
        status: "ARCHIVE_SENDING",
        attempt,
        operationId,
        startedAt: new Date().toISOString(),
      };
      tx.put("archiveMetadata/" + id, doc(next));
      return { send: true, meta: next };
    }, 4);
    if (!staged.send) return { archive: staged.meta };
    const operationId = String(staged.meta!.operationId);
    let result: RelayResult;
    try {
      result = await callRelay(config, {
        action: "archive",
        operationId,
        portable: portableText(portable),
      });
    } catch {
      result = { operationId, status: "OUTCOME_UNKNOWN" };
    }
    return { archive: await updateResult(claims, id, operationId, result) };
  };
}
