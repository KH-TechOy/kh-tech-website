# CONTACT 3.0 — tuotantoon tarkoitettu sähköpostipolku

Päivitetty 9.11.2026. Työ `main`-haaralla paikallista tarkistusta varten. **Ei pushia, palvelinten käyttöönottoa tai oikeita sähköposteja. Todellista postilaatikkotoimitusta ei ole todennettu, eikä tuotantovalmiutta hyväksytty.**

## Toteutus

Julkisen lomakkeen nykyiset kentät ja Liquid Glass -ulkoasu säilyvät. Käyttöönottokelpoinen lähdeketju on React → Cloudflare Free Worker / Turnstile → HMAC-allekirjoitettu Google Apps Script → MailApp. Vastaanottaja on vain Googlen Script Propertiesissa. Sender on julkaiseva Google-tili; asiakkaan sähköposti on tarvittaessa Reply-To. Ei avoimen vastaanottajan kenttää, automaattista asiakassähköpostia tai markkinointia.

- `contact/worker.ts`: exact-origin CORS/preflight, vain POST JSON, 16 KiB myös luettaessa, tiukka kenttäskeema ja kokorajat, honeypot, Turnstilen palvelinvarmennus sekä action/hostname-tarkistus. Tuntemattomat kentät ja vastaanottaja-/header-injektiot hylätään.
- SQLite-pohjainen Durable Object -namespace: atominen pyyntövaraus ja pysyvät rajoittimet. 5 yritystä/IP:n 10 minuutin aikaikkuna, lisäksi uusille sähköpostiyrityksille 20/tunti ja 80/UTC-vuorokausi. Cloudflaren IP-headerista lasketaan salaisella avaimella jaksokohtainen tiiviste; ei raakaa IP:tä omassa tietokannassa. CORS ei ole tunnistautuminen tai yksin riittävä väärinkäytön torjunta.
- `apps-script/contact/Code.gs`: erillinen julkaistava projekti. HMAC + 5 minuutin envelope-ikä, riippumaton kenttä-/UTF-8-kokotarkistus, kiintiön tarkistus ja ScriptLock. Script Propertiesiin kirjataan tila **ennen** MailApp-kutsua. Vanhaa raportti-/jaetun salasanan luonnosta ei oteta käyttöön eikä raportin backendiksi.
- Google ContentService -ohjaus käsitellään palvelimella vain `script.googleusercontent.com`-hostiin, HTTPS:llä, GET-pyynnöllä ilman alkuperäistä allekirjoitettua sisältöä. Uutta ohjausketjua ei seurata. Google-vastauksen HMAC ja tunnus tarkistetaan. Runtime-testi löysi ja korjasi Workerin puuttuvan `redirect: "error"` -tuen: molemmat fetchit käyttävät hallittua `manual`-käsittelyä.
- Suomalaiseen sähköpostiin kaikki alkuperäiset kentät, palvelimen aika Europe/Helsinki, viite ja kiireellisyys. Aiheessa `[KH-Tech][TARJOUSPYYNTÖ][KHT-YYYYMMDD-XXXXXXXXXXXX]`, kiireellisessä lisäksi `[KIIREELLINEN]`. Vain plain text, ei HTML:ää tai liitteitä. Ei päivystys-/vasteaikalupausta.
- Julkiset asetukset `.env.example`: `VITE_CONTACT_API_URL`, `VITE_TURNSTILE_SITE_KEY`. **Ne ovat nyt tyhjiä**: normaali tuotantobuild pitää lähetyksen pois käytöstä eikä lataa Turnstilea. Tämä on puuttuva käyttöönottoasetus, ei demo-/testivälitys tai simuloitu toimitus. Tuotantokoodissa ei ole testivastinetta tai turvasuojauksen ohitusta.

## Viite, uudelleenyritys ja epäselvät sivuvaikutukset

Worker luo `KHT-YYYYMMDD-XXXXXXXXXXXX`-viitteen palvelimen Suomen päivämäärästä ja 6 kryptografisesta satunnaistavusta. Sama tunnus on sähköpostissa ja asiakkaan vastauksessa. Google suojaa myös harvinaisen tunnustörmäyksen ennen lähetystä. Ei henkilötietoa tai muistissa kasvatettavaa laskuria.

Selain luo kryptografisen idempotenssiavaimen, jossa on 48 tunnin tarkistusjakson alku. Worker tallentaa avaimen tiivisteen perusteella sisältötiivisteen, tunnuksen, tilan ja ajat; sama avain + eri sisältö hylätään. Vanhentunutta avainta ei hyväksytä uudeksi toimitukseksi, vaikka ledger olisi jo siivottu.

Tilat: `pending` → `sent`, `not_sent` tai `unknown`. **MailApp ei tarjoa transaktiota, omaa idempotenssiavainta tai postilaatikon toimituskuittausta. Täsmälleen yhden saapuvan viestin takuuta ei väitetä.** Jos palvelu epäonnistuu sähköpostin sivuvaikutuksen jälkeen, sitä ei yritetä automaattisesti uudestaan. Status-reitti voi vain lukea Googlen ledgeristä vahvistuksen; se ei kutsu MailAppia. Ratkaisematon `unknown` käsitellään tunnuksella puhelimitse. Tämä voi jättää oikean epäonnistumisen manuaalisesti selvitettäväksi, mutta ei muuta epäselvää tilaa uudeksi hyväksytyksi toimitukseksi.

Lomakkeella loading, synkroninen kaksoispainalluksen lukko, kenttävirheet, säilyvät kentät ja palvelinvahvistuksen tunnus. Vahvistus saa näppäimistöfokuksen. Teksti kertoo täsmällisesti lähetyspalvelun vahvistuksesta ja ettei se takaa postilaatikkoon saapumista. HTTP 200 / `accepted:true` yksin ei kelpaa onnistumiseksi. Verkko- tai epäselvässä virheessä lomake lukitaan status-tarkistukseen; sivun päivitys palauttaa tarkistusmahdollisuuden sessionStorage-avaimesta **ilman viestisisällön tallennusta**. Estetystä selaintallennuksesta kerrotaan. Asiakkaan on säilytettävä tunnus ja vältettävä epäselvän pyynnön uutta lähetystä.

## Tietosuoja ja säilytys

Seloste kuvaa samaan buildiin konfiguroidun toiminnan: konfiguroitu lomake nimeää Googlen, Cloudflaren, Turnstilen, välityksen, teknisen ledgerin ja sessionStorage-merkinnän. Konfiguroimaton versio sanoo lähetyksen olevan pois käytöstä. Omistajan tilien sopimus-/siirtosuojia tai postilaatikon retentiota ei päätellä koodista. Pakollista tietosuojasuostumusta ei palautettu.

Viestisisältö on välityksessä ja vastaanottolaatikossa, ei omassa Worker-/Script Properties -tietokannassa. Tekniset tiivisteet ja tunnukset eivät ole sama asia kuin anonyymit tiedot. Pyyntömerkinnän tarkistusjakso 48 h; Worker alarm ja Googlella seuraava onnistuva tunnin cleanup. Rate-laskurit enintään vuorokauden. Ajastusten virheitä on valvottava. Tämä on **toteutuksen tekninen kesto**, ei keksitty yrityksen asiakas-/sähköpostisäilytysaika.

Lähdekoodi ei kirjoita asiakastietoja konsoliin; Workerin observability pois. Alustojen omat lokit ja tilien asetukset ovat omistajan tarkistuskohtia. Kuluttaja-Gmailin yrityskäytön sopimussoveltuvuus ja mahdollinen käsittelysopimus ovat nimenomaisia esteitä, kunnes vahvistettu. [Päivitetty auditointi](PRIVACY_DATA_FLOW_AUDIT.md) ja [hyväksyntälista](PRIVACY_APPROVAL_CHECKLIST.md).

## Raportti ja muu sivusto

Raportin ID, autentikointi, malli, PDF ja NFC-suoraosoite säilyivät muuttumattomina. Julkista raporttilinkkiä ei lisätty. Nykyinen vapaaehtoinen asiakkaan viite voi sisältää uuden pyyntötunnuksen. Tuleva erillinen viitekenttä/valtuutettu linkitys: [CONTACT_3_0_REPORT_LINKING.md](CONTACT_3_0_REPORT_LINKING.md). Peliä, kuvia tai heroja ei muutettu. GitHub Pages -buildiin lisättiin vain kahden julkisen repository variablen välitys Viteen; triggerit, oikeudet ja deploy-vaiheet säilyvät. Backend-salaisuuksia ei välitetä workflow'hun. Muuttujia ei asetettu eikä workflow'ta ajettu.

## Testit

- Frontend TypeScript ja erillinen Worker TypeScript hyväksytty.
- Kaikki unit-/paikalliset runtime-testit: **69/69**, joista CONTACT 3.0 -testejä **14**. [Tulokset](docs/contact30-checks/unit.json). Mukana 10 000 viitteen satunnaisuus-/muototarkistus, Suomen vuorokauden vaihtuminen, allekirjoitus/väärä ikä, riippumaton GAS-validointi, plain text / Reply-To, quota, cleanup, samanaikaiset idempotentit pyynnöt, muuttunut sisältö, expiry, IP-/global-rajoitus, Turnstilen hylkäys, kadonnut vastaus, väärä redirect ja allekirjoitus sekä MailApp-poikkeus. [Paikallisen runtime-ajon rajaus](docs/contact30-checks/local-runtime.json).
- Wrangler-bundle **dry-run** hyväksytty, SQLite-namespace ja migraatio validoitu. Ei deployta.
- Lomakkeen selain-/visuaalitestit konfiguroiduista tuotantobuildeista kolmessa koossa: **12/12 root ja 12/12 Pages**, ei virheitä tai epävakaita testejä. [Root](docs/contact30-checks/ui-root.json), [Pages](docs/contact30-checks/ui-pages.json). Käyttävät vain testin eristämiä palveluvastineita; ei oikeaa Turnstilea tai sähköpostia. Mukana latauslukko, kaksoispainallus, palvelinvahvistuksen referenssi/fokus, malformed `accepted:true` ilman onnistumista, katkeava verkko, reload/status ilman viestin uudelleenlähetystä, quota-/palvelinvirheet ja konfiguroidun buildin tietosuojateksti.
- Nykyiset sivuston tuotantoselaintestit root: **14 hyväksyttyä / 4 tarkoituksella ohitettua**, ei virheitä. Sisältää PDF:n, kuvat, offline-raportin, validoinnin ja sivuston navigaation. [Tulokset](docs/contact30-checks/root-browser.json). Mobiilissa ohitetut toistot suoritetaan työpöydällä.
- Nykyiset sivuston tuotantoselaintestit Pages: **14 hyväksyttyä / 4 tarkoituksella ohitettua**, ei virheitä. [Tulokset](docs/contact30-checks/pages-browser.json). Molemmat base-polut on rakennettu sekä uusilla julkisilla testiasetuksilla että ilman lähetysasetuksia. Nykyinen suuren erikseen ladattavan pelichunkin build-huomautus säilyy.
- Tietosuojan regressiot ilman julkaisuasetuksia: **9/9 root ja 9/9 Pages**. [Root](docs/contact30-checks/privacy-root.json), [Pages](docs/contact30-checks/privacy-pages.json). Säilyvät 19 osiota, metatiedot, hero, storage-/evästehavainnot ja NFC-tyyppinen raportin suora avaus/refresh/PDF/poisto. Lopullinen juuripolun build palautettu ilman lähetysasetuksia paikallista tarkistusta varten.
- Tuotantoriippuvuuksien auditointi: **0 ilmoitettua haavoittuvuutta**, ei yleinen tietoturvahyväksyntä. [Havainto](docs/contact30-checks/dependency-audit.json).
- Asset-/tuotantopoissulut hyväksytty: `node scripts/check-contact-build.mjs` ja `node scripts/check-website-assets.mjs`. Palvelinsalaisuuksien nimet, Google-endpoint ja testivastineiden osoitteet eivät sisälly konfiguroimattoman frontend-buildin JavaScriptiin. [Poissulut](docs/contact30-checks/build-exclusions.json). Erikseen tarkistettu, ettei omistajan ilmoittama sisäinen vastaanottaja esiinny frontendissä, buildissa tai julkisissa ohjeissa. [Havainto](docs/contact30-checks/recipient-exclusion.json).
- Raportin/PDF:n/autentikoinnin lähteet ja kaikki seitsemän alkuperäistä taustakuvaa säilyivät. Pages-workflow'n rajattu julkisten asetusten env-lisäys tarkistettu: [integriteettitarkistus](docs/contact30-checks/regression-integrity.json).

Kaappaukset `docs/contact30-screenshots/root/` ja `pages/` ovat oikeasta selaimesta, **palveluvastineilla**. Niitä ei esitetä todellisen toimituksen todisteena. Koot 390×844, 768×1024, 1440×900. Ensimmäisellä selainkierroksella korjattiin testin liian aikainen widget-painikkeen haku; se ei ollut tuotannon turvatarkistuksen ohitus. Lopulliset kaappaukset otetaan scrollin alusta Chromiumin pitkän sivun kiinteän skip-linkin kaappausartefaktin välttämiseksi. Oikeat laitteet ja Googlen/Cloudflaren tilit eivät kuulu näiden testien todennettuun ympäristöön.

## Omistajan jäljellä olevat askeleet / julkaisuesteet

1. Vahvista Google-kuluttajatilin ja Cloudflare Free -palvelujen sopimukset, siirrot, postilaatikon käyttöoikeudet ja säilytys sekä hyväksy tietosuojaseloste.
2. Luo erillinen Google-projekti, valtuuta MailApp, aseta vastaanottaja ja HMAC-avain, cleanup-trigger ja versionoitu `/exec`. Luo Cloudflare Free Worker/SQLite ja oikea Turnstile-widget, aseta palvelinsalaisuudet. **Tarkat vaiheittaiset ohjeet:** [CONTACT_3_0_SETUP.md](CONTACT_3_0_SETUP.md).
3. Hyväksy erikseen oikeat testisähköpostit ja varmista postilaatikon saapuminen, Reply-To, sama viite, yksi viesti ja virhetapaukset [CONTACT_3_0_EMAIL_ACCEPTANCE.md](CONTACT_3_0_EMAIL_ACCEPTANCE.md) -menettelyllä. Mitään näistä ei merkitä tehdyn tässä työssä.
4. Aseta julkiset frontend-arvot vasta hyväksyttyyn buildiin ja myöhemmin erikseen hyväksyttyyn julkaisutyönkulkuun. Uusi workflow lukee repository variables `CONTACT_API_URL` ja `TURNSTILE_SITE_KEY`; ilman niitä lomake ei aktivoidu. Nykyinen main-push voi edelleen julkaista sivuston — siksi tässä ei pushata. Backendin julkaisu ei kuulu workflow'hun.
5. Jatka turvalliseen henkilöstötodennukseen, raportin toimitukseen/mobiili/PWA/NFC-laitetesteihin ja lopulliseen tuotannon tietoturva-/toiminnallisuushyväksyntään aiemmin sovitussa järjestyksessä.

**Lopputila: paikallinen toteutus ja toistettavat testit, ulkoinen käyttöönotto ja vastaanottotodiste puuttuvat. Ei tuotantovalmius- tai GDPR-hyväksyntää.**
