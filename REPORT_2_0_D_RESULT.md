# REPORT 2.0 D — toteutuksen tulokset

Paikallinen main-toteutus 14.11.2026. Ei pushia, deployta, oikeita sähköposteja, tuotantodatan muutoksia, Firebase-asetusten muutoksia tai Cloudflare-salaisuuksien käsittelyä.

## Toiminnallisuus

1. Arkistorelayn yhteys-, aikakatkaisu-, käyttöoikeus-, HMAC-, asetus-, kiintiö- ja odottamattomat vastausvirheet saavat rajatut diagnostiikkakoodit. Tuotannon alkuperäistä yksittäistä virhettä ei ole varmistettu ilman sen palvelinvastausta. Koodista todetut yleisvirhe ja GAS-riippuvainen vahvistuksen umpikuja on korjattu.
2. Käsin talletettu hyväksytty arkisto voidaan vahvistaa auditoidulla owner recovery -polulla ilman toimivaa sähköpostipalvelua. Se ei väitä sähköpostin onnistuneen eikä ohita poistosuojia. Aikaisempi kuittaus, hyväksyntä, idempotenssi ja epäselvien toimitusten säilytys jatkuvat.
3. Arkiston UI on jaettu lyhyisiin päätoimintoihin ja avattaviin lisätietoihin. Yhteinen materiaalihaun fokus, editorin alapuolinen kuvasähköposti, kompaktin allekirjoituksen layoutversio sekä tuonnin täydellinen tyhjennys on toteutettu.
4. Adminin hallinta tarjoaa tilarajauksen, haun, arkistot, poiston tarkistuksen, perutun työn uuden kopion ja tarpeettoman hyväksymättömän työn erillisen vahvistetun poiston. Viittaukset jäävät hautakiviin ja auditointiin. Hyväksytyt alkuperäiset pysyvät muuttumattomina.
5. Omistajan säilytysasetukset ovat versionoituja ja päivättyjä. Ei automaattista poistoa tai kahden vuoden oletusta. Palvelimen poiston turvakytkin ja erillinen oikeudellisten/toiminnallisten säilytysvelvoitteiden tarkistus säilyvät pakollisina.
6. Adminin Yhteenvedot käyttää palvelimella rajattuja 10 dokumentin sivuja ja lukittuja hyväksyttyjä finansseja. Työtunnit, km, materiaalit, laskutuksen osat, ALV-ryhmät, työntekijöiden ilmoitettu tasajako, ostotiedon puutteet ja alustavat arviot ovat näkyvissä. CSV on suomalaisen Excelin muotoinen ja kaavainjektiolta suojattu; PDF-esikatselu ja -vienti käyttävät samoja rivejä.
7. CONTACTiin ei lisätty julkista kirjoituspolkua tai riskialtista toimitusmuutosta. Turvallinen Adminin käsintuonti säilyttää alkuperäisen CONTACT-viitteen, estää tuplat ja luo päätöksestä yhden työn ilman työntekijän automaattista valintaa.

## Yhteensopivuus

Vanhan C-golden-PDF:n SHA-256 säilyy `d4649035d8c9abd66bd22ca29850989c66e7eba4c94b13caf491aa5cefb311ce`. Uuden layout-2-vertailu-PDF:n SHA-256 on `7376661c2cda4064dda7faca299f63ac0d0483311997d8366486228159c3da74`. Molemmat verrataan samaan rajatussa GAS-ajossa suoritettuun generaattoriin. Aikaisempia hyväksyntöjä tai tiedostoja ei muunneta uuteen ulkoasuun.

Firebase Auth, skeema 3, raporttien autosave/allekirjoitukset, CONTACT 3.1, julkinen sivusto, peli, PWA ja GitHub Pages -työnkulku säilyvät. Uudet dokumenttipolut ovat nykyisten sulkevien sääntöjen takana. Ei hinnastosta jälkikäteen keksittyjä historiallisia ostohintoja.

## Varmennus

| Tarkistus | Tulos |
| --- | --- |
| TypeScript: sovellus ja Report Worker | Läpäisi (`tsc -b`, `check:report`). |
| Tuotantobuild `/kh-tech-website/` | Läpäisi. Offline-kuori sisältää 27 hajautetuin nimin julkaistavaa assetia. Aiempi suurten chunkien varoitus säilyy. |
| Yksikkö-/malli-/relay-regressiot | **166/166**, 26 tiedostoa. Myös CONTACTin ja pelin olemassa olevat yksikkötestit. |
| Auth/Firestore/Worker-emulaattorit | **52/52**, 8 tiedostoa. Mukana UTF-8-runkoraja, ostohinnan historiallinen otos, roolit, tarjousviitteen idempotenssi, palautus, säilytys ja ensimmäisten kuittausten suoja. |
| Olemassa olevat Report-selaintestit | **84/84**, desktop, tabletti ja puhelin. A/A.1/B/B.1/C-toiminnot, luonnokset, PDF, allekirjoitukset, oikeudet ja arkisto. |
| Uudet D-selaintestit | **12/12**, 1440×900, 768×1024, 390×844 ja 844×390. Yhteenvedon näyttö ja CSV sisältävät saman 251,00 € testisumman. Myös käyttäjän vaihto saman sivulatauksen sisällä nollaa Adminin raporttivalinnan. |
| Arkiston lopputarkistus | **6/6** C:n selainkoetta uusittiin myös viimeisen metatietosuojan jälkeen: allekirjoitus, PDF, arkistointi, nimenomainen poisto ja tuonti. |
| CONTACTin selainregressiot | **30/30**, vain eristetyt vastineet; ei oikeaa postia. |
| Tuotantosivusto/PWA | **16 läpäisi, 2 tarkoituksella ohitettua** mobiilin offline-skenaariota. Tuotannon työpöydän offline-PWA tarkistettiin myös erikseen viimeistelyn jälkeen. |
| GAS ja Worker-bundle | Koko PdfLibrary.gs ja Code.gs läpäisivät ES2019-portin. Selaimen ja GAS-VM:n PDF-tavut täsmäävät sekä C- että D-goldeneihin. Worker dry-run läpäisi, ei deployta. |

Laajassa 90 Report-selainkokeen ajossa kaikki 84 aiempaa testiä läpäisivät. Kolme uutta D-testiä pysähtyi fokuskuvakaappauksen rajaukseen: jo fokusoitu kenttä jäi sivun vierityksen ulkopuolelle. Testi vierittää kentän nyt näkyviin ennen kuvausta; korjattu D-matriisi läpäisi tämän jälkeen kaikki kahdeksan tapausta. Lopuksi mukaan lisättiin käyttäjän vaihdon neljä tapausta: viimeinen 12 tapauksen ajo läpäisi kokonaan. Tuotannon toimintoja ei ohitettu testin korjaamiseksi.

Kaappauksista korjattiin kuvatoimitusosion 8 px leveysero, liian matalat valintalistat, suomalaisten päivämäärien/desimaalien muoto, tarjouspyynnön `NEW`-raakateksti, säilytysvahvistuksen valintaruudun tasaus sekä allekirjoituksen tyhjä piirtoalue. Lopullinen allekirjoituksen PDF rajattiin ja tarkastettiin PyMuPDF:llä: ympäröiviä isoja suorakulmioita ei ole. Materiaalihaun kuvassa fokuskehys ympäröi koko hakua ja painiketta. Sivuilla ei havaittu vaakaylivuotoa. Lopulliset kaappaukset ja PDF:t: `.playwright-artifacts/report20d/`.

Ajolokit ovat paikallisesti `.playwright-artifacts/report-d-*.log`. Ne eivät sisällä tuotantoavaimia tai oikeita asiakastietoja. Testien muuttamat aiempien erien tallennetut kaappaukset/mittausartefaktit palautetaan ennalleen; ne eivät kuulu D:n tuotantodiffiin.

## Muutetut tiedostot

- Palvelin: `report-api/archive.ts`, `archiveRelay.ts`, `work.ts`, `worker.ts`; uudet `management.ts` ja `retentionPolicy.ts`.
- Näkymät: `src/reportAuth/AdminManagement.tsx` (uusi), `ArchiveControls.tsx`, `PhotoDelivery.tsx`, `ReportApp.tsx`, `WorkWorkspace.tsx`, `SignaturePad.tsx`, `api.ts`, `report-auth.css` sekä `src/Report.tsx`.
- Mallit/generaattorit: `src/reportSummary.ts` ja `reportSummaryPdf.ts` (uudet), `reportWorkModel.ts`, `reportArchive.ts`, `reportSignature.ts`, `pdf.ts`, `finalPdf.ts`.
- Testit: uudet `src/reportSummary.test.ts`, `report-api/management.emulator.ts`, `e2e/reportStabilization.playwright.ts`, `playwright.report-d.config.ts`; lisäksi `src/reportC.test.ts`, `report-api/archive.emulator.ts`, `report-api/test/server.ts`, `report-relay/relay.test.ts`, `e2e/reportArchive.playwright.ts`, `scripts/run-report-tests.mjs`.
- Dokumentit: neljä D-raporttia, `PRIVACY_DATA_FLOW_AUDIT.md`, `PRIVACY_APPROVAL_CHECKLIST.md`, `CODEX_PROMPT.md`, `IDEA.md`, `README.txt`.
- Uudelleen generoitu paikallinen, Gitissä tarkoituksella ohitettu tiedosto: `.playwright-artifacts/report-relay/PdfLibrary.gs`. Koko tämä tiedosto kopioidaan GASiin uudelleen; C:n Code.gs ja manifesti säilyvät.

CONTACTin, julkisten React-sivujen, pelin, Firebase-sääntöjen/asetusten, ympäristösalaisuuksien, riippuvuuksien ja GitHub Pages -workflow'n lähteitä ei muutettu.

## Rajat ja tuotannon hyväksymisesteet

- Oikea GAS-editorin tallennus, deploymentin asetukset, HMAC-vastaavuus, MailApp-valtuutus ja oikea postilaatikkovastaanotto vaativat omistajan hyväksymistestin. Tässä työssä ei lähetetä oikeaa postia.
- Workers Freen 10 ms CPU-raja ei ole paikallisesta emulaattorista todistettavissa. Haku on sivutettu ja PDF generoidaan GASissa/selaimessa; edustavan tuotantoajon CPU-arvot on silti tarkistettava ennen hyväksyntää.
- CONTACT-automaattisiirto tarvitsee erillisen suojatun backend-rajan. Nyt valmis toiminto on nimenomaisesti nimetty käsintuonti, ei väite automaattisesta synkronoinnista.
- Osto- ja kustannustiedon puutteet merkitään. Vanhojen hyväksyntöjen puuttuvia ostohintoja ei täytetä nykyhinnastosta. Työntekijöiden tasajako ei korvaa henkilökohtaista tuntikirjanpitoa.
- Sivutetun haun aikana keskeneräiset työt voivat muuttua; ne merkitään arvioiksi. Suuri tietomäärä edellyttää useampaa käyttäjän käynnistämää sivua, ei rajatonta taustalatausta.
- Yhteenvedot kattavat pilvessä säilyvät raportit. Pysyvästi poistetun työn koko aineisto ei enää kuulu hakuun; sitä tarkastellaan alkuperäisistä arkistotiedostoista. Kooste ei korvaa kirjanpitoarkistoa. Uutena työnä luotu kopio on erillinen tilaus, jonka laskutuskäsittely on tarkistettava ennen laskutusta.
- Säilytyspolitiikkaa ei keksitä yrityksen puolesta. Omistajan/kirjanpitäjän päätös ja oikeat varmistukset tarvitaan. Ei automaattista poistoa. Käytäntöhistorian 20 version raja sulkee muutokset hallitusti eikä hävitä historiaa.
- Fyysisten NFC-/iOS-/Android-laitteiden ja oikean PWA-asennuksen hyväksyntä tehdään erikseen; selainemulointi ei korvaa sitä.

Tarkat asetukset, julkaisujärjestys, palautus ja hyväksymislista: [SETUP](REPORT_2_0_D_SETUP.md). Valtuutus ja palautuspolun luottamusrajat: [SECURITY](REPORT_2_0_D_SECURITY.md). Käytettävyyden muutokset ja kaappaukset: [UX_REVIEW](REPORT_2_0_D_UX_REVIEW.md).
