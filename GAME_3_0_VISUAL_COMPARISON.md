# GAME 3.0 – visuaalinen vertailu

## Ennen toteutusta, 7.11.2026

Avattu ja tarkastettu ensisijainen konsepti `docs/Putkimestari_ 2.png` (toimitetussa nimessä on välilyönti), alkuperäiset kaksi PNG-tunnusta, `docs/game22-screenshots/character-art.png`, desktop- ja pystymobiilin pelikaappaukset. Luettu aiemmat asset-, katselmointi-, toteutus- ja generointidokumentit, nykyinen Phaser-renderöinti sekä hahmon SVG-spritejen lähde. Konsepti on taiteellinen referenssi, ei pelin tausta tai spritejen lähde.

| Osa | Nykyinen GAME 2.2 | Konseptin tavoite | Toteutettava korjaus ja arviointitapa |
| --- | --- | --- | --- |
| Kamera | Neliöruudukko näyttää lähes kohtisuoralta, pystyakseli yhtä pitkä kuin vaaka. | Matalampi kolmen neljäsosan kuvakulma, lattian lyhenevä syvyys ja pystysuorat esineet. | Projektio renderöinnissä: x säilyy, lattian y tiivistyy; objektien korkeus ei tiivisty. Looginen törmäys- ja ohjaustaso säilyy. Tarkistetaan oikea pelattu reitti kolmessa koossa. |
| Seinät | Sama erillinen kuutiokuva toistuu seinän jokaisessa ruudussa; saumat katkovat jatkuvuuden. | Yhtenäiset paksut seinäpinnat, listat, aukot ja kulmat. | Naapuritietoinen modulaarinen seinäjärjestelmä, jatkuvat yläpinnat ja etupinnat, päädyt vain aukoissa, matalampi etuseinä. Tarkistetaan myös generoitu monihuoneinen kenttä. |
| Hahmo | Suuret lähes valkoiset silmät, leveä hammasrivi, pienet jalat ja lähes sama askel. | Ystävällinen nuori aikuinen, luonnolliset silmät, kiinni oleva suu, pehmeät kasvot, yhtenäinen anatomia. | Uusi rasterihahmo, neljä erillistä suuntaa ja lepo/kävely, musta lakki ja hiilenharmaat vaatteet. Alkuperäiset tunnukset lisätään erillisinä alkuperäisinä PNG-kerroksina. Tarkistetaan myös otsikko. |
| Materiaalit | Paksu viiva ja yksinkertaiset liukuvärit korostavat vektorimuotoja. | Pehmeästi maalattu metalli, puu, keramiikka ja kangas, reunavalot ja kosketusvarjot. | Uudet alkuperäiset rasteriassetit ja yhtenäinen lämmin ylävasen valo / viileä varjo. Generoinnin onnistuminen ja lähteet kirjataan, vastaavuutta ei oleteta. |
| Putket | Samat irralliset vaakaputket toistuvat ja liittyvät epäselvästi venttiiliin. | Yhtenäinen halkaisija, sopivat liitokset, mutkat, tuet ja selvä vaurio. | Yhteiset liitosmitat ja reititettävät koristeelliset verkostot; ei kulkuesteitä tai uutta pelilogiikkaa. Tarkistetaan liitoskohdat lähikuvasta. |
| Vesi | Yksi samankokoinen lätäkkö ja pienet putoavat partikkelit; äkillinen kasvu vasta häviössä. | Elävä suihku, roiskeet, renkaat, heijastukset ja hitaasti kasvava pinta. | Rajattu ajassa kasvava visuaalinen pinta, useampi vesikerros, sulkeminen pysäyttää suihkun ja kasvun; rauhoittuminen. Aika- ja tehtäväsäännöt säilyvät. |
| Valaistus | Hehkuvat lamput ilman ympäristön vahvaa valotilaa; tasainen lattia. | Lämmin seinävalo, veden sininen valo, syvyys ja pehmeä AO. | Valmiit pienet valotekstuurit, nurkkavarjot, kerrosten syvyys, metallin kohokohdat; kevyt mobiilitaso ilman jälkikäsittelysumennusta. |
| Kalusteet | Irralliset samanmuotoiset SVG-esineet ja toistuva kasvi. | Yhtenäinen mittakaava, tilavuus ja harkitut yksityiskohdat. | Koherentti rasterikalusteperhe kuuteen teemaan, varjot jalan kohdalla; törmäysruutujen vastaavuus tarkistetaan. |
| HUD ja kosketus | Toimivat suuret ohjaimet; paljon tasaisia sinisiä pintoja. Pystyssä opastuskortti peittää lattiaa. | Viimeistelty tumma lasi/metalli, sininen emali, keltainen toiminto, luettavat tavoitteet. | Kehysten, typografian, valon ja tilankäytön uudistus. Ohjainten vähimmäiskoko, monikosketus ja safe area säilyvät. |
| Tutkiminen | Pelaajan nuoli, laatikon työntösuunnan nuoli ja seuraavan kohteen pysyvä huutomerkki paljastavat reitin. | Pelaaja tutkii ja ratkaisee itse. | Poistetaan reittihakuun sidotut opasteet ja kohdemerkit. Vain lähellä toimivaa objektia näkyvä toimintovihje, tavoitelista ja lyhyet kuvitetut opastusohjeet. Putkipulman todelliset tulo-/lähtömerkit säilyvät. |

## Katselmointisuunnitelma

Alkutoteutuksen jälkeen tallennetaan oikeat pelikaappaukset 1440×900, 390×844 ja 844×390. Sen jälkeen tehdään vähintään kaksi erillistä kuvista johdettua korjauskierrosta. Jokaisesta kirjataan havainto, muutos ja jälkitarkistus. Lopputuloksen rajoitukset erotetaan toteutuneista parannuksista. Fyysisiä mobiililaitteita ei ole käytettävissä.

## Alkutoteutus ja korjauskierros 1

Aidot kaappaukset `docs/game3-screenshots/initial/`: näppäimistö, tauko ja mobiilin monikosketus läpäisivät kaikissa kolmessa koossa. Uudet rasterikalusteet, jatkuvat seinät, projektion lyhennetty lattiasyvyys ja uusi hahmo näkyvät selvästi. Nuolet ja kaukaisen kohteen huutomerkki puuttuvat.

Kuvista havaittiin: runkoputket peittyivät takaseinän taakse väärän syvyysarvon vuoksi; huone jäi desktopilla turhan pieneksi; lamppujen valo peittyi seinään; sivusuuntainen hahmo oli liian hoikka ja matalasta kuvakulmasta; ellipsilätäkkö näytti geometriselta. Otsikkohahmon lakkimerkki oli liian korkealla.

Korjaukset: putkien ja valojen kerrokset nostettiin näkyvän seinäpinnan eteen, desktopin kameraa lähennettiin, hahmosta generoitiin uusi yläviistosta nähty versio samoilla kasvoilla ja vaatetuksella, tuotettiin alkuperäinen neliosainen vesiefektiatlas. Orgaaninen lätäkkö kasvaa ajassa, erillinen suihku ja kruunuroiske elävät, renkaat rauhoittuvat suljettaessa. Logokerrosten paikat tarkennettiin. Lähdekuvien ensimmäinen hahmoversio säilyy vertailua varten.

## Korjauskierros 2

Aidot jälkitarkistukset `docs/game3-screenshots/iteration1/`: opastus pelattiin voittoon kaikissa kolmessa koossa. Putket ja orgaaninen vesi näkyvät, kamera käyttää tilan paremmin ja hahmo sopii yläviistoon maailmaan. Seinä näyttää jatkuvalta myös oven ympärillä.

Uudet havainnot: läpinäkyvän atlasruudun käyttö mittana teki putkikauluksista suhteettoman korkeita; putki kulki valaisimen edestä; HUD:n taustakuvarajaus näytti uudesta hahmosta lähinnä lakin. Korjattiin putkien näkyvän 26 px halkaisijan ja mutka-/T-porttien kalibrointi, rakennettiin portteihin päättyvät suorat sekä pystynousut, pienennettiin kaulukset, nostettiin valaisimet putkirungon yläpuolelle, lisättiin lämmin lattiavalon pinta ja tehtiin erillinen oikeasti rajattu kasvokuva HUD:iin. Suihkun aloituskorkeus sovitettiin vauriokohtaan.

Lopulliset kaappaukset ovat `docs/game3-screenshots/`-juuressa. Sama hakemisto sisältää oikean generoituja huoneita käyttävän pelin, korjauspulman, voiton, häviön ja safe area -näkymän. `asset-review.png` on erikseen merkitty assetkatselmus, ei pelikaappaus.

## Lopullinen vertailu konseptiin

Konsepti avattiin uudelleen rinnakkain lopullisten desktop-, pysty- ja vaakamobiilin todellisten pelikaappausten kanssa. Viimeinen kohdistettu 9/9 selaintestiajo läpäisi kaikkien kolmen koon opastuksen, kontrollit ja vesitarkistuksen. Loppusilauksessa tarkennettiin brändimerkkien sijoittelu ja opastuksen teksti sekä poistettiin laatikon alkukohtaan jäänyt toinen varjo.

| Osa | Lopullinen havainto kaikissa kolmessa koossa | Jäljellä oleva ero |
| --- | --- | --- |
| Kamera / tilavuus | Lattian syvyys on tiivistetty, pystyhahmo ja esineet säilyttävät korkeutensa, seinien ylä-/etupinnat erottuvat. Mobiili seuraa hahmoa, desktop näyttää koko huoneiston. | Suorakulmainen hallittu projektio; ei perspektiivistä 3D-kameraa tai konseptin käsin sommiteltua yksittäistä huonetta. |
| Hahmo | Ei hammasriviä, partaa tai valkoisina paistavia silmiä. Pehmeä iho, pyöreä lakki ja luettava työasu. HUD näyttää kasvot, title saman hahmon tarkemmin. | Kahden ruudun sivukävelyn askelten ero on pieni; käsin animoitu pidempi kierto olisi sulavampi. Otsikko- ja pelimittasuhteet eivät ole täysin samat. |
| Seinät | Vanha kuutiojono on korvattu jatkuvilla materiaalipinnoilla, listoilla, avautuvalla ovella ja paksuilla päädyillä. Generoidun kentän aukot vastaavat kulkureittejä. | Kulmat ovat teknisesti yhdistettyjä pintoja, eivät joka huoneelle käsin maalattuja uniikkeja seinämoduuleja. |
| Putket | Yhtenäinen runko, sopivan kokoiset kaulukset, kalibroidut mutka-/T-portit, pystynousut ja tuet. Valot ovat rungon yläpuolella. Vauriokohta on selkeä. | Ympäristöverkosto ja tehtäväkohtaiset venttiili-/vuotoliitokset ovat paikallisia esityskokonaisuuksia, eivät koko huoneiston hydrauliikkasimulaatio. |
| Vesi | Orgaaninen kirkas pinta, heijastukset, elävä suihku/roiske, pisarat ja renkaat. Sulkemisen jälkeen näkyy rauhoittunut märkä lattia. | Ei virtausta huoneen geometrian ympäri tai fysikaalista heijastusta. Kasvu on rajattu visuaalinen peitto. |
| Valo / esineet | Uudet puu-, metalli- ja keramiikkapinnat ovat huomattavasti pehmeämpiä ja yksityiskohtaisempia. Viileä ympäristö ja lämpimät valot erottuvat. | Konseptin vahva paikallinen värivalo, tiheä kalustus ja yksityiskohtien määrä eivät täyty kokonaan; ei dynaamisia 3D-varjoja. |
| UI / opastus | Siniset emaliohjaimet, keltainen työntö, lasikehykset, luettavat tavoitteet. Portraitin opastuskortti on ohjainten yläpuolella; landscapessa niiden välissä. Ei kohdetta/reittiä paljastavaa nuolta tai huutomerkkiä. | Pystynäkymä näyttää vain osan kentästä ja opastuskortti käyttää alareunan pelitilaa; tämä säilyttää riittävän isot kosketusalueet. |

Lopputulos on merkittävä uusi rasteritaiteeseen perustuva esitys, ei vanhan SVG-maailman värinvaihto. Konseptin täyttä laatuyhtäläisyyttä ei väitetä. Tarkempi viimeistely vaatisi erityisesti käsin animoidun 6–8 ruudun sivukävelyn, teemakohtaisesti sommiteltuja lisäkalusteita sekä valaisimien mukaan maalattuja vaihtoehtoisia materiaali-/varjokerroksia. Fyysisten puhelinten suorituskyky on edelleen erikseen testattava.
