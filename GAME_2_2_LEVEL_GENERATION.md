# Putkimestari 2.2 – kenttägenerointi

Generaattorin versio on 22. Toteutus: `src/game2/generator.ts`, `solver.ts`, `puzzle.ts`, `generation.worker.ts` ja `levelFactory.ts`. Phaser ja jatkuva liikkuminen säilyvät olemassa olevassa moottorissa. Kenttiä ei kierrätetä kuuden valmiin kentän listasta.

## Seed ja uusinta

Istunto alkaa selaimen satunnaistamasta 32-bittisestä luvusta. Kentän indeksi sekoitetaan siihen kokonaislukuoperaatioilla. Varsinainen generaattori käyttää determinististä PRNG:tä: sama seed, vaikeus ja generaattoriversio tuottavat saman kentän ja putkipulman. Suoritusajan mittaus on tarkoituksella epädeterministinen metadata.

Koodi `KHT-12345678-D6` tarkoittaa heksadesimaalista seediä `12345678` ja vaikeutta 6. Asetusten kenttäkoodi avaa kentän. Osoite päivittyy muotoon `/peli/?seed=12345678&difficulty=6`; sama toimii Pages-peruspolun alla. Uudelleenaloitus säilyttää täsmälleen nykyisen kentän. Seuraava taso generoi uuden; vaikeus kasvaa joka toisella kentällä, enintään 12:een. Vaikean kentän uusinnasta jatkaminen säilyttää vaikeuden etenemisen.

## Rakenteen muodostus

1. Valitaan koko: alkuun 15×11, myöhemmin 15/17/19 × 11/13.
2. Alue jaetaan vaaka- tai pystysuoralla seinällä kahteen osaan. Ainoa yhdyskäytävä saa kytkimellä avautuvan oven. Aloituspuoli vaihtelee.
3. Molempien alueiden sisällä tehdään rekursiiviset huonejaot, oviaukot ja vaihteleva määrä lisäseiniä. Helpot aukot ovat väljempiä. Huoneiden syvyys kasvaa vaikeuden mukana.
4. Teemaan sopivat kalusteet asetetaan seinien viereen. Ne ovat todellisia törmäysesteitä. Asettelu hylätään, jos avoin lattia pirstoutuu.
5. Laatikkopulma rakennetaan painokytkimestä taaksepäin: virtuaalinen pelaaja vetää laatikkoa vain, jos pystyy seisomaan vieressä ja perääntymään. Vedot eivät käy samoissa laatikkoruuduissa uudelleen. Vaikeammissa pulmassa suositaan suunnanvaihtoja.
6. Aloitus, venttiilit ja välineet valitaan laatikon alkutilanteesta saavutettavalta puolelta. Vuoto ja mahdollinen lisätarkastus ovat oven takana. Tavoitteet eivät saa olla päällekkäin. Lisäventtiilejä tulee vaikeudesta 6, kolmas korjausosa vaikeudesta 5.
7. Erillinen eteenpäin etsivä ratkaisija ja putkipulman tarkistus hyväksyvät kentän ennen palautusta.

Teemat: keittiö, kylpyhuone, kellari, kodinhoitohuone, toimisto ja tekninen tila. Vaihtelua tuovat huoneiden seinärakenteet ja kulkureitit, kalusteiden törmäykset, laatikon reitti, aloituspuoli, esineet, venttiilien määrä ja pulman rakenne. Teema ei ole pelkkä värikerros. Valinnainen tarkastus on erillinen kerättävä esine, josta saa viisi lisäsekuntia.

## Ratkeavuuden todistus

`solveLevel` tekee BFS-haun tilassa **laatikon ruutu + pelaajan saavutettava alue + oven lukittu/avattu tila**. Pelaajan sijainti kanonisoidaan alueen pienimpään ruutuindeksiin. Jokaisessa tilassa selvitetään seisomapaikat, joilta laatikkoa voidaan työntää. Seuraajaksi hyväksytään vain laillinen työntö; umpikulmat karsitaan. Pelkkä lattian flood fill ei siis todista pulmaa ratkaistavaksi.

Ratkaisun yhteydessä rakennetaan työntösertifikaatti ja tarkistetaan sen kävelyreitit. Lisäksi kuljetaan tavoitteet järjestyksessä: venttiilit → kaikki välineet → työntöreitti/kytkin → vuoto. Oven avaaminen lukittuu pysyvästi. Näin laatikkoa ei tarvitse jättää kytkimelle oven auki pitämiseksi. Valinnainen lisätarkastuskin on saavutettavissa ratkaisun lopputilassa.

Myös pelinaikainen työntö tarkistetaan jäljellä olevien tavoitteiden ja pelaajan uuden alueen suhteen. Ratkaisemattomaan tilaan johtava siirto estetään, eikä pelkkä kulmatunnistus riitä tähän. Tulos välimuistitetaan laatikon uuden ja vanhan ruudun, oven ja kerättyjen tavoitteiden perusteella. Tauosta voi perua työnnön; avattu ovi pysyy auki.

Yksi laatikko, kytkin ja ovi per kenttä on tietoinen rajaus. Vaikeus syntyy niiden reitistä ja ympäristöstä, ei usean laatikon Sokoban-hausta.

## Rajat ja varakentät

Generointiyrityksiä on enintään 18; ehdokkaan tilahaussa enintään 1 800 käsiteltyä tilaa. Sisäiset vetoyritykset, vetojen määrä ja putkipolun haku ovat myös rajattuja. Epäonnistuva ehdokas ei päädy peliin.

Varakenttä muodostuu kuudesta säilytetystä, validoidusta pohjasta peilaamalla ja/tai transponoimalla. Teema ja putkipulma seuraavat seediä. Varakenttäkin validoidaan ennen palautusta; testit pakottavat varareitin 48 seedillä. Tämä varajärjestelmä saa olla rajallinen, normaali generointi on rakenteellista.

Worker pitää generoinnin poissa piirto- ja käyttöliittymäsäikeestä. Vastaus tunnistetaan pyynnön ID:llä. Kuuden sekunnin aikakatkaisu tai Worker-virhe palauttaa validoidun varakentän. Varareitti luovuttaa ensin yhden tapahtumakierroksen selaimelle. Sulkeminen hylkää odottavat pyynnöt ja lopettaa Workerin; Scene käyttää lisäksi sukupolvitunnistetta vanhentuneiden vastausten estämiseen.

## Putkipulma ja aika

Normaalipulma on 3×1, 3×2, 3×3 tai 4×3. Rajattu polkuhaku rakentaa kaikkien solujen kautta kulkevan reitin; tulo- ja lähtösolu sekä niiden sivut vaihtelevat. Osat sekoitetaan vain kiertämällä. Valmis ratkaisu tarkistetaan todellisilla liitosbiteillä, ja lähtötilanne pidetään keskeneräisenä. Kuvassa näkyvät sininen tulo ja keltainen lähtö juuri oikealla solun sivulla. Opastuksessa on kolme suoraa putkea ja yksi korostettu käännös kerrallaan.

Odotettu aika = kävelyruudut × 80 / 180 + työnnöt × 0,7 + putkisolut × 1,35 + venttiilit × 1,4 sekuntia. Kävelybudjetti käyttää pelin todellista 226 px/s liikettä hitaampaa nopeutta. Aikaraja on vähintään 90 s ja muuten pyöristetty odotusaika × 2,15 + 24 s + alun lisäaika. Aikaa ei leikata automaattisesti kenttänumeron kasvaessa eikä yläraja katkaise pitkän reitin tarvitsemaa aikaa.

Opastuskentän aloitusarvo on 90 s. Ohjatussa opastuksessa se ei vähene. Ohituksen jälkeen kello käy myös korjauspulmassa; tauko pysäyttää sen.

## Stressitesti

`npm.cmd test` sisältää 1 000 eri seediä vaikeuksilla 1, 3, 6, 10 ja 12. Jokaiselle tarkistetaan erikseen sertifikaatin kävelyt ja työnnöt, kohteet, ovi, valmis putkipulma ja aikabudjetti. Lisäksi sertifikaatin työnnöt suoritetaan varsinaisella `RescueModel`-mallilla, jolloin pelinaikainen turvatarkistus ei saa torjua oikeaa ratkaisua.

Tulokset: `docs/game22-checks/generation-stress.json`. Tarkistettu erä: 1 000/1 000 ratkaistavaa, 1 000 eri seinärakenteen tiivistettä, kaikki kuusi teemaa ja kuusi kokoa, 0 varakenttää; 353 kentässä useita venttiilejä, 600 kentässä kolmas osa ja 318:ssa valinnainen tarkastus. Enintään 9 yritystä ja 49 käsiteltyä hakutilaa. Ajat ovat paikallisia mittauksia, eivät kaikille laitteille annettuja takuita.

Selaintesti avaa 12 eri kenttäkoodia aidon käyttöliittymän kautta ja mittaa Workerin ajat sekä pääsäikeen jatkuvat animaatioruudut. Tulokset: `docs/game22-checks/worker-browser.json`. Lisäksi yksi generoitu vaikeuden 6 kenttä pelataan venttiileistä putkipulman voittoon näppäimillä ja hiirellä. Tuhannen seedin erä on laaja otos, ei kaikkien 2³² seedien läpikäynti; jokainen pelissä tuotettu kenttä validoidaan silti erikseen.
