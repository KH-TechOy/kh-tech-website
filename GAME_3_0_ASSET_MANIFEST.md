# GAME 3.0 – asset manifest

## Kävelykorjaus 8.11.2026

Sivukävely käyttää nyt kuuden aidon asennon sykliä kumpaankin suuntaan: uusi `public/game2/v3/plumber-walk.webp` (1536×512), alkuperäinen läpinäkyvä PNG `art/game3/source/side-walk.png`. Sama mittakaava ja lähderuudun kiinnityspiste kaikissa ruuduissa pitävät pään ja vartalon vakaina. Animaatio etenee kuljetun matkan mukaan; etu-/takasuuntiin lisättiin lepoasennon kautta kulkeva väliaskel. Etusivun esittely käyttää samaa olemassa olevaa `mascot.webp`-kuvaa kuin pelin otsikko. Aiemmat ympäristöassetit säilyvät.

Pelkkä kävelykuvan uusintapakkaus: `node scripts/build-game3-art.mjs --walk-only`. Prompti on `art/game3/PROMPTS.md`:ssä. Tarkistus ja todelliset liikevideot: `docs/walk-review/README.md`.

## Lähteet ja tuotanto

Alkuperäinen, tätä peliä varten sisäänrakennetulla **imagegen**-työkalulla luotu rasteritaide. Kahdeksan onnistunutta tuotantoa: ensimmäinen hahmo, kalusteet, putkisto, lattiamateriaali, seinämateriaali, otsikkomaskotti, korjattu hahmo ja vesi. CLI:tä, maksullista API-varareittiä, ulkopuolista kuvapankkia tai muiden pelien spritejä ei käytetty. Tarkat tuotantopyynnöt: [art/game3/PROMPTS.md](art/game3/PROMPTS.md).

Lähde-PNG:t säilyvät muokattavina `art/game3/source/`-hakemistossa. Ensimmäinen hahmo on `character-initial.png`; nykyinen `character.png` on kamerakulman ja mittasuhteiden korjattu versio. Otsikkomaskotti tuotettiin alkuperäisen hahmoarkin avulla, hahmopäivitys saman arkin muokkauksena. Muut kuvat ovat uusia alkuperäisiä tuotantoja. Konseptin pikseleitä ei käytetty tuotannossa tai leikattu spriteiksi. Yksityistä hahmoreferenssivalokuvaa ei luettu grafiikkaputkessa eikä lähetetty kuvapalveluun tässä työssä.

Kuvitus on pehmeästi varjostettua ja teksturoitua, ei vanhojen SVG-esineiden rasterointia. Taiteen luontityökalu ei takaa täysin identtistä anatomiaa tai sivuaskelten ajoitusta; erot on arvioitu katselmoinnissa. Generoituihin kuviin ei ole pyydetty jäljiteltyjä KH-Tech-logoja.

## Pelissä käytettävät tiedostot

Kaikki uudet runtime-assetit ovat `public/game2/v3/`-hakemistossa ja toimivat myös Pages-peruspolulla.

| Tiedosto | Sisältö / käyttö |
| --- | --- |
| `workshop-atlas.webp`, `.json` | 1536×1280 RGBA, 28 erillistä 256×256 ruutua; sama tekstuuri kalusteille, putkille ja vesikuville. |
| `plumber-sheet.webp` | 768×1024; alas, vasen, oikea, ylös. Jokaisessa lepo ja kaksi erikseen kuvattua askelta. Sama ruudukko kuin ennen, ei yhden suunnan venyttämistä. |
| `mascot.webp` | 640×800 otsikkohahmo; sama musta lakki, ruskeat hiukset, luonnolliset silmät, parraton ja viiksetön, kiinni oleva suu ja hiilenharmaat työvaatteet. |
| `portrait.webp` | 192×192 oikeasti rajattu HUD-muotokuva; ei koko vartalon siirtelyä taustakuvana. |
| `floor.webp`, `wall.webp` | 512×512 materiaalit; lattia sovitetaan projektioon ja kuuteen palettiin. Seinät muodostetaan naapuritietoisista pinnoista. |
| `crate`, `toolbox`, `valve`, `leak`, `gasket`, `spare` `.webp` | Atlasruutujen pienet erilliset versiot Reactin opastuskuviin. |

Atlas: laatikko, työkalupakki, kasvi, varaaja, keittiökaluste, hylly, allaskaluste, pesukone, WC, työpöytä, korjauskulma, tiiviste; suora putki, mutka, T, kaulus, avoin/suljettu venttiili, vaurio/korjattu liitos, kannake, valaisin, huolto-ovi, painokytkin; lätäkkö, roiske, rengas ja suihku.

Vanhoista SVG-tiedostoista runtime käyttää vain alkuperäisen PNG:n sisältävää brändikylttiä, pientä tarkastuskuvaketta, kipinäpartikkelia ja opastuksen joystick-kuvaa. Varsinainen maailma, hahmo, esineet, seinä- ja lattiamateriaalit sekä vesi ovat uusia. Vanhat GAME 2.x -aineistot ja lähdeskriptit säilyvät historiallista uusintaa varten; niitä ei ladata uudeksi pelimaailmaksi. `guide-arrow.svg` ja `marker.svg` eivät lataudu eivätkä esiinny pelissä.

## Viralliset tunnukset

`docs/kh-tech-logo-musta.png` → `public/brand/kh-tech-logo.png`, `docs/favicon-kh-tech.png` → `public/brand/kh-tech-icon.png`. Alkuperäiset PNG-tavut, värit ja mittasuhteet säilyvät. Grafiikkapakkaaja lisää ne erillisinä kerroksina lakkiin, työvaatteisiin, selkään, työkalupakkiin ja otsikkomaskottiin. Skaalaus säilyttää kuvasuhteen; tekstiä ei peilata tai piirretä uudelleen. Runtime-kyltti ja Reactin HUD/valikot käyttävät samoja alkuperäisiä tunnuksia.

## Toistaminen

`npm.cmd run game:art` pakkaa lähteet uudelleen käyttäen Playwrightin selaimen Canvas 2D:tä: alpha-rajaus, kokojen yhtenäistäminen, alkuperäisten logokerrosten koostaminen ja WebP/JSON-pakkaus. Tämä on paikallinen asset-pakkaaja; se ei kutsu kuvapalvelua eikä tarvitse API-avainta. Tarvitaan Playwright Chromium tai `GAME_BROWSER_EXECUTABLE`. Tavallinen `npm.cmd run build` käyttää valmiita pakattuja kuvia eikä tarvitse grafiikan uusintaa tai kuvapalvelua.

- `scripts/build-game3-art.mjs`: muokattava rajaus-, skaalaus-, logo- ja atlasasettelu.
- `art/game3/pack-layout.json`: hahmoposejen lähderajaukset.
- `node scripts/review-game3-art.mjs`: todellisten pakattujen kuvien katselmointitaulu.
- `node scripts/check-game3-assets.mjs`: atlasrajat, brändin tavut ja lähde/public/dist-vastaavuus tuotantobuildin jälkeen.
- `npm.cmd run game:art:legacy`: aikaisemman GAME 2.x SVG-tuotannon historiallinen komento.

Putkien yhteinen näkyvä halkaisija on 26 maailmapikseliä. Suoran, mutkan ja T:n liitäntäpisteet on kalibroitu atlasruudun sisäisiin todellisiin portteihin, ei läpinäkyvän neliön keskipisteeseen. Kannakkeet ja kaulukset ovat omia päällekkäisiä spritejä. Seinän putkisto on ympäristön kalustoa eikä reittiohjain tai uusi törmäyseste.

Valot ovat kerran Canvasilla luotuja pieniä radiaalitekstuureja ja Phaserin ADD-kerroksia. Kosketusvarjot käyttävät samaa pehmeää tekstuuria. Veden renkaat ovat kevyttä piirtoa, pisarat rajattu partikkelipooli. Tämä ei edellytä sumennus-/jälkikäsittelypassia. HUD ja kontrollit ovat skaalautuvaa CSS:ää ja Lucide-kuvakkeita nykyisillä lisensseillään.

Pakkausmitat, SHA-256-tiivisteet ja runtime-kuvien yhteiskoko: `docs/game3-checks/assets.json`. Pakattujen kuvien katselmointitaulu: `docs/game3-screenshots/asset-review.png`.
