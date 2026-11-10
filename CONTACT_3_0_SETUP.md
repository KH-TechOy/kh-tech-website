# CONTACT 3.0 — omistajan käyttöönotto

**CONTACT 3.1, 10.11.2026:** käyttäjä ilmoittaa aiemman toimituksen varmennetuksi. Älä luo tilejä/avaimia/widgetiä uudelleen päivitystä varten. Käytä nykyisiä tuotantoasetuksia ja [CONTACT_3_1_REPORT.md](CONTACT_3_1_REPORT.md)-päivitysohjetta: GAS → Worker → frontend. Managed-widget tukee clientin `execution: execute` / `appearance: interaction-only` -asetuksia ilman Dashboard-muutosta. Tarkistus käynnistyy nyt Lähetä pyyntö -painikkeesta, eikä erillistä aktivointipainiketta ole. Alla oleva alkuperäinen ohje on uuden ympäristön perustamista varten; uuden version käyttöönoton jälkeinen live-testi tarvitaan erikseen.

Päivitetty 9.11.2026. Nämä ovat **manuaaliset ohjeet**, eivät suoritetun julkaisun tai postilaatikkotestin kuvaus. Älä julkaise tai lähetä testiviestejä ennen omaa nimenomaista hyväksyntääsi. Paikalliset testit korvaavat ulkoiset palvelut testivastineilla; tuotantokoodissa ei ole testipalvelua tai näennäistä onnistumista.

## Ratkaisu ja hyväksyntä ennen aktivointia

GitHub Pages → Cloudflare Worker + Turnstile → HMAC-todennettu Google Apps Script → MailApp → yksi yrityksen määrittämä postilaatikko. Google-puolen suora selainintegraatio jätettiin pois: ContentService ohjaa vastauksen `script.googleusercontent.com`-osoitteeseen, eikä Apps Script tarjoa tähän toteutukseen tarvittavaa hallittua CORS-preflightia. Worker antaa tarkat CORS-vastaukset ja tarkistaa Googlen allekirjoitetun vastauksen.

Toteutus soveltuu pieneen liikennemäärään maksuttomien kiintiöiden rajoissa, ilman tilausta. Maksuton palvelu ei takaa saatavuutta: kiintiön ylittyessä lähetys estetään. Älä ota maksullista suunnitelmaa käyttöön tätä varten. SQLite-pohjaiset Durable Objectit kuuluvat Cloudflaren Free-tasoon. Gmail-kuluttajatilin MailApp-kiintiö on dokumentaatiossa 100 vastaanottajaa vuorokaudessa; toteutus tarkistaa myös todellisen jäljellä olevan kiintiön. Muiden samalla tilillä toimivien skriptien käyttö kuluttaa samaa kiintiötä.

Vahvista ensin [tietosuojan hyväksyntälista](PRIVACY_APPROVAL_CHECKLIST.md): Google- ja Cloudflare-tilien sopimusehdot, henkilötietojen käsittelyroolit, siirtoperusteet, postilaatikon käyttöoikeudet ja säilytys. **Ilmainen kuluttaja-Gmail ei sellaisenaan todista yrityksen tarvitseman käsittelysopimuksen olemassaoloa.** Jos tilin ehdot eivät sovi yrityksen henkilötietojen käsittelyyn, pysäytä aktivointi ja valitse hyväksyttävä palvelu; älä keksi DPA:ta tai siirtosuojaa.

## 1. Luo palvelinavaimet omalla koneella

Tarvitset kaksi erillistä 32 tavun satunnaista avainta. Seuraava komento tuottaa yhden 64-merkkisen heksadesimaaliavaimen; suorita se kahdesti **itse**, älä liitä tuloksia tähän repoon, chattiin, selaimen VITE-muuttujiin tai testiraporttiin:

```powershell
node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))"
```

Ensimmäinen on `RELAY_SECRET` (Worker ja Apps Script), toinen vain Workerin `RATE_SECRET`. Tallenna yrityksen hallitsemaan salaisuuksien säilytyspaikkaan. Ei Gmail-salasanaa, sovellussalasanaa tai Gmail API -avainta tarvita.

## 2. Google Apps Script — erillinen yhteydenottoprojekti

1. Kirjaudu omistajan ilmoittamalle yrityksen Google-tilille. Tämä tili tulee sekä lähettäjäksi että alkuvaiheen vastaanottolaatikoksi. Älä käytä henkilökohtaista kehittäjätiliä. Suojaa tili monivaiheisella tunnistautumisella ja sovi käyttöoikeuksista.
2. Avaa `https://script.google.com/`, luo **uusi itsenäinen projekti**, esimerkiksi `KH-Tech yhteydenotot`. Kopioi **vain** `apps-script/contact/Code.gs`. Älä kopioi vanhan `apps-script/Code.gs`-tiedoston raportti-/salasanalogiikkaa tai `Index.html`:ää.
3. Ota projektiasetuksissa `appsscript.json` näkyviin ja kopioi `apps-script/contact/appsscript.json`. Aikavyöhyke Europe/Helsinki; ainoa OAuth-scope on `script.send_mail`. Projektin omat Script Properties -asetukset eivät edellytä sähköpostin luku- tai Drive-oikeutta. Projekti ei lue saapuneita viestejä eikä käytä Driveä/Sheetsia. Tarkista editorin Project OAuth Scopes ja todellinen valtuutus käyttöönotossa.
4. Lisää **Script Properties** -asetuksiin `RECIPIENT_EMAIL` = omistajan ilmoittama yrityksen vastaanottolaatikko sekä `RELAY_SECRET` = ensimmäinen avain. Vastaanottaja ei tule frontendistä. Tiliä vaihdettaessa sender määräytyy edelleen julkaisevasta Google-tilistä, ei `RECIPIENT_EMAIL`:stä.
5. Suorita editorista `authorizeContactMail` ja hyväksy pyydetyt oikeudet. Se tarkistaa kiintiön **lähettämättä sähköpostia**. Jos käyttöoikeusvaroitusta tai organisaation rajoituksia ei voida hyväksyä asianmukaisesti, pysäytä käyttöönotto.
6. Luo Triggers-näkymästä aikaperusteinen **tunnin välein** ajettava `cleanupContactLedger`. Hyväksy triggerin pyytämä valtuutus. Tämä poistaa vanhentuneet tekniset lokimerkinnät eikä lähetä postia. Testaa siivouksen onnistuminen ja valvo ajovirheitä.
7. Deploy → New deployment → Web app → Execute as **Me**, access **Anyone**. Julkinen URL tarvitsee tämän pääsyn, mutta sähköposti edellyttää oikeaa HMAC-allekirjoitusta. Kopioi `/exec`-URL palvelinasetukseksi. `/dev` ei kelpaa.
8. Päivityksessä Deploy → Manage deployments → Edit → **New version** → Deploy. Pelkkä editorin tallennus ei päivitä versionoitua `/exec`-toteutusta. Peru vanhat tarpeettomat deploymentit.

`doGet` ei paljasta asetuksia tai lähetä postia. Julkisen Apps Script -URL:n väärinkäyttö voi silti kuluttaa Googlen suorituskiintiötä; HMAC estää luvattoman sähköpostilähetyksen, ei Googlen alustan kaikkia palvelunestoyrityksiä.

## 3. Cloudflare Free ja Turnstile

1. Luo yrityksen hallitsema Cloudflare-tili. Workers Free ja Turnstile Free riittävät tämän arkkitehtuurin pieneen liikenteeseen. Maksullista tilausta tai omaa domainia ei tarvita; Worker voi käyttää `workers.dev`-osoitetta. Varmista ajantasaiset kiintiöt hallintanäkymästä.
2. Turnstile → Add widget → Managed, hostname **`kh-techoy.github.io`**, pre-clearance pois. Julkinen site key kuuluu frontend-asetukseen; secret key vain Workerille. Älä käytä tuotannossa Cloudflaren testiavainparia.
3. Tarkista `contact/wrangler.jsonc`: `ALLOWED_ORIGINS=https://kh-techoy.github.io`, `TURNSTILE_HOSTNAMES=kh-techoy.github.io`. Originissa **ei** ole `/kh-tech-website/`-polkua eikä loppukauttaviivaa. Tuleva custom domain lisätään molempiin täsmällisenä; ei `*`-jokeria tai mielivaltaista originin heijastamista. CORS ei voi erottaa saman GitHub Pages -originin projektipolkuja.
4. Aja projektin juuressa `npm ci`, `npm run check:contact`, `npm run test:contact`, `npm run contact:bundle`. Viimeinen on **dry-run**, ei julkaisu. Testit eivät lähetä oikeaa sähköpostia.
5. Kirjaudu itse `npx wrangler login`. Lisää neljä salaisuutta komennolla `npx wrangler secret put NIMI --config contact/wrangler.jsonc` (yksi nimi kerrallaan):
   - `GAS_URL`: Googlen versionoitu `/exec`-osoite.
   - `RELAY_SECRET`: sama ensimmäinen avain kuin Googlella.
   - `RATE_SECRET`: toinen erillinen avain.
   - `TURNSTILE_SECRET`: Turnstilen server-side secret.
6. Kun olet hyväksynyt palvelimen julkaisun, suorita **itse** `npx wrangler deploy --config contact/wrangler.jsonc`. SQLite-namespace syntyy `new_sqlite_classes`-migraatiosta. Älä korvaa sitä Free-tasolle sopimattomalla vanhalla KV-pohjaisella Durable Object -määrittelyllä. Huomaa: myös secret put voi luoda/päivittää palvelinversion; nämäkin komennot ovat omistajan käyttöönottoaskelia, niitä ei ajettu tässä työssä.
7. Älä kytke request-body-lokitusta, Workers Observabilitya tai `wrangler tail` -henkilötietotulostusta päälle tuotantotestissä. Lähdekoodi ei kirjoita asiakasviestejä konsoliin. Palveluntarjoajan oma lokitus/retentio on arvioitava erikseen.

Paikallisten asetusten esimerkki on `contact/.dev.vars.example`. Todelliset `.dev.vars` ja `.env.local` on jätetty Gitin ulkopuolelle. Paikallinen `wrangler dev` **voi lähettää oikeaa postia**, jos sille annetaan oikea Google-endpoint ja salaisuudet: älä paina lähetystä ilman erillistä hyväksyntää. Automaattiset testit eivät käytä niitä.

## 4. Selaimen konfigurointi ja hyväksytty toimitustesti

Älä muuta sivuston julkaisutyönkulkua tai pushaa keskeneräistä toimintoa. Ennen julkisen lomakkeen avaamista rakenna omistajan hyväksymää yksityistä paikallista testausta varten `.env.local`:

```dotenv
VITE_BASE_PATH=/kh-tech-website/
VITE_CONTACT_API_URL=https://OMA-WORKER.OMA-TILI.workers.dev/contact
VITE_TURNSTILE_SITE_KEY=OMA_JULKINEN_SITE_KEY
```

Nämä kaksi viimeistä ovat julkista konfiguraatiota, eivät salaisuuksia. Ilman molempia lomake pysyy pois käytöstä eikä Turnstilea ladata. Älä julkaise testidomainia tai testiavainparia. Vite lukee arvot buildissa: muuttaminen vaatii uuden buildin, selaimen välimuisti/service worker voi pitää vanhan version kunnes päivittyy.

Todellinen Turnstile hyväksyy vain sallitun hostin. Paikalliseen oikeaan toimitustestiin tarvitset **erillisen** testiwidgetin oikean julkisen avaimen localhost-hostille, Workerin erillisen staging-konfiguraation ja sallitun paikallisen HTTPS-originin (tai omistajan hyväksymän HTTPS-staging-sivun). Tuotannon Worker hyväksyy vain HTTPS-originin; älä avaa sitä tavalliselle HTTP-localhostille, jokerioriginille tai testin ohituslipulle. Yksinkertaisin manuaalinen reitti on omistajan hyväksymä saman lopullisen HTTPS-hostin julkaisu vasta kaikkien muiden julkaisuehtojen täytyttyä. **Tässä työssä kumpaakaan ei julkaista.**

Kun annat erillisen hyväksynnän oikeille testisähköposteille, seuraa [päästä päähän -testimenettelyä](CONTACT_3_0_EMAIL_ACCEPTANCE.md). Kirjaa vastaanottolaatikon havainto ennen julkaisuhyväksyntää. MailAppin virheetön paluu tarkoittaa lähetyspalvelun vahvistusta, **ei** todennettua saapumista. Asiakkaan näkymä tekee eron selväksi. Vahvistusviesti asiakkaalle on verkkosivulla, ei automaattinen toinen sähköposti.

Lopullinen GitHub Actions -build lukee samat **julkiset** asetukset repository variables -kentistä. Kun oikea toimitus ja julkaisu on hyväksytty, avaa repositorion Settings → Secrets and variables → Actions → **Variables** ja lisää `CONTACT_API_URL` = Workerin HTTPS `/contact`-URL sekä `TURNSTILE_SITE_KEY` = oikea julkinen site key. `pages.yml` välittää ne buildin `VITE_CONTACT_API_URL`- ja `VITE_TURNSTILE_SITE_KEY`-muuttujiksi. Tyhjät arvot pitävät lomakkeen pois käytöstä. Tässä työssä muuttujia ei aseteta, workflow'ta ei ajeta eikä pushata. Älä tallenna backend-salaisuuksia repository variables -kenttiin tai VITE-muuttujiin. Tarkista hyväksytty tuotantobuild ennen erikseen hyväksyttyä pushia/deployta; asetukset eivät päivity jo julkaistuun buildiin ilman uutta buildia.

## Ylläpito ja vikatilanteet

- Pyyntörajoitus: 5 yritystä IP-kohtaisessa 10 minuutin aikaikkunassa, uusille lähetysyrityksille lisäksi 20/tunti ja 80/UTC-vuorokausi. Kyse on aikaikkunoista, ei tarkasta liukuvasta kiintiöstä. IP tunnistetaan Cloudflaren asettamasta `CF-Connecting-IP`:stä, ei selaimen JSONista tai X-Forwarded-Forista. Pelkkä origin/honeypot ei ole roskapostisuoja.
- Lähetyksen metatiedot: Worker SQLite ja Googlen Script Properties. Ei viestisisältöä tietokantaan, Sheetsiin tai Driveen. Tarkistusjakso 48 h; avaimen ikä estää vanhan pyynnön lähetyksen myös siivouksen jälkeen. Googlen ajastettu poisto enintään seuraavassa onnistuvassa tuntiajossa, Workerin poisto alarmilla. Ajastusten viat voivat pidentää teknistä säilymistä; valvo niitä. Postilaatikon säilytys on erillinen omistajan päätös.
- Epäselvä toimitus: älä poista lokeja/avaimia tai pyydä asiakasta lähettämään heti uudestaan. Hae postilaatikosta pyyntötunnuksella, tarkista Googlen suorituksen tila ilman viestin sisällön lokitusta. Status-toiminto vain lukee, ei koskaan lähetä. Ratkaisematon epäselvyys käsitellään puhelimitse.
- Avaimen vaihto: tee hallittu huoltokatko. Yhden HMAC-avaimen toteutus ei tue rinnakkaista avainkiertoa; vaihda molemmat päät ja varmista oikea Google-versio. Älä menetä keskeneräisten pyyntöjen lokeja, kierrätä namespacea tai muuta idempotenssisääntöä tarkistusjakson aikana.
- Free-kiintiöt, hyökkäys tai Google-tilin rajoitus voivat estää palvelun. Puhelin ja julkinen sähköpostilinkki säilyvät vaihtoehtoina. Älä näytä onnistumista poikkeustilassa.

## Tarkistetut ensisijaiset lähteet

- [Google ContentService ja uudelleenohjaus](https://developers.google.com/apps-script/guides/content), [web app -julkaisu ja suorittava tili](https://developers.google.com/apps-script/guides/web).
- [Web app -manifesti](https://developers.google.com/apps-script/manifest/web-app-api-executable), [OAuth-scopet](https://developers.google.com/apps-script/concepts/scopes) ja [projektin Properties-palvelu](https://developers.google.com/apps-script/reference/properties/properties-service): erillinen minimaalinen lähetysoikeus, ei postilaatikon lukuoikeutta.
- [MailApp](https://developers.google.com/apps-script/reference/mail/mail-app): lähetys, Reply-To, quota; ei postilaatikon lukua tai toimituskuittausta. [Googlen muuttuvat kiintiöt](https://developers.google.com/apps-script/guides/services/quotas).
- [Turnstile server-side validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/): kertakäyttöinen, 5 minuutin token, success/action/hostname tarkistetaan palvelimella.
- [Durable Objects Free/SQLite](https://developers.cloudflare.com/durable-objects/platform/pricing/), [rajoitukset](https://developers.cloudflare.com/durable-objects/platform/limits/). Tarkista tiliä koskevat kiintiöt ennen aktivointia.
