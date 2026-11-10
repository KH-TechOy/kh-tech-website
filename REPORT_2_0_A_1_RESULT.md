# KH-Tech Report 2.0 A.1 — luonnosten säilyminen ja työntekijäkutsut

10.11.2026. Työ olemassa olevalla `main`-haaralla, lähtöversio `63dc896` (Firebase-projektitunnus määritetty A-version jälkeen). Käyttäjän mukaan A-version ensimmäinen oikea Admin-kirjautuminen toimii GitHub Pagesissa. Tässä työssä ei julkaistu mitään, muutettu oikeita palvelutilejä tai lähetetty oikeaa sähköpostia. CONTACT 3.1:n, julkisten sivujen, pelin, PDF-generaattorin ja Pages-workflow'n lähteitä ei muutettu.

## 1. Luonnoksen katoamisen syy

Vanhassa toteutuksessa lomakkeen ajantasainen tila oli vain editorin React-tilassa. `ReportApp.validate()` vaihtoi `checking=true` myös taustavarmennuksessa. Renderöintiehto korvasi silloin editorin latausnäkymällä, eli **purki komponentin**, eikä pelkästään näyttänyt tallennusilmaisinta. Saman polun käynnistivät välilehteen palaaminen ja määräaikainen istunnon tarkistus. Verkkovirhe puolestaan nollasi profiilin ja navigaation. Seuraava avaus alustettiin `readReport()`-kutsulla tallennustilasta.

Normaalisti unmount-flush yritti pelastaa tiedot. Tallennuksen epäonnistuessa, lukemisen estyessä tai istuntoadapterin sulkeutuessa muistissa ollut uudempi tila kuitenkin hävisi ja editori palasi vanhempaan tai tyhjään luonnokseen. Vanha `clear()` myös poisti kaikkien report-istuntoluonnosten avaimet käyttöeston/profiilikuuntelijan virheen yhteydessä. Lisäksi vanha editori ajoi tallennuksen jo alustuksessa: lukemisvirheestä tyhjänä palautunut raportti saatettiin tulkita poistettavaksi tyhjäksi luonnokseksi.

**450 ms:n tallennusajastimessa ei ollut lomaketta nollaavaa `setState`-kutsua.** Tallennuksen valmistuminen näytti ajallisesti syylliseltä, mutta varsinainen vaarallinen yhdistelmä oli komponentin purkaminen, tilan lukeminen uudelleen ja epäonnistunut/suljettu tallennus. Kentät olivat jo kontrolloituja, `Field` oli määritelty komponentin ulkopuolella ja sen avaimet olivat vakaita. Niitä ei vaihdettu uudelleen alustaviksi kentiksi.

### Korjaus

- `draftSession.ts` omistaa elävän lomaketilan, version ja tallennustilan editorin ulkopuolella. Päivitys muistiin tapahtuu heti. React lukee saman session `useSyncExternalStore`-rajapinnalla; tallennus muuttaa vain tallennuksen tilaa, ei lomakearvoja tai raporttitunnusta.
- Tallennus viivästetään **2 sekuntia viimeisestä muutoksesta**. Kentästä poistuminen, manuaalinen **Tallenna luonnos**, välilehden piiloutuminen, sivulta poistuminen ja editorin purkaminen yrittävät tallentaa uusimman muistissa olevan version. Muuttumatonta versiota ei kirjoiteta uudelleen.
- Näkyvät tilat: **Tallentamattomia muutoksia**, **Tallennetaan...**, **Luonnos tallennettu** ja selkeä tallennusvirhe. Uudelleenyritys käyttää samoja eläviä arvoja, ei vanhaa tallennettua kopiota.
- UID-kohtainen sessionStorage-kuva tallennetaan yhtenä atomisena arvona `kht-report2:<uid>:snapshot`. Raporttitunnus ja sisältö eivät enää jakaudu kahteen erikseen onnistuvaan kirjoitukseen. Vanhan A-version UID-kohtaiset kaksi avainta luetaan yhteensopivasti ja siivotaan vasta uuden kuvan onnistuneen kirjoituksen jälkeen.
- Jos alkuluku estyy tai sisältö on rikkoutunut, automaattinen kirjoitus estetään. Uusia syötteitä ei heitetä pois. Aiemman tiedon korvaaminen vaatii erillisen vahvistuksen manuaalisessa tallennuksessa.
- Taustavarmennus ei pura jo varmennettua editoria. Tilapäinen verkkovika säilyttää käyttäjän oman paikallisen editorin; palvelinoperaatiot vaativat edelleen normaalin palvelinvaltuutuksen. Uutta istuntoa ei avata offlineen.
- Aidot käyttöeston/mitätöidyn istunnon ilmoitukset sulkevat pääsyn. Ne eivät poista luonnosta. Saman UID:n muistissa oleva session tila säilyy myös tallennusvirheessä. Toisen kirjautuneen käyttäjän käyttöliittymä avaa vain oman, palvelimella varmennetun UID:n session.
- Profiilin nimen/roolin päivitys ja tokenin refresh eivät muuta editorin avainta. Raportin tunnuksen muuttaminen ei ole komponentin uudelleenluonnin peruste.
- Vanhan yhteisen localStorage-luonnoksen tuonti vaatii yhä Adminin vahvistuksen ja uuden palvelintarkistuksen. Jos käyttäjä muuttaa raporttia tarkistuksen aikana, tuonti perutaan. Tyhjää/puuttuvaa vanhaa luonnosta ei tuoda nykyisten tietojen päälle.
- Keskeneräinen kuvan käsittely on sidottu alkuperäiseen UID-sessioniin. Valmistuva kuva ei korvaa muuta uudempaa lomaketilaa. Nimenomainen luonnoksen tyhjennys tai legacy-tuonti vaihtaa sukupolven ja estää vanhan kuvatehtävän palauttamasta poistettua sisältöä.

## 2. Työntekijän kutsun epäonnistuminen

Tuotannon aiemman sähköpostivirheen HTTP-tilaa tai Googlen virhekoodia ei ollut saatavilla. Käyttäjä vahvisti, että oikea sähköpostitesti tehdään uuden version julkaisun jälkeen. **Tästä syystä tuotannon yksittäistä IAM-/API-avain-/kiintiö-/sähköpostipohjasyytä ei väitetä todistetuksi.**

Koodista varmennetut puutteet olivat:

1. Tilin luonti ei lähettänyt kutsua automaattisesti.
2. Lähetysauditointi siirrettiin `attempting`-tilaan ennen kutsua, mutta selvästi hylättyä pyyntöä ei erotettu epäselvästä toimituksesta. Sama uudelleenyritys saattoi jäädä pysyvästi `outcome_unknown`-virheeseen.
3. Googlen virheet peittyivät yleiseen `provider_unavailable`-vastaukseen. Puuttuva lähetysoikeus, väärä API-avain ja kiintiö eivät erottuneet ylläpitäjälle.
4. Yleinen REST-apuri palautti 404:stä `null`; sähköpostifunktio ei tarkistanut tätä erikseen. Sellaista vastausta ei saa tulkita lähetyksen hyväksymiseksi.

### Uusi lähetysketju

**Luo työntekijä** varaa idempotentin UID:n ja sähköpostin, luo Auth-tilin satunnaisella palvelimella hylättävällä salasanalla sekä Employee-profiilin ja lähettää automaattisesti Firebase-palautustoiminnolla asetusviestin. Salasanaa ei näytetä ylläpitäjälle eikä lähetetä sähköpostiin. Sähköpostin varaus ja Authin sähköpostihaku estävät myös eri luontitunnuksella tehdyn kaksoistilin/profiilin.

Lähetyksessä käytetään Firebasen REST-päätepistettä `accounts:sendOobCode`, projektin **Web API -avainta**, palvelutilin OAuth-tunnistetta ja kiinteää `targetProjectId`-arvoa. `requestType=PASSWORD_RESET`, `returnOobLink=false`, `canHandleCodeInApp=false`, suomen locale ja todellinen Cloudflaren caller IP. Firebase toimittaa oman määräaikaisen, käytön jälkeen kelpaamattoman linkkinsä. Käyttäjä valitsee salasanan Firebasen isännöimässä näkymässä. Linkkiä tai sen tokenia ei palauteta Adminin selaimeen, tallenneta omaan auditointiin tai tulosteta sovelluslokeihin. Linkin normaali esiintyminen vastaanottajan omassa viestissä/Firebase-toiminnossa on osa tätä turvallista palautusketjua.

Vain palvelun onnistunut HTTP-vastaus hyväksytään lähetettäväksi vastaanotetuksi pyynnöksi; se ei todista postilaatikkoon saapumista. Palvelun virhevastaus, virheellinen JSON tai palautuva linkki/token ei muutu onnistumiseksi. Uudelleenohjauksia ei seurata. Workers tukee tähän `redirect: manual` -tilaa; Node-selainten `error`-tilaa ei käytetä Workerissa.

Jos tili syntyy ja sähköposti epäonnistuu, palvelin palauttaa **tili luotu + erillinen sähköpostin failed/unknown-tila**. Profiili ja Auth-tili säilyvät. Käyttöliittymä näyttää varoituksen ja **Lähetä asetuslinkki uudelleen** -toiminnon; se kutsuu vain lähetysoperaatiota samalla UID:llä. Myös kesken katkenneen tililuonnin requestId säilyy Adminin UID-kohtaisessa välilehtimuistissa, joten verkkovirheen jälkeinen luontiyritys voi jatkaa samaa operaatiota.

Selvästi hylätyn pyynnön auditointi on `failed`, joten saman operaation turvallinen uusinta onnistuu. Aikakatkaisun tai kadonneen vastauksen tila jää `unknown/attempting`; automaattista toistamista ei tehdä. Uusi lähetys vaatii käyttäjän tietoisen vahvistuksen, koska ensimmäinenkin viesti saattaa olla matkalla. Vastaanottajan pitää käyttää uusinta linkkiä.

Uuden käyttäjän painike on **Lähetä salasanan asetuslinkki**, epäonnistuneelle kutsulle **Lähetä asetuslinkki uudelleen** ja aiemmin käyttöön otetulle tilille **Lähetä salasanan palautuslinkki**. Profiilin `passwordSetupRequired` poistuu ensimmäisessä onnistuneessa varmennetussa kirjautumisessa; siksi tilana kerrotaan tarkasti **Odottaa ensimmäistä kirjautumista**, ei väitetä nähtävän käyttäjän salasanan sisältöä tai sähköpostin avaamista.

## 3. Näyttönimet

Adminin omalla rivillä ja jokaisen työntekijän rivillä on **Muokkaa nimeä**. Nimi on erillinen kirjautumissähköpostista. Ensimmäinen Admin voi vaihtaa sähköpostilta näyttävän nimensä esimerkiksi nimeksi Tomi tai Admin käyttöliittymässä; mitään henkilökohtaista nimeä ei ole kovakoodattu tuotantotoimintoon.

Palvelin vaatii aktiivisen Adminin myös nimimuutokseen, trimmaa nimen ja hyväksyy 1–120 merkkiä ilman ohjaus-/peittomerkkejä. Työntekijöille ei tässä erässä anneta omaa nimienhallintaoikeutta. Firestore-clientin profiilikirjoitukset pysyvät kiellettyinä myös Adminille. UID, sähköposti, rooli, aktiivisuus ja viimeisen Adminin laskuri eivät muutu nimitoiminnolla.

Firestore on näyttönimen lähde. Nimi päivitetään palvelimella ja synkronoidaan Authin `displayName`-kenttään. Samanaikaisen uudemman nimen jälkeen tehdään sovitus; palveluntarjoajavirhe näkyy erillisenä `name_auth_pending`-virheenä ja saman muutoksen voi uusia. Profiilikuuntelija päivittää oman nimen heti, ilman uloskirjautumista tai editorin uudelleenluontia.

## 4. Paikallisen tallennuksen rajat

Tämä vaihe **ei tallenna raportin sisältöä Firestoreen eikä synkronoi luonnoksia laitteiden välillä**. Firebaseen lisättiin vain käyttäjähallinnan kutsutiloja, nimiauditointi sekä palvelimen yksityinen sähköpostivaraus `accessControl/employee-<SHA256>`; raporttisisältö ja kuvat säilyvät selaimessa.

Luonnos säilyy uloskirjautumisen ja vahvistetun käyttöeston jälkeen tässä välilehdessä omalla UID:llään. Sovellus ei näytä sitä toiselle tilille. Jälleenavaus edellyttää saman tilin hyväksyttyä istuntoa. Jos tallennus epäonnistui, viimeisin versio säilyy vain välilehden muistissa. Uloskirjautuminen pyytää tällöin erillisen vahvistuksen; myös sivulta poistumista varoitetaan. **Poista luonnos** pyytää nimenomaisen vahvistuksen.

SessionStorage on **salaamatonta saman originin selainmuistia**. UID-erottelu sovelluksessa ei ole laitesalausta eikä suojaa saman selainprofiilin kehittäjätyökaluilta, haitalliselta laajennukselta, XSS:ltä tai fyysiseltä laitteen haltijalta. Käytä henkilökohtaista hallittua laitetta ja lukitse se. Suljettu välilehti, kaatuva selain, selaimen oma palautuskäytäntö tai sivustotietojen poistaminen voivat hävittää luonnoksen; viimeisen kahden sekunnin tietoja ei voi luvata pelastaa sähkökatkossa. Lataa PDF ennen välilehden sulkemista. Jos kuvan käsittely on yhä kesken, odota sen valmistumista ennen selaimen sulkemista.

Jo ladattua PDF:ää ei poisteta uloskirjautumisessa. Vanha yhteinen `localStorage`-luonnos ei muutu uuden version myötä salatuksi; sitä ei avata automaattisesti ja sen lopullinen siivous on omistajan erillinen päätös. Käyttöeston tieto voi sulkea paikallisen editorin vasta, kun tieto saadaan palvelimelta; offlineen ei luvata aiemmin ladattujen tietojen etäperuutusta. Yrityksen API- ja Firestore-operaatiot tarkistavat oikeudet edelleen palvelimella.

Julkista tietosuojasivua ei muutettu käyttäjän rajauksen mukaisesti. Sen A-version teksti luonnoksen poistamisesta logoutissa/käyttöestossa ei kuvaa uutta säilyttämiskäytäntöä. Tämä säilytysteksti pitää sovittaa erikseen ennen uuden käytännön tuotantojulkaisua; sisäisen sovelluksen oma ohjeistus kertoo uuden käytöksen jo nyt. Tietosuojaselosteen, CONTACTin tai pelin muutos ei sisälly tähän erään.

## 5. Kertaluonteiset tuotantoasetukset

Tallennustilan rajat koskevat myös päivitystä: vanhan suuren UID-luonnoksen ensimmäinen atominen snapshot voi tarvita tilapäisesti lisätilaa ennen vanhojen avainten siivousta. Jos tila ei riitä, alkuperäinen tallenne ja elävä lomake säilyvät ja käyttöliittymä näyttää virheen; tilaa ei vapauteta hävittämällä vanhaa luonnosta ensin. Varmista PDF ennen selaimen tietojen tarkoituksellista siivoamista.

Ylläpitäjän ei tarvitse avata Firebase Consolea, Google Cloud Consolea tai Cloudflare Dashboardia **yksittäistä työntekijää luodessaan, kutsuessaan, nimetessään tai estäessään**. Käyttöönoton asetukset tekee palvelun operaattori kerran:

1. Säilytä nykyinen Firebase-projekti, käyttäjät, UID:t, Firestore ja Cloudflare Worker. Älä aja ensimmäisen Adminin bootstrap-skriptiä uudelleen. Älä vaihda nykyisiä palvelutilisalaisuuksia tämän päivityksen vuoksi.
2. Lisää Report-Workeriin tavallinen muuttuja **`FIREBASE_WEB_API_KEY`**, joka kuuluu samaan projektiin kuin `FIREBASE_PROJECT_ID`. Selaimen olemassa oleva Web API -avain soveltuu, jos sen sovellusrajoitus sallii myös palvelinkutsut. Se on julkinen projektiasetus, ei palvelutilin yksityinen avain. Älä sijoita `SERVICE_ACCOUNT_JSON`-arvoa tähän tai frontendin asetuksiin.
3. Jos nykyinen Web API -avain on rajattu vain HTTP referrer -osoitteisiin, **älä heikennä sen olemassa olevaa selainrajausta**. Google Cloud Console → oikea projekti → APIs & Services → Credentials → Create credentials → API key. Luo erillinen palvelinkäyttöön tarkoitettu projektin API-avain, Application restrictions = None (Cloudflaren jaettu lähtö-IP ei ole vakio), API restrictions = Restrict key → **Identity Toolkit API** (`identitytoolkit.googleapis.com`). Lisää se vain Report-Workeriin edellisen kohdan muuttujaksi. Älä muuta CONTACTin avaimia tai asetuksia. OAuth-tunniste, kiinteä targetProjectId ja palvelimen Admin-valtuutus säilyvät vaadittuina; API-avain ei itsessään myönnä yrityksen käyttöoikeuksia.
4. Cloudflare → Workers & Pages → olemassa oleva Report Worker → Settings → Variables and Secrets: varmista `FIREBASE_WEB_API_KEY`, `FIREBASE_PROJECT_ID`, nykyinen `ALLOWED_ORIGINS`, nykyinen salainen `SERVICE_ACCOUNT_JSON` sekä SQLite DO -binding. Tämän dokumentin vuoksi ei tarvitse toimittaa tai tulostaa yksityistä avainta.
5. Google Cloud IAM → valitun palvelutilin oikeudet samassa projektissa: `roles/firebaseauth.admin` sisältää `firebaseauth.users.sendEmail`, `users.get`, `users.create` ja `users.update`; `roles/datastore.user` tarvitaan edelleen. Rajatulla custom-roolilla tarkista nimenomaan lähetysoikeus — tilin luonnin onnistuminen ei yksin todista sendEmail-oikeutta. Älä lisää Owner-/Editor-oikeuksia. Varmista Identity Toolkit API:n saatavuus.
6. Firebase Console → Authentication → Sign-in method: **Email/Password** käytössä. Authentication → Settings → Authorized domains: nykyinen Firebase-projektin toiminto-domain sekä `khtechoy.github.io` ja tarvittaessa oikea oma domain. Pelkkä Pages-polku ei ole domain-asetus.
7. Authentication → Templates → Password reset: yrityksen tunnistettava nimi ja suomenkielinen viesti. Säilytä Firebasen toimiva oletus-action URL, ellei yrityksellä ole oikeasti toteutettua muuta palautusnäkymää. Älä osoita action URL:ää Reportin etusivuun, joka ei käsittele oobCodea. Uusi tili ja palautus käyttävät samaa turvallista Firebase-password-reset-mekanismia.
8. Pidä Firebase **Spark**, Cloudflare **Workers Free**, ei korttia, Blazea, SMS:ää, Cloud Functionsia, uutta SMTP-palvelua tai maksullista sähköpostipalvelua. Spark-salasanapalautusten viestikiintiö on tarkistushetkellä 150/päivä; myös muut väärinkäytön torjunnan rajat voivat estää lähetyksen. `email_recaptcha_required` ei ole lupa poistaa tarpeellista suojausta tai ottaa maksullista palvelua käyttöön; projektin todellinen asetus on silloin selvitettävä operaattorilla.

| Koodi | Tarkistus / toiminta |
| --- | --- |
| `email_not_configured` | Lisää Workerille `FIREBASE_WEB_API_KEY`. Tili on jo olemassa, käytä uudelleenlähetystä. |
| `email_api_key_invalid` | Tarkista avaimen projekti ja arvo. |
| `email_permission_denied` | Tarkista sendEmail-IAM sekä palvelinkutsuille kelpaava API-avain ja sen API/sovellusrajoitukset. |
| `email_provider_disabled` | Tarkista Email/Password-provider. |
| `email_domain` | Tarkista hyväksytty domain ja sähköpostipohjan oikeasti toimiva action URL. |
| `email_quota` | Odota kiintiön/torjuntarajan palautumista; älä luo tiliä uudelleen. |
| `email_outcome_unknown` / `outcome_unknown` | Ensimmäinen viesti voi olla matkalla. Ei sokeaa automaattista uusintaa; vahvista tietoinen uusi lähetys. |
| `name_auth_pending` | Profiilin nimi on tallessa; uusi nimipäivitys Auth-sovitusta varten. |

## 6. Julkaisujärjestys — ei suoritettu tässä työssä

1. Varmista keskeneräiset raportit nykyisessä **samassa välilehdessä** ja lataa tarpeellinen PDF ennen päivitystä. Älä sulje välilehteä tai tyhjennä sivustotietoja varmistuksen keinona.
2. Operaattori asettaa edellä kuvatun julkisen Worker-muuttujan. Paikallisesti `npm run check:report`, `npm run report:bundle` tekee vain dry-runin.
3. Omistajan julkaisupäätöksen jälkeen päivitä ensin **vain Report Worker**:

   ```text
   npx wrangler deploy --config report-api/wrangler.jsonc --keep-vars
   ```

   `--keep-vars` on olennainen, koska nykyiset tuotantoasetukset voivat olla Dashboardissa eivätkä repossa. Tarkista myös configissa mukana olevan `ALLOWED_ORIGINS`-arvon vastaavan nykyistä sallittua originia. Salaisuuksia, CONTACT-Workeria tai Firestore Rulesia ei vaihdeta. A.1 ei tarvitse sääntömuutosta; aiempien deny-by-default-sääntöjen täytyy pysyä julkaistuina.
4. Rakenna frontend nykyisillä julkisilla Firebase/API-asetuksilla: PowerShellissa `$env:VITE_BASE_PATH='/kh-tech-website/'` ja `npm run build`. Uusia frontend-salaisuuksia tai -muuttujia ei tarvita. Julkaise sivusto vasta päivitetyn Workerin jälkeen yrityksen omalla julkaisumenettelyllä. Työntekijöiden luontia ei aloiteta backend/frontend-päivityksen puolivälissä, koska vanha käyttöliittymä pyytää vielä erillistä manuaalista viestiä uuden automaattisen kutsun lisäksi.
5. Päivitä olemassa oleva raporttivälilehti/PWA uuteen versioon. Älä poista sessionStoragea välimuistipäivityksen yhteydessä. Tarkista vanhan UID-luonnoksen tunnus, sisältö ja materiaalit, tee muutos, tallenna ja lataa PDF.
6. Tee käyttäjän kanssa sovittu oikean sähköpostin hyväksyntä: luo yksi oikea työntekijä Administa → varmista palvelun hyväksyntä → tarkista vastaanottajan postilaatikko/roskaposti → avaa uusin Firebase-linkki → aseta salasana → kirjaudu työntekijänä → tarkista Employee-oikeudet. Testaa myös nimipäivitys, eston vaikutus ja manuaalinen reset. Jos virhe jatkuu, kerää vain HTTP-status ja rajattu `error`-koodi, **ei Authorization-otsaketta tai palautuslinkkiä**. Mittaa samalla oikean Free-Workerin CPU-käyttö; paikallinen testi ei todista tuotannon 10 ms rajaa.

## 7. Testit

Testit käyttävät vain `demo-kh-tech-report`-projektin Firebase Auth/Firestore -emulaattoreita. Tuotannon Worker-koodi testataan myös workerd/SQLite-ajossa oikeilla muistissa muodostetuilla RSA-allekirjoituksilla ja emulaattoreihin rajatulla verkkokuljetuksella. HTTP-hylkäykset ja verkkovirheet ovat eristettyjä testivastineita, eivät tuotannon testitila. CLI:n omat emulaattorin palautuslinkit peitetään testitulosteista.

| Tarkistus | Tulos |
| --- | --- |
| `npm test` | **112/112 läpi.** Yksikkö-/regressiotestiä: mm. debouncen ajastus, uusin syöte myös tallennuksen aikana, tallennusvirhe/uusinta, UID-erottelu, atominen snapshot/ID, korruptoituneen alkuluvun suoja, vanhan tuonnin revision tarkistus, virheviestit sekä olemassa oleva PDF/raporttimalli/peli/CONTACT-testit. |
| `npm run test:report` / Firebase + workerd | **24/24 läpi.** Admin/Employee, roolien korotusyritykset, estetyt käyttäjät, viimeinen Admin, Firestore Rules ja nykyiset suojat; lisäksi automaattinen kutsu, API-key/OAuth-lähetys, epäonnistumisen osatulos, sama UID uusinnassa, palautuskoodin käyttö ja sen uudelleenkäytön esto, oikea kirjautuminen uudella salasanalla, nimi/validointi/roolien säilyminen ja Auth-nimen sovitus. |
| Playwright | **39/39 läpi.** Työpöytä 1440×900, puhelin 390×844, tabletti 768×1024. Syötteet säilyvät autosavessa, blurissa, manuaalisessa tallennuksessa, refreshissä, token-refreshissä, profiilipäivityksissä, välilehteen palatessa, verkkokatkossa, tallennusvirheessä ja editorista poistuttaessa/palatessa. Nimen muutos heti, automaattinen kutsu, oikea varoitus ja uudelleenlähetys. Materiaalit, kuva, esikatselu ja ladattu oikea PDF säilyvät. |
| `tsc -b`, `npm run check:report` | Läpi. |
| `npm run build` / `npm run report:bundle` | Läpi, ei deployta. Worker 83,42 KiB / gzip 20,71 KiB. Konfiguroitu Firebase/Report-chunk noin 539 kB / gzip 165 kB ja ennestään suuri Phaser-chunk tuottavat Viten kokovaroituksen; Auth ladataan raporttireitille, eikä peliä muutettu. |

Näyttökuvat: `docs/report20a1-screenshots/`. Todellinen sähköpostin vastaanotto, kyseisen projektin IAM/API-rajoitukset ja tuotannon Worker-CPU vahvistetaan julkaisun jälkeisessä hyväksynnässä, ei emulaattorin perusteella.

Lähteet tarkistettu 10.11.2026: [Firebase email REST](https://docs.cloud.google.com/identity-platform/docs/reference/rest/v1/accounts/sendOobCode), [projektikohtainen OAuth-menetelmä](https://docs.cloud.google.com/identity-platform/docs/reference/rest/v1/projects.accounts/sendOobCode), [Auth-IAM-oikeudet](https://docs.cloud.google.com/iam/docs/roles-permissions/firebaseauth), [Firebase Auth -kiintiöt](https://firebase.google.com/docs/auth/limits), [Workers Request / redirect](https://developers.cloudflare.com/workers/runtime-apis/request/). Näiden dokumentaatio ei yksin todista yrityksen tuotantoprojektin asetuksia tai postin perillemenoa.
