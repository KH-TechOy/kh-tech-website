# KH-Tech – Putkimestari 2.2

Paikallinen toimitus 6.11.2026. Muutokset tehtiin nykyiselle `main`-haaralle. Pushia, deployta tai oikeita sähköpostilähetyksiä ei tehty.

## Toteutunut peli

Olemassa olevaa Phaser 3 / TypeScript -peliä päivitettiin. Jatkuva liike, törmäykset, laatikon ruututarkat työnnöt, oven lukittuminen, partikkelit, ääniefektit, React-valikot, analogijoystick, monikosketus ja sivuston laiska pelilataus säilyvät. Worker lisättiin kenttien muodostamista varten; Phaser-maailmaa ei rakennettu staattisesta konseptikuvasta.

- **Virallinen brändi:** toimitetut alkuperäiset PNG-logot ovat otsikossa, alkuruudussa, HUD:ssa, maskotin lakissa ja työvaatteissa, työkalupakissa, yhdessä ympäristökyltissä, voittonäkymässä ja etusivun peliesittelyssä. Tavut tarkistetaan lähteestä publiciin ja distiin. Ei uutta korvaavaa logoa.
- **Hahmo:** musta lippalakki, tummat työvaatteet, lyhyet ruskeat hiukset ja puhtaat kasvot ilman viiksiä tai partaa. Sama maskotti otsikkokuvassa ja neljässä liikesuunnassa. Jokaisessa suunnassa idle ja kaksi kävelyruutua. Referenssivalokuvaa ei julkaista eikä upoteta assetteihin.
- **Opastus:** liikkuminen → hana → työkalut → laatikko → vuoto/putkien kierto → palkitseva voitto. Vaihe vaihtuu vasta pelaajan tehtyä asian. Suuntanuoli, esinekorostus, toimintopainikkeiden korostus ja yksi lyhyt kuvitettu suomenkielinen ohje. Ensimmäinen putkipulma opettaa yhden osan kerrallaan. Opastuksen 90 sekuntia eivät kulu; ohituksen jälkeen laskuri alkaa. Ohjeet ja asetukset löytyvät valikosta ja tauolta. Pitkän odotuksen jälkeen annetaan toimintaa koskeva muistutus.
- **Kentät:** rakenteellisesti generoituja huoneita, kuusi teemaa, vaihtelevat kalusteet ja tavoitteet, käänteisesti rakennettu laatikkopulma sekä erillinen eteenpäin etsivä ratkaisija. Vaikeus lisää reittejä, venttiilejä, korjausosia ja putkipulman kokoa. Valinnainen lisätarkastus antaa +5 s. Kentät eivät kierrä kuuden tason listassa.
- **Turva ja uusinta:** jokainen kenttä validoidaan ennen peliä. Yritys- ja hakurajat, deterministinen validoitu varakenttä sekä pelinaikainen työnnön ratkeavuustarkistus. Kenttäkoodi asetuksissa, seed osoitteessa ja täsmälleen saman kentän uudelleenaloitus.
- **Aika:** johdetaan todistetun ratkaisun reittipituudesta, työnnöistä, venttiileistä ja putkipulman koosta. Sitä ei lyhennetä sokeasti tasojen mukana. Tauko, välilehden piilotus ja ikkunan fokuksen menetys pysäyttävät pelin.
- **Voitto:** “Homma hoidettu!”, “Oikean elämän LVI-työt hoitaa KH-Tech Oy.” sekä “Seuraava taso”, “Pelaa uudelleen” ja sivuston oikealle `/yhteystiedot/`-reitille johtava yhteyspainike. Pages-peruspolku huomioidaan.

Algoritmi ja toistaminen: [GAME_2_2_LEVEL_GENERATION.md](GAME_2_2_LEVEL_GENERATION.md). Kuvituksen lähteet ja tiedostot: [GAME_2_2_ASSETS.md](GAME_2_2_ASSETS.md).

## Referenssit ja visuaalinen katselmointi

Ennen toteutusta luettiin IDEA, CODEX_PROMPT, README, aiemmat GAME 2.0:n asset- ja katselmointidokumentit, pelin lähteet ja grafiikkaskripti. Uusi ensisijainen konsepti löytyi toimitetulla nimellä `docs/Putkimestari_ 2.png`. Viralliset tunnukset löytyivät nimillä `kh-tech-logo-musta.png` ja `favicon-kh-tech.png`. Kaikki kolme sekä paikallinen hahmoreferenssivalokuva avattiin ja tarkastettiin visuaalisesti. Yrityksen virallinen sivusto `https://kh-tech.fi/` tarkastettiin; muita yritystietoja tai palvelulupauksia ei lisätty.

Todelliset kaappaukset: `docs/game22-screenshots/`. Jokaisesta kolmesta näyttökoosta on otsikko, pelitilanne, laatikon opastus, avattu ovi, korjauspulma, voitto ja generoitu seuraava kenttä. Lisäksi tallennettiin generoitu vaikeuden 6 kenttä, sen putkipulma ja voitto, todellinen aikarajahäviö, safe area ja tuotantopolkukaappaukset. `character-art.png` näyttää kaikki hahmon suunnat sekä brändätyt esineet.

Konseptiin verrattaessa korjattiin useita näkyviä puutteita: suurennettiin liian pientä pelihahmoa, siirrettiin ohjekortti pois hanan ja hahmon päältä, jätettiin työpöydällä maailmalle HUD:n alapuolinen tila ja väljennettiin mobiilikameraa niin, että hahmo pysyy keskellä myös seinän lähellä. Ohje on nyt ohjainten yläpuolella; toimintopainikkeet pysyvät erillisinä. Vuoto sai sinisen hehkun ja teemojen lattiat säilyttävät omat värinsä.

Toteutuksessa on konseptin tumma ilme, musta brändätty hahmo, kirkas vesi, kellertävät korostukset ja suuret mobiiliohjaimet. **Vektorikuvitus ei vastaa konseptin maalattua 3D-henkistä pintaa täsmälleen.** Ympäristöt ovat tyylitellympiä ja väljempiä, hahmon anatomia ja valaistus yksinkertaisempia. Täydellistä visuaalista vastaavuutta ei väitetä. Konseptia ei käytetä pelitaustana eikä sprite sheetinä.

## Tarkistukset ja tulokset

| Tarkistus | Tulos |
| --- | --- |
| `npm.cmd test` | 40/40 testiä, 6 tiedostoa. Mukana pelimalli, opastuksen järjestys ja kellon pysähtyminen, useat venttiilit/osat, bonus, ei-kulmassa syntyvän laatikkojumin torjunta, putkipulma, reititys, PDF sekä palvelinpuolen aiemmat testit. |
| 1 000 seedin stressi | 1 000/1 000 ratkaistavaa ja 1 000 eri seinärakennetta, kaikki kuusi teemaa ja kuusi kokoa, 0 varakenttää. Mukana myös sertifikaattien työnnöt oikealla pelimallilla. |
| Varakentät | 48 seediä pakotetulla varareitillä, kaikki ratkaistavia. |
| Koko alkuperäinen selaintestiajo | 12 läpäisyä, 6 tarkoituksellista toisto-ohitusta; desktop 1440×900, mobiili 390×844 ja 844×390. Sisältää oikean 90 sekunnin laskurin loppumisen ja uusinnan. |
| Kameran/ohjekortin viimeisen korjauksen jälkeinen ajo | 11 läpäisyä, 4 toisto-ohitusta. Opastus, ohjaus, monikosketus, pause/resume, korjaus, voitto ja seuraava kenttä kaikissa kolmessa koossa; vaikeuden 6 generoitu kenttä desktopilla. Muuttumatonta 90 s häviöajoa ei toistettu. |
| Workerin häiriö ja poistuminen | Erillinen selaintesti läpäisi: Workerin lataus estettiin, validoitu varakenttä avautui, sivustolle palaaminen poisti Scene-hookin/canvasin ja peliin palaaminen loi yhden uuden instanssin. |
| Kenttäkoodit selaimessa | 12 eri rakenteista kenttää aidon asetusvalikon kautta; Worker käytössä kaikissa, viisi teemaa otoksessa. Yksi generoitu kenttä pelattu koko ratkaisuun näppäimillä ja hiirellä, ei teleporttaavaa testikoukkua. |
| Safe area ja saavutettavat asetukset | Mobiilin pysty/vaaka-vaihto, 44 px ylä- ja 34 px alareuna, yksi canvas, ei sivun ylivuotoa, reduced motion, oletusmykistys ja äänen kytkentä tarkistettu. |
| Tuotantobuild | TypeScript ja Vite läpäisivät sekä `/`- että `/kh-tech-website/`-peruspolulla. |
| Tuotannon selainajo, molemmat peruspolut | Suora pelireitti ja refresh, yksi canvas, ei DEV-hookia, oikea Worker/asset-polku, kaikki sivureitit, yhteydenoton nykyinen esittelytilan palaute, raporttiluonnoksen säilyminen ja todellisen `%PDF`-tiedoston lataus läpäisivät. |
| Assetit | 40 SVG:tä; alkuperäisten kahden PNG:n tavut yhtäläiset lähteessä, publicissa ja distissä. Ei valokuvaa eikä konseptia tuotantohakemistossa. |
| Riippuvuudet | `npm.cmd audit --omit=dev`: 0 haavoittuvuutta tarkistushetkellä. Node-tyypit lisättiin tiedostoja kirjoittavan stressitestin TypeScript-tarkistusta varten. |

Raakatulokset ovat `docs/game22-checks/`-hakemistossa: `generation-stress.json`, `worker-browser.json`, `assets.json`, `production-root.json` ja `production-pages.json`. FPS-näytteet ovat kaappaushakemiston `*-benchmark.json`-tiedostoissa. Selaintestit: `e2e/game.playwright.ts`; tuotantotarkistus: `scripts/check-pages-game.mjs`.

## Mitattu suorituskyky

Mittausympäristö: Windows-kehityskone, Chromium 153.0.8010.12 headless, WebGL / ANGLE Direct3D11, NVIDIA RTX A2000 8 GB Laptop GPU. Käytettiin koneella valmiina olevaa Chromiumia `GAME_BROWSER_EXECUTABLE`-muuttujalla. Mobiilit ovat viewport- ja kosketusemulointia samalla tietokoneella. Mittauksen aikana ei otettu kaappauksia eikä jäljitetty ruutuja. Muu paikallinen työ voi vaikuttaa tuloksiin; nämä ovat testiajon näytteet.

| Näkymä | Keskim. FPS | P95 ruutuväli | Efektitaso |
| --- | ---: | ---: | --- |
| 1440×900 | 53,5 | 18,1 ms | full |
| 390×844 | 52,9 | 17,3 ms | light |
| 844×390 | 57,1 | 17,6 ms | full |

Peli vähentää vesipartikkelien määrää automaattisesti, jos alkumittauksen toimitusnopeus jää alle 40 FPS:n; pystynäkymässä tämä varatila aktivoitui. Keskiarvo sisältää satunnaiset pidemmät ruutuvälit. Fyysisen puhelimen 60 FPS:ää ei luvata.

Tuhannen seedin viimeisessä paikallisessa stressiajossa generoinnin mediaani oli 0,88 ms, P95 3,48 ms ja maksimi 13,07 ms. Koko validointierä vei noin 3,2 s sisältäen erilliset tarkistukset. Selaimen 12 Worker-generointia veivät noin 1,2–8,6 ms per kenttä; käyttöliittymä toimitti 872 animaatioruutua noin 14,8 sekunnissa, pisin väli 66,6 ms. Worker-generointi ei siis pysäyttänyt pääsäiettä koko laskennan ajaksi, mutta täysin katkottomia ruutuvälejä ei väitetä.

Vite ilmoittaa edelleen Phaser-moottorin noin 1,23 MB:n pakkaamattomasta chunkista (noin 339 kB gzip). Peli ja moottori ladataan laiskasti erikseen muusta sivustosta. Alkuperäisen logon upotukset kasvattavat hahmoassetin kokoa; niitä ei korvata piirretyllä tunnuksella koon pienentämiseksi.

## Muu sivusto ja työpuu

Etusivun peliesittely päivitettiin. Muu sivuston sisältö, yhteydenottolomake, raporttieditori, PDF-lähde ja Apps Script -logiikka säilyvät. Service workerin kuoriversio vaihtui uusien pelitiedostojen välimuistia varten; Pages-julkaisutyönkulku säilyi. Lomake ja raportti ovat edelleen aiemmin dokumentoidussa paikallisessa/esittelytilassa. Tämä pelityö ei ota palvelinlähetystä tai kirjautumista käyttöön.

`docs/GAME_2_0_ASSETS.md` ja `docs/GAME_2_0_REVIEW.md` säilytettiin täsmälleen samoina git-blobina. Alussa työpuussa olleet vanhojen kaappausten ja konseptin poistot sekä README:n käyttäjän lisäämät käsikomennot säilytettiin erillään tämän toimituksen paikallisesta commitista. Niitä ei palautettu eikä julkaistu.

## Rajaukset ja paikallinen arviointi

Fyysistä Android-/iOS-laitetta tai lapsipelaajien käyttäjätestiä ei ollut käytettävissä. Opastuksen ymmärrettävyys on tarkastettu vaiheittaisella toiminnallisella testillä ja visuaalisella katselmoinnilla; itsenäistä lapsikäyttäjätestiä ei väitetä tehdyksi. iOS:n äänentoiston ja pitkän pelaamisen lämpö-/akkukäyttäytyminen pitää arvioida oikealla laitteella.

Kentät käyttävät yhtä laatikkoa, yhtä kytkintä ja yhtä ovea. Hakurajat voivat torjua vaikean ehdokkaan ja vaihtaa varakenttään. Tuhat seediä ei ole kaikkien mahdollisten seedien kattava testi, mutta jokainen pelissä syntyvä kenttä validoidaan.

Paikallinen tarkistus: `npm.cmd run dev`, sitten `/peli/`. Käy ensin opastus, kokeile “Osaan jo pelata” ja avaa asetuksista esimerkiksi `KHT-12345678-D6`. Tarkista erityisesti pelituntuma oikealla puhelimella ja visuaalisen tyylin sopivuus yritykselle ennen omaa julkaisupäätöstä. Ei automaattista pushia tai deployta.
