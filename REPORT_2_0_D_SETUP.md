# REPORT 2.0 D — käyttöönotto ja palautus

Paikallinen muutos main-haaralla, 14.11.2026. Tämän työn komennot eivät julkaise, lähetä oikeaa postia tai poista tuotantotietoja. Tuotannon sähköpostitoimitusta ei ole hyväksymistestattu tässä erässä.

## Julkaisujärjestys

1. Sovi lyhyt hyväksyntöjen/arkistointien huoltotauko. Tallenna nykyiset GAS- ja Worker-versiot sekä frontendin commit. Älä tyhjennä Script Properties -toimituslokia, Firestorea tai selainluonnoksia.
2. Aja paikallisesti `npm.cmd run report:relay` ja `npm.cmd run check:report:relay`. Korvaa **KH-Tech Report Archive** -projektin **PdfLibrary.gs:n koko sisältö** tiedostolla `.playwright-artifacts/report-relay/PdfLibrary.gs`. Älä kopioi vanhaa `report-relay-before-gas-fix`-varmuuskopiota. `report-relay/Code.gs` ja `appsscript.json` eivät muutu D:ssä.
3. Tallenna GAS-editorissa. Päivitä saman web-sovelluksen deployment uuteen versioon, suorittajana yrityksen omistajatili ja pääsy ilman Google-kirjautumista. HMAC suojaa kutsut. Käytä julkaistua `/exec`-osoitetta, ei `/dev`-osoitetta tai kirjautumista vaativaa deploymentia. Älä luo uutta CONTACT-projektia tai muuta sen julkaisua.
4. Varmista nykyiset Report Worker -asetukset hallitussa ylläpitoympäristössä: `ARCHIVE_RELAY_URL` osoittaa tähän `/exec`-julkaisuun, `ARCHIVE_RELAY_SECRET` ja GASin `REPORT_RELAY_SECRET` ovat täsmälleen sama vähintään 32 merkin salaisuus. Ei välilyöntejä tai rivinvaihtoja. Älä kopioi/tulosta arvoja tikettiin tai selaimeen. GASin `ARCHIVE_RECIPIENT`, MailApp-valtuutus ja päiväkatto säilyvät C:n ohjeen mukaisina.
5. Julkaise Report Worker olemassa olevaan palveluun nykyisillä sidoksilla ja salaisuuksilla. Käytä olemassa olevan C-asennuksen ohjetta ja `--keep-vars`; älä korvaa asetuksia esimerkeillä. Uusi reitti `/management` on vain kirjautuneelle aktiiviselle Adminille. **Firebase Auth-, sääntö-, indeksi-, laskutus- tai CONTACT-muutosta ei tarvita.** Nykyiset deny-by-default-säännöt estävät uudet suorat tietokantapolut.
6. Julkaise frontend GitHub Pagesin nykyisellä `/kh-tech-website/`-peruspolulla. Älä aloita uusia hyväksyntöjä Worker-päivityksen ja frontend-päivityksen välissä: uusi hyväksyntä sisältää `approval.pdfLayout: 2`, jota vanha frontend ei välttämättä osaa lukea.
7. Tarkista Admin- ja Employee-istunnot, luonnoksen jatkaminen ja uuden hyväksytyn testiraportin molemmat arkistotiedostot. Lopeta huoltotauko vasta hyväksymistarkistusten jälkeen. NFC-suoraosoite ja sisäisen sovelluksen piilottaminen julkisesta navigaatiosta säilyvät.

## Arkiston vianmääritys ilman viestin uusimista

Tuotannon alkuperäisestä epäonnistumisesta ei ole HTTP-/allekirjoitettua relay-vastausta. Sitä ei ole todistettu yksittäiseksi HMAC-, kiintiö- tai GAS-virheeksi. Koodista todettiin yleisvirheeseen peittyvä relay-polku, vastaanoton GAS-tarkisteriippuvuus ja aiemman PdfLibraryn todellinen syntaksiongelma. Varmista julkaistu GAS-versio ennen lähetysyritystä.

| Näytön koodi | Merkitys ja turvallinen toimi |
|---|---|
| R01 / `relay_network` | DNS/yhteys/transport. Tarkista palvelun saavutettavuus. **Tarkista lähetys**, älä uusi epäselvää operaatiota. |
| R02 / `relay_timeout` | GAS ei vastannut määräajassa. Kutsu on voinut silti edetä. Tarkista tila ja postilaatikko. |
| R03 / `relay_unauthorized` | HTTP 401/403 tai relay hylkäsi HMAC:n/ajan. Tarkista deploymentin käyttöoikeus ja salaisuuksien vastaavuus. Ei salaisuuksien tulostusta. |
| R04 / `relay_auth` | Vastauksen HMAC/operationId ei vastaa pyyntöä. Väärä projekti/salaisuus tai virheellinen vastaus. |
| R05 / `relay_configuration` | Väärä redirect, julkaisuosoite tai allekirjoitettu vastaanottaja-/kiintiöasetusvirhe. |
| R06 / `relay_response` | Ei odotettua allekirjoitettua JSON-vastausta, esim. Googlen HTML-virhesivu. Tarkista GASin julkaistu versio ja valtuutus. |
| R07 / `relay_rate_limit` | HTTP 429. Odota ja tarkista tila. |
| R08 / `relay_quota` | Allekirjoitettu ennen lähetyksen aloitusta saatu päivä-/MailApp-kiintiövirhe. Vain varmasti aloittamaton `ARCHIVE_FAILED` voidaan uusia. |
| R09 / `relay_busy` | GAS-lukko varattu. Status myöhemmin. |
| R10 / `relay_journal_full` | Toimituslokin tilaraja. Älä tyhjennä epäselviä merkintöjä. Selvitä ylläpidossa. |
| R11 / `relay_record_missing` | GAS ei voi todistaa vanhaa toimitusta. Älä tulkitse puuttuvaa merkintää luvaksi lähettää uudelleen. |
| R12 / `relay_outcome_unknown` | MailApp-sivuvaikutuksen tulos epäselvä. Ei automaattista uusintaa. |
| R13 / `relay_rejected` | Muu allekirjoitettu hylkäys. Tarkista kirjaston ja Code.gs:n yhteensopivuus. Ei palvelimen raakavirhettä käyttäjälle. |

`prepare` ei lähetä postia. Se voi tarkistaa generaattorin vastaavuuden, mutta se ei yksin varmista vastaanottoa. ContentService-uudelleenohjaus seurataan vain `script.googleusercontent.com`-palveluun GET-pyyntönä; alkuperäistä postitusta ei tehdä uudelleen. Epäonnistunut statustarkistus säilyttää aikaisemman toimitus-/arkistotiedon.

## Epäselvän arkiston palautus

1. Älä nollaa tilaa, poista raporttia tai luo uutta lähetysyritystä. Tarkista postilaatikko ja **Tarkista lähetys**.
2. Lataa hyväksytyn raportin alkuperäinen PDF ja .khtreport tai hae ne arkistoviestistä. Säilytä molemmat yrityksen palautettavassa arkistossa. Älä käytä tulostettua/uudelleen muunnettua PDF:ää.
3. Avaa **Merkitse arkistoiduksi**, valitse molemmat talletetut tiedostot ja vahvista tunnus sekä palautettavuus. Tavallinen vahvistus vertaa niitä luotetun relayn antamiin tarkisteisiin.
4. Jos relayn varmennus puuttuu, avaa **Käsin talletetun arkiston vahvistus**, tarkista PDF:n sisältö ja .khtreportin oikea hyväksytty raportti, kirjoita perustelu ja vahvista. Palvelin tarkistaa .khtreportin alkuperäiset tavut ja hyväksytyn otoksen. Valitun PDF:n SHA-256 lasketaan selaimessa. Tämä on **nimetty Adminin tiedostovakuutus**, ei uusi riippumaton palvelin-PDF-varmennus tai sähköpostin toimituskuittaus. PDF:n sisältöä ei lähetetä Workeriin.
5. Arkisto merkitään vahvistetuksi; pilviraportti säilyy. Jos PDF:n luotettu vertailutieto puuttuu tai sähköpostin tulos on selvittämättä, pysyvä poisto on estetty. Ylläpito voi myöhemmin varmentaa saman generaattorin PDF:n **Kehittäjän vianmääritys → Valmistele arkiston tarkisteet** ja sulkea lähetysoperaation tavallisella uudella vastaanoton vahvistuksella. Ensimmäistä vastaanottokuittausta/auditointia ei kirjoiteta uudelleen. Väärän PDF:n perusteella tehtyä vahvistusta ei korjata vaivihkaa; säilytä tiedot ja selvitä hallitusti.

## Säilytys ja tarjouspyynnöt

- **Hallinta → Säilytysasetukset**: oletuksena sovelluksessa ei ole säilytysaikaa. C:n nimenomaisesti konfiguroitu palvelinasetus säilyy varavaihtoehtona, kunnes sovellukseen tallennetaan käytäntö. Uusi käytäntö on versioitu ja päivätty Helsingin päivämäärän mukaan. Voimaantulopäivää ei voi takauttaa. Enintään 20 versiota; rajan jälkeen ylläpitomuutos vaaditaan historian hävittämisen sijaan.
- Tuleva ensimmäinen sovelluskäytäntö sulkee C:n varavaihtoehdon; ennen voimaantuloa poisto pysyy estettynä. `ARCHIVE_DELETE_ENABLED` jää erilliseksi palvelimen poiston turvakytkimeksi. Pelkkä käyttöliittymässä määritetty aikaraja ei ota poistoa käyttöön. Ei oletusarvoista kahta vuotta, TTL:ää tai ajastettua poistoa.
- Poisto vaatii nykyisen käytäntöversion, vähimmäisajan, vastaanottovarmennuksen, ratkaistut viesti-/kuvaoperaatiot sekä Adminin erillisen säilytysvelvoitteiden tarkistuksen ja vahvistuksen.
- CONTACT 3.1 ei säilytä tarjouspyyntöjen sisältöä Reportissa. **Hallinta → Tarjouspyynnöt → Tuo tarjouspyyntö sähköpostista** käyttää alkuperäistä CONTACT-tunnusta. Sama tunnus ja sama sisältö ovat idempotentteja, eri sisältö estetään. Hyväksyntä luo yhden **vastuuhenkilöittä olevan** uuden työtilauksen; työntekijä valitaan erikseen. Asiakkaan toivottu ajankohta säilyy pyynnössä ja työraportin huomiona, ei vahvistettuna kalenterivarauksena.
- Automaattinen CONTACT-siirto vaatisi validoinnin ja varmistetun sähköpostihyväksynnän jälkeisen palvelinten välisen, erikseen autentikoidun idempotentin rajan sekä turvallisen uudelleenyrityslokin. Selain ei kirjoita Firestoreen. Tätä rajaa ei oteta käyttöön D:ssä eikä nykyistä CONTACT-toimitusta muuteta.

## Palautus vanhaan julkaisuun

Älä käynnistä vanhaa Worker/frontend-paria uusien D-hyväksyntöjen päällä. Turvallinen ensitoimi on jättää data ja GAS-loki paikoilleen, sulkea työnkulun kirjoitukset huoltotauolla ja palauttaa koko yhteensopiva D-versio tai korjattu julkaisu. Vanhat C-hyväksynnät ovat tavuyhteensopivia. D:n `pdfLayout:2`-hyväksyntöjä ei muuteta C-muotoon. Tarvittaessa pidä D:n luku- ja arkistotuki käytössä, kunnes kaikki uudet raportit on hallitusti käsitelty. Älä poista käytäntöhistoriaa, tarjouspyyntöjä tai poiston hautakiviä rollbackissa. Ei datamigraatiota, tunnusten nollausta tai automaattista tiedostojen uudelleenkirjoitusta.

## Ennen tuotantohyväksyntää

- [ ] GAS-editori tallentaa uuden koko PdfLibraryn ja `/exec` suorittaa oikean deployment-version.
- [ ] Adminin `prepare` palauttaa varmennetun vastauksen ilman oikeaa postitusta.
- [ ] Omistajan erikseen käynnistämä synteettinen sähköpostitesti: MailApp-hyväksyntä, oikea postilaatikkovastaanotto ja molempien liitteiden riippumaton tarkistus. Ei asiakastietoja testiin.
- [ ] Workers Freen todellinen CPU-/alikutsumäärä hyväksytään edustavalla raportilla ja yhteenvetosivulla; paikallinen ajo ei todista Cloudflaren CPU-kiintiön alittumista.
- [ ] Säilytysaika, arkiston sijainti, varmistukset ja lakisääteiset/toiminnalliset rajoitteet sovittu omistajan ja kirjanpitäjän kanssa. Sovellus ei ratkaise näitä oikeudellisia tosiasioita.
- [ ] Vahvista ennen oikeiden tarjouspyyntöjen käsintuontia tietosuojainformoinnin kattavuus: yhteystietojen ja kuvauksen kopioiminen postista Adminin Firestore-työtilaan sekä myös hylättyjen pyyntöjen säilytys. Ei automaattista CONTACT-siirtoa tai keksittyä säilytysaikaa.
- [ ] Puhelimen aito allekirjoitus, valokuva, .khtreport-valinta, työn jatkaminen, NFC-suoraosoite ja PWA-asennus kokeiltu kohdelaitteessa.

Rajojen lähteet tarkistettu 14.11.2026: [Workers Free](https://developers.cloudflare.com/workers/platform/limits/) (10 ms CPU, 50 alikutsua/pyyntö), [Firestore Spark](https://firebase.google.com/docs/firestore/quotas) (1 GiB, 50 000 lukua/20 000 kirjoitusta päivässä), [GAS-kiintiöt](https://developers.google.com/apps-script/guides/services/quotas), [ContentService-uudelleenohjaukset](https://developers.google.com/apps-script/guides/content#redirects). Ei uutta maksullista palvelua, korttia tai Blaze-toimintoa.
