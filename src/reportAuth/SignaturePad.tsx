import React from "react";
import {
  SIGNATURE_POINTS,
  signaturePath,
  signatureBounds,
  type ReportSignature,
} from "../reportSignature";
import { finnishTimestamp } from "../reportLocale";
export function SignatureView({ value }: { value: ReportSignature }) {
  const bounds=signatureBounds(value),w=bounds.width+200,h=bounds.height+200;
  return (
    <svg
      viewBox={`${bounds.minX-100} ${bounds.minY-100} ${w} ${h}`}
      style={{aspectRatio:String(w/h),maxHeight:104}}
      className="signature-view"
      role="img"
      aria-label="Asiakkaan allekirjoitus"
    >
      <g transform="scale(1 .4)">
        {value.strokes.map((stroke, i) => (
          <path
            key={i}
            d={signaturePath(stroke.points)}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </g>
    </svg>
  );
}
export default function SignaturePad({
  value,
  onChange,
  reportId,
  customer,
  date,
  readOnly = false,
}: {
  value?: ReportSignature | null;
  onChange(value: ReportSignature | null): void;
  reportId: string;
  customer: string;
  date: string;
  readOnly?: boolean;
}) {
  const [error, setError] = React.useState(""),
    pointer = React.useRef<number | null>(null),
    latest = React.useRef(value);
  latest.current = value;
  const locked = readOnly || !!value?.confirmedAt;
  const commit = (next: ReportSignature | null) => {
    latest.current = next;
    onChange(next);
  };
  const point = (e: React.PointerEvent<SVGSVGElement>) => {
    const matrix = e.currentTarget.getScreenCTM();
    if (!matrix) return [0, 0];
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(
      matrix.inverse(),
    );
    return [
      Math.round(Math.max(0, Math.min(10000, p.x))),
      Math.round(Math.max(0, Math.min(10000, (p.y / 4000) * 10000))),
    ];
  };
  return (
    <div className="signature-pad">
      <h3>Asiakkaan allekirjoitus (vapaaehtoinen)</h3>
      <p>
        Piirrä hiirellä, sormella tai kynällä. Allekirjoitus ei ole
        henkilöllisyyden varmennus.
      </p>
      <svg
        viewBox="0 0 10000 4000"
        className={"signature-surface" + (locked ? " is-locked" : "")}
        role="img"
        aria-label={
          locked
            ? "Lukittu asiakkaan allekirjoitus"
            : "Piirrä asiakkaan allekirjoitus"
        }
        onPointerDown={(e) => {
          if (locked || pointer.current !== null) return;
          e.preventDefault();
          setError("");
          pointer.current = e.pointerId;
          e.currentTarget.setPointerCapture(e.pointerId);
          const previous = latest.current;
          if ((previous?.strokes.length || 0) >= 40) {
            setError(
              "Viivoja on liikaa. Peru viimeinen viiva tai aloita uudelleen.",
            );
            pointer.current = null;
            return;
          }
          commit({
            version: 1,
            strokes: [...(previous?.strokes || []), { points: point(e) }],
            confirmedAt: "",
            context: { reportId, customer, date },
          });
        }}
        onPointerMove={(e) => {
          if (locked || pointer.current !== e.pointerId) return;
          e.preventDefault();
          const current = latest.current;
          if (!current) return;
          const p = point(e),
            strokes = current.strokes.slice(),
            last = strokes[strokes.length - 1].points;
          if (
            Math.hypot(
              p[0] - last[last.length - 2],
              p[1] - last[last.length - 1],
            ) < 20
          )
            return;
          if (
            strokes.reduce((n, s) => n + s.points.length / 2, 0) >=
            SIGNATURE_POINTS
          ) {
            setError(
              "Allekirjoituksen enimmäispituus saavutettiin. Peru viiva tai aloita uudelleen.",
            );
            return;
          }
          strokes[strokes.length - 1] = { points: [...last, ...p] };
          commit({ ...current, strokes });
        }}
        onPointerUp={(e) => {
          if (pointer.current === e.pointerId) {
            pointer.current = null;
            e.currentTarget.releasePointerCapture(e.pointerId);
          }
        }}
        onPointerCancel={() => {
          pointer.current = null;
        }}
      >
        <rect width="10000" height="4000" fill="white" />
        <path d="M500 3350 H9500" stroke="#b7c5cd" strokeWidth="12" />
        <g transform="scale(1 .4)">
          {value?.strokes.map((stroke, i) => (
            <path
              key={i}
              d={signaturePath(stroke.points)}
              fill="none"
              stroke="#1e2529"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </g>
      </svg>
      {value?.confirmedAt ? (
        <>
          <p role="status">
            Allekirjoitus tallennettu luonnokseen ·{" "}
            {finnishTimestamp(value.confirmedAt)}
          </p>
          {!readOnly && (
            <button
              type="button"
              className="button outline"
              onClick={() => {
                if (
                  confirm(
                    "Poistetaanko vahvistettu allekirjoitus? Uusi allekirjoitus on pyydettävä asiakkaalta.",
                  )
                )
                  commit(null);
              }}
            >
              Korvaa allekirjoitus
            </button>
          )}
        </>
      ) : (
        !readOnly && (
          <div className="signature-actions">
            <button
              type="button"
              className="button outline"
              disabled={!value?.strokes.length}
              onClick={() =>
                value &&
                commit(
                  value.strokes.length > 1
                    ? { ...value, strokes: value.strokes.slice(0, -1) }
                    : null,
                )
              }
            >
              Peru viimeinen viiva
            </button>
            <button
              type="button"
              className="button outline"
              disabled={!value?.strokes.length}
              onClick={() => commit(null)}
            >
              Tyhjennä allekirjoitus
            </button>
            <button
              type="button"
              className="button primary"
              disabled={
                !value?.strokes.length ||
                !customer.trim() ||
                !/^\d{4}-\d\d-\d\d$/.test(date)
              }
              onClick={() =>
                value &&
                commit({
                  ...value,
                  confirmedAt: new Date().toISOString(),
                  context: { reportId, customer, date },
                })
              }
            >
              Vahvista allekirjoitus
            </button>
          </div>
        )
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
