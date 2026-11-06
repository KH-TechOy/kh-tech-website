KH-TECH OY – VERKKOSIVU, TYÖRAPORTTI JA PELI
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
