# Putkimestari 2.2 – grafiikka ja brändiaineisto

## Tarkastetut lähtöaineistot

| Aineisto | Käyttö |
| --- | --- |
| `docs/Putkimestari_ 2.png` | Ensisijainen konsepti, avattu ja tarkastettu. Toimitetussa tiedostonimessä on välilyönti. Ei tuotantoassetti. |
| `docs/kh-tech-logo-musta.png` | Alkuperäinen musta KH-Tech Talotekniikka -tunnus; 1340×424. |
| `docs/favicon-kh-tech.png` | Alkuperäinen pisaratunnus; 864×975. |
| `docs/kh-tech-character-reference.jpg` | Paikallisesti tarkastettu hahmon ulkonäköreferenssi. Ei gitissä eikä julkaistavissa asseteissa. |
| `https://kh-tech.fi/` | Virallinen yritysilme ja palvelutiedot tarkastettu 6.11.2026. Yritystietoja ei keksitty. |

Pyynnön nimillä `Putkimestari_2.png`, `kh-tech-logo.png` ja `kh-tech-icon.png` tiedostoja ei ollut; yllä olevat toimitetut vastineet löytyivät ja niitä käytettiin. `docs/game-references/`-hakemistoa ei ollut. Edellisen version kaappaukset ja vanha konsepti oli poistettu työpuusta jo työn alkaessa; niitä ei palautettu eikä käytetty uusien tulosten tallennuspaikkana.

## Viralliset tunnukset

`npm.cmd run game:art` kopioi PNG:t sellaisinaan:

| Lähde | Julkaistava tiedosto |
| --- | --- |
| `docs/kh-tech-logo-musta.png` | `public/brand/kh-tech-logo.png` |
| `docs/favicon-kh-tech.png` | `public/brand/kh-tech-icon.png` |

Muotoa, värejä ja mittasuhteita ei piirretä uudelleen. Käyttöliittymä käyttää `object-fit: contain` -skaalausta; musta logo asetetaan vaalealle kortille. Kuvitetuissa asseteissa sama alkuperäinen PNG on upotettu base64-kuvana. Hahmon profiilin heijastus ei heijasta logotekstiä: tunnus piirretään heijastetun vartalon ulkopuolelle.

Tunnukset ovat otsikossa ja alkuruudussa, HUD:ssa, lakissa, rinnassa ja selässä, työkalupakissa, yhdessä ympäristökyltissä, voittonäkymässä, sivuston peliesittelyssä ja pelin faviconina. Lisätarkastus käyttää toimitettua ikonia. Muu sivuston navigaatio ja lomakkeet säilyvät.

`node scripts/check-game22-assets.mjs` tarkistaa lähde-PNG:n, public-kopion ja dist-kopion tavut, sekä alkuperäisen logon upotuksen kuvitukseen. SHA-256-tulokset: `docs/game22-checks/assets.json`.

## Alkuperäinen pelitaide

Graafinen lähde on `scripts/build-game-art.mjs`; uuden hahmon lähde `scripts/game22-character-art.mjs`. Tuotoksena 40 erillistä SVG-assetia ja kaksi virallista PNG:tä. Phaser rasteroi SVG:t latauksen aikana omiksi tekstuureiksi. Tämä jatkaa toimivaa grafiikkaputkea eikä vaadi kuvia generoivaa palvelua.

| Muutos | Tiedostot / sisältö |
| --- | --- |
| Uusi maskotti | `mascot.svg`: musta lippalakki, hiukset, puhtaat kasvot, tummat vetoketjulliset työvaatteet, työkaluvyö ja peukutus. |
| Suunta-animaatio | `plumber-sheet.svg`: 768×1024; alas, vasen, oikea, ylös; jokaisessa idle + kaksi kävelyruutua. Sama hahmo kuin otsikkokuvassa. |
| Brändätty kalusto | Päivitetty `toolbox.svg`, uusi `brand-sign.svg` ja `inspection.svg`. |
| Kuusi lattiateemaa | `floor-kitchen`, `floor-bathroom`, `floor-basement`, `floor-utility`, `floor-office`, `floor-technical`. |
| Teemakalusteet | Uudet `basin`, `toilet`, `washer`, `desk`; aiemmat `counter`, `boiler`, `shelf`, `plant` säilyvät. |
| Ohjaus ja tavoitteet | `guide-arrow`, `joystick`, kolmas korjausosa `spare`; aiemmat venttiilit, laatikko, kytkin ja ovi säilyvät. |
| Vesi ja valo | Aiemmat vuoto-, lätäkkö-, pisara-, kipinä- ja hehkuassetit säilyvät. Phaserin partikkelit, valopinnat ja syvyysjärjestys tuovat liikkeen. |

Uusi pelitaide on tätä projektia varten kirjoitettua SVG-kuvitusta. Muiden pelien hahmoja, spritejä tai ympäristökuvia ei ole kopioitu. Toimitetut viralliset tunnukset ovat KH-Techin aineistoa. Konseptia ei pilkota spriteiksi eikä aseteta pelitaustaksi. Lucide-kuvakkeet ja riippuvuudet säilyttävät omat lisenssinsä.

## Valokuvan suojaaminen

Referenssivalokuvaa katsottiin paikallisesti ulkonäön suunnittelua varten. Hahmo on alkuperäinen piirros, ei valokuvan upotus tai kasvokuvan julkaisu. Generointiskriptit eivät lue valokuvaa. `.gitignore` sulkee alkuperäisen `.jpg`- ja mahdollisen `.jpeg`-polun pois. Kuvaa ei kopioida publiciin, distiin, hahmokaappauksiin tai dokumenttien esimerkkikuviin. Asset-tarkistus estää JPEG-upotukset pelin SVG-tiedostoissa ja referenssitiedostot distissä.

## Visuaalinen katselmointi

Todellinen hahmo-/assetkatselmus: `docs/game22-screenshots/character-art.png`. Sen voi uusia komennolla `node scripts/review-game22-art.mjs`.

Pelin todelliset työpöytä-, pystymobiili- ja vaakamobiilikaappaukset ovat `docs/game22-screenshots/`. Konseptiin verrattiin otsikkoa, mustaa hahmoa, tunnuksia, vesiefektejä, tavoitteita, ohjainpainikkeita ja putkipulmaa. Katselmoinnin perusteella hahmoa suurennettiin, ohjekortti siirrettiin pois hahmon ja hanan päältä, kameralle lisättiin mobiilissa seurantavaraa ja työpöydän maailmalle HUD:n alapuolinen tila. Vuodolle lisättiin sininen hehku, ja lattiateemojen omat värit säilytettiin ilman yhteistä värisävytystä.

Rajoitus: konsepti on yksityiskohtainen maalattu 3D-henkinen kuva. Toteutus on selkeä, varjostettu vektorikuvitus, jossa esineet ja seinät ovat erillisiä interaktiivisia objekteja. Pintojen tekstuuri, hahmon anatomia ja valaistus eivät vastaa konseptia täsmälleen. Täyttä visuaalista vastaavuutta ei väitetä.

Historialliset `docs/GAME_2_0_ASSETS.md` ja `docs/GAME_2_0_REVIEW.md` säilytettiin muuttumattomina. Niiden aiemmat hahmokuvaukset koskevat versiota 2.0.
