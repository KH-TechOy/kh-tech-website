# Report 2.0 A — turvallisuus ja tietomalli

10.11.2026. Toteutus on paikallinen; tuotantoprojekti, IAM, postin vastaanotto ja käyttöönotto odottavat [asetuksia ja hyväksyntää](REPORT_2_0_FIREBASE_SETUP.md). Maksullista tuotetta tai todennuksen korvaavaa demoa ei ole lisätty.

## Luottamusrajat

Firebase Authentication säilyttää henkilökohtaiset salasanat. Firestoreen, omaan auditointiin, Worker-vastaukseen tai lokiin ei tallenneta salasanoja. Uuden tilin salasana muodostetaan kryptografisesti palvelimella, hylätään eikä sitä anneta ylläpitäjälle. Työntekijä asettaa salasanansa erillisellä Firebase-palautusviestillä. Sähköpostipalvelun hyväksyntä ei tarkoita todistettua vastaanottoa.

Selain käyttää oikeaa Firebase SDK:ta ja välilehden `browserSessionPersistence`-istuntoa. Raportin avaaminen vaatii lisäksi Workerin `/session`-tarkistuksen. Worker hyväksyy vain Googlen projektikohtaisesti allekirjoittaman RS256 ID-tokenin, oikean issuer/audience/exp/iat/auth_time/sub-arvon ja password-kirjautumistavan. Julkiset Google JWK:t haetaan kiinteästä HTTPS-osoitteesta ja välimuistitetaan. Tokeneita tai palvelutiliavaimia ei tulosteta. Tuotanto ei hyväksy emulaattorin allekirjoittamattomia tokeneita. Pelkkä API-avain, CORS, NFC-kortti, localStorage, React-rooli tai tokenin asiakkaan lisäämä custom claim ei anna oikeutta.

Jokainen Worker-kutsu tarkistaa lisäksi **Auth-tilin tämänhetkisen disabled/validSince-tilan ja tuoreen Firestore-profiilin**. Hallintakirjoitus lukee myös toimijan aktiivisen admin-roolin uudelleen tietokantatransaktiossa. Rooli on vain palvelimen hallitsema profiilitieto; custom claimien viivettä ei käytetä valtuutuksena. Firestore Rules valvoo suoria SDK/REST-asiakaskutsuja erikseen.

Palvelutilin OAuth-tunnisteella tehdyt Firestore-operaatiot ohittavat Rulesin. Siksi roolien myöntäminen on rajattu Workerissa tarkistettuihin toimintoihin, eikä yleistä dokumentinkirjoitus-/IAM-/bootstrap-rajapintaa ole. OAuth-pyyntöjen kohteet ovat koodissa kiinteitä Googlen osoitteita. Workerissa ei käytetä Node Firebase Admin SDK:ta. Paikallinen ensimmäisen ylläpitäjän työkalu käyttää Admin SDK:ta operaattorin ADC:llä ja kieltäytyy jo alustetusta tietokannasta.

## Roolit, estot ja rinnakkaisuus

- Admin: listaa profiilit (50/sivu), luo työntekijän, aloittaa palautuksen, muuttaa roolin tai estää tilin. Employee: oma työtila ja editori, ei tilien hallintaa. Myös suoraan kutsuttu hallinta-API kieltäytyy työntekijästä.
- Asiakas ei voi kirjoittaa `users`-, `accessControl`- tai `auditEvents`-dokumentteja, edes omiaan tai adminina.
- Roolimuutos sekä `accessControl/admins.activeAdminCount` muuttuvat yhdessä Firestore-transaktiossa. Se lukee myös toimijan roolin. Laskuri ei saa alittaa yhtä. Samanaikainen viimeisten ylläpitäjien poistaminen ei voi onnistua molemmille. Laskurin kiertäminen konsolin/IAM-oikeuksilla on luotetun operaattorin toimenpide, jonka väärinkäyttöä Rules ei voi estää. Älä muuta rooleja tai poista ylläpitäjiä konsolissa tavallisessa ylläpidossa.
- Estossa **profiilin active=false ja validAfter asetetaan ensin transaktiossa**; vasta sitten Auth disabled ja validSince. Vaikka Auth API epäonnistuu, Rules ja Worker epäävät yritysdatan. Uudelleenyritys samalla requestId:llä viimeistelee idempotentin Auth-eston. UI tarkkailee omaa profiilia; esto sulkee editorin ja poistaa istuntoluonnoksen. Jo ladattua PDF:ää tai aiemmin nähtyä tietoa ei voi peruuttaa etänä.
- Pelkkä Firebase Consolen disable/password reset/revoke ei välttämättä mitätöi kaikkia jo annettuja Firestore ID-tokeneita heti. Worker tekee live-tilitarkistuksen; Rules käyttää profiilia ja `auth_time >= validAfter`. Kiireellinen sulku tehdään tämän Workerin estotoiminnolla. Operaattorin hätämenettelyssä ensin profiili inactive + validAfter, vasta sen jälkeen Auth-tili. Ei luoteta pelkkään uloskirjautumispainikkeeseen.
- Tilin uudelleenaktivointia, käyttäjän poistoa tai sähköpostin vaihtoa ei tässä vaiheessa tarjota. Ne vaativat erillisen valtuutetun, auditoinnin ja laskurin huomioivan toteutuksen. Päivittäistä käyttöä varten luodaan erilliset tilit; ei palauteta toisen henkilön UID:tä uudelle henkilölle.

`requestId` on UUID v4, ja auditointidokumentti on idempotenssimerkintä. Uudelleenkäyttö eri toiminnolle/tekijälle/kohteelle hylätään. Salasanan palautuksen pending → attempting varataan transaktiossa ennen sähköposti-API:a. Epäselvää lähetystä ei toisteta automaattisesti: attempting vaatii tilanteen selvittämisen; se ei muutu tekaistuksi onnistumiseksi. Luonnin keskeytyessä profiili pysyy inaktiivisena, ja täsmälleen sama pyyntö voi jatkaa palvelimen valitsemaa UID:tä. Uusi requestId ei korjaa vanhaa varausta: operaattori selvittää keskeneräisen tapahtuman.

## Firestore-malli

Käytössä yksi yritys, yksi Spark-tietokanta. Ei moniyrityskenttää tai asiakkaan valittavaa companyId:tä. Kaikki kokoelmat suljetaan oletuksena.

| Polku | Sisältö | Valtuutus |
| --- | --- | --- |
| `users/{uid}` | uid, email ≤160, displayName ≤120, role admin/employee, active, validAfter (epoch seconds), createdAt/updatedAt ISO | Omat käyttöoikeustiedot get-luettavissa myös eston jälkeen, jotta UI sulkeutuu; admin lukee/listaa ≤100. Kaikki client-kirjoitukset kielletty. Worker tuottaa kentät. |
| `accessControl/admins` | activeAdminCount, updatedAt | Vain luotettu palvelin/operaattori; laskuri transaktioissa. |
| `reports/{id}` | schemaVersion=1, ownerUid, assignedTo (≤10), title (1–200), status draft/submitted/completed, createdAt/updatedAt Firestore timestamp; valinnainen workOrderId ja quotationReference | Aktiivinen tekijä tai nimetty työntekijä lukee/muokkaa; admin yrityksen raportit. Uusi raportti vain oma draft, työntekijä ei määrää muita eikä vaihda omistajaa. Työntekijä ei muuta completed-raporttia. Admin voi määrätä ja viimeistellä. Ei asiakaskenttiä/kuvia tähän metadatamalliin. |
| `workOrders/{id}` | Sama rajattu metadataydin | Tekijä/nimetty työntekijä/admin lukee, vain admin kirjoittaa. |
| `materialCatalog/{id}` | name ≤120, unit ≤20, code ≤40, active, updatedAt | Aktiiviset lukevat, admin kirjoittaa. |
| `archiveMetadata/{id}` | Tulevan arkiston ownerUid/assignedTo ja rajattu metadata | Oikeutettu tekijä/nimetty/admin lukee, kaikki client-kirjoitukset kielletty. Arkistointipalvelua ei vielä ole. |
| `auditEvents/{requestId}` | actorUid, targetUid, action, role tarvittaessa, status, createdAt/completedAt | Admin lukee (list ≤100), vain palvelin kirjoittaa. Ei salasanaa, tokenia, raporttitekstiä tai raakaa IP:tä. |

Raportti-/työtilaus-/arkistolistat vaativat ≤50 rajan ja työntekijällä `where(ownerUid == uid)` tai `where(assignedTo array-contains uid)` -rajauksen. Rules ei ole suodatin; yrityksen yleinen listaus hylätään työntekijältä. Materiaalilista ≤100. Palvelinlistaus käyttää omaa ≤50 sivutusta. Indeksit ovat `firebase/firestore.indexes.json`-tiedostossa. Kaikki client-metadatakirjoitukset on rajattu täsmälliseen kenttäjoukkoon, pituuksiin ja palvelinaikaleimaan; raakaa PDF:ää, data URL -kuvia tai koko vanhaa raporttiobjektia ei hyväksytä metadataan.

**Vaihe A ei liitä editoria näihin pilvikokoelmiin.** Nykyinen ReportData/PDF/kuvamalli ja vanhat tunnukset säilyvät. Varsinainen raporttisisältö, tilausten työnkulku, arkistointi, sähköpostitoimitus ja liitteiden säilytys ovat seuraavia vaiheita. Spark ei tarjoa tähän käyttöön maksutonta Cloud Storage -ratkaisua; kuville/PDF-arkistolle ei oteta hiljaa käyttöön laskutusta.

## Selain, PWA ja vanhat luonnokset

Kirjautunut editori käyttää käyttäjän UID:llä nimettyä välilehden **plaintext sessionStorage** -luonnosta; ei yhteistä automaattista localStorage-lukua. Uloskirjautuminen tai vahvistettu käyttöesto poistaa uudet raporttiluonnokset ja sulkee tallennusadapterin, jotta editorin unmount/pagehide-flush ei palauta poistettua tietoa. Saman käyttäjän refresh säilyttää luonnoksen, toinen kirjautunut käyttäjä ei lue sitä. Firestore SDK käyttää vain muistivälimuistia; ei pysyvää pilvidatan IndexedDB-cachea.

Tämä ei salaa laitetta eikä suojaa haitalliselta saman originin JavaScriptiltä, selainlaajennukselta, avatun välilehden toiselta käyttäjältä tai fyysiseltä laitteen haltijalta. Käytä hallittua henkilökohtaista laitetta, lukitse näyttö, lataa PDF talteen ennen uloskirjautumista. SessionStorage voi olla selaimen palautettavissa sen oman käytännön mukaan. Logout ei poista ladattuja tiedostoja. XSS samalla originilla vaarantaa istunnon; pidä riippuvuudet ja työasemat päivitettyinä.

Vanha `kht-report-draft` / `kht-report-id` localStorage säilyy yhteensopivuutta varten muuttamattomana. Sitä ei näytetä automaattisesti työntekijälle. Admin voi erikseen vahvistaa tuonnin tuoreen Worker-tarkistuksen jälkeen; tuonti säilyttää vanhan raporttitunnuksen eikä lähetä sisältöä pilveen. **Vanha paikallinen tieto ei muutu suojatuksi uuden kirjautumisen ansiosta.** Omistajan pitää tunnistaa vanha luonnos, viedä tarpeellinen tieto hyväksyttyyn paikkaan ja poistaa kyseiset vanhat avaimet selaimen devtoolsista. Ei koko originin summittaista tyhjennystä, joka poistaisi CONTACTin tarkistusavaimia.

Verkkoyhteyden katkeaminen sulkee editorin mutta säilyttää tämän välilehden luonnoksen samaan käyttäjään palaamista varten. Varmennus ei avaudu offlineen. PWA:n staattinen kuori ja suora NFC-URL säilyvät; vanhaa julkista offline-editoria ei käytetä todentamisen kiertotienä. Service worker välimuistittaa vain saman originin GET-staattisia tiedostoja, ei Firestorea, Authia, Worker-vastauksia tai lomake-POSTeja. Vanhat jo asennetut julkaisuversiot on päivitettävä/poistettava ennen henkilötietojen käyttöä; staattisen sivun päivitys ei etänä peruuta vanhan asennuksen paikallista dataa.

## Rajat ja julkaisuesteet

Admin-API:ssa on 4 KiB JSON-kehoraja, exact-origin CORS ja pysyvä 30 hallintapyynnön / 10 minuutin UID-rajoitin SQLite DO:ssa. CORS ei estä palvelinasiakkaan väärentämää Originia; oikea valtuutus on token + live-tili + profiili. `/session`-tarkistus tehdään avattaessa, välilehteen palatessa, verkon palatessa ja viiden minuutin välein. Firestore-kuuntelija välittää profiilin eston/roolimuutoksen. Jo ladatun paikallisen editorin täydellistä etäperuutusta ei voi luvata.

Maksuton Auth on julkinen rajapinta; väärinkäyttö voi kuluttaa rekisteröinti-/palautuskiintiötä. Hallinnan rajoitin ei ole koko Auth-palvelun DDoS-suoja. Kiintiöiden loppuessa palvelu sulkeutuu; maksullista automaattista skaalausta ei sallita. Auditoinnille ei ole maksullista TTL:ää tai varmuuskopiointia. Omistaja vahvistaa retentio-, tietopyyntö-, avainrotaatio-, hätäesto-, varmuuskopio- ja palautusmenettelyt, Firebase/Cloudflare-sopimukset, EU-sijainnin ja mahdolliset kansainväliset siirrot. IAM/hallintatili ohittaa sovelluksen suojat: vähimmät oikeudet ja MFA ovat operaattorin vastuulla.

Tuotannon hyväksynnässä tarvitaan oikean projektin IAM/Rules/domain-testi, oikean salasanapalautusviestin vastaanotto ja kertakäyttö, Workers Free CPU -mittaus sekä asennetun PWA:n/NFC:n testaus työntekijöiden laitteilla. Paikalliset testit eivät todista näitä. [Käyttöönotto, kustannusrajat ja ensisijaiset lähteet](REPORT_2_0_FIREBASE_SETUP.md).
