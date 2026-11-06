# Putkimestari 2.0 – aineistoluettelo

Kaikki pelin kuvat on tehty tätä projektia varten alkuperäisenä SVG-kuvituksena. Toistettava lähde on `scripts/build-game-art.mjs`; tuotokset ovat `public/game2/`-hakemistossa. Konseptikuvaa ei ole leikattu, kopioitu spriteiksi tai asetettu pelitaustaksi. Kuvitus koostuu poluista, liukuväreistä, korostuksista ja kerroksista, jotka rasteroidaan Phaserin latauksessa ja käytetään uudelleen tekstuureina. Hahmo liikkuu oikeassa interaktiivisessa maailmassa.

| Aineisto | Käyttö |
| --- | --- |
| `plumber-sheet.svg` | 768×1024, 3×4 ruutua: neljä katsesuuntaa, lepo ja kaksi kävelyaskelta |
| `mascot.svg` | Alkuvalikon alkuperäinen putkimieshahmo |
| `floor*.svg`, `wall.svg` | Lattia- ja seinäpinnat; keittiö-, toimisto- ja kellaripaletit |
| `pipe.svg`, `leak.svg`, `leak-off.svg` | Ehjä putki ja vuotokohdan kaksi tilaa |
| `valve.svg`, `valve-closed.svg` | Venttiilin auki- ja kiinni-tila |
| `crate.svg`, `plate.svg`, `plate-active.svg`, `gate.svg` | Laatikko, painokytkin ja huolto-ovi |
| `toolbox.svg`, `gasket.svg` | Kerättävät korjausvälineet |
| `plant.svg`, `boiler.svg`, `counter.svg`, `shelf.svg` | Kuvitetut kalusteet ja ympäristön esteet |
| `puddle.svg`, `droplet.svg`, `spark.svg`, `glow.svg`, `wall-light.svg` | Vesilammikko, hiukkaset, valot ja keräilykorostus |
| `marker.svg` | Kontekstuaalinen kohdemerkki |

Hahmo, kalusteet ja esineet ovat projektissa kirjoitettua kuvitusta; ulkopuolista pelitaidetta tai stock-kuvia ei ole käytetty. Niille ei tässä anneta uutta erillistä julkaisulisenssiä: projektin omistaja päättää aineiston jatkojakelusta. Käyttäjän toimittama konseptikuva kuuluu käyttäjän lähdeaineistoon, eikä sen jakeluoikeuksia oleteta. Se ei kuulu `dist/`-julkaisuun.

Käyttöliittymän pienet toimintokuvakkeet tulevat jo käytössä olevasta `lucide-react`-paketista (ISC/MIT-tiedot paketin LICENSE-tiedostossa). Phaser ja React ovat MIT-lisensoituja. Ääniefektit syntetisoidaan Web Audio -oskillaattoreilla omasta koodista; ulkopuolisia ääninäytteitä tai musiikkia ei ole. Fontit ovat laitteen järjestelmäfontteja, eikä peli hae ulkoista kirjasinpalvelua.

Sisäänrakennettua imagegen-kuvagenerointia yritettiin kahdesti alkuperäisen sinilakkisen/oranssihaalareisen hahmon 3×4-kävelyspritearkille. Molemmat tuotannot hylättiin palvelussa, eikä niistä syntynyt toimitettavaa kuvaa. CLI/API-varamenetelmää ei käytetty. Lopulliset pelissä näkyvät kuvat ovat yllä kuvattua omaa vektorigrafiikkaa. Se on selvästi tasaisempaa ja vähemmän maalauksellista kuin referenssi; tämä ero on kuvattu visuaalisessa katselmoinnissa.

Viimeisen sisäänrakennetun kuvagenerointiyrityksen prompti (tuotosta ei syntynyt):

> An original high-quality cartoon plumber character animation sprite sheet for a friendly plumbing puzzle game. Transparent background. Precisely 3 columns and 4 rows, 12 evenly spaced separate character poses, generous transparent padding in every cell. Same friendly adult moustached plumber with a blue baseball cap, orange overalls, blue shirt, brown gloves, utility belt and brown boots. Big expressive head, sturdy small body, rounded polished 3D cartoon shading, high three-quarter top-down camera with feet visible, warm upper-left highlights, dark navy silhouette edge. Row 1 faces down toward viewer, row 2 faces left, row 3 faces right, row 4 faces up away from viewer. Each row: idle pose, left walking step, right walking step. All figures the same size, no overlap, no shadows on floor. Usable sprite atlas, not a scene. No words, no logos, no border. Canvas ratio 3:4.
