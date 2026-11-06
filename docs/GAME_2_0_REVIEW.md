# Putkimestari 2.0 – lähtötilanne ja visuaalinen suunta

6.11.2026, ennen uudelleenrakentamista. Työ tehdään nykyisellä `main`-haaralla.

Konseptikuva avattiin ja tarkastettiin: `docs/putkimestari-2-consept.png` (käyttäjän viestissä nimi oli `concept`). Se on suunnittelureferenssi, ei käytettävä pelitausta. Keskeisiä piirteitä ovat sinilakkinen putkimies, pyöristetyt ja varjostetut esineet, violetinsiniset putket, lämmin valo, kirkas vesi, tumma HUD ja suuret pyöreät mobiiliohjaimet.

Vanha peli on React-komponentti `src/main.tsx`:ssä. Liike tapahtuu yhden ruudun askelin 140 ms:n `setInterval`-ajastimessa. Pelaajan sijainnin päivitys aiheuttaa React-renderöinnin ja canvasin koko kentän uudelleenpiirtämisen; näppäimistökuuntelijat asennetaan uudelleen sijainnin muuttuessa. Yhden näppäimen taulukko estää luontevan moninäppäinliikkeen. 200 ms:n mobiilitapahtuma on erillään liikeajastimesta eikä ole varsinainen joystick. Kuvitus on pääosin ruutuja/ympyröitä; hahmosuunnittelu, syvyys, työntömekaniikka ja korjauspulma puuttuvat. Nämä ovat koodista havaittuja rakenteellisia ongelmia, eivät mitattuja FPS-tuloksia.

Uusi rakenne: yksi hallittu Phaser 3 -instanssi, React vain valikoille ja rajatuille HUD-päivityksille. Pelimalli, törmäykset, työntäminen, pulma ja ratkeavuuden tarkistus ovat erillistä TypeScript-koodia. Liike käyttää delta-aikaa, laatikoiden sijainnit ovat deterministisiä ja asettuvat ruutuihin. Mukaan tulevat kuusi suunniteltua kenttää, kytkinovet ja kiertoputkipulma.

Alkuperäisiä spritejä yritettiin tuottaa sisäänrakennetulla imagegen-palvelulla kahdesti, mutta palvelu hylkäsi tuotannon. CLI/API-varamenetelmää ei otettu käyttöön. Siksi grafiikka toteutetaan omana yksityiskohtaisena SVG-sprite- ja ympäristöaineistona. Vektorityylin ero maalattuun konseptiin on kirjattava lopulliseen raporttiin ja tarkistettava oikeista peliruudunkaappauksista.
