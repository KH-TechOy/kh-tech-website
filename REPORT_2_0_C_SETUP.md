# Report 2.0 C – käyttöönotto

Paikallinen toteutus. Mitään seuraavista tuotantotoimista ei ole ajettu automaattisesti. Ei laskutuksen aktivointia, Blaze-palvelua, Firebase Storagea, Cloud Functionsia, Drive-arkistoa tai maksullista sähköpostipalvelua. CONTACTin asetuksia ei muuteta.

## 1. Ennen julkaisua

Omistaja vahvistaa tietosuojan, arkistopostilaatikon käyttöoikeudet, säilytysajat ja palautusvastuun (`PRIVACY_APPROVAL_CHECKLIST.md`). Varmista Spark ja Workers Free. Ota hallittu vienti nykyisistä raporteista ennen siirtoa. Älä poista selainluonnoksia tai sivustotietoja. Varaa lyhyt huoltokatko: vanha verkkosivu ei tunne uutta tietojen erottelua. Sulje vanhat editorit vasta niiden luonnosten tallentamisen jälkeen; tavallinen sivun päivitys säilyttää saman välilehden sessionStorage-luonnokset.

## 2. Erillinen Google Apps Script

1. Luo yrityksen hallitsemalla Google-tilillä **uusi, erillinen** Apps Script -projekti raporttiarkistolle. Älä käytä CONTACTin projektia, URL:ää tai salaisuutta.
2. Aja paikallisesti `npm.cmd run report:relay` (myös aiempi `report:relay:bundle` toimii). Generointi tarkistaa koko PdfLibraryn ja Code.gs:n konservatiivisen ES2019-skriptisyntaksin ennen tiedoston kirjoittamista. Voit toistaa tarkistuksen komennolla `npm.cmd run check:report:relay`. Kopioi `report-relay/Code.gs` projektin Code-tiedostoon ja `.playwright-artifacts/report-relay/PdfLibrary.gs` uuteen PdfLibrary-tiedostoon. Jälkimmäinen sisältää jaetun jsPDF-generaattorin ja virallisen logon; älä muokkaa sitä käsin. Säilytä generoitu kirjasto vastaavan verkkosivujulkaisun kanssa.

   **13.11.2026 syntaksikorjaus:** jos aiempi PdfLibrary ei tallentunut rivin 13727 `Unexpected token ILLEGAL` -virheen vuoksi, korvaa KH-Tech Report Archive -projektin **PdfLibrary.gs:n koko sisältö** uudelleen generoidulla `.playwright-artifacts/report-relay/PdfLibrary.gs`-tiedostolla. `10n`-tyyppiset BigInt-literaalit on poistettu kanonisesta laskennasta tarkkuutta muuttamatta, eikä generoitu koodi tarvitse BigInt-tukea. Code.gs, manifesti, Firebase-asetukset ja Cloudflaren salaisuudet eivät muutu tässä korjauksessa. Katso [juurisyy ja tarkistukset](REPORT_2_0_C_GAS_SYNTAX_FIX_RESULT.md). Paikallinen tarkistus ei ole Googlen oman editorin etätallennus.
3. Ota projektiasetuksissa manifestin näyttäminen käyttöön. Kopioi `report-relay/appsscript.json`: V8, Europe/Helsinki, vain `script.send_mail`, poikkeuslokitus pois. Ei Gmailin luku-, Drive- tai URL Fetch -oikeuksia.
4. Lisää Script Properties -asetukset: `REPORT_RELAY_SECRET` (yksityisesti generoitu vähintään 32 merkin satunnainen salaisuus), `ARCHIVE_RECIPIENT=khtech.site@gmail.com`, `ARCHIVE_DAILY_CAP=40`. Käytä samaa salaisuutta vain tämän Report Workerin kanssa. Älä liitä sitä selaimeen, repoon, lokiin tai keskusteluun.
5. Suorita editorissa `doPost` kerran **ilman tapahtuma-argumenttia** ja hyväksy MailAppin lähetysoikeus. Tämä palauttaa unauthorized eikä lähetä viestiä. Tarkista luvan soveltuvuus yrityksen käyttöön. Koodi ei pyydä korttia.
6. Julkaise omistajan toimesta Web App: suorittaja oma palvelutili / **Execute as me**, käyttö **Anyone**. Julkinen URL tarvitsee aina HMAC-valtuutuksen lähetykseen. Jos tilin organisaatiokäytäntö estää tämän, käytä käyttöliittymän tiedostolatauksia ja manuaalista arkistointia; älä avaa muita oikeuksia kiertotieksi.
7. Tallenna version `/macros/s/…/exec`-URL. Älä käytä `/dev`-URL:ää. Päivityksissä julkaise saman käyttöönoton uusi versio, jossa sekä Code että PdfLibrary vastaavat tätä julkaisua. Älä tyhjennä Script Properties -lähetyspäiväkirjaa.

## 3. Report Worker ja Firestore

Säilytä aiemmat Firebase-palvelutilin tunnukset, Firebase Web API key, origin-rajaus ja ReportRate Durable Object. Uusia IAM-oikeuksia ei tarvita: aiempi dokumenttien hallintaoikeus kattaa myös uudet kokoelmat. Worker ei käytä Firebase Admin SDK:ta.

Lisää yksityisesti Report Workerille `ARCHIVE_RELAY_SECRET` (esimerkiksi `npx.cmd wrangler secret put ARCHIVE_RELAY_SECRET --config report-api/wrangler.jsonc`). Syötä arvo interaktiivisesti. Lisää `ARCHIVE_RELAY_URL` Workerin palvelinasetukseksi. Nämä eivät ole `VITE_*`-arvoja. Ei uusia frontend-salaisuuksia.

Poisto on oletusarvoisesti suljettu. Vasta hyväksytyn säilytyspolitiikan jälkeen omistaja voi asettaa kaikki:

| Asetus | Merkitys |
|---|---|
| `ARCHIVE_DELETE_ENABLED=true` | Sallii nimenomaisen ylläpitäjäpoiston muiden ehtojen täyttyessä |
| `ARCHIVE_RETENTION_DAYS` | Omistajan vahvistama vähimmäisaika hyväksynnästä, kokonaisluku 0–36500; esimerkkitestien 0 ei ole tuotantosuositus |
| `ARCHIVE_POLICY_VERSION` | Yrityksen hyväksytyn politiikan yksilöivä versio |

Sovellus ei ratkaise lakisääteistä säilytysaikaa. Metatietojen/auditoinnin vanheneminen ja postilaatikon poisto tarvitsevat erillisen hallitun menettelyn; maksullista TTL:ää ei käytetä.

Julkaisujärjestys huoltokatkon aikana:

1. Tarkista kohdeprojekti ja julkaise `firebase/firestore.rules` sekä `firebase/firestore.indexes.json` (CLI:n `--project OIKEA_PROJEKTI`). Säännöt estävät työntekijältä vanhan schema-2:n laskutustiedot heti. Indeksien valmistuminen varmennetaan ennen liikennettä.
2. Julkaise päivitetty Report Worker omistajan toimesta. Se ymmärtää skeemat 2/3 ja tekee tarvittaessa siirron atomisesti. Älä palauta vanhaa Workeria uusien sääntöjen rinnalle.
3. Käytä paikallista ylläpitotunnistusta (Application Default Credentials; älä tulosta avaimia). Aja ensin `node scripts/migrate-report-finances.mjs --project=OIKEA_PROJEKTI`. Se validoi sivutettuina schema-2-raportit, ei kirjoita eikä tulosta asiakastietoja. Vain tarkistetun tuloksen jälkeen aja sama komento lisäyksillä `--apply --confirm-project=OIKEA_PROJEKTI`. Jokainen julkisen ja yksityisen dokumentin jako on atominen; virhe pysäyttää ajon. Jo siirrettyjä ei muuteta, joten keskeytyksen jälkeen voi jatkaa.
4. Rakenna ja julkaise verkkosivu normaalia erikseen hyväksyttyä Pages-työnkulkua käyttäen, base `/kh-tech-website/`. PWA käyttää edelleen olemassa olevaa sisältöpohjaista välimuistiversiota. Älä tyhjennä sessionStoragea tai IndexedDB:tä.
5. Päivitä vanhat selainvälilehdet. Varmista henkilökohtaisilla testitileillä suora `/report/`-osoite/NFC, kirjautuminen ja oma palautuskopio. Julkiseen navigaatioon ei lisätä Report-linkkiä.

Skeema-2-siirto ei vaihda raporttitunnusta, revisiota, vastuuhenkilöitä tai materiaalien historiallisia hintoja. Virheellinen hinnoitteluaineisto suljetaan korjattavaksi, sitä ei korvata nollilla. Tarvittaessa siirto tapahtuu myös turvallisesti `/work load` -pyynnössä.

## 4. Oikea vastaanottotesti (omistajan suorittama)

Käytä sovittua synteettistä raporttia. Tarkista ylläpitäjän summat, allekirjoitus ja hyväksyntä. Lataa PDF ja `.khtreport`, lähetä kerran, odota tilaa **Hyväksytty lähetykseen – vastaanotto varmistamatta**. Tarkista oikea arkistopostilaatikko sekä roskaposti. Lataa molemmat liitteet itse viestistä ja valitse ne vastaanoton varmennuksessa. Ohjelma vertaa niiden SHA-256-tarkisteita palvelimen hyväksymiin tiedostoihin. Kirjoita raporttitunnus ja vahvista palautettavuus. Tarkista myös siirtotiedoston tuonti vain luku -näkymässä. Testaa erillinen pieni kuvalähetys ja sen aidot liitteet.

Mittaa samalla Workerin Free CPU, virheet ja todelliset kiintiöt. Paikalliset testit eivät varmista Cloudflaren 10 ms:n tuotantorajaa tai oikean GAS-tilin asetuksia. Jos vastaanotto tai resurssiraja ei täyty, pidä raportti pilvessä ja käytä ladattuja tiedostoja/manuaalista yritysarkistoa. Älä ilmoita sähköpostia toimitetuksi.

## 5. Häiriöstä palautuminen

- `ARCHIVE_FAILED`: palvelu ei aloittanut lähetysyritystä; korjaa asetukset/kiintiö ja käytä Uudelleen-painiketta. Uusi yritystunnus, alkuperäinen raportti ennallaan.
- `ARCHIVE_OUTCOME_UNKNOWN` / aikakatkaisu: **ei uutta lähetystä**. Tarkista tila ja postilaatikko. Lataa tarvittaessa hyväksytyt tiedostot käyttöliittymästä ja tallenna hallittuun palautettavaan arkistoon. Valmistele tarkisteet, valitse samat tiedostot ja vahvista sijainti. Varmennus sulkee myös keskeneräisen relay-operaation, jotta myöhästynyt pyyntö ei lähetä uutta viestiä. Jos sulkeminen epäonnistuu, poisto pysyy estettynä.
- Epäselvät kuvat: lataa oikeat kuvaliitteet arkistosta tai tallenna käyttöliittymän **Lataa toimitusversio** -tiedostot hallitusti ennen sivun päivitystä/sulkemista. Ne ovat tarkalleen uudelleenpakatut lähetystavut; alkuperäisen paikallisen kuvan tavut voivat poiketa. Valmistellut lähetysversiot ovat vain sivun muistissa, eivät uusi kuvapilvi tai varma selainvarmistus. Ylläpitäjä valitsee niiden alkuperäiset tiedostot **Vahvista kuvaliitteiden vastaanotto** -kohdassa. Vain samat lähetetyt tavut kelpaavat; muunnettu kopio ei kelpaa. Jos sekä oikea viesti että lähetysversiot puuttuvat, säilytä pilviraportti ja selvitä toimitus, älä nollaa tilamerkintää.
- Tarkistevirhe: älä poista raporttia. Varmista sama generaattoriversio, hyväksytty revisio ja muuttamattomat tiedostot. Päivitä GAS-kirjasto ja sivusto yhdessä; aikaisemmat arkistot säilyvät luettavana JSONina.
- Yhteys puuttuu: elävä luonnos ja viimeinen paikallinen palautuskopio säilyvät nykyisessä välilehdessä. Pilvimuutokset/rinnakkaismuokkaukset ratkaistaan aiemman konfliktinäkymän kautta. Älä poista selaintietoja.

Ei automaattista tuotantopoistoa, arkistoviestien uudelleenlähetystä tai palvelulaskutuksen aktivointia.
