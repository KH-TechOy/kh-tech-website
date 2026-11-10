# CONTACT 3.1 — yksi lähetyspainallus

Päivitetty 10.11.2026. Työ nykyisellä `main`-haaralla. Ei pushia, deployta, salaisuuksien vaihtoa tai oikeita sähköposteja tässä työssä. Käyttäjä ilmoittaa aiemman version oikean sähköpostitoimituksen onnistuneeksi. **Tämän uuden version käyttöönoton jälkeistä toimitusta ei ole vielä riippumattomasti testattu.**

## Käyttöliittymä

- Lomakkeen yläosan pysyvä sininen turvatarkistuslaatikko ja erillinen Tee turvatarkistus -painike poistettu. Nykyinen sivun asettelu, yritystiedot, kentät, hero, Liquid Glass -tyylit ja tietosuojalinkki säilyvät.
- Asiakas täyttää tiedot ja valitsee Lähetä pyyntö. Varmistetaan lähetystä… / Lähetetään… ja lomakkeen `aria-busy` kertovat vaiheesta. Synkroninen lukko estää myös ohjelmalliset ja nopean peräkkäisen lähetyksen tarkistuksen aikana.
- Jos Cloudflare vaatii vuorovaikutusta, Managed-haaste näytetään itsestään ja siirretään näkyviin/näppäimistöfokukseen. Muut asiakkaat eivät näe ylimääräistä tarkistusvaihetta. Virhe tai vanheneminen avaa saman toiminnon Yritä uudelleen -painikkeella. Kenttiä ei tyhjennetä.
- Onnistuminen vasta backendin `state: sent`, HTTP 200 ja oikeanmuotoisen palvelinviitteen jälkeen. Tekstit ovat käyttäjän pyytämät: **Kiitos yhteydenotostasi!**, **Pyyntösi on vastaanotettu ja välitetty KH-Techille.**, pyyntötunnus ja vapaaehtoisen säilyttämisen ohje. Kiireellisessä asiassa näkyy nykyinen puhelin, ilman päivystys-/vasteaikalupausta. Gmail-postilaatikon saapumistakuuta ei anneta.
- Kopioi tunnus kutsuu `navigator.clipboard.writeText`-API:a todellisella palvelimen palauttamalla viitteellä. `role=status` kertoo onnistumisesta tai käyttöoikeus-/API-virheestä; epäonnistumista ei merkitä kopioinniksi. Viitteen voi tällöin valita käsin. Uusi yhteydenotto nollaa nykyiset kentät ja palautteen kuten aiemmin.
- Kopiointi ei kirjoita localStorageen. Aiempi välilehtikohtainen lähetyksen tarkistusmerkintä säilyy vain idempotenssi-/palautustoiminnolle; kenttien sisältöä ei lisätä siihen. Epäselvä lähetys pysyy lukittuna status-tarkistukseen, joka ei lähetä uutta sähköpostia.
- Jos tämän paikallisen buildin julkiset lähetysasetukset puuttuvat, lähetys pysyy rehellisesti pois käytöstä; vain silloin tavallinen tekstiohje näkyy lähetysalueella. Ei korvaavaa pysyvää infolaatikkoa konfiguroidulle lomakkeelle.

## Turnstile ja Managed-widget

Nykyiset julkiset `VITE_CONTACT_API_URL` / `VITE_TURNSTILE_SITE_KEY` ja palvelinten salaisuudet säilyvät. Asetuksia ei korvata tuotannossa testiavaimilla. Testiosoite/site key ovat vain eristetyn automaatioprosessin konfiguraatiota, eikä tuotantokoodissa ole testitilaa tai ohitusta.

Asiakasohjelma lataa Cloudflaren alkuperäisen `api.js?render=explicit`-ohjelman vasta validin lähetyksen/status-tarkistuksen alussa. `turnstile.render` saa:

```js
{ execution: 'execute', appearance: 'interaction-only', action: 'contact',
  size: 'compact', retry: 'never', 'refresh-expired': 'manual',
  'refresh-timeout': 'manual', 'response-field': false }
```

Sen jälkeen `turnstile.execute(widgetId)` käynnistyy automaattisesti. Jokainen yritys luo uuden widgetin; vanha poistetaan, tokenia ei tallenneta tai käytetä uudelleen. Vanheneminen, interaktiivisen haasteen timeout, virhe, ohjelman latausvika ja kahden minuutin kokonaisodotus käsitellään. Yrityskohtainen tunniste estää vanhan callbackin vapauttamasta seuraavaa lähetystä. Ohjelman latauksella on 15 sekunnin aikaraja. Uutta idempotenssiavainta ei tallenneta ennen onnistunutta turvatarkistusta.

**Cloudflare Dashboardissa ei tarvita muutosta Managed-widgetiin.** Säilytä sen tyyppi Managed, oikea tuotannon site key, sallitut hostnamet ja nykyinen pre-clearance-asetus. Execution ja appearance ovat asiakkaan render-parametreja, eivät widgetin tyypin vaihto Invisibleksi. Jos muuttaminen Invisible-tyyppiin myöhemmin halutaan, se on erillinen päätös eikä tämän toteutuksen vaatimus. Tarvittava interaktiivinen haaste säilyy Managed-tilassa.

Ensisijainen lähde: [Cloudflare: widget configurations, execution/appearance ja Managed-koot](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/widget-configurations/). Palvelimen aiempi tokenin success/action/hostname-varmennus säilyy muuttumattomana. Ulkoisen haasteen todellinen toiminta nykyisellä tuotantowidgetillä pitää varmistaa käyttöönoton jälkeen; paikallinen testivastine ei ole sen todiste.

## Validaatio ja välttämätön GAS-yhteensopivuus

| Vastaustapa | Puhelin | Sähköposti |
| --- | --- | --- |
| `phone` | pakollinen ja kelvollinen | vapaaehtoinen, annettuna kelvollinen |
| `email` | vapaaehtoinen, annettuna kelvollinen | pakollinen ja kelvollinen |
| `both` | pakollinen ja kelvollinen | pakollinen ja kelvollinen |

Selaimen ja Workerin vaatimukset sekä sähköpostin ja puhelimen muodot tulevat samasta `contact/shared.ts`-lähteestä. Pakolliset tähdet/HTML-required tukevat käyttöä, mutta JS- ja palvelinvalidointi eivät nojaa niihin. Kummankin puuttuvan yhteystiedon oma suomalainen virhe liitetään kenttään `aria-describedby` / `aria-invalid`; yhteenveto saa fokuksen. Puhelinnumerossa tarvitaan vähintään viisi numeroa: pelkkä viiva-/sulkumerkkijono ei kelpaa. Aiempi sallittu merkkijoukko ja 40 merkin raja säilyvät. Sähköpostin nykyinen palvelinmuoto/160 merkkiä säilyy ja on nyt sama myös selaimessa.

Workerin `normalizeContact` valvoo uutta vaihtoehtoa ennen Turnstile-verifiointia ja Googlen kutsua. `contact/worker.ts`:n protokolla, HMAC, allowed origins, hostname/action, rate limiter, idempotenssi, CSPRNG-viitteet ja status-palautus eivät muutu. Muut kenttärajat ja sanitointi säilyvät.

Vanha Apps Script **hylkäisi `both`-vaihtoehdon** ja näyttäisi sille väärän yhteydenottotavan. Siksi `apps-script/contact/Code.gs`:ään tehtiin vain välttämätön enum-/pakollisuus-/puhelinmuodon yhteensopivuus ja Both-vaihtoehdon tekstimerkintä. MailApp, vastaanottajan Script Properties, Reply-To, quota, allekirjoitukset, ledger ja lukitukset eivät muuttuneet. Vanhojen phone/email-pyyntöjen viestimuoto säilyy. Manifestin scopeja ei muutettu.

Tietosuojasivun kaksi kohtaa päivitettiin automaattiselle tarkistukselle ja molempien yhteystietojen vaatimukselle, päiväys 10.11.2026. Uusia palveluita, säilytysaikoja tai oikeudellisia hyväksyntöjä ei lisätty. Raporttiin/PDF:ään/PWA:han, peliin, kuviin, logoihin tai julkaisutriggeriin ei tehty muutoksia.

## Testit ja visuaalinen tarkistus

- Frontend TypeScript ja Worker TypeScript: hyväksytty.
- `npm run test:contact`: **35/35** (17 backend + 18 vaatimusten yhtenevyyttä). Paikallinen workerd + SQLite Durable Object ja riippumaton GAS-harness, kaikki ulkoiset palvelut testivastineita.
- `npm test`: **90/90**, 11 tiedostoa. [Tulokset](docs/contact31-checks/unit.json). Myös aiemmat PDF-, raportti- ja 1 000 seedin pelitestit säilyvät.
- Worker bundle / Wrangler dry-run: hyväksytty testiajossa. Ei deployta.
- Konfiguroidun tuotantobuildin lomaketestit: **30/30 root ja 30/30 Pages**, koossa 390×844, 768×1024 ja 1440×900. [Root](docs/contact31-checks/ui-root.json), [Pages](docs/contact31-checks/ui-pages.json). Mukana oikea selaimen Clipboard API -kirjoitus/luku, erikseen estetty kopiointi, kolmen vastaustavan pakolliset ja virheelliset kentät, yksi lähetyspainallus, automaattinen Managed-suoritus, tarvittavan haasteen ilmestyminen, vanheneminen/virhe/latausvika/timeout, vanha callback, tuore token backend-hylkäyksen jälkeen, kaksoispainallus ja status-palautus. Ulkoiset haaste-/lähetyspalvelut ovat testivastineita.
- Molemmat tuotannon base-polut rakentuvat sekä julkisilla, eristetyillä testiasetuksilla että ilman lähetysasetuksia. Nykyinen suuren, erikseen ladattavan pelichunkin huomautus säilyy.
- Aiemmat sivusto-/PDF-/PWA-testit työpöytäprojektissa: **6/6 root ja 6/6 Pages**, tietosuojan/raportin suoraosoitteen regressiot työpöytäprojektissa **3/3 root ja 3/3 Pages**. [Root-sivusto](docs/contact31-checks/root-browser.json), [Pages-sivusto](docs/contact31-checks/pages-browser.json), [root-tietosuoja](docs/contact31-checks/privacy-root.json), [Pages-tietosuoja](docs/contact31-checks/privacy-pages.json). Yhteensä uuden lomakkeen testien kanssa **78 onnistunutta selaintarkistusta**, ei ohituksia tai epävakaita testejä. Näissä vanhoissa regressioissa ajettiin työpöytäprojekti; uuden lomakkeen kaikki ominaisuudet testattiin kolmessa koossa.
- `node scripts/check-contact-build.mjs` ja `node scripts/check-website-assets.mjs`: hyväksytty molemmissa base-poluissa. Konfiguroimattoman frontendin salaisuus-/testivastinepoissulut ja viralliset tunnukset/PWA säilyvät. [Poissulut](docs/contact31-checks/build-exclusions.json). Lopullinen paikallinen tuotantobuild palautettiin juureen ilman testiasetuksia; yrityksen nykyisiä tuotantoasetuksia ei muutettu.

Oikeat selainkaappaukset tarkistettiin silmämääräisesti, eikä vaakaylivuotoa havaittu:

| Koko | Valmis lomake | Vahvistus ja kopiointi | Tarvittaessa näkyvä haaste |
| --- | --- | --- | --- |
| 390×844 | [kuva](docs/contact31-screenshots/root/mobile-ready-form.png) | [kuva](docs/contact31-screenshots/root/mobile-accepted-and-copied-fixture.png) | [kuva](docs/contact31-screenshots/root/mobile-interactive-challenge-fixture.png) |
| 768×1024 | [kuva](docs/contact31-screenshots/root/tablet-ready-form.png) | [kuva](docs/contact31-screenshots/root/tablet-accepted-and-copied-fixture.png) | [kuva](docs/contact31-screenshots/root/tablet-interactive-challenge-fixture.png) |
| 1440×900 | [kuva](docs/contact31-screenshots/root/desktop-ready-form.png) | [kuva](docs/contact31-screenshots/root/desktop-accepted-and-copied-fixture.png) | [kuva](docs/contact31-screenshots/root/desktop-interactive-challenge-fixture.png) |

Vastaavat Pages-kuvat ovat `docs/contact31-screenshots/pages/`. Raportti-/peli-/hero-lähteiden ja Workerin turvatransportin säilyminen tarkistettu: [integriteettitarkistus](docs/contact31-checks/protected-source-integrity.json). Ensimmäisen testikierroksen kolmen vastaustavan toistot korjattiin aloittamaan seuraava pyyntö nykyisen Uusi yhteydenotto -toiminnon kautta; sessionStorage-palautus lukitsi tarkoituksellisesti aiemman pyynnön pelkän sivupäivityksen jälkeen.

Paikalliset selainkuvat sisältävät selvästi merkityn haaste-/palveluvastineen. Ne todistavat sovelluksen asettelua ja virhe-/vahvistusnäkymiä, eivät nykyisen Cloudflare-widgetin oikeaa haastetta tai todellista sähköpostitoimitusta. Fyysisiä puhelimia tai käyttöönoton jälkeistä live-toimitusta ei väitetä testatuiksi.

Perustarkistusten toisto PowerShellissa (tarvittaessa `GAME_BROWSER_EXECUTABLE` osoittaa asennettuun Chromiumiin):

```powershell
npx.cmd tsc -b
npm.cmd run check:contact
npm.cmd run test:contact
npm.cmd test
npm.cmd run contact:bundle # vain dry-run
npm.cmd run test:contact-ui # eristetty kehityspalvelin ja verkkovastineet
```

Konfiguroidun tuotantobuildin lomaketesti tehtiin erillisessä testiprosessissa käyttäen vain `https://contact-api.example.test/contact`-osoitetta ja `browser-fixture-site-key`-arvoa, jotka Playwright korvaa paikallisilla vastineilla. `CONTACT_UI_PRODUCTION=1` vaihtaa testipalvelimen previewksi; buildin base toistettiin `/` ja `/kh-tech-website/`. **Tällaista testibuildia ei julkaista.** Lopuksi rakennetaan normaali juuribuild ilman näitä testiarvoja. Normaali frontend käyttää edelleen vain yrityksen nykyisiä julkisia ympäristöasetuksia, eikä testiarvoja lisätty tuotannon `.env`-tiedostoihin, repo variables -asetuksiin tai työnkulkuun.

## Päivityksen julkaiseminen omistajan erillisellä hyväksynnällä

1. Säilytä nykyiset palvelutilit, vastaanottaja, avaimet, endpoint, site key, origin/hostname ja Durable Object -namespace. Älä luo uutta ledger-namespacea tai tyhjennä vireillä olevia pyyntöjä.
2. Päivitä olemassa olevaan **yhteydenottojen** Google-projektiin `apps-script/contact/Code.gs`; Deploy → Manage deployments → nykyinen Web app → Edit → New version → Deploy. Pidä nykyinen `/exec`-URL. Älä käytä historiallista raportti-/salasanaluonnosta. Ei uusia OAuth-oikeuksia. Varmista, että myös phone/email toimivat kuten ennen.
3. Tarkista `npm run check:contact`, `npm run test:contact` ja `npm run contact:bundle`. Julkaise sitten päivitetty Worker **itse hyväksytyssä julkaisuvaiheessa** nykyiseen palveluun samalla configilla: `npx wrangler deploy --config contact/wrangler.jsonc`. Tämä deploy-komento ei kuulunut tähän paikalliseen työhön.
4. Julkaise frontend vasta, kun GAS ja Worker hyväksyvät uuden `both`-vaihtoehdon. Käytä nykyisiä GitHub repository variables `CONTACT_API_URL` ja `TURNSTILE_SITE_KEY`, samaa Managed-widgetiä ja Pages-basea. Workflow'hun ei tarvita muutoksia. Huomioi vanhan PWA/selaimen välimuistin päivitys.
5. Tee erikseen hyväksytty oikea testi: phone, email, both, haaste tarvittaessa, uusi token uudelleenyrityksessä, sama server-viite, kopiointi ja oikean viestin saapuminen nykyiseen laatikkoon. Varmista ilmoituksen oikea yhteydenottotapa ja Reply-To sekä ettei kaksoispainallus tuota toista viestiä. Testaa myös Android/iPhone ja haasteen käytettävyys. Älä laske Lähetetyt-kansion kopiota saapumisnäytöksi.

**Tässä työssä tehtiin vain paikalliset muutokset ja testit. Ei pushia/deployta eikä väitettä uuden version varmennetusta live-toimituksesta.**
