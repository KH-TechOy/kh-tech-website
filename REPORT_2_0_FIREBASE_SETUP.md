# Report 2.0 A — maksuton käyttöönotto

**A.1 olemassa olevaan tuotantoon:** käytä tämän perustamisohjeen sijasta [A.1-päivitysohjetta](REPORT_2_0_A_1_RESULT.md). Älä luo projektia tai ensimmäistä Adminia uudelleen. Report Worker tarvitsee lisäksi julkisen `FIREBASE_WEB_API_KEY`-muuttujan; säilytä nykyiset Dashboard-muuttujat julkaisemalla `--keep-vars`-valinnalla. Yksittäiset työntekijäkutsut hoituvat A.1:n Admin-käyttöliittymässä.

Päiväys 10.11.2026. Nämä ovat omistajan **myöhemmin manuaalisesti suorittamat** tuotantovaiheet. Tässä työssä ei luotu oikeaa Firebase-projektia, avaimia tai käyttäjiä, lähetetty oikeaa sähköpostia, julkaistu sääntöjä, Workeria tai sivustoa eikä liitetty laskutusta. Lähdekoodin valmistuminen ei ole tuotantoympäristön hyväksyntä.

## 1. Maksuton projekti

1. Kirjaudu yrityksen hallitsemaan Google-tiliin; suojaa operaattorin ja Cloudflaren hallintatilit monivaiheisella tunnistuksella.
2. Firebase Console → Add project. Valitse yksilöllinen projektitunnus. Poista Google Analytics käytöstä; älä yhdistä Google Cloud Billing -tiliä. Tarkista projektin suunnitelmaksi **Spark**. Jos työvaihe vaatii kortin, Blaze-päivityksen tai laskutuksen, keskeytä se.
3. Build → Authentication → Get started → Sign-in method → **Email/Password**, vain tavallinen sähköposti/salasana. Ei email-link-, SMS- tai monivuokraajatoimintoja; älä päivitä Identity Platformiin tätä varten. Ota sähköpostiosoitteiden luetteloinnin suojaus käyttöön saatavilla olevista suojausasetuksista ja varmista yleisluonteinen virheviesti oikealla projektilla.
4. Authentication → Settings → Authorized domains: `khtechoy.github.io`, myöhemmin yrityksen tarkka mukautettu verkkotunnus. Firebase-palautuslinkin oma projektikohtainen `firebaseapp.com`-toiminto säilytetään. Älä lisää tuotantoon localhostia ilman erillistä tarvetta.
5. Authentication → Templates → Password reset: suomenkielinen yrityksen tunnistettava viesti, oikea lähettäjän nimi ja vastausosoite. Käytössä on Firebase-hostattu palautustoiminto, ei keskeneräinen oma reset-reitti.
6. Firestore Database → Create database → **Standard**, `(default)`, production mode. Valitse yrityksen hyväksymä EU-alue (esim. `europe-west3`) ennen luontia; sijaintia ei voi vaihtaa tällä koodilla. Vain yksi maksuton tietokanta. Ei Storagea, Functionsia, Extensionseja, TTL:ää, PITR:ää tai maksullisia varmuuskopioita.
7. Project settings → General → Add app → Web. Ei Firebase Hostingia eikä Analyticsia. Tallenna **julkiset** web-asetukset paikalliseen `.env.local`-tiedostoon: `.env.example` kentät `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_AUTH_DOMAIN`. Älä sijoita palvelutilin avainta mihinkään `VITE_*`-kenttään.
8. Tarkista Authentication-palvelun salasanapolitiikka; suositus vähintään 12 merkkiä ja vahvat yksilölliset salasanat. Roolit myöntää Worker, ei rekisteröityminen tai tokenin asiakkaan asettama väite. Julkinen signup-rajapinta voi edelleen luoda Auth-tilejä; ilman palvelimen luomaa profiilia niillä ei ole pääsyä yritystietoihin. Julkisen Auth-rajapinnan kiintiöhyökkäysten täydellistä estoa ei väitetä.

## 2. Paikallinen varmennus ja säännöt

Node 22+ ja Java 21+. `npm ci`, `npm test`, `npm run check:report`, `npm run test:report`, `npm run build`, `npm run report:bundle`. Selaintesteihin asenna Playwright Chromium (`npx playwright install chromium`) tai aseta `GAME_BROWSER_EXECUTABLE` olemassa olevaan Chromeen. Testiprojekti on aina `demo-kh-tech-report`, Auth `127.0.0.1:9099`, Firestore `127.0.0.1:8085`. Testipalvelinta ei koskaan julkaista. Emulaattorit eivät lähetä postia.

Vasta tuotannon hyväksynnän jälkeen operaattori kirjautuu CLI:hin `npx firebase login`, varmistaa Spark-tilan uudelleen ja julkaisee vain Firestoren säännöt ja indeksit:

```text
npx firebase deploy --only firestore:rules,firestore:indexes --project OMA_PROJEKTITUNNUS
```

Älä käytä test mode -sääntöjä. `firebase.json` määrittää säännöt ja indeksit; repossa ei ole tuotantoprojektin oletusaliasta. Tarkista konsolista julkaistu sääntöversio ja indeksien valmistuminen. Tyhjät kokoelmat eivät tarvitse etukäteisluontia. Tietomalli on [turvallisuuskuvauksessa](REPORT_2_0_SECURITY.md).

## 3. Ensimmäinen ylläpitäjä — vain luotetun operaattorin työkalulla

1. Firebase Console → Authentication → Users → Add user. Luo omistajan **henkilökohtainen** sähköposti/salasanatili vahvalla yksilöllisellä salasanalla. Varmenna henkilöllisyys ja sähköposti erillisellä yrityksen menettelyllä. Älä käytä yhteistä tai pysyvää bootstrap-salasanaa. Tili ei vielä pääse raportteihin.
2. Kirjaa UID konsolista. Operaattorilla tulee olla kyseisessä projektissa `roles/firebaseauth.admin` ja `roles/datastore.user` tai jo olemassa oleva hallintaoikeus, joka sisältää tarvittavat toiminnot; älä myönnä ylimääräistä Owner-roolia. Suojaa tili MFA:lla. Asenna Google Cloud CLI. `gcloud auth application-default login` luo paikallisen ADC-tunnisteen operaattorille. Älä tallenna ADC:tä repon sisään. Tarvittaessa aseta quota project kyseiseen projektiin `gcloud auth application-default set-quota-project OMA_PROJEKTITUNNUS`; tähän tarvitaan myös `serviceusage.services.use` (esim. `roles/serviceusage.serviceUsageConsumer`). Quota project ei tarkoita laskutustiliä; älä kytke laskutusta.
3. Aja luotetulla koneella:

```text
node scripts/provision-report-admin.mjs OMA_PROJEKTITUNNUS OLEMASSA_OLEVAN_TILIN_UID
```

4. Skripti käyttää Node Firebase Admin SDK:ta ADC:n avulla, tarkistaa aktiivisen email/password-tilin ja luo **yhdessä transaktiossa** ensimmäisen admin-profiilin, laskurin `accessControl/admins.activeAdminCount=1` ja auditoinnin. Se kieltäytyy, jos profiileja tai laskuri on jo olemassa. Ei julkista bootstrap-API:a eikä salasanaa lähdekoodissa.
5. Varmenna profiili ja laskuri konsolista, kirjaudu sovellukseen, luo toinen henkilökohtainen ylläpitäjä käyttöliittymän kautta. Poista tarpeeton operaattorin laaja IAM-oikeus ja peru paikallinen ADC `gcloud auth application-default revoke`. Älä käytä skriptiä tavalliseen roolien ylläpitoon tai nollaa laskuria sen uudelleenajamista varten.

## 4. Cloudflare Workers Free

1. Yrityksen Cloudflare-tili → Workers & Pages → varmista **Workers Free**, ei maksullista tilausta tai korttia. Tämä on erillinen Worker CONTACT-palvelusta, jonka salaisuuksia ei muuteta.
2. Google Cloud IAM → luo tähän tarkoitukseen rajattu palvelutili samaan Firebase-projektiin. Roolit **Firebase Authentication Admin** (`roles/firebaseauth.admin`) ja **Cloud Datastore User** (`roles/datastore.user`). Ei Owner-/Editor-roolia, avainta selaimeen, repo-secretiin tai Pages-buildiin. Varmista Firestore- ja Identity Toolkit -API käytössä; API:n aktivointi ei tarkoita laskutuksen aktivointia. Jos organisaatio estää palvelutiliavaimet, älä kierrä käytäntöä; käyttöönotto pysähtyy, kunnes hyväksytty avaimeton vaihtoehto on suunniteltu.
3. Luo avain vain suojatulla operaattorin koneella ja säilytä JSON repon ulkopuolella, tiedosto-oikeuksiltaan rajattuna. Tämä työ ei tarvitse, pyydä eikä tulosta avainta. Avain viedään vain Worker-secretiin vaiheen 5 jälkeen; ei selaimeen tai keskusteluun. Dokumentoi avaimen rotaatio ja vastuuhenkilö.
4. `report-api/wrangler.jsonc`: lisää julkiseen `vars`-kohtaan `FIREBASE_PROJECT_ID`, pidä `ALLOWED_ORIGINS` tarkkoina HTTPS-origineina, pilkuilla erotettuina. GitHub Pagesin polku ei kuulu originiin: `https://khtechoy.github.io`. Tuleva domain lisätään erikseen. Älä lisää `*`:ä. Säilytä SQLite Durable Object -migraatio; vanha KV-pohjainen DO ei kuulu tähän ilmaiseen toteutukseen.
5. `npm run report:bundle` tekee vain dry-runin. Vasta omistajan erillisen julkaisupäätöksen jälkeen `npx wrangler deploy --config report-api/wrangler.jsonc`. Ensimmäinen Worker pysyy suljettuna ilman salaisuutta. Lisää nyt suojattu JSON **ainoastaan** Worker-secretiin `SERVICE_ACCOUNT_JSON` Cloudflaren salaisuuskentässä tai `npx wrangler secret put SERVICE_ACCOUNT_JSON --config report-api/wrangler.jsonc` -komennon turvallisen syötteen kautta. Älä käytä komentoa, joka tulostaa avaimen tai liittää sen komentorivin argumenttiin. Poista tarpeeton paikallinen kopio yrityksen hyväksymällä tavalla. Kirjaa HTTPS Worker-origin, esim. yrityksen oma `workers.dev`-osoite. `observability.enabled=false`; älä kytke payload-/token-lokeja tai maksullisia lisäpalveluita.
6. Palvelutili käyttää OAuth-allekirjoitusta ja Googlen REST API:a WebCryptolla. Firebase Admin SDK:ta ei paketoida Worker-runtimeen. Palvelutili ohittaa Firestore Rulesin, joten Worker tarkistaa allekirjoituksen, projektin, oikean Auth-tilan ja tuoreen profiilin jokaisessa pyynnössä; kirjoitustoiminnot lukevat ylläpitäjäroolin uudelleen transaktiossa.

## 5. Frontend ja NFC

1. Aseta `.env.local`:iin julkisten Firebase-kenttien lisäksi `VITE_REPORT_API_URL` = Worker-origin ilman polkua/loppukauttaviivaa. Kehitysemulaattoriasetusta `VITE_REPORT_EMULATORS=1` ei koskaan käytetä tuotannossa; tuotantobuild ei sisällä sitä mahdollistavaa DEV-haaraa.
2. GitHub repository → Settings → Variables → Actions: julkiset `FIREBASE_PROJECT_ID`, `FIREBASE_API_KEY`, `FIREBASE_APP_ID`, `FIREBASE_AUTH_DOMAIN`, `REPORT_API_URL`. Nykyiset CONTACT-muuttujat säilyvät. Workflow vain välittää nämä julkiset arvot rakennukseen; ei uusia automaattisia backend-julkaisuja. Jos ne puuttuvat, raportin käyttö on suljettu, eikä vanhaan avoimeen editoriin palata.
3. Paikallinen `VITE_BASE_PATH=/kh-tech-website/ npm run build` (PowerShellissa aseta ympäristömuuttuja erikseen) sekä myöhemmin `/` mukautetulle domainille. URL:t, logo, manifesti ja editori käyttävät nykyistä base-käsittelyä.
4. NFC-korttiin vain suora HTTPS-osoite `/kh-tech-website/report/` tai tulevan domainin `/report/`. Ei UID:tä, salasanaa, ID-/refresh-tokenia tai asiakastietoa URL:iin. Kortti avaa kirjautumisen; se ei itsessään todista henkilöllisyyttä. Julkisessa navigaatiossa ei ole report-linkkiä.
5. Live-hyväksyntä kahdella erillisellä työntekijällä ja kahdella ylläpitäjällä: virheellinen kirjautuminen, palautusviestin oikea vastaanotto ja linkin kertakäyttö, uloskirjautuminen, uudelleenlataus, mobiili/NFC/PWA, tuoreen tokenin sekä jo myönnetyn tokenin esto, oikeuksien poisto, rinnakkainen viimeisen ylläpitäjän suojaus, Firestore Rules, kaikki julkiset sivut/CONTACT/peli/PDF. Varmista Workers Free **10 ms CPU** -raja oikeasta runtime-metriikasta myös kylmäkäynnistyksellä. Emulaattori tai dry-run ei todista tuotannon CPU-rajaa, IAM-oikeuksia, viestin vastaanottoa tai CORS/domain-asetuksia.

## 6. Kustannusrajat ja käyttökatkojen hyväksyntä

Virallisista lähteistä tarkistettu 10.11.2026: [Spark](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans), [Firestore-kiintiöt](https://firebase.google.com/docs/firestore/quotas), [Auth-kiintiöt](https://firebase.google.com/docs/auth/limits), [Workers Free](https://developers.cloudflare.com/workers/platform/pricing/), [SQLite DO Free](https://developers.cloudflare.com/durable-objects/platform/pricing/), [Cloudflare: ei korttia](https://www.cloudflare.com/products/workers/).

| Palvelu | Maksuton raja / vaikutus |
| --- | --- |
| Firestore Spark | Yksi maksuton tietokanta, 1 GiB, 50 000 dokumenttilukua/päivä, 20 000 kirjoitusta ja 20 000 poistoa/päivä, 10 GiB ulospäin/kk. Päivärajan palautus Tyynenmeren keskiyöllä. Sääntöjen profiililuvut ja listojen dokumentit kuluttavat kiintiötä. |
| Auth Spark | Salasanan palautussähköposteja 150/päivä; tilien luontiraja 100/IP/tunti. Muut anti-abuse-rajoitukset voivat olla tiukempia. Ei maksullista SMS:ää tai email-link-kirjautumista. |
| Workers Free | 100 000 pyyntöä/päivä ja 10 ms CPU/HTTP-pyyntö. Ulkoisten API:en odotus ei ole CPU-aikaa. Kiintiöraja voi sulkea palvelun. |
| SQLite Durable Objects Free | 100 000 pyyntöä/päivä, 13 000 GB-s/päivä, 5 miljoonaa rivilukua/päivä, 100 000 rivikirjoitusta/päivä ja 5 GB tallennusta. Myös alarm/poistot kuluttavat kiintiötä. Vain SQLite-backend; ylitys hylkää operaation, ei osta lisäkiintiötä. Yksi pieni 10 minuutin laskuri per hallintaa käyttävä UID; alarm-siivojan häiriö voi viivästyttää poistoa. |

Ei laskutustiliä, Blaze- tai Workers Paid -päivitystä; ei ajastettuja Cloud Functions -kuluja, Storagea tai maksullista varmuuskopiointia. Cloudflaren tilikohtaiset Free-kiintiöt ovat yhteisiä myös samalla tilillä toimivalle CONTACT-palvelulle; ne eivät moninkertaistu luomalla uuden Workerin. Maksuttomuus tarkoittaa kiintiöiden sisällä toimimista ja mahdollista käyttökatkoa niiden täyttyessä, **ei rajatonta saatavuutta**. Auditointi kasvaa ilman TTL:ää: sovittava dokumentoitu säilytys-/manuaalinen poistomenettely ja kiintiöiden seuranta ennen käyttöä. Palveluntarjoaja voi muuttaa ehtoja; tarkista ne uudelleen julkaisupäivänä.
