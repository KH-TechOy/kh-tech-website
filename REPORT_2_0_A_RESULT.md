# KH-Tech Report 2.0 A — paikallinen toteutus

10.11.2026 · `main` · lähtöversio `ab81ca8` (CONTACT 3.1). Ei pushia, deployta, oikeita sähköposteja, maksullisia palveluita tai laskutuksen aktivointia.

## Toteutettu

Nykyinen `/kh-tech-website/report/` avaa henkilökohtaisen Firebase email/password -kirjautumisen. Uloskirjautuminen, salasanan palautus, välilehti-istunnon palautus, suomenkieliset virheet ja käyttöeston käsittely on toteutettu oikealla Firebase SDK:lla. Puuttuvat tuotantoasetukset sulkevat palvelun; vanhaan avoimeen editoriin ei ole varareittiä. NFC-kortti avaa saman suoran URL:n ja kirjautumisen. Julkiseen navigaatioon ei lisätty report-linkkiä.

Admin- ja Employee-työtilat käyttävät KH-Techin virallista logoa ja nykyistä typografiaa. Ylläpitäjä voi luoda henkilökohtaisen työntekijätilin, lähettää palautuspyynnön, myöntää/poistaa admin-roolin, estää pääsyn ja selata aktiivisia/inaktiivisia profiileja sivutettuna. Työntekijällä ei ole näitä oikeuksia myöskään suoraan API:a tai Firestorea kutsumalla.

Erillinen `report-api/worker.ts` käyttää Workers Free -runtimea, WebCryptoa/JOSE:a ja Googlen OAuth/REST API:a. JWT-allekirjoituksen/projektin tarkistus, Auth-tilin live-esto, tuore profiili, hallinnan transaktiot, idempotenssi, auditointi, JSON-kokoraja, exact-origin CORS ja SQLite DO -rajoitin ovat palvelimella. Viimeisen aktiivisen ylläpitäjän poistaminen estetään Firestore-transaktiolla ja palvelinpuolisella laskurilla myös rinnakkaisissa pyynnöissä. Ensimmäiselle adminille on vain luotetun operaattorin paikallinen ADC-työkalu; ei julkista alustuspäätepistettä tai salasanaa.

Spark Firestore -pohja ja deny-by-default-säännöt kattavat käyttäjät, työtilaukset, raporttimetadatan, materiaalit, arkistometadatan ja auditoinnin. Työntekijä saa vain oman tai hänelle osoitetun raportin. Rooli-/profiili-/auditointi-/laskurikirjoitukset on suljettu kaikilta selaimilta. Metadatan kentät/pituudet, omistajuus, osoitukset, tilat, aikaleimat ja kyselyrajat valvotaan säännöissä. [Tietomalli ja turvallisuusrajat](REPORT_2_0_SECURITY.md).

## Nykyisen sovelluksen auditointi ja yhteensopivuus

Tarkistettiin reititys/lazy-load, React-raporttieditori ja `ReportData`/kuvamalli, jsPDF-generaattori, luonnoksen luku/tallennus/tyhjennys, manifesti/service worker, julkinen sivusto/CONTACT 3.1, pelin erillinen lataus, Apps Script -lähteet, nykyiset testit ja Pages-build. Lähtöversiossa raportilla ei ollut varsinaista henkilöstötodennusta, ja se avasi yhteisen localStorage-luonnoksen. Historiallinen irrallinen `apps-script/Code.gs` sisältää jaetun salasanan luonnoksen, mutta uusi kirjautuminen ei käytä tai julkaise sitä.

Raporttieditori säilyy kirjautumisen takana. Sisältökentät, vanhat raporttitunnukset, materiaalit, enintään kuusi kuvaa, esikatselu ja paikallinen PDF säilyvät; PDF-generaattorin sisältöä ei muutettu. Tallennusadapteri erottaa uudet luonnokset käyttäjän UID:n mukaan välilehden sessionStorageen. Logout/esto sulkee adapterin ennen editorin viimeistä tallennusta ja poistaa uuden luonnoksen. Tavallinen refresh palauttaa saman käyttäjän luonnoksen. Verkottomana editori sulkeutuu; saman välilehden luonnos säilyy uutta palvelinvarmennusta varten. Staattisen PWA-kuoren offline-lataus säilyy.

Vanhaa localStorage-luonnosta ei lueta automaattisesti. Admin voi tuoda sen erikseen vahvistettuaan oikeutensa; vanha tunnus ja tietomalli säilyvät. **Vanha yhteinen tieto jää laitteelle suojaamattomana, kunnes omistaja poistaa sen erikseen.** Uusi tab-luonnoskaan ei ole salattu eikä korvaa hallittua henkilökohtaista laitetta. PDF jää laitteen tiedostoihin logoutin jälkeen.

Julkisen sivuston ilme, CONTACT-backend/lomakelogiikka, peli ja PDF:n sisältö säilyvät. Tietosuojateksti ja auditointi päivitettiin todellisiin uusiin tietovirtoihin; omistajan avoimia vahvistuksia ei merkitty tehdyiksi. Julkisella sivulla ei alusteta Firebase SDK:ta; seloste käyttää vain puhdasta julkista asetuslippua. Pages-workflow'hun lisättiin vain julkiset Firebase/API-build-muuttujat, ei backend-julkaisua tai salaisuuksia.

Vaihe A **ei vielä tallenna editorin raportteja pilveen** eikä sisällä täyttä tilausten/arkiston työnkulkua, raporttien sähköpostia, liitearkistoa tai työnohjausnäkymiä. Näitä ei esitetä operatiivisina. Kirjautuminen/tilihallinta ovat oikeita integraatioita, eivät frontend-salasananäyttö tai simuloitu sähköpostipalvelu.

## Paikallinen varmennus

Node 24.20.0, Java 21, Chromium; vain `demo-kh-tech-report`-Auth/Firestore-emulaattorit. Testidatat, testipalvelin ja paikalliset kuljetusvastineet ovat erillisiä tuotantobundlesta. Tuotannon Worker-runtime testattiin lisäksi workerd/Miniflaressa oikeilla muistissa muodostetuilla RSA-allekirjoituksilla, julkisella testi-JWK:llä, oikeilla emulaattoritietokannoilla ja SQLite DO:lla. Google OAuth/IAM:ia tai oikeaa postitoimitusta ei väitetä emuloiduksi tuotantotodisteeksi.

| Tarkistus | Tulos |
| --- | --- |
| `npm test` | 94/94; raporttimalli, PDF, peli, CONTACT/GAS/Worker-regressiot sekä uudet JWT- ja luonnoseristystestit. |
| `npm run check:report`, `npm run check:contact`, `tsc -b` | Läpi. |
| Firebase Emulator / `vitest.report.config.ts` | 16/16: puuttuva/väärennetty/eri projektin token, väärä salasana, tuntematon/estetty/revokoitu käyttäjä, Admin/Employee, oikeuksien korotusyritykset, omat/osoitetut/vieraat raportit ja listaukset, metadatarajat, tilan suojat, palautus/idempotenssi, epäselvät toimitukset, profiili-ensin-esto, samanaikainen viimeinen admin, ensimmäisen adminin rinnakkainen alustus ja oikea workerd/SQLite-rajoitus. |
| Raportin Playwright / emulaattorit | 21/21, 1440×900, 390×844, 768×1024: kirjautuminen/uloskirjautuminen, reset-pyyntö, refresh, roolinäkymät, käyttäjän luonti/palautus/roolit/esto/viimeinen admin, kuvat/esikatselu/oikea PDF, henkilökohtainen luonnos, legacy-tuonti, tilien eristys, verkkokatko ja jo kirjautuneen käyttäjän esto. Lisäksi julkiset sivut konfiguroidun Authin kanssa: ei Firebase-pyyntöjä tai report-linkkiä. |
| Salasanan palautusketju | Auth-emulaattori tuottaa OOB-koodin; koodi vaihtaa oikeasti salasanan, saman koodin uudelleenkäyttö hylätään ja uusi työntekijä kirjautuu uudella salasanalla. Ei oikeaa sähköpostia. |
| Julkisen sivuston tuotantoselaintestit, Pages-polku | 16 läpi; 2 tarkoituksellista ohitusta (saman staattisen offline-kuoren kertaluonteinen työpöytätesti). Brändi, sivut, navigaatio, lomake, pelin käynnistys, suljettu report, vanhan luonnoksen salassapito ja offline-kuori. |
| Tietosuoja, tuotanto / Pages | 9/9; 19 osiota, mobiili/tabletti/desktop, kontrasti, kuvat, ankkurit, suora NFC/manifesti ja ei julkisia report-linkkejä tai tarpeettomia ulkoisia pyyntöjä. |
| CONTACT 3.1 -selaintestit | 30/30 eristetyillä olemassa olevilla vastineilla; automaattinen Turnstile, validointi, oikea Clipboard API, virhe-/aikakatkaisu-/epäselvän toimituksen käsittely. Ei oikean vastaanoton väitettä. |
| Tuotantobuild / Worker dry-run | Läpi sekä `/` että `/kh-tech-website/`; tuotannon pelin/reittien smoke-testit molemmilla poluilla. Worker noin 72 KiB / gzip 18.5 KiB. Raportin Auth-chunk noin 381 kB / gzip 118 kB, vain report-reitillä. Nykyinen suuri Phaser-chunk tuottaa edelleen Viten kokovaroituksen; peliä ei ladattu osaksi Authia. |
| Riippuvuusauditointi | `npm audit --omit=dev`: 0 löydöstä; haavoittuva gRPC päivitetty override-rajoitteella. Täysi `npm audit`: 14 moderate -havaintoa Firebase CLI:n kehitystyökaluketjun transitiivisissa riippuvuuksissa, ei tuotantobundlessa. Ei väitettä täysin puhtaasta työkaluketjusta tai riskialtista major-version pakkopäivitystä. |

Testien vanhat avoimen/offline-editorin oletukset muutettiin tarkoituksellisesti oikeaan käyttöoikeusvaatimukseen. Editorin, valokuvien, legacy-tietojen ja todellisen PDF-latauksen selaintarkistukset tehtiin nyt **kirjautuneella emulaattori-istunnolla**; niitä ei korvattu todentamisen ohittavalla fixturellä.

`npm run test:report` käynnistää ja sammuttaa emulaattorit itse. Windowsin CLI:n jättämä Java-jälkiprosessi siivotaan vain, jos se ei ollut olemassa ennen tätä ajoa ja sen komentorivi vastaa täsmälleen paikallista demo-projektia ja tämän repon sääntötiedostoa. Pelkät palvelin-/sääntötestit voi ajaa `node scripts/run-report-tests.mjs --security-only`.

## Visuaalinen katselmointi

Todelliset emulaattori-istunnot kuvattiin [docs/report20a-screenshots](docs/report20a-screenshots/): login, työntekijän työtila, admin-hallinta ja nykyinen editori kolmessa näyttökoossa. Kuvat tarkastettiin; mobiililomake sopii 390 px:iin, napit ovat kosketettavia, admin-toiminnot pinoutuvat ja työpöydällä lista on väljä. Syötekenttien fontti on vähintään 16 px. Testit tarkistavat vaakaylivuodon puuttumisen. Ensimmäisen kierroksen liian aikainen mobiilikaappaus odotti vain latausruutua; kaappaus korjattiin odottamaan oikean kirjautumislomakkeen valmistumista. Lopulliset kuvat näyttävät varsinaisen sovelluksen.

## Ennen tuotantokäyttöä

1. Omistaja luo ja hyväksyy Spark-/Workers Free -ympäristöt ilman laskutusta, julkaisee Rulesin/indeksit ja Worker-koodin sekä asettaa julkisen frontend-konfiguraation. Tässä työssä ei tehty mitään näistä julkaisuista. [Täsmällinen käyttöönottopolku](REPORT_2_0_FIREBASE_SETUP.md).
2. Ensimmäinen henkilökohtainen admin alustetaan operaattorin ADC:llä; vähintään toinen admin, IAM/MFA ja palvelutiliavaimen säilytys/rotaatio varmennetaan. Älä lähetä avainta keskusteluun tai sijoita sitä VITE-kenttiin/repoon.
3. Oikean Firebase-projektin IAM/API/domain/Rules sekä palautussähköpostin vastaanotto, linkin kertakäyttö ja henkilöstölaitteiden NFC/asennettu PWA on hyväksyttävä oikeassa ympäristössä. Free-Workerin 10 ms CPU -raja pitää mitata oikeasta palvelusta; paikallinen dry-run ei sitä todista.
4. Yritys hyväksyy Firebase/Cloudflare-sopimukset, tietojen siirrot, henkilöstön informoinnin, säilytys-/poisto-/varmistus-/hätämenettelyt ja aiemman paikallisen datan siivouksen. [Omistajan tarkistuslista](PRIVACY_APPROVAL_CHECKLIST.md).
5. Maksuttomat kiintiöt voivat katkaista palvelun. Niitä ei kierretä Blazella, maksullisella Storagella, TTL:llä tai Workers Paidilla. Auditointi kasvaa ilman automaattista TTL-poistoa; seuranta ja manuaalinen säilytysmenettely tarvitaan. Päivitä myös Firebase CLI:n kehitystyökalujen riippuvuudet yhteensopivaan korjattuun versioon, kun sellainen on saatavilla; älä käsittele epäluotettuja arkistoja tällä työkaluketjulla.

Vaiheen A lähdekoodi ja paikallinen turvallisuusperusta ovat toteutettuja. Tuotantopalvelun operatiivista käyttöönottoa tai kaikkien myöhempien raportointivaiheiden valmistumista ei väitetä tehdyksi.
