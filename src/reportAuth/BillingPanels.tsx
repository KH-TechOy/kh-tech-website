import {
  billingTotals,
  emptyBilling,
  emptyOperations,
  money,
  type Billing,
} from "../reportWorkModel";
import type { ReportForm, ReportState } from "../reportModel";
import type { DraftSession } from "./draftSession";
import { BufferedPrice } from "./ReportInputs";
export function BillingSummary({
  form,
  billing,
}: {
  form: ReportForm;
  billing: Billing;
}) {
  const totals = billingTotals(form, billing);
  return (
    <dl className="billing-totals">
      {(
        [
          ["Materiaalit", totals.materialsTotal],
          ["Työ", totals.work],
          ["Matka", totals.travel],
          ["Muut kulut", totals.other],
          ["Yhteensä alv 0 %", totals.net],
          [
            "ALV " +
              String(billing.vatBasisPoints / 100).replace(".", ",") +
              " %",
            totals.vat,
          ],
          ["Yhteensä sis. ALV", totals.gross],
        ] as const
      ).map(([label, value]) => (
        <div
          key={label}
          className={
            label === "Yhteensä sis. ALV" ? "billing-grand-total" : undefined
          }
        >
          <dt>{label}</dt>
          <dd>{money(value)}</dd>
        </div>
      ))}
    </dl>
  );
}
export default function BillingPanels({
  state,
  session,
  admin,
  uid,
}: {
  state: ReportState;
  session: DraftSession;
  admin: boolean;
  uid: string;
}) {
  const operations =
    state.operations ||
    (state.billing
      ? {
          travelKm: state.billing.travelKm,
          otherCents: state.billing.otherCents,
          otherDescription: state.billing.otherDescription,
        }
      : emptyOperations());
  const billing = { ...emptyBilling(), ...state.billing, ...operations };
  return (
    <>
      <section className="report-section operational-expenses">
        <h2>Matka ja muut kulut</h2>
        <div className="work-filters">
          {(["travelKm", "otherCents"] as const).map((key, i) => (
            <label key={key}>
              {["Matka (km)", "Muut kulut (€)"][i]}
              <BufferedPrice
                label={["Matka (km)", "Muut kulut (€)"][i]}
                uid={uid}
                identity={state.id + ":operations:" + key}
                value={operations[key]}
                scale={key === "travelKm" ? 1 : 100}
                maximum={key === "travelKm" ? 100000 : 100000000}
                onCommit={(value) =>
                  session.update((s) => ({
                    ...s,
                    operations: {
                      ...(s.operations || operations),
                      [key]: value,
                    },
                  }))
                }
              />
            </label>
          ))}
          <label>
            Muiden kulujen selite
            <input
              value={operations.otherDescription}
              maxLength={500}
              onChange={(e) =>
                session.update((s) => ({
                  ...s,
                  operations: {
                    ...(s.operations || operations),
                    otherDescription: e.target.value,
                  },
                }))
              }
            />
          </label>
        </div>
      </section>
      {admin && (
        <section className="report-section billing-summary">
          <h2>Laskutuksen valmistelu</h2>
          <p>Ei lasku. Ylläpitäjän laskutusasetukset ja kokonaissummat.</p>
          <div className="work-filters">
            {(
              ["hourRateCents", "travelRateCents", "vatBasisPoints"] as const
            ).map((key, i) => (
              <label key={key}>
                {["Tuntihinta (€)", "Kilometriveloitus (€)", "ALV (%)"][i]}
                <BufferedPrice
                  label={
                    ["Tuntihinta (€)", "Kilometriveloitus (€)", "ALV (%)"][i]
                  }
                  uid={uid}
                  identity={state.id + ":billing:" + key}
                  value={billing[key]}
                  maximum={key === "vatBasisPoints" ? 10000 : 100000000}
                  onCommit={(value) =>
                    session.update((s) => ({
                      ...s,
                      billing: { ...(s.billing || billing), [key]: value },
                    }))
                  }
                />
              </label>
            ))}
          </div>
          <BillingSummary form={state.form} billing={billing} />
        </section>
      )}
    </>
  );
}
