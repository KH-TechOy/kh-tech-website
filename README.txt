KH-TECH OY – VERKKOSIVU, TYÖRAPORTTI JA PELI
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
