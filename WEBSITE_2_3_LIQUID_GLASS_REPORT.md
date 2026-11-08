# WEBSITE 2.3 — taustakuvat ja Liquid Glass

Toteutettu 8.11.2026 suoraan `main`-haaralle. Kolme toimitettua kuvaa on otettu etusivun koko leveydelle ulottuviksi taustoiksi pyydetyssä järjestyksessä. Nykyiset tekstiryhmät, yhteystiedot, otsikkohierarkia ja CTA-linkit säilyvät saavutettavana HTML:nä. Heron ja peliesittelyn tekstit ovat edelleen vasemmalla, yritysesittelyn oikealla. Vanha herokuvitus kuvateksteineen, yrityksen harmaa tunnuskortti ja pieni pelikuva poistettiin.

## Muutetut tiedostot

- `src/Website.tsx`: yhteinen koristeellinen `SectionBackground`-picture, kolme taustaa ja yksi lasipaneeli kunkin nykyisen tekstiryhmän ympärillä. Peliesittelyn keskitetty container siirrettiin täysleveän sectionin sisälle.
- `src/homepage-backgrounds.css`: rajatut etusivutyylit; kuvan peittävä `object-fit: cover`, osioittainen kohdistus, responsiiviset paneelit ja kontrastit.
- `src/style.css`: poistettu käytöstä jääneiden kolmen kuvituskortin säännöt ja niiden mediakyselyt. Muu sivuston ja raportin tyylitys säilyi.
- `scripts/build-website-backgrounds.py`: toistettava WebP-pakkaus ja mobiilirajaukset. Pillow tarvitaan vain kuvien uudelleenpakkaamiseen; normaali Node-build käyttää valmiita kuvia.
- `scripts/review-liquid-glass.mjs`: paikalliset tuotanto-/kehityskaappaukset, tekstien ja linkkien vertailu lähtötilanteeseen sekä kuormauksen, kontrastin, fokuspisteiden, CTA-navigoinnin ja ylivuodon tarkistus.
- `e2e/website.playwright.ts` ja `scripts/website-test-reporter.mjs`: tarkistusten tuloskansio voidaan valita ympäristömuuttujilla. Nykyisten testien sisältö säilyi.
- `IDEA.md`, `CODEX_PROMPT.md` ja `README.txt`: rajauksen ja tarkistusohjeiden päivitys.

Pelin lähdekoodia, animaatiota, mekaniikkaa, navigaation toimintaa, palvelutekstejä, lomakkeita, sähköpostitaustaa, raportti-PWA:ta, PDF-generointia tai GitHub Actions -työnkulkua ei muutettu. Viralliset logot säilyvät alkuperäisinä.

## Kuvat ja suorituskyky

Alkuperäiset `docs/website_bg_1.png`–`website_bg_3.png` säilyivät muuttamattomina. SHA-256-tiivisteet, rajauskoordinaatit, työkalun versio ja kaikkien tiedostojen tarkat mitat/koot: [background-assets.json](docs/website23-checks/background-assets.json).

| Osio | Alkuperäinen PNG | Suurin WebP, 1774 px | Mobiilin WebP, 720 px |
| --- | ---: | ---: | ---: |
| Hero / sininen venttiili | 2 048 831 tavua | 114 238 tavua | 70 164 tavua |
| Yritys / kupariputket | 1 893 921 tavua | 89 604 tavua | 46 148 tavua |
| Putkimestari | 1 999 178 tavua | 145 292 tavua | 57 976 tavua |

Assetit: `public/website/{hero,company,game}-{960,1280,1774}.webp` ja `public/website/{hero,company,game}-mobile-{480,720}.webp`. WebP quality 84, method 6. Kolmen suurimman kuvan yhteiskoko 349 134 tavua on noin 94,1 % pienempi kuin alkuperäisten 5 941 930 tavua. Kaikki 15 vaihtoehtoa yhteensä noin 1,02 Mt; selain valitsee kustakin kuvasta yhden sopivan vaihtoehdon.

Hero on `loading="eager"`, `fetchPriority="high"`. Alemmat kuvat ovat `loading="lazy"`, `decoding="async"`. `srcset`, mobiilin `source` ja taustan todelliseen peittävään kokoon sovitettu `sizes` estävät liian pienen tablet-kuvan valinnan. Kaikki URL:t muodostetaan projektin nykyisellä `url()`/`BASE_URL`-apufunktiolla, myös polulla `/kh-tech-website/`. Ei ulkoista kuvapalvelua tai uusia Node-riippuvuuksia.

## Lasipaneelit ja responsiivisuus

Yhteinen `.kh-glass`: tumma läpikuultava pinta, `backdrop-filter: blur(18px) saturate(125%)`, WebKit-prefiksi, 24 px:n kulmat, ohut läpikuultava reuna, pehmeä varjo ja sisäreunan kevyt valo. Tavallisten paneelien peittävyys 0,70; pelissä sinertävä 0,76. Ilman blur-tukea peittävyys on 0,94. Paneelin sisällä ei käytetä ylimääräisiä blur-kerroksia tai animaatioita. Nykyinen `prefers-reduced-motion`-tuki säilyy.

Tekstien laskennallinen vähimmäiskontrasti myös täysin valkoisen taustakuvan päällä: hero/yritys **4,63:1**, peli **5,58:1**. Tämä on varovainen CSS-värien ja alfasekoituksen tarkistus; lisäksi oikeat kaappaukset tarkastettiin silmämääräisesti. Puhelinlinkki ja tarjous-/pelipainikkeet ovat vähintään 44 px korkeita; yrityslinkin kosketusalue nostettiin samaan kokoon.

- Työpöytä: alkuperäinen keskitetty 1240 px:n sisältöleveys, tekstiryhmien puolet ja painikkeiden järjestys säilyvät. Venttiili oikealla, kupariputket/mittari vasemmalla. Paneelin lisätila sijoittuu nykyisen tekstin ympärille.
- Tabletti: kuva- ja tekstipalstojen suhteita tasapainotettu, padding 28 px; pääkohteet jäävät lasin ulkopuolelle.
- Puhelin: erilliset kuvarajaukset, lähes täysleveä paneeli, 22 px:n sisäpadding ja kuvan pääkohteelle varattu tila paneelin yläpuolella. Kaikkien kuvien tausta täyttää silti koko osion. Sinisen venttiilin alaosaa jää paneelin taakse kapealla näytöllä; käsipyörä ja keskiö ovat näkyvissä.
- Pelibannerissa maskotti on toimitetussa kuvassa vasemmalla kuten nykyinen tekstiryhmä. Paneeli pidetään vasemmalla alempana, jotta kasvoja ei peitetä. Tämän vuoksi banneri tarvitsee aiempaa enemmän korkeutta. Leveillä näytöillä erillinen kuvan pystykohdistus pitää myös lakin näkyvissä.
- 320 px:n erikoistarkistuksessa löytynyt flex-painikkeiden venyminen korjattiin: päällekkäisten painikkeiden `flex-basis` palautetaan automaattiseksi.

## Visuaalinen tarkistus ja parannuskierros

Ennen muutoksia katsottiin kaikki kolme alkuperäistä kuvaa sekä olemassa olevat työpöytä- ja puhelinkaappaukset. Nykyisestä versiosta otettiin myös lähtötilanteen kaappaukset kolmessa koossa ja tallennettiin tekstiryhmät/linkit: [before.json](docs/website23-checks/before.json).

Ensimmäinen kierros: [pass1](docs/website23-screenshots/pass1). Kaappausten perusteella:

1. Mobiilin yritys-/pelirajauksia nostettiin, jotta mittarin alareunan ja maskotin kasvojen ympärille jää tilaa.
2. `sizes` muutettiin vastaamaan peittävän taustan kuvaleveyttä: tabletin liian pieni 960 px:n tiedosto vaihtuu terävämpään vaihtoehtoon, mobiilissa käytetään tarvittaessa 720 px:n rajausta.
3. Pelipaneelin yläreunaa laskettiin työpöydällä; leveälle näytölle lisättiin oma kuvan kohdistus.
4. Lasin peittävyyttä säädettiin tekstien vähimmäiskontrastin varmistamiseksi ja 320 px:n painikkeiden korkeus korjattiin.

Lopulliset oikeat selainkaappaukset:

| Koko | Hero | Yritysesittely | Peliesittely |
| --- | --- | --- | --- |
| 390×844 | [kuva](docs/website23-screenshots/final/mobile-hero.png) | [kuva](docs/website23-screenshots/final/mobile-company-section.png) | [kuva](docs/website23-screenshots/final/mobile-game-teaser.png) |
| 768×1024 | [kuva](docs/website23-screenshots/final/tablet-hero.png) | [kuva](docs/website23-screenshots/final/tablet-company-section.png) | [kuva](docs/website23-screenshots/final/tablet-game-teaser.png) |
| 1440×900 | [kuva](docs/website23-screenshots/final/desktop-hero.png) | [kuva](docs/website23-screenshots/final/desktop-company-section.png) | [kuva](docs/website23-screenshots/final/desktop-game-teaser.png) |

Lisäksi tarkistettu 320×740 ja 1920×1080, kuvat samassa kansiossa. Blur-varatyylin puhelinkaappaus: [mobile-fallback.png](docs/website23-screenshots/final/mobile-fallback.png). Fokuspisteiden laskennallinen tarkistus täydentää kuvien silmämääräistä tarkastusta; se ei yksin todista koko kohteen näkyvyyttä.

## Testitulokset

- `npx.cmd tsc -b`: hyväksytty.
- `npm.cmd test`: **55/55**, 9 tiedostoa; mukana 1 000 seedin ratkeavuustarkistus. [Generoinnin tulos](docs/website23-checks/generation-stress.json).
- `npm.cmd run build`: hyväksytty sekä juuripolulla että `/kh-tech-website/`-polulla. Buildin nykyinen suuren Phaser-chunkin huomautus säilyy; peli ladataan erikseen.
- Nykyinen `npm.cmd run test:website`, tuotannon juuri: **14 hyväksyttyä, 4 tarkoituksella ohitettua**, ei virheitä. [Tulokset](docs/website23-checks/root-browser.json).
- Nykyinen `npm.cmd run test:website`, tuotannon Pages-polku: **14 hyväksyttyä, 4 tarkoituksella ohitettua**, ei virheitä. [Tulokset](docs/website23-checks/pages-browser.json). Molemmissa ajoissa ohitetaan mobiilissa ne migraatio-/offline-testit, jotka suoritetaan työpöytäprojektissa.
- Lopullinen visuaaliskripti: **5/5 näyttökokoa** sekä juuri- että Pages-polulla; jokaisessa kaikki kolme osiota ja CTA-linkkiä hyväksytty. [Juuri](docs/website23-checks/final-root.json), [Pages](docs/website23-checks/final-pages.json). Ei selainvirheitä tai epäonnistuneita kuvapyyntöjä. Vähennetty liike ja blur-varatyylin simulaatio tarkistettu.
- `node scripts/check-website-assets.mjs`: hyväksytty; virallisten tunnusten alkuperäiset tavut, PDF:n tunnus, PWA-ikonit, offline-paketti ja tuotannon poissulut tarkistettu.

Nykyiset selaintestit tarkistavat sivureitit, navigoinnin, näppäimistökäytön, yhteydenottolomakkeen validoinnin ja esittelytilan, raporttiluonnoksen, kuvat, esikatselun, oikean PDF-latauksen sekä tuotannon offline-raportin. Pelin aloitus ja yhden canvasin säilyminen tarkistetaan. Visuaaliskripti tarkistaa lisäksi kaikki kolme CTA-linkkiä oikeilla klikkauksilla, kuvat, blur-tyylin, tekstien säilymisen ja vaakaylivuodon.

## Toistaminen ja rajaukset

```powershell
$env:GAME_BROWSER_EXECUTABLE='C:/polku/chrome.exe' # Vain jos tarvitaan oma Chromium-polku
npm.cmd test
$env:VITE_BASE_PATH='/' # Vaihtoehto: /kh-tech-website/
npm.cmd run build
$env:WEBSITE_PRODUCTION='1'
$env:GLASS_PASS='final'
node scripts/review-liquid-glass.mjs
$env:WEBSITE_CHECKS='docs/website23-checks'
$env:WEBSITE_SCREENSHOTS='.playwright-artifacts/website23-regression'
npm.cmd run test:website
```

Kuvien uusinta tarvittaessa: `python scripts/build-website-backgrounds.py` (Pillow). Kehityspalvelinta varten poista `WEBSITE_PRODUCTION` ja `VITE_BASE_PATH` tai käytä uutta PowerShell-ikkunaa.

Testaus käyttää Chromiumia, mobiilin kosketus-/näyttöemulointia sekä tuotantopreviewtä omalla tietokoneella. Fyysistä iPhonea/Androidia tai Safari-laitetta ei testattu. Blur-varatyyli tarkistettiin simuloimalla sen CSS-tulos; kyseessä ei ole testi vanhalla selaimella. Ei oikeaa sähköpostilähetystä eikä julkaisutestiä verkossa. Ei automaattista pushia tai deployta.
