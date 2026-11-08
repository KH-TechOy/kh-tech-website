# Yksi Toiminta-painike – 8.11.2026

Oikean reunan kaksi pelipainiketta on yhdistetty yhdeksi **Toiminta**-painikkeeksi. Sama painike ja pikanäppäimet **E / välilyönti** sulkevat hanan, työntävät laatikkoa ja avaavat putkikorjauksen. Näytöllä oleva nimi pysyy samana. Lähikohteen lyhyt teksti kertoo toiminnon; opastus, pikaopas ja näppäimistöohje on päivitetty.

`RescueModel.actionTarget()` valitsee etäisyyden perusteella lähimmän kantaman sisällä olevan avoimen hanan, laatikon tai vuodon. Maailman lähivihje, painikkeen korostus ja suoritettava toiminto käyttävät samaa valintaa. Yksi painallus suorittaa yhden toiminnon. Suljettu hana poistuu ehdokkaista. Laatikon työntösuunta määräytyy pelaajan sijainnista, ja samat kulma-, seinä- ja ratkeavuustarkistukset sekä opastuksen ehdot pysyvät voimassa. Laatikkoa voi työntää myös oven avauduttua. Väärä sijainti tai puuttuva edellytys antaa palautteen.

Kävelyanimaation ruudut ja askelrytmi säilytettiin. Erillinen työntöpainike ja sen CSS poistettiin; yhden sinisen painikkeen koko ja safe area tarkistetaan desktop-, pysty- ja vaakamobiilikuvista.

## Syötteen tarkistus

Saman työn yhteydessä varmistettiin hiiri, kosketus, toisen sormen käyttö joystickin kanssa, SVG-kuvakkeiden painaminen sekä natiivi click/Space/Enter-aktivointi. Valittu HTML-painike käsittelee omat Space-/Enter-painalluksensa; pelialueella ne käyttävät yhteistä toimintoa. Joystick tyhjennetään tauossa ja näkymää vaihdettaessa, ja uusi kosketus toimii sen jälkeen.

`ActionInputScope` säilyttää käsitellyn pointer-eleen tiedon näkymän vaihtuessa. Tämä estää viimeisen putkipalan kosketuksesta syntyvää yhteensopivuusclickiä painamasta vahingossa voittonäkymän Seuraava taso -painiketta. Click-only- ja näppäimistöaktivoinnit säilyvät. Selaimen käyttäjäaktivointia tarvitsevat ääni- ja fullscreen-toiminnot tehdään vapautuksessa.

## Testaus

- 55 yksikkötestiä läpäisi. Uudet testit tarkistavat saman toiminnon hana → laatikko → korjaus -ketjun, päällekkäisten kantamien lähimmän kohteen ja jumittavan työnnön estämisen.
- Selainajo pelaa opastuksen oikeilla hiiri-/kosketuspainalluksilla ja erikseen näppäimistöllä. Se varmistaa, että pelialueella on yksi Toiminta-painike. Pystymobiili ja vaakamobiili käyttävät myös kahta samanaikaista kosketuspistettä.
- Mukana ovat tauko, jatkaminen, laatikon siirron peruminen, asetukset, äänet, ohjeet, uudelleenaloitus, natiiviklikkaus sekä 12 seedin Worker-ajo ja yhden generoidun kentän täysi ratkaisu.
- Pitkä putkipalan painallus tekee yhden neljänneskäännöksen. Voittonäkymään jäädään viimeisen korjauspainalluksen jälkeen.

Lopullinen selainajo läpäisi **18 testiä**, ja kolme samaa raskasta tarkistusta jätettiin tarkoituksella toistamatta muissa näyttökoissa. Virheitä tai flaky-tuloksia ei ollut. Pysty- ja vaakamobiilin sekä desktopin opastus pelattiin voittoon yhdellä Toiminta-painikkeella ja erikseen pikanäppäimillä. Kuvat avattiin visuaaliseen tarkistukseen: painike, opastus ja vasen ohjain pysyvät erillään ja teksti mahtuu painikkeeseen.

TypeScript ja tuotantobuild läpäisivät sekä `/`- että `/kh-tech-website/`-polulla. Molempien paikallinen tuotantoselain tarkisti suoran pelireitin ja refreshin, yhden canvasin, rakennetun Workerin, DEV-hookin puuttumisen, kaikki sivureitit, nykyisen yhteydenoton esittelypalautteen, raporttiluonnoksen säilymisen ja todellisen PDF-latauksen. Ei runtime- tai pyyntövirheitä. Lopuksi dist palautettiin tavalliseen juuripolun buildiin paikallista arviointia varten.

`screenshots/` sisältää oikeat pelikaappaukset, `focused-browser.json` selaintuloksen, `production-root.json` ja `production-pages.json` tuotantotarkistukset sekä `generation-stress.json` nykyisen 1 000 seedin tarkistuksen (1 000 ratkaistavaa, 1 000 eri rakennetta, 0 varakenttää). Fyysistä Android-/iOS-laitetta ei ollut käytettävissä; mobiilit ovat Chromiumin kosketus- ja viewport-emulointia.

Työ nykyisellä main-haaralla. Ei pushia tai deployta. Vanhemman kahden painikkeen tutkimuksen välitulokset ovat erikseen `docs/button-review/`-hakemistossa; ne eivät kuvaa lopullista ohjausta.
