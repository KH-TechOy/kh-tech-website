# KH-Tech Oy – virallinen brändiaineisto

WEBSITE 2.0, 7.11.2026. Toimitetut tunnukset tarkastettiin visuaalisesti ennen toteutusta. Niitä ei piirretty uudelleen, väritetty suodattimilla, venytetty tai korvattu typografisella jäljitelmällä.

| Alkuperäinen aineisto | Julkaistava tiedosto | Koko | Käyttö |
| --- | --- | --- | --- |
| `docs/kh-tech-logo-musta.png` | `public/brand/kh-tech-logo.png` | 1340 × 424 | Sivuston navigaatio ja alatunniste, yritystiedot, raportin otsake ja esikatselu, PDF. Myös olemassa oleva peli käyttää samaa tiedostoa. |
| `docs/favicon-kh-tech.png` | `public/brand/kh-tech-icon.png` | 864 × 975 | Favicon ja yritysesittelyn virallinen pisaratunnus. |
| Sama alkuperäinen ikoni | `public/brand/icon-192.png`, `icon-512.png` | 192 × 192 ja 512 × 512 | PWA:n ja laitteen kotinäytön ikonit. Koko alkuperäinen kuva sovitetaan valkoiselle neliöpohjalle oikeassa kuvasuhteessa, ilman rajausta. |

Logon alkuperäisen PNG:n SHA-256 on `84848d06ab6a9221ca7bda43e60309cfed2832773042dea743fb9d8aa7ee20aa`. Ikonin alkuperäisen PNG:n SHA-256 on `8ed9604495add3e75c4275c84ab17524774dfd18a33b1342b86fd5a81e17ac85`.

`scripts/build-brand-assets.mjs` kopioi alkuperäiset tavut public-hakemistoon ja tuottaa `src/brand-logo-data.ts`-moduulin. Moduuli sisältää saman PNG:n base64-muodossa, jotta PDF toimii myös ilman verkkoyhteyttä. `npm.cmd run build` suorittaa vaiheen automaattisesti. Muutos ei tarvitse kuvagenerointipalvelua eikä ulkoista kuvapalvelinta.

PDF käyttää alkuperäistä PNG:tä koossa 53 × 16,77 mm. Näyttökuvissa logo käyttää `object-fit: contain` -skaalausta ja alkuperäistä kuvasuhdetta. Tummassa alatunnisteessa tunnus on valkoisella alustalla, jolloin sen alkuperäiset värit säilyvät.

PWA-ikonien toistettava muodostus on `python scripts/build-brand-icons.py` (Pillow). Tämä erillinen työkalu tarvitaan vain ikonilähteen muuttuessa; tavallinen Node/Vite-build käyttää versionhallintaan tallennettuja valmiita ikoneita eikä vaadi Pythonia.

## Muu kuvitus

- `public/brand/lvi-installation.svg` on tätä sivustoa varten kirjoitettu alkuperäinen tekninen putkistokuvitus. Se on kuvitus, ei valokuva toteutetusta asiakastyöstä. Se ei sisällä KH-Tech-logon jäljitelmää tai ulkopuolista kuvamateriaalia.
- `public/game2/mascot.svg` on projektin olemassa oleva Putkimestari-maskotti. Sitä käytetään vain hillityssä peliesittelyssä. Pelin kuvitusta tai mekaniikkaa ei muutettu tässä erässä.
- Lucide-kuvakkeet ovat projektin olemassa olevasta MIT-lisensoidusta riippuvuudesta. Virallista yritystunnusta ei rakenneta niistä.
- Typografia käyttää laitteen omia Segoe UI / Arial / sans-serif-fontteja. Ulkoista fonttipalvelua tai uusia fonttitiedostoja ei ladata.

Kolmannen osapuolen verkkosivustokuvia tai henkilövalokuvia ei kopioitu. Paikallinen hahmoreferenssivalokuva pysyy `.gitignore`-rajauksen piirissä eikä päädy publiciin, distiin tai uusiin kaappauksiin.

## Testiaineisto ja tarkistus

`e2e/fixtures/before.jpg` ja `after.jpg` ovat tätä testausta varten piirrettyjä synteettisiä kuvia. Niissä lukee “TESTIKUVA – ei asiakaskohde”. Niitä käytetään kuvanlisäyksen ja PDF:n tarkistamiseen, eikä niitä julkaista sivuston tuotantoassetteina. Raporttien esimerkkitiedot ovat testitietoja.

`node scripts/check-website-assets.mjs` vertaa lähde-, public- ja dist-PNG:n tavuja, tarkistaa PDF-moduuliin upotetun alkuperäisen kuvan ja PWA-ikonien koot sekä varmistaa, etteivät yksityiset referenssit tai sisäiset palvelinasetukset sisälly julkaistavaan pakettiin. Koneelliset tulokset: `docs/website2-checks/brand-assets.json`.

PDF:n kuvasuhteet ja logon esiintyminen joka sivulla tarkistetaan erillisellä renderöinnillä: `python scripts/review-website-pdf.py` (PyMuPDF). Tulokset ja todelliset renderöidyt sivut ovat `docs/website2-checks/`- ja `docs/website2-screenshots/`-hakemistoissa.

PDF-tarkistustiedostot merkitään `.gitattributes`-tiedostossa binäärisiksi, jotta Windowsin rivinvaihtomuunnos ei muuta niiden tavurakennetta versionhallinnassa.

Yrityssisällön lähde: [KH-Tech Oy:n virallinen verkkosivusto](https://kh-tech.fi/). Vahvistettu sisältö kattaa yrityksen, Tomi Hongan, Y-tunnuksen, julkiset yhteystiedot, postiosoitteen, Helsinki/Uusimaa-palvelualueen ja neljä palveluluokkaa. Sivuston kuvia, sertifikaattimerkkejä tai asiakasarvioita ei kopioitu.
