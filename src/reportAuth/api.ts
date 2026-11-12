import type { User } from "firebase/auth";
import { reportApi } from "./configuration";
export type EmployeeProfile = {
  uid: string;
  email: string;
  displayName: string;
  role: "admin" | "employee";
  active: boolean;
  validAfter: number;
  passwordSetupRequired?: boolean;
  setupEmailStatus?: string;
  setupEmailError?: string;
};
export class ReportApiError extends Error {
  constructor(public code: string) {
    super(code);
  }
}
export function authorizationLost(error: unknown) {
  const code =
    error instanceof ReportApiError
      ? error.code
      : (error as { code?: string })?.code;
  return (
    !!code &&
    [
      "access_disabled",
      "invalid_session",
      "auth/user-disabled",
      "auth/user-token-expired",
      "auth/invalid-user-token",
      "auth/id-token-revoked",
      "auth/id-token-expired",
    ].includes(code)
  );
}
export async function reportRequest<T>(
  user: User,
  path: string,
  data?: object,
): Promise<T> {
  const token = await user.getIdToken();
  let response: Response;
  try {
    response = await fetch(reportApi + path, {
      method: data ? "POST" : "GET",
      credentials: "omit",
      cache: "no-store",
      referrerPolicy: "no-referrer",
      headers: {
        Authorization: "Bearer " + token,
        ...(data ? { "Content-Type": "application/json" } : {}),
      },
      ...(data ? { body: JSON.stringify(data) } : {}),
      signal: AbortSignal.timeout(25_000),
    });
  } catch {
    throw new ReportApiError("network");
  }
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new ReportApiError(result.error || "unavailable");
  return result as T;
}
export function reportError(error: unknown): string {
  const code =
    error instanceof ReportApiError
      ? error.code
      : (error as { code?: string })?.code || "";
  if (
    [
      "auth/invalid-credential",
      "auth/wrong-password",
      "auth/user-not-found",
      "auth/invalid-email",
    ].includes(code)
  )
    return "Sähköpostiosoite tai salasana ei kelpaa.";
  if (["auth/user-disabled", "access_disabled"].includes(code))
    return "Käyttöoikeutesi on estetty tai sitä ei ole vielä myönnetty. Ota yhteyttä ylläpitäjään. Mahdollista paikallista luonnosta ei poistettu.";
  if (["auth/too-many-requests", "rate_limited"].includes(code))
    return "Liikaa yrityksiä. Odota hetki ja yritä uudelleen.";
  if (
    [
      "invalid_session",
      "auth/user-token-expired",
      "auth/invalid-user-token",
    ].includes(code)
  )
    return "Istunto on päättynyt. Kirjaudu uudelleen.";
  if (code === "last_admin")
    return "Viimeisen aktiivisen ylläpitäjän oikeuksia ei voi poistaa.";
  if (code === "admin_required")
    return "Toiminto on sallittu vain ylläpitäjälle.";
  if (code === "email_exists")
    return "Sähköpostiosoitteella on jo käyttäjätili. Tarkista käyttäjäluettelo.";
  if (code === "outcome_unknown")
    return "Toiminnon tulos on epäselvä. Tarkista tilanne ennen uutta pyyntöä.";
  if (code === "invalid_request") return "Tarkista antamasi tiedot.";
  const messages: Record<string, string> = {
    archive_not_configured:'Arkistopalvelun asetukset puuttuvat. Lataa molemmat tiedostot ja säilytä raportti pilvessä.',
    approved_snapshot_required:'Toiminto vaatii palvelimella hyväksytyn raporttiversion.',
    archive_format:'Arkistotiedoston muotoa tai versiota ei tueta.',
    archive_integrity:'Tiedostojen tarkisteet tai hyväksytty versio eivät vastaa toisiaan.',
    archive_too_large:'Arkistotiedosto on liian suuri.',
    archive_receipt_invalid:'Valitse hyväksytyn version vastaavat PDF ja .khtreport ja vahvista raporttitunnus sekä palautettavuus.',
    archive_delete_blocked:'Poisto estettiin: varmista vastaanotto ja ratkaise kaikki epäselvät toimitukset ensin.',
    retention_not_configured:'Omistajan säilytyspolitiikkaa ei ole asetettu. Pilvitietojen poisto on estetty.',
    retention_period:'Säilytyspolitiikan vähimmäisaika ei ole vielä kulunut.',
    report_archived:'Raportti on poistettu aktiivisesta pilvitietokannasta. Paikallista kopiota ei palauteta pilveen samalla tunnuksella. Tuo arkistotiedosto tarvittaessa uutena kopiona.',
    finance_migration_required:'Raportin tietomalli vaatii ylläpitäjän tarkistuksen. Tietoja ei poistettu.',
    invalid_signature:'Allekirjoituksen muoto tai koko ei kelpaa. Syöte säilyi paikallisesti.',
    approval_confirmation_required: "Vahvista raportin lopullinen hyväksyntä erikseen.",
    signature_confirmation_required:'Vahvista allekirjoitus nykyiselle asiakkaalle ja päivämäärälle tai poista se nimenomaisesti.',
    photo_limits:'Kuvien koko, muoto tai mitat ylittävät toimitusrajat. Lataa kuvat ja toimita ne tarvittaessa käsin.',
    photo_outcome_requires_check:'Aiemman kuvalähetyksen tila on tarkistettava ennen uutta toimitusta. Älä uusi epäselvää lähetystä.',
    photo_report_not_ready:'Kuvat voidaan lähettää erikseen, kun raportti on tarkastettavana tai hyväksytty.',
    quota:'Arkistopalvelun lähetysraja tuli vastaan. Viestiä ei aloitettu. Tiedostot ovat edelleen ladattavissa.',
    recipient_configuration:'Arkistopalvelun vastaanottaja-asetus puuttuu tai on virheellinen. Viestiä ei lähetetty.',
    journal_full:'Arkistopalvelun toimitusloki on täynnä. Lähetystä ei aloitettu; ylläpitäjän on tarkistettava palvelu.',
    mail_outcome_unknown:'Sähköpostipalvelun tulos on epäselvä. Tarkista tila tai varmista arkistotiedostot itsenäisesti; älä lähetä uudelleen.',
    busy:'Arkistopalvelu käsittelee toista pyyntöä. Tarkista tila myöhemmin.',
    record_not_found:'Palvelu ei voinut varmistaa aiemman toimituksen tulosta. Älä lähetä epäselvää viestiä uudelleen.',
    revision_conflict: 'Raportti muuttui toisessa istunnossa. Päivitä näkymä tai ratkaise versioristiriita; paikallisia tietoja ei poistettu.',
    request_conflict: 'Saman pyynnön sisältö muuttui. Tarkista palvelimelle tallentunut versio ennen uutta toimintoa.',
    report_locked: 'Raportin nykyinen tila estää muokkaamisen.',
    report_forbidden: 'Sinulla ei ole enää käyttöoikeutta tähän raporttiin. Paikallista palautuskopiota ei poistettu.',
    invalid_transition: 'Tätä tilamuutosta ei voi tehdä nykyisillä oikeuksilla tai raportin nykyisestä tilasta.',
    report_incomplete: 'Täydennä pakolliset raporttitiedot ennen tarkastukseen lähettämistä.',
    billing_protected: 'Vain ylläpitäjä voi muuttaa laskutuksen hintoja ja asetuksia.',
    material_changed: 'Valittu materiaali muuttui tai poistettiin käytöstä. Valitse materiaali uudelleen luettelosta.',
    invalid_assignee: 'Valitse vähintään yksi aktiivinen vastuuhenkilö.',
    legacy_locked: 'Vanhan raportin tila estää sen automaattisen siirron. Ota yhteyttä ylläpitäjään.',
    too_many_catalog_items: 'Lisää enintään 20 uutta erilaista luettelomateriaalia kerralla. Tallenna ennen seuraavaa erää.',
    invalid_name:
      "Anna nimi (1–120 merkkiä). Nimi ei saa sisältää ohjausmerkkejä.",
    name_auth_pending:
      "Nimi tallennettiin profiiliin, mutta Auth-nimen päivitys epäonnistui. Yritä nimipäivitystä uudelleen.",
    email_not_configured:
      "Sähköpostipalvelun käyttöönottoasetus puuttuu. Tili säilyi; pyydä palvelun ylläpitoa korjaamaan asetus ennen uutta lähetysyritystä.",
    email_api_key_invalid:
      "Firebase Web API -avain ei kelpaa. Tili säilyi; palvelun asetus on korjattava.",
    email_permission_denied:
      "Firebase hylkäsi sähköpostikutsun käyttöoikeuden tai API-avaimen rajoituksen vuoksi. Tarkista palvelutilin sendEmail-oikeus ja avaimen palvelinasetukset.",
    email_provider_disabled:
      "Sähköposti/salasana-kirjautuminen ei ole käytössä Firebase-projektissa.",
    email_quota:
      "Firebase-palautusviestien lähetysraja tai väärinkäytön rajoitus tuli vastaan. Tili säilyi; odota ennen uutta yritystä.",
    email_domain:
      "Firebase hylkäsi palautuslinkin verkkotunnuksen. Tarkista hyväksytyt domainit ja sähköpostipohjan toiminto-URL.",
    email_recaptcha_required:
      "Firebase edellyttää lisäturvatarkistusta. Palvelinlähetystä ei hyväksytty; tarkista projektin reCAPTCHA-asetukset.",
    email_account_missing:
      "Työntekijän Auth-tiliä ei löytynyt tai sen tiedot eivät vastaa profiilia. Viestiä ei lähetetty.",
    email_outcome_unknown:
      "Sähköpostipalvelun vastausta ei voitu varmistaa. Tili säilyi. Uusi lähetys voi tuottaa toisen viestin.",
    email_rejected:
      "Firebase hylkäsi sähköpostipyynnön. Tili säilyi. Tarkista projektin sähköposti- ja lähetysasetukset.",
  };
  if (messages[code]) return messages[code];
  return "Palveluun ei saada yhteyttä. Tarkista verkkoyhteys ja yritä uudelleen.";
}
