# WEBSITE 2.5 — tietosuojasivu ja tuotantoon valmistelu

Päivitetty 8.11.2026. Työ tehdään `main`-haaralla paikallista tarkistusta varten. **Tuotantojulkaisua tai tietosuojan oikeudellista hyväksyntää ei ole annettu.** Seloste kattaa pyydetyt 19 aihetta, mutta yrityksen vahvistamattomia toimintatapoja, palvelusopimuksia ja säilytysaikoja ei esitetä valmiina tosiasioina.

## Toteutettu muutos

- `/tietosuoja/`: uusi suomenkielinen kysymys-vastausseloste, 19 yksilöityä osiota, näppäimistöllä käytettävä sisällysluettelo ja normaali vaalea lukupohja. Oikeudet kuvataan tilanteen ja oikeusperusteen mukaan. Mukana yhteyshenkilö, pyynnöt, viranomaisvalitus ja päivityspäivä.
- Tiedot perustuvat sovelluksen koodiin, yrityksen [omaan sivustoon](https://kh-tech.fi/) ja auditoinnin viranomaislähteisiin. Erillistä käyttäjän mainitsemaa valmista KH-Tech-luonnosta ei löytynyt saatavilla olevasta keskustelu-/liiteaineistosta tai repositoriosta. Toisen yrityksen selostetta ei kopioitu.
- Nykyinen `PageHero`/`SectionBackground` ja `.kh-glass` käytetään uudelleen kuvalle 7. Alkuperäinen pääotsikko säilyi. Väliaikaiseen selosteluonnokseen viittaava johdanto korvattiin nykyisen sisällön kuvauksella.
- `PrivacyNotice` ladataan erillisenä React-osana vain tietosuojareitillä; muita sivuja ei kuormiteta pitkän selosteen ohjelmakoodilla. CSS on rajattu tietosuojan luokkiin ja lomakkeen tietosuojatekstiin.
- Suomenkielinen title/description/lang sekä base-polun huomioiva self-canonical. Canonical osoittaa palvelevan originin tietosuojareittiin ilman kyselyä tai fragmenttia; lopullinen ensisijainen domain/aliasohjaukset ovat omistajan vahvistettavia. `vite-ignore` pitää reittilinkin poissa Viten tiedostoasset-käsittelystä; base korvataan silti buildissa.
- Julkisen sivuston raporttilinkki poistettiin alatunnisteesta. Navigaatiosta tai tietosuojan sisällysluettelosta ei ole linkkiä sisäiseen raporttiin. Raportin noindex säilyy; kumpikaan ei ole pääsynhallintaa.

Keskeiset tiedostot: `src/PrivacyNotice.tsx`, `src/privacy.css`, `src/Website.tsx`, `tietosuoja/index.html`.

## Todelliset tietovirrat ja korjaukset

Kattava lähtötilan tarkistus ja lähdeviitteet: [PRIVACY_DATA_FLOW_AUDIT.md](PRIVACY_DATA_FLOW_AUDIT.md). Omistajan vahvistukset, prosessipäätökset ja julkaisuesteet: [PRIVACY_APPROVAL_CHECKLIST.md](PRIVACY_APPROVAL_CHECKLIST.md).

1. **Yhteydenottolomake ei ole yhdistetty lähetyspalveluun.** Sen pakollinen tietosuojakuittaus ja `consent`-validaatio poistettiin. Lähetyspainike on selvästi pois käytöstä; ohje kertoo oikean puhelimen ja sähköpostin. Tavallista sopimusasiointia ei sidota suostumukseen. Lomakkeen muut kentät ja validaatio säilyvät. Myös ohjelmallisesti ohitettu disabled-painike jää vanhan, lähettämättömän submit-käsittelijän piiriin: ei POSTia tai väärää onnistumista. Ei uutta demo-/tilalippua tai simuloitua toimitusta.
2. **Raportilla ei ole henkilöstökirjautumista.** Suora osoite, selainluonnos, valokuvat, PDF ja PWA säilyvät. Näkymä kertoo todennuksen/toimituksen puutteesta ja siitä, ettei toiminto ole tuotantokäyttöön asiakastiedoilla. Varmennetuksi suojaukseksi tulkittava shield-check-kuvake vaihdettiin tietokuvakkeeksi. Ei asiakaspuolen salasanaa tai näennäistä lukitusta.
3. **Pelin tarpeeton automaattinen historiakirjoitus poistettiin.** `kht-game2-progress` ei vaikuttanut nykyisen pelin käynnistykseen tai jatkamiseen. Voitto, seuraava taso, opastus ja ohjaus säilyvät. Itse liukusäätimellä valittu ohjainasetus muistetaan edelleen; asetuksissa kerrotaan paikallisesta muistamisesta ja poistosta sekä tarjotaan tietosuojalinkki. Vanhan historia-avaimen mahdollinen säilyminen kerrotaan selosteessa. Ei analytiikkaa tai koristeellista evästebanneria.
4. **Irrallinen Apps Script ei ole nykyinen backend.** Pakollinen kuittaus poistettiin myös sen validaatiosta ja HTML-lähteestä. Muu lähetys-/istuntoluonnos ei aktivoidu eikä sitä julkaista. Yksikkötestin MailApp-mock ei ole todellinen vastaanottotesti. Yksityistä sisäistä vastaanottajaosoitetta ei julkaistu.

Selainluonnoksen automaattista vanhenemista, sovellustason salausta, toimittajasopimuksia, DPO-nimitystä tai siirtosuojia ei keksitty. Tämän erän lähdekoodi- ja selainhavainnot erotetaan palveluntarjoajan todellisista asetuksista ja yrityksen sähköposti-/asiakasprosesseista. Niiden puutteet jäävät nimenomaisiksi julkaisuesteiksi.

## NFC-avaus ja sisäinen raportti

Raportti avautuu suoraan `/report/`-reitin tai projektipolun `/kh-tech-website/report/` kautta. Manifestin suhteellinen `start_url` ja PWA:n aloitus toimivat kummallakin polulla. Suora avaus, päivitys, luonnoksen palautus, PDF:n oikea lataus ja luonnoksen poisto testataan selaimessa.

NFC-korttiin tulee aikanaan tavallinen hyväksytyn tuotantopalvelun HTTPS-URL. Korttiin tai URL:iin ei saa laittaa henkilötietoja, salasanaa, istuntotokenia tai todentamiseksi tulkittavaa kortin tunnistetta. Fyysistä NFC-korttia tai henkilöstön kirjautumista ei tässä erässä testattu. **Suoraosoitteen toimivuus ei ole näyttö todennuksesta.** Todellinen palvelinpuolinen identiteetti ja käyttöoikeusrajaus kuuluvat käyttäjän määrittämään seuraavaan työvaiheeseen.

## Kuva ja ulkoasu

`docs/website_bg_7.png` tarkastettiin visuaalisesti ja säilyi muuttamattomana. Pelkkä uudelleenmitoitus/WebP-pakkaus; ei retusointia, mobiilirajausta tai kuvaan lisättyä tekstiä.

| Asset | Mitat | Koko |
| --- | --- | ---: |
| Alkuperäinen PNG | 1672×941 | 1 812 606 tavua |
| `public/website/privacy-800.webp` | 800×450 | 29 644 tavua |
| `public/website/privacy-1200.webp` | 1200×675 | 50 972 tavua |
| `public/website/privacy-1672.webp` | 1672×941 | 79 014 tavua |

WebP quality 84 / method 6. Suurin vaihtoehto on noin 95,6 % alkuperäistä pienempi; selain valitsee sopivan vaihtoehdon `srcset`/`sizes`-asetuksista. Hero on eager/high-priority, kuva erillisessä absoluuttisessa taustakerroksessa ja tekstit HTML:ää. [Manifesti ja alkuperäisen SHA-256](docs/website25-checks/background-assets.json).

Lasin nykyiset rajat, varjot ja fallback säilyvät. Blur 18 px työpöydällä/tabletilla ja 12 px puhelimessa. Konservatiivinen tekstikontrasti vähintään 4,63:1 myös valkoisen kuvan päällä. Puhelimen paneeli on hieman muita heroja kapeampi, jotta teknisen kaapin lukko pysyy näkyvissä oikealla. Koko pitkä seloste on vaalealla pohjalla; fonttikoko 16 px / mobiilissa 15 px ja rajattu lukuleveys. Ensimmäisen kaappauskierroksen jälkeen pitkien tekstiosioiden kaappaukset vakautettiin vähennetyn liikkeen asetuksella ja varsinaisina viewport-kuvina.

## Testit ja havaintojen rajat

- TypeScript: `npx.cmd tsc -b` ja tuotantobuildin tyyppitarkistus hyväksytty.
- `npm.cmd test`: **55/55**, 9 tiedostoa. Mukana 1 000 seedin generaattoritesti sekä päivitetty vaatimus siitä, ettei tavallinen yhteydenotto tarvitse suostumusta. [Generoinnin tulos](docs/website25-checks/generation-stress.json).
- `npm.cmd run build`: juuripolku ja `/kh-tech-website/` hyväksytty. Nykyinen suuren Phaser-chunkin huomautus säilyy; peli ladataan erikseen.
- Nykyiset sivuston tuotantoselaintestit, juuri: **14 hyväksyttyä / 4 tarkoituksella ohitettua**, ei virheitä. [Tulokset](docs/website25-checks/root-browser.json). Sisältää navigaation, lomakevalidaation ja todellisen lähetyksen puuttumisen, raporttiluonnoksen, kuvat, PDF-latauksen sekä offline-raportin.
- Uudet tietosuojatestit, juuri: **9/9**. [Tulokset](docs/website25-checks/privacy-root.json).
- Nykyiset sivuston tuotantoselaintestit, Pages-polku: **14 hyväksyttyä / 4 tarkoituksella ohitettua**, ei virheitä. [Tulokset](docs/website25-checks/pages-browser.json). Ohitetut mobiilin migraatio-/offline-toistot suoritetaan työpöytäprojektissa.
- Uudet tietosuojatestit, Pages-polku: **9/9**, mukaan lukien lopulliset lähde-/luovutustiedot ja pelin paikallista asetusta koskeva tieto. [Tulokset](docs/website25-checks/privacy-pages.json).
- Tuotannon Pages-tarkistusskripti: suora avaus/päivitys, yksi canvas, ei kehityskoukkua, generoiva Worker oikeasta base-polusta, kaikki sivureitit, todellinen PDF-lataus, luonnoksen palautus ja lähetyseston tarkistus hyväksytty. [Tulos](docs/website25-checks/production-pages.json).
- Pelin opastus oikeilla syötteillä voittoon, seuraava generoitu kenttä ja yhteystietolinkki: **1/1 työpöydällä**, mukaan lisätty tarkistus ettei voitto kirjoita historia-avainta. [Tulokset](docs/website25-checks/game-regression.json).
- `node scripts/check-website-assets.mjs`: hyväksytty; alkuperäiset logot, PDF-tunnus, PWA-ikonit, offline-paketti ja tuotannon poissulut.
- `npm audit --omit=dev --json`: **0 ilmoitettua haavoittuvuutta** asennetuissa tuotantoriippuvuuksissa. [Havainto](docs/website25-checks/dependency-audit.json). Tämä ei korvaa sovelluksen tai julkaisualustan tietoturvatarkastusta.
- Lopullinen juuripolun uusinta viimeisellä lähdekoodilla: **9/9**, ei virheitä tai epävakaita testejä. Juuripolun tuotantobuild palautettu paikallista tarkistusta varten. Kaikkien seitsemän alkuperäisen PNG:n tiivisteet ja tuotantoon kopioidut WebP-tiedostot täsmäävät: [asset-tarkistus](docs/website25-checks/asset-integrity.json).

Tietosuojatestit ajavat kolme tapausta koossa **1440×900, 390×844 ja 768×1024**: 19 osion sisältö, kieli/title/canonical, lasi, kontrasti, kaapin näkyvyys, näppäimistöankkurit ja suora päivitys; julkiset reitit ilman raporttilinkkiä, evästeitä tai ylimääräistä paikallista tallennusta; käyttäjän ohjainvalinnan tallennus; disabled-lomakkeen ohitusyritys ilman POSTia; sekä raportin NFC-tyyppinen suora avaus, manifesti, PDF ja poisto. Havaitut julkisten sivujen pyynnöt olivat paikallisia resursseja, eivät ulkoisia seurantoja. Selainhavainto koskee paikallista tuotantopreviewtä, ei vielä lopullisen hostin vastausevästeitä tai lokitusta.

Lopulliset oikeat selainkaappaukset:

| Koko | Hero | Tallennus | Oikeudet |
| --- | --- | --- | --- |
| 1440×900 | [kuva](docs/website25-screenshots/final/desktop-privacy-hero.png) | [kuva](docs/website25-screenshots/final/desktop-privacy-tallennus.png) | [kuva](docs/website25-screenshots/final/desktop-privacy-oikeudet.png) |
| 390×844 | [kuva](docs/website25-screenshots/final/mobile-privacy-hero.png) | [kuva](docs/website25-screenshots/final/mobile-privacy-tallennus.png) | [kuva](docs/website25-screenshots/final/mobile-privacy-oikeudet.png) |
| 768×1024 | [kuva](docs/website25-screenshots/final/tablet-privacy-hero.png) | [kuva](docs/website25-screenshots/final/tablet-privacy-tallennus.png) | [kuva](docs/website25-screenshots/final/tablet-privacy-oikeudet.png) |

Lisäksi samassa kansiossa viewportin yläosa ja blur-fallbackin simulaatio. Ensimmäinen kierros on `docs/website25-screenshots/pass1/`. Kaappaukset tarkastettu silmämääräisesti; ei vaakaylivuotoa tai kaapin peittävää paneelia. Fallback testattiin CSS-simulaatiolla, ei vanhalla selaimella. Fyysistä iPhonea/Androidia, Safari-asennusta, NFC-korttia, oikeaa sähköpostivastaanottoa tai palvelinpuolista henkilöstöistuntoa ei väitetä testatuiksi.

## Julkaisuesteet ja seuraavat työvaiheet

Tämä erä ei tee sovelluksesta julkaisuvalmista. Etenemisjärjestys säilyy käyttäjän ohjeen mukaisena:

1. Julkisen sivuston sisällön ja ulkoasun lopullinen hyväksyntä.
2. Omistajan vahvistamat oikeusperusteet, roolit, palveluntarjoajat/sopimukset, säilytys, siirrot ja suojat sekä selosteen hyväksyntä.
3. Oikea yhteydenottosähköposti: palvelin, väärinkäytön torjunta ja vastaanotto päästä päähän ennen lähetyspainikkeen avaamista.
4. Turvallinen palvelinpuolinen henkilöstöidentiteetti ja raportin valtuutus; pelkkä URL:n piilottaminen tai NFC ei riitä.
5. Raportin toimitus, henkilötietojen laite-/käyttäjäkohtainen suojaus, hyväksytyt säilytyskäytännöt sekä PDF/mobiili/PWA/NFC-laitetestit.
6. Lopullinen tietoturva-, toiminnallisuus- ja mobiilihyväksyntä todellisessa tuotantoympäristössä.

Nykyinen main-pushiin reagoiva Pages-työnkulku säilytettiin eikä sitä ajettu. Sen ympäristön hyväksynnät ja lopullinen domain pitää tarkistaa ennen julkaisupushia. Salaisia osoitteita, avaimia tai tunnuksia ei lisätä hyväksyntädokumentteihin.

## Toistaminen

```powershell
npx.cmd tsc -b
npm.cmd test
$env:VITE_BASE_PATH='/' # Toista myös /kh-tech-website/
npm.cmd run build
$env:WEBSITE_PRODUCTION='1'
$env:GAME_BROWSER_EXECUTABLE='C:/polku/chrome.exe' # Vain tarvittaessa
npm.cmd run test:privacy
$env:WEBSITE_CHECKS='docs/website25-checks'
$env:WEBSITE_SCREENSHOTS='.playwright-artifacts/website25-regression'
npm.cmd run test:website
```

Kuvan uusinta tarvittaessa: `python scripts/build-website-backgrounds.py --privacy` (Pillow). Normaali Node-build käyttää valmiita kuvia. Kehityspalvelinta varten käytä uutta PowerShell-ikkunaa tai poista tuotantotestien ympäristömuuttujat. Työ tallennetaan paikallisesti `main`-haaralle; **ei pushia tai deployta**.
