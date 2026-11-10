KH-TECH OY – VERKKOSIVU, TYÖRAPORTTI JA PELI

REPORT 2.0 A — 10.11.2026
  Henkilökohtainen Firebase email/password, Admin/Employee ja erillinen
  Cloudflare Workers Free -käyttäjähallinta. Spark, ei korttia tai Blazea.
  Raportti avataan suoraan NFC-URL:stä; julkisessa navigaatiossa ei linkkiä.
  Ilman oikeita asetuksia raportti on suljettu. Ei jaettua salasanaa.
  Editorin/PDF:n tietomalli säilyy. Uusi luonnos on UID-kohtainen
  sessionStorage-luonnos, joka poistuu uloskirjautumisessa tai käyttöestossa.
  Vanha yhteinen localStorage ei avaudu automaattisesti; admin voi tuoda
  sen nimenomaisesti. Vanha tieto on poistettava erikseen laitteelta.
  Pilviraporttien/tilausten/arkiston täysi työnkulku on seuraava vaihe.
  Käyttöönotto ja ensimmäinen admin: REPORT_2_0_FIREBASE_SETUP.md.
  Valtuutus ja tietomalli: REPORT_2_0_SECURITY.md.
  Tulokset ja todelliset julkaisuesteet: REPORT_2_0_A_RESULT.md.
  npm.cmd test / npm.cmd run check:report / npm.cmd run test:report
  npm.cmd run build / npm.cmd run report:bundle (vain dry-run)
  Testit käyttävät vain demo-emulaattoria; ei oikeaa postia tai avaimia.
  Main-haara, paikallinen commit. Ei pushia, deployta tai laskutusta.

CONTACT 3.1 — 10.11.2026
  Lomake käynnistää Managed Turnstilen automaattisesti yhdestä lähetyksestä.
  Ei erillistä aktivointipainiketta tai pysyvää sinistä ohjelaatikkoa.
  Puhelin/sähköposti/molemmat validoidaan selaimessa, Workerissa ja GASissa.
  Vahvistuksessa palvelimen tunnus ja oikea Clipboard API -kopiointi.
  Nykyiset site key / salaisuudet / origin- ja hostname-asetukset säilyvät.
  Managed-widgetille ei tarvita Dashboard-muutosta. Käyttöönottopäivitysten
  järjestys: GAS uusi versio -> Worker -> frontend. Älä pushaa/deployaa
  automaattisesti. Uuden version live-testistä ei ole tässä työssä näyttöä.
  Raportti, testit ja tarkat päivitysohjeet: CONTACT_3_1_REPORT.md.

CONTACT 3.0 — 9.11.2026
  Todellinen lähetyskoodi: contact/worker.ts ja apps-script/contact/Code.gs.
  Käyttöönotto: CONTACT_3_0_SETUP.md. Oikean postilaatikkotestin menettely:
  CONTACT_3_0_EMAIL_ACCEPTANCE.md. Raporttiliitos: CONTACT_3_0_REPORT_LINKING.md.
  Toteutus ja testit: CONTACT_3_0_REPORT.md.
  npm.cmd run check:contact   (Worker TypeScript)
  npm.cmd run test:contact    (paikallinen workerd/SQLite + testivastineet)
  npm.cmd run test:contact-ui (eristetty käyttöliittymätesti; ei oikeaa postia)
  npm.cmd run contact:bundle  (Wrangler dry-run; ei deployta)
  .env.example sisältää vain julkiset API-URL/site key -asetukset. Ilman niitä
  lähetys pysyy pois käytöstä. Google/Cloudflare-salaisuudet vain palvelimella.
  Pages-build lukee julkiset repository variables -arvot CONTACT_API_URL ja
  TURNSTILE_SITE_KEY. Aseta ne vasta hyväksytyn oikean toimitustestin jälkeen.
  Vanha apps-script/Code.gs on historiallinen raportti-/salasanaluonnos,
  sitä ei julkaista yhteydenottopalveluksi. Main-haara, paikallinen commit.
  Ei pushia, deployta tai oikeaa testipostia ilman erillistä hyväksyntää.

WEBSITE 2.5 – TUOTANTOON VALMISTELU JA TIETOSUOJA
  Tavoite on oikea tuotantopalvelu. Vanhojen erien demo- ja
  salasanaluonnokset ovat historiaa, eivät tuotannon käyttöoikeusratkaisu.
  Vahvistetut tietovirrat: PRIVACY_DATA_FLOW_AUDIT.md.
  Ennen julkaisua ratkaistavat asiat: PRIVACY_APPROVAL_CHECKLIST.md.
  Toteutus ja testit: WEBSITE_2_5_PRIVACY_REPORT.md.
  Sisäinen raportti avataan suoraan NFC-kortin osoitteesta, ei julkisesta
  navigaatiosta. Kortin URL ei korvaa palvelinpuolista kirjautumista.
  Ei pushia tai deployta. Tulevat vaiheet: sivusto → tietosuoja → oikea
  lomakesähköposti → henkilöstötodennus → raportti/PWA → hyväksyntätestit.
  Vanhempia käyttöönotto-/push-komentoja ei saa käyttää tuotannon
  julkaisuun ennen PRIVACY_APPROVAL_CHECKLIST.md:n esteiden ratkaisemista.
  Tietosuojan selain-/tietovirtatestit: npm.cmd run test:privacy.
  Kuva 7 WebP-muotoon: python scripts/build-website-backgrounds.py --privacy.

WEBSITE 2.4 – ALASIVUJEN HEROT
  Palvelut-, Yritys- ja Yhteystiedot-sivut käyttävät samaa taustakuva-
  komponenttia ja lasipaneelia kuin etusivu. Vain yläherot muuttuvat.
  Alkuperäiset kuvat: docs/website_bg_4.png–website_bg_6.png.
  Raportti: WEBSITE_2_4_SUBPAGES_REPORT.md.
  Kuvien uusinta: python scripts/build-website-backgrounds.py --subpages
  (Pillow; ei muuta etusivun kuvia). Selainkatselmointi:
  node scripts/review-subpage-glass.mjs. Tuotantoajoa varten rakenna
  sivusto ja aseta WEBSITE_PRODUCTION=1 sekä haluttu VITE_BASE_PATH.
  Kaappaukset: docs/website24-screenshots/final/.
  Samalla korjattu hyväksytty vanha tablettinäkymän yhteystietoruudukko.

WEBSITE 2.3 – ETUSIVUN TAUSTAT JA LIQUID GLASS
  Heron, yritysesittelyn ja peliesittelyn nykyisten tekstien taakse
  lisätään toimitetut koko leveydelle ulottuvat kuvat ja lasipaneelit.
  Alkuperäiset docs/website_bg_*.png-kuvat säilyvät muuttamattomina.
  Optimoidut WebP-kuvat: public/website/. Raportti ja tarkistusohjeet:
  WEBSITE_2_3_LIQUID_GLASS_REPORT.md. Peli ja raporttitoiminnot säilyvät.
  Kuvien uusinta: python scripts/build-website-backgrounds.py (Pillow).
  Selainkatselmointi: node scripts/review-liquid-glass.mjs.
  Tuotantokatselmointia varten rakenna sivusto ja aseta
  WEBSITE_PRODUCTION=1 sekä VITE_BASE_PATH=/ tai /kh-tech-website/.
  Kaappaukset: docs/website23-screenshots/final/.

TOIMINTA-PAINIKE – 8.11.2026
  Pelissä on yksi Toiminta-painike. Se sulkee hanan, työntää laatikkoa
  tai avaa korjauksen lähimmän kohteen mukaan. E ja välilyönti tekevät
  saman toiminnon. Laatikkoa työnnetään edelleen sen takaa; törmäys- ja
  jumitustarkistukset säilyvät. Opastus ja ohjeet käyttävät yhtä painiketta.
  Tarkistusraportti: docs/action-review/README.md.

PUTKIMESTARI 3.0 – NYKYINEN PELIVERSIO
  Peli /peli/ käyttää alkuperäistä varjostettua rasteritaidetta, yhtenäisiä
  2.5D-seiniä, uusia hahmoja, kalusteita, putkia ja animoitua vettä.
  Pelimalli, ohjaus ja seeded-kenttägeneraattori säilyvät. Reittinuolia
  tai seuraavan kohteen pysyviä merkkejä ei näytetä. Tutki ja ratkaise
  itse; tavoitelista, paikalliset toimintovihjeet ja kuvitettu opastus
  auttavat toimintojen oppimisessa. Putkipulman virtausportit säilyvät.

  npm.cmd run dev               Avaa paikallinen /peli/.
  npm.cmd test                  49 yksikkötestiä, mukana 1 000 seediä.
  npm.cmd run test:game         Aidot syötteet kolmessa näyttökoossa.
  npm.cmd run build             Valmiit kuvat mukana; ei kuvapalvelua.
  node scripts/check-game3-assets.mjs
  npm.cmd run game:art          Pakkaa PNG-lähteet WebP-atlakseksi.
  node scripts/review-game3-art.mjs
  Grafiikan uusinta käyttää Playwright Chromiumia; tarvittaessa aseta
  GAME_BROWSER_EXECUTABLE kuten alempana. Ei API-avainta eikä verkkokutsua.
  Vanhan SVG-tuotannon komento: npm.cmd run game:art:legacy.
  Dokumentit: GAME_3_0_VISUAL_REPORT.md, GAME_3_0_ASSET_MANIFEST.md,
  GAME_3_0_VISUAL_COMPARISON.md. Kaappaukset: docs/game3-screenshots/.
  Alemmat GAME 2.x -osiot kuvaavat aiempia versioita. Ei pushia tai deployta.

Päivitetty 6.11.2026

SISÄLTÖ
  Suomenkielinen KH-Tech Oy:n yrityssivusto, yhteydenottolomake,
  paikallinen työraportin PDF-sovellus osoitteessa /report/ ja
  putkenkorjauspeli osoitteessa /peli/. Vite, React ja TypeScript.

KEHITYS
  Asenna Node.js LTS ja npm. Projektin juuressa:
    npm install
    npm run dev
    npm run build
    npm test

PAGES-PROJEKTIPOLKU
  Vite-konfiguraatio käyttää VITE_BASE_PATH-asetusta. GitHub Actions
  rakentaa projektisivun repositorion nimeä vastaavalla polulla.
  GitHubissa: Settings > Pages > Source: GitHub Actions. Tarkista
  repositoryn nimi ja työnkulun pages/id-token-oikeudet.
  Sivut: https://KÄYTTÄJÄ.github.io/REPOSITORY/
  Raportti: .../REPOSITORY/report/
  Peli: .../REPOSITORY/peli/
  Ennen julkaisua tarkista projektipolku, suora URL-päivitys ja assetit.
  Älä julkaise ennen omistajan hyväksyntää.

OMA VERKKOTUNNUS
  Aseta VITE_BASE_PATH=/ ja määritä Pagesin oma verkkotunnus vasta
  hyväksynnän jälkeen. Tarkista Zonerin DNS ja HTTPS. Älä muuta nykyisiä
  MX/SPF/DKIM/DMARC-tietueita: sähköpostin toimivuus voi rikkoutua.
  Varmista CNAME ja omistajan hyväksyntä ennen verkkotunnuksen vaihtoa.

YHTEYDENOTTOLOMAKE
  Staattinen demo ei lähetä lomakkeita itsestään. Ilmoita onnistumisesta
  vain kun konfiguroitu palvelin vahvistaa vastaanoton. Julkisen
  puhelimen/sähköpostin kautta voi ottaa yhteyttä manuaalisesti. Sisäinen
  vastaanottaja ei kuulu julkiseen bundleen.

GOOGLE APPS SCRIPT -KÄYTTÖÖNOTTO
  Lähdekoodi ja vaiheittaiset ohjeet ovat apps-script/-kansiossa.
  Luo Apps Script -projekti yrityksen Google-tilillä, kopioi koodi ja
  aseta vastaanottaja sekä erikseen luotu henkilöstön salasana Script
  Properties -asetuksiin. Älä käytä keskustelussa mainittua salasanaa.
  Julkaise web-sovelluksena ja tarkista kirjautumis-, CORS-, istunto-,
  liitekoko-, kiintiö- ja väärinkäyttörajoitukset ennen tuotantokäyttöä.
  GAS:n vapaat kiintiöt ja ehdot voivat muuttua. Älä julkaise salasanaa,
  vastaanottajaa tai tokenia GitHubiin. Ilman palvelinpuolen vahvistusta
  raportin automaattilähetys ja yhteydenottopyynnöt pysyvät pois päältä.
  Oikeaa sähköpostitoimitusta ei ole vahvistettu ilman testiviestiä.

TIETOSUOJA JA TUOTANTOTARKISTUS
  Raporttiluonnokset ja kuvat voivat sisältää henkilötietoja ja tallentua
  käytetyn laitteen selaimeen. Poista luonnos ja kuvat laitteen käytön
  jälkeen; älä käytä yhteiskäyttölaitteella. Tarkista tietosuojateksti,
  säilytys, yrityksen yhteystiedot, toiminta-alue, lomakkeen suojaukset,
  henkilöstön salasanan asetus ja ulkoinen sähköpostipalvelu ennen liveä.
  Tuotantovalmiuden lista: PRODUCTION_CHECKLIST.md.

Peli ei kerää henkilötietoja eikä tarvitse palvelinta. Älä lisää
tekijänoikeudella suojattuja Brawl Stars -aineistoja.

PUTKIMESTARI 2.0 – PIPE RESCUE
  Phaser 3 -peli /peli/-reitillä. Yksi Phaser-instanssi, erillinen
  TypeScript-pelimalli, 6 suunniteltua kenttää (ensitaso 90 sekuntia),
  venttiili, kytkinovelle työnnettävä laatikko, työkalujen keräily ja
  putkien kiertopulma. Kentät tarkistetaan työntämisen ja saavutettavuuden
  osalta. Laatikon siirron voi perua taukovalikossa. Ovi pysyy avattuna.

  Työpöytä: WASD / nuolet liikkumiseen, E vuorovaikutukseen, välilyönti
  työntämiseen, Escape tauolle. Hiiri valikoihin ja putkipulmaan.
  Puhelin: vasemmalla joystick, oikealla käsi- ja laatikkopainike.
  Monikosketus ja peruutustapahtumat on käsitelty. Ohjaimen kuollutta
  aluetta voi säätää taukovalikossa. Äänet oletuksena pois päältä.
  Eteneminen ja ohjainasetus voivat tallentua paikallisesti; ei henkilötietoja.

  npm run game:art       Luo projektin alkuperäiset SVG-assetit uudelleen.
  npm run test:game      Playwright-selaintestit kolmessa näyttökoossa.
  Asenna testiselain ensin: npx playwright install chromium
  Vaihtoehtoinen asennettu Chromium voidaan valita vain testejä varten
  ympäristömuuttujalla GAME_BROWSER_EXECUTABLE (exe-tiedoston polku).
  PowerShellissä npm:n estyessä käytä npm.cmd / npx.cmd -komentoja.
  Pages-tarkistus: rakenna VITE_BASE_PATH=/kh-tech-website/ -asetuksella
  ja suorita node scripts/check-pages-game.mjs samalla asetuksella.
  Skripti käynnistää ja sulkee vain paikallisen tuotantopreviewn.

  Visuaalinen referenssi: docs/putkimestari-2-consept.png. Referenssin
  pikseleitä ei käytetä pelissä. Grafiikka: public/game2/ ja lähdekoodi
  scripts/build-game-art.mjs. Asset-lähteet: docs/GAME_2_0_ASSETS.md.
  Toteutus, testit, todelliset ruudunkaappaukset ja rajoitteet:
  GAME_2_0_REPORT.md. Selainemulointi ei korvaa fyysistä puhelintestiä.
  Työ tehdään main-haaralla; älä pushaa tai deployaa ilman hyväksyntää.

Perus npm.cmd komennot ja git komennot:

npm.cmd run build
npm.cmd test
npm.cmd run dev (jos haluat testata pelin ennen git pushia)

git status
git add .
git commit -m "commit kommentti"
git push origin main

PUTKIMESTARI 2.2 – NYKYINEN PELIVERSIO
  Edeltävä 2.0-osio kuvaa aiempaa toimitusta. Nyt käytössä ovat viralliset
  KH-Tech-logot, musta parraton maskotti, tekoihin reagoiva opastus ilman
  aikapainetta ja seedistä generoituvat kentät kuudessa ympäristöteemassa.
  Opastuksen jälkeen "Seuraava taso" luo uuden validoidun työkohteen.
  "Osaan jo pelata" ohittaa opastuskentän. Tauosta pääsee asetuksiin.
  Asetuksissa voi säätää joystickia, valita äänet ja pelata kenttäkoodilla.
  Esimerkki: KHT-12345678-D6. Kentän avattuasi voit kopioida osoitteen.

  Graafinen lähde: scripts/build-game-art.mjs ja game22-character-art.mjs.
  npm.cmd run game:art
  npm.cmd test                   (sisältää 1 000 seedin stressitestin)
  npm.cmd run test:game          (Playwrightin Chromium vaaditaan)
  npm.cmd run build
  node scripts/check-game22-assets.mjs

  Playwright: npx.cmd playwright install chromium
  Tarvittaessa GAME_BROWSER_EXECUTABLE osoittaa valmiiseen chrome.exe:en.
  Esimerkiksi PowerShellissa:
    $env:GAME_BROWSER_EXECUTABLE='C:\polku\chrome.exe'
    npm.cmd run test:game

  Tuotannon projektipolun tarkistus PowerShellissa:
    $env:VITE_BASE_PATH='/kh-tech-website/'
    npm.cmd run build
    node scripts/check-pages-game.mjs
  Juuripolun tarkistus:
    $env:VITE_BASE_PATH='/'
    npm.cmd run build
    node scripts/check-pages-game.mjs
  Käynnistä kehityspalvelin oletusjuurella uudessa PowerShellissa tai poista
  testin VITE_BASE_PATH-muuttuja ennen npm.cmd run dev -komentoa.

  Todelliset kaappaukset: docs/game22-screenshots/.
  Generoinnin, Worker-testin ja tuotannon tulokset: docs/game22-checks/.
  Toteutus ja rajaukset: GAME_2_2_REPORT.md, GAME_2_2_ASSETS.md,
  GAME_2_2_LEVEL_GENERATION.md. Fyysisiä puhelimia ja lapsipelaajia ei testattu.
  Hahmon alkuperäistä valokuvaa ei julkaista; se on .gitignoressa.

  Työ tehdään main-haaralla. Tässä tehtävässä ei pushata eikä deployata
  automaattisesti.


WEBSITE 2.0 – SIVUSTON JA RAPORTIN UUDISTUS
  Nykyinen työ yhtenäistää yrityssivuston, raportin ja PDF:n viralliseen
  KH-Tech-brändiin. Pelin mekaniikka säilyy. Lomake ja raportti säilyttävät
  aiemman paikallisen/esittelytilansa; sähköpostia ei väitetä lähetetyksi.
  Toteutus ja tarkistukset kirjataan WEBSITE_2_0_REPORT.md-tiedostoon.
  Viralliset tunnukset ja niiden käyttö: BRAND_ASSET_MANIFEST.md.
  Ei automaattista pushia tai deployta.
  Nykyiset WEBSITE 2.0 -komennot:
    npm.cmd run brand:assets
    npm.cmd test
    npm.cmd run build
    npm.cmd run test:website
    npm.cmd run test:game
    node scripts/check-website-assets.mjs

  Build kopioi viralliset tunnukset, tarkistaa TypeScriptin, tekee Vite-
  tuotantoversion ja generoi raportin offline-kuoren. Normaali build ei
  tarvitse Pythonia. Sivusto, raportti ja peli ladataan erillisinä osina.
  Kehityksen selaintestipalvelin käynnistyy erilliselle portille 5174.

  Tuotannon selaintestit PowerShellissa (Playwright-Chromium asennettuna,
  tarvittaessa GAME_BROWSER_EXECUTABLE kuten edellä):
    $env:WEBSITE_PRODUCTION='1'
    $env:VITE_BASE_PATH='/'
    npm.cmd run build
    npm.cmd run test:website
    $env:VITE_BASE_PATH='/kh-tech-website/'
    npm.cmd run build
    npm.cmd run test:website
  Testi käynnistää ja sulkee oman paikallisen preview-palvelimensa (5183).
  Nämä komennot eivät julkaise sivustoa.

  Riippumaton PDF:n sivutus-, ääkkös- ja kuvasuhdetarkistus:
    python -m pip install pymupdf
    python scripts/review-website-pdf.py
  npm.cmd test tuottaa ensin synteettisen 14-sivuisen, kuuden kuvan PDF:n.
  Raportit ja kaappaukset: docs/website2-checks/ ja docs/website2-screenshots/.
  Alkuperäisen logon tavuvertailu: node scripts/check-website-assets.mjs.
  PWA-ikonien uusinta tarvittaessa: python scripts/build-brand-icons.py
  (vaatii Pillow'n). Ikonit ovat valmiiksi versionhallinnassa.

  Ennen normaalia kehityspalvelinta tai pelin kehitystestejä poista testin
  peruspolku ja tuotantotestiasetus tai käytä uutta PowerShell-ikkunaa:
    Remove-Item Env:VITE_BASE_PATH -ErrorAction SilentlyContinue
    Remove-Item Env:WEBSITE_PRODUCTION -ErrorAction SilentlyContinue
    npm.cmd run dev
  Paikallinen arviointi: /, /yhteystiedot/, /report/ ja /peli/.
  Raportin offline-tila vaatii onnistuneen ensimmäisen verkkokäynnin
  tuotantobuildissa. Käytä omaa laitetta ja poista luonnos käytön jälkeen.
