# Putkimestari 2.0 – Pipe Rescue!

6.11.2026. Toteutus nykyisellä `main`-haaralla. Sivustoa ei ole pushattu tai deployattu.

## Arkkitehtuuri

Vanhan ruuduttaisen React/canvas-pelin korvaa Phaser 3.90.0. [Lähtötilanteen katselmointi](docs/GAME_2_0_REVIEW.md) tehtiin ennen uudelleenrakentamista. Konseptikuva avattiin ja tarkastettiin paikallisesta tiedostosta `docs/putkimestari-2-consept.png` (viestissä nimi oli `concept`).

| Tiedosto | Vastuu |
| --- | --- |
| `src/game2/GamePage.tsx` | Laiskasti ladattava React-kuori, valikot, HUD, monikosketusjoystick ja pulman painikkeet |
| `src/game2/engine.ts` | Yksi Phaser-instanssi/Scene, sprite- ja hiukkasrenderöinti, kamera, äänet ja mittaus |
| `src/game2/model.ts` | Pelitilat, jatkuva liike, törmäykset, vuorovaikutus, työntö ja ajastin |
| `src/game2/levels.ts` | Opastuskenttä ja viisi lisäkenttää; kalusteet kuuluvat samaan törmäysmalliin |
| `src/game2/solver.ts` | Kävely- ja työntötilojen BFS sekä kulmajumiin työntämisen esto |
| `src/game2/puzzle.ts` | Siemenestä toistettava putkipulma, 90° kierrot ja yhteyden tarkistus |
| `scripts/build-game-art.mjs` | Alkuperäisen SVG-kuvituksen toistettava lähde |
| `e2e/game.playwright.ts` | Todelliset selainohjaukset, läpipeluu, kuvat ja mittaus |

Pelaajan säde on 18 ja ruudun koko 80 maailmapikseliä. Liike on jatkuvaa, vinoliike normalisoidaan ja törmäykset tarkistetaan enintään 20 ms:n aliaskeleilla. Liike ja ajastin käyttävät kulunutta aikaa, joten 30 ja 60 päivityksen nopeuksilla matka on sama. Ajastin ei nojaa Reactin ajastimeen tai Phaserin tasoitettuun FPS-arvioon. Reactille julkaistaan uusi HUD vain sen sisällön muuttuessa, tavallisesti sekunnin välein tai vuorovaikutuksessa.

Phaser lataa SVG:t tekstuureiksi kerran. Vesihiukkaset (enintään 45) ja kipinät (enintään 100) käyttävät Phaserin hiukkaspoolia. Kentän vaihdossa vanhat kohteet ja tweenit tuhotaan. Poistumisessa ResizeObserver, tapahtumakuuntelijat, peli-instanssi, tekstuurit ja AudioContext siivotaan. Peli on omissa laiskasti ladattavissa osissaan: Phaseria ei ladata yrityssivua tai raporttia avatessa. Käytetyt lifecycle- ja kamera-API:t löytyvät [Phaserin Scene-ohjeesta](https://docs.phaser.io/phaser/concepts/scenes) ja [kameraohjeesta](https://docs.phaser.io/phaser/concepts/cameras).

## Mekaniikat ja kentät

- Sulje punainen pääsulku E:llä tai käden toimintopainikkeella. Venttiili vaihtaa vihreään tilaan ja veden suihku pysähtyy.
- Työnnä puulaatikko painokytkimelle välilyönnillä / laatikkopainikkeella. Laatikko siirtyy loogisesti yhden ruudun; renderöinti pehmentää siirtymän. Työntö seinään tai ei-tavoiteltuun umpikulmaan estetään. Taukovalikon peruminen palauttaa laatikon ja pelaajan; avattu ovi pysyy avattuna, joten peruminen ei sulje pelaajaa oven taakse.
- Kerää työkalupakki ja tiiviste kävelemällä niiden luo. Keräily antaa tekstin, välähdyksen ja valinnaisen pehmeän äänen.
- Avaa vuotokohdassa korjauspulma. Putkien portit kuvataan nelibittisinä suuntina. Kaikkien osien pitää liittyä tulon ja lähdön väliseen yhteyteen. Alkutaso käyttää kolmea osaa, myöhemmät kuutta tai yhdeksää.
- Aikarajat: 90, 85, 80, 78, 75 ja 70 sekuntia. Aika kuluu myös putkipulmassa. Tauko ja taustalle siirtyminen pysäyttävät pelin. Voitto, häviö, uudelleenaloitus ja seuraava kohde toimivat.

Kentät ovat kuusi suunniteltua kokoonpanoa, eivät rajattomasti satunnaistettuja karttoja. Pulmien sekoitus on siemenestä toistettava. Jokaisen kentän työntöratkaisu ja kohteiden saavutettavuus testataan; kenttää valittaessa tarkistus tehdään myös ajossa. Virheellinen kokoonpano käyttää tunnettua opastuskenttää varalla. Jokaisessa kentässä on yksi siirrettävä pulmaläatikko; muut esteet ovat kalusteita ja seiniä.

## Ohjaus ja saavutettavuus

WASD/nuolet liikuttavat, E toimii, välilyönti työntää ja Escape avaa tauon. Kuuntelu on pelikuoren fokuksen sisällä. Hiiri ja näppäimistön Enter toimivat valikoissa ja putkipulmassa.

Mobiilijoystick käyttää oman sormen pointer capturea, normalisoitua suuntaa ja säädettävää kuollutta aluetta. Toimintopainikkeilla on omat osoittimensa, joten niitä voi käyttää yhtä aikaa joystickin kanssa. Pointer cancel / lost capture nollaa ohjaimen. Touch action estää sivun tahattoman vierimisen. ResizeObserver sovittaa kameran näkymään ilman uutta peli-instanssia. Safe area ja `viewport-fit=cover` huomioidaan. Vähennetyn liikkeen asetus poistaa koristeellista animaatiota; toiminnallinen liike säilyy. Äänet ovat oletuksena mykistettyjä, ja AudioContext avataan vasta käyttäjän valinnasta.

Paikallisesti voi tallentua vain korkein läpäisty kenttä ja joystickin kuollut alue. Ei tiliä, henkilötietoja, palvelinta tai tietokantaa.

## Aineisto ja visuaalinen katselmointi

[Aineistoluettelo ja lisenssit](docs/GAME_2_0_ASSETS.md). Lopputulos sisältää 28 alkuperäistä SVG-tiedostoa (yhteensä noin 86 kB), hahmon 12 suunta-/kävelyruutua, oman maskotin, kalusteet, putket ja vesiefektit. Äänet syntetisoidaan omasta koodista. Konseptikuvaa ei käytetä taustana tai spriteinä eikä muiden pelien aineistoa kopioida.

Sisäänrakennettu imagegen hylkäsi kaksi spritekuvien tuotantoyritystä. Yhtään generoitua bitmap-assetia ei syntynyt. Ohjeen sallima oma vektorikuvitus toteutettiin sen sijaan. Sen tasaisempi, piirretty ilme eroaa konseptin maalatusta 3D-tyylistä; vastaavaa rasteritaiteen laatua ei väitetä saavutetuksi.

Todelliset kuvat avattiin ja tarkastettiin referenssin rinnalla. Katselmoinnin perusteella korjattiin lattian musta SVG-artefakti, puuttuva putkien liukuväri, liian tyhjä ympäristö, kameran epäkeskinen työpöytärajaus, laatikon paikalleen jäävä varjo, kerättyjen esineiden valot ja venttiilin/vuodon visuaaliset tilat. Ohjaimet on toteutettu suurina kerroksellisina painikkeina ja analogisena joystickina. Pystypulman kuva otettiin uudelleen vasta sisääntuloanimaation päätyttyä.

| Tarkasteltu kuva | Tiedosto |
| --- | --- |
| Työpöydän varsinainen peli | [1440×900](docs/game2-screenshots/desktop-gameplay.png) |
| Puhelimen pystynäkymä | [390×844](docs/game2-screenshots/portrait-gameplay.png) |
| Puhelimen vaakanäkymä | [844×390](docs/game2-screenshots/landscape-gameplay.png) |
| Korjauspulma pystyssä | [Korjaus](docs/game2-screenshots/portrait-repair.png) |
| Korjauspulma vaaka-asennossa | [Korjaus](docs/game2-screenshots/landscape-repair.png) |
| Voitto | [Voitto](docs/game2-screenshots/portrait-victory.png) |
| Todellinen aikarajan päättyminen | [Häviö](docs/game2-screenshots/desktop-failure.png) |

## Testaus ja mittaukset

- `npm test`: 33 testiä / 5 tiedostoa. Kattaa liikenopeuden ja vinoliikkeen, törmäykset, venttiilin, keräilyn, työntämisen, kulmaeston, perumisen, pulman, ajastimen, tauon, uudelleenaloituksen ja kaikkien kuuden kentän ratkeavuuden. Myös aiemmat lomake-, GAS-, PDF-, ID- ja Pages-polun testit ovat mukana.
- Playwrightin koko ensimmäinen sarja: 10 läpi, 2 tarkoituksella ohitettua saman 90 sekunnin häviötestin mobiilitoistoa. Oikea 90 sekunnin odotus ja uudelleenaloitus testattiin työpöydällä.
- Visuaalisten ja syötteen viimeistelyjen jälkeen kaikki kolme kokoluokkaa sekä oikeilla näppäinpainalluksilla/putkipainikkeilla tehty opastuskentän läpipeluu ajettiin uudelleen: 6 / 6 läpi.
- Erillinen dynaaminen pysty–vaaka–pysty-vaihto, yksi canvas-instanssi, reduced motion ja äänen erillinen käyttöönotto testattiin pystykontekstissa. CDP:n safe area -emuloinnilla tarkistettiin 44 px:n yläalue ja 34 px:n ala-alue: otsake väistää yläalueen, ohjaimet pysyvät ala-alueen yläpuolella eikä sivu veny vieritettäväksi. [Safe area -kuva](docs/game2-screenshots/portrait-safe-area.png).
- Selainkonsolissa ei ollut käsittelemättömiä JavaScript-virheitä. Selaintestit käyttivät aidosti joystickin pointer- ja monikosketustapahtumia; läpipeluussa ei siirretty pelaajaa debug-komennolla.
- `npm run build` onnistuu. Phaserin laiska pelimoottoriosa on noin 1,22 MB / 337 kB gzip; Vite antaa odotetun yli 500 kB:n chunk-varoituksen. Se ei kuulu yrityssivun alkuperäiseen lataukseen.
- Tuotantobuild rakennettiin myös `VITE_BASE_PATH=/kh-tech-website/`-asetuksella. `node scripts/check-pages-game.mjs` varmisti suoran `/kh-tech-website/peli/`-avauksen ja päivityksen, assettien onnistuneet pyynnöt, yhden canvasin sekä kehityshookin puuttumisen. Yrityssivu, yhteydenottolomake ja raportti avattiin samassa tuotantopreviewssä. [Tuotantopreviewn pelikuva](docs/game2-screenshots/production-pages-gameplay.png).
- `npm audit --audit-level=moderate`: 0 haavoittuvuutta tarkistushetkellä.

Kuuden sekunnin erillinen kehysvälien mittaus tehtiin ilman tracingia tai ruudunkaappausta mittausjakson aikana. Windows, headless Chromium 153.0.8010.12, NVIDIA RTX A2000 8 GB Laptop GPU / ANGLE D3D11, WebGL. Tulokset kuvaavat tätä tietokonetta ja mobiilinäkymien emulointia, eivät oikeita puhelimia:

| Näkymä | Mitattu keskiarvo | 95 % kehysväli | Näytteitä |
| --- | ---: | ---: | ---: |
| 1440×900 | 59,2 FPS | 17,3 ms | 359 |
| 390×844 | 59,5 FPS | 17,4 ms | 362 |
| 844×390 | 58,8 FPS | 18,2 ms | 363 |

Raakadata on `docs/game2-screenshots/*-benchmark-webgl.json`. Aiemmassa pakotetussa SwiftShader-ohjelmistorenderöinnissä saatiin noin 12 FPS; myös Canvasia kokeiltiin siinä ympäristössä eikä se ratkaissut hitautta. Oletus on Phaser AUTO (WebGL kun käytettävissä, muuten Canvas). Alle 40 FPS:n pidempikestoisessa mittauksessa hiukkastiheys vähenee. Liike ja ajastin säilyvät aikaan sidottuina, mutta kaikille ohjelmistorenderöintilaitteille ei luvata 30/60 FPS:ää.

## Julkaisu ja jäljellä olevat rajat

GitHub Pagesin oma peruspolku säilyy Viten asetuksena, ja kaikki SVG:t sekä laiskat moduulit käyttävät sitä. Tuotannon kehityshook jätetään buildista pois. Raportti-PWA:n cache-versio päivitettiin, jotta aiemman pelin HTML/JS ei jää pysyvästi vanhaan cacheen; raportin sisältöä tai tietojen käsittelyä ei muutettu.

Fyysisiä iPhone-/Android-laitteita, Safari/WebKit-selainta tai äänentoiston laatua puhelimen kaiuttimella ei ole testattu. Kaikkien kuuden kentän solver-tarkistus on ajettu; täydellinen selainläpipeluu kattaa opastuskentän. Muut kentät tarvitsevat lisäksi käyttäjän pelituntuman arvioinnin. Vektorikuvitus on omaa käyttökelpoista aineistoa mutta ei vastaa referenssin maalatun 3D-taiteen viimeistelyä. Näitä rajoja ei piiloteta yleiseen ”tuotantovalmis”-väitteeseen.

Muu yrityssivusto, yhteydenotto ja työraportti säilyivät nykyisissä toimintatiloissaan. Pelibatch ei ota sähköpostia tai henkilöstökirjautumista tuotantokäyttöön. Ei pushia, deployta, maksullisia palveluita tai uusia tilejä.

Julkisten sivujen ja Report/Materials-komponenttien tekstit verrattiin edelliseen committiin: sisältö säilyi samana. `src/main.tsx`:stä poistettiin vanha pelikomponentti ja peli ohjattiin uuteen laiskasti ladattavaan moduuliin. Käyttäjän konseptitiedostoa ei muutettu eikä sen pikseleitä sisällytetty julkaistavaan hakemistoon.
