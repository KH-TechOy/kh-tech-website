# KH-Tech – Putkimestari GAME 3.0

Paikallinen grafiikkauudistus 7.11.2026, nykyisellä `main`-haaralla. Ei pushia tai deployta. Pelin avaaminen: `npm.cmd run dev`, sitten `/peli/`.

## Toteutunut muutos

Pelin näkyvä maailma ja hahmo on uudistettu alkuperäisillä pehmeästi varjostetuilla rasterikuvilla. Uusi mustalakkinen, parraton ja viiksetön hahmo käyttää hiilenharmaita työvaatteita, luonnollisia silmiä ja kiinni olevaa suuta. Neljä erillistä suuntaa sisältävät levon ja kaksi askelruutua. Otsikossa on saman hahmon tarkempi versio. Viralliset alkuperäiset PNG-tunnukset on säilytetty ja lisätty erillisinä kerroksina.

Kalusteet, työkalut, varaajat, putket, venttiilit, laatikko, ovi ja vesipinnat käyttävät uutta yhteistä atlasta. Lattia ja seinä käyttävät maalattuja materiaalitekstuureja. Seinät muodostetaan naapuritietoisina jatkuvina pintoina; koko huone ei enää koostu saman erillisen seinäkuution jonosta. Oviaukot ja kalusteiden törmäysruudut säilyvät. Putkiston portit, kaulukset ja kannakkeet on kalibroitu yhteiseen näkyvään halkaisijaan. Valaisimet, lämmin lattiavalo, viileä vesihehku, reunavalot ja pehmeät kosketusvarjot tuovat tilaa ilman raskasta maailman jälkikäsittelyä.

Vesi koostuu orgaanisesta heijastavasta lätäköstä, erillisestä elävästä suihkusta ja roiskeesta, rajatuista pisaroista ja renkaista. Peitto kasvaa vähitellen vain aktiivisen vuodon aikana. Kaikkien tarvittavien venttiilien sulkeminen pysäyttää suihkun ja kasvun; jäljelle jäänyt vesi rauhoittuu. Vesi ei muuta liikkumista, ratkaisua tai aikarajaa. Sulkeminen vahvistetaan venttiilin tilalla, lyhyellä tekstillä ja partikkelipalautteella.

HUD:n, kellon, tavoitekorttien, etenemisen, joystickin, käsi-/työntöpainikkeiden, opastuksen ja valikoiden pinnat on viimeistelty samaan sinisen emalin, tumman lasin ja lämpimän keltaisen tyyliin. Touch-koot, safe area, monikosketus ja näppäimistö säilyvät.

## Projektio ja säilytetty logiikka

`projection.ts` muuntaa vain piirrettävän lattian sijainnin: **x′ = x, y′ = 0,72 × y**. Hahmon ja esineiden korkeus säilyy. Seinien etu- ja yläpinnat, esineiden jalat sekä kameran rajat käyttävät samaa muunnosta; syvyys järjestetään projisoidun lattiasijainnin mukaan. Koko canvasia ei vinouteta. Looginen TILE=80-taso, törmäykset, nopeus, tavoite-etäisyydet, analogisyötteet ja ruututarkat työnnöt säilyvät ennallaan. Akseleiden suunnat säilyvät, joten syötettä ei tarvitse kiertää.

Uusi `WorkshopView` erottaa esityksen `RescueScene`-ohjauksesta. Yksi siivottava Phaser-instanssi, laiska lataus ja Reactin rajatut HUD-päivitykset säilyvät. `generator.ts`, `solver.ts`, `puzzle.ts`, Worker ja levelFactory säilytettiin muuttumattomina. Niiden seed, ratkaistavuustodistus, aikabudjetti ja varakentät eivät muutu.

## Tutkiminen ilman reittiohjausta

Pelaajan suuntanuoli, laatikon ratkaisusuunnan nuoli, kohteen pysyvä huutomerkki ja niitä palvellut renderöinnin reittihaku on poistettu. Näitä tekstuureja ei edes ladata. Tavallinen pelikonteksti ei vaihdu automaattisesti seuraavaa tavoitetta paljastavaksi ohjeeksi. Lähellä käyttökelpoista venttiiliä, laatikkoa tai korjausta näkyy paikallinen toimintovihje. Tavoitelista säilyy.

Interaktiivinen opastus etenee edelleen vain pelaajan teoista, opettaa yhden toiminnon kerrallaan kuvalla ja lyhyellä tekstillä ja pitää kellon pysähtyneenä. Sen voi ohittaa. Korjauspulmassa ei enää verrata piirrettyä osaa ratkaisuun seuraavan käännettävän palan korostamiseksi. Oikeat sininen tulo, keltainen lähtö ja nykyisestä liitännästä syntyvä virtauskorostus säilyvät pelimekaniikkana. Joystickin suuntamerkit ja valikoiden navigointikuvakkeet eivät osoita kohteita pelimaailmassa.

## Visuaalinen katselmointi

Ensisijainen `docs/Putkimestari_ 2.png` avattiin visuaalisesti ennen toteutusta. Alkuperäiset logot, vanhat pelikaappaukset ja hahmoarkki tarkastettiin. Yksityiskohtainen ennen-tilan analyysi sekä kaksi erillistä alkutoteutuksen jälkeistä korjauskierrosta ovat [GAME_3_0_VISUAL_COMPARISON.md](GAME_3_0_VISUAL_COMPARISON.md)-tiedostossa.

Aidot pelikaappaukset 1440×900, 390×844 ja 844×390 ovat `docs/game3-screenshots/`-juuressa. `initial/` ja `iteration1/` säilyttävät kierrosten todisteet. Kaappaukset syntyvät oikeista näppäin-/kosketussyötteistä ja klikkauksista; mallia ei teleportata ratkaisuun. Mukana ovat opastus, laatikko, ovi, korjaus, voitto, generoitu kenttä ja häviö. `asset-review.png` on erikseen merkitty kuvien katselmointitaulu.

Loppukatselmoinnissa tarkennettiin vielä logokerrosten sijainteja, poistettiin laatikon alkupaikkaan jäänyt ylimääräinen varjo ja korjattiin opastuksen vanhat hohtavaan ratkaisupalaan viittaavat tekstit. Lopullinen kohdistettu selainajo uusii näiden jälkeen opastuksen ja paikallisen veden/vihjeiden tarkistukset.

## Tarkistukset

| Tarkistus | Toteutunut tulos |
| --- | --- |
| Yksikkötestit | 49/49, kahdeksan testitiedostoa; mukana liike/törmäykset, opastus, venttiilit, keräily, työnnön turva, pulmat, projektio ja PDF:n aiemmat testit. Viimeiset tekstien/varjon muutokset tarkistettiin uusimalla ajo. |
| Generointi | 1 000/1 000 ratkaistavaa, 1 000 eri rakennetta, kuusi teemaa ja kuusi kokoa, 0 varakenttää stressiotoksessa. Generaattoria ei muutettu. |
| Koko selaintestisarja | 16 läpäisyä, 8 tarkoituksellista toisto-ohitusta; kaikki kolme kokoa, koko opastus, monikosketus, pointer cancel, tauko, orientaatio, safe area, reduced motion ja äänikytkin. |
| Viimeisten korjausten jälkeinen selainajo | 9/9 läpäisi. Paikallinen konteksti/veden pysähtyminen, ohjaus ja koko opastus voittoon kaikissa kolmessa koossa; korjauspulmassa ei ratkaisupalan korostusta, molemmat oikeat virtausportit näkyvät. Raakatulos: `final-focused-browser.json`. |
| Generoitu peli ja häiriöt | 12 kenttäkoodia aidon asetusvalikon kautta, Worker ja rakenteellinen vaihtelu; vaikeuden 6 kenttä ratkaistiin kokonaan; Worker-virheestä validoitu varakenttä ja reittivaihdossa instanssin siivous. |
| Häviö/uusinta | Oikea 90 sekunnin laskuri päättyi häviöön, uusinta palautti saman kentän ja ajan. |
| Uusi tutkimis-/vesitesti | Kaikissa kolmessa koossa ei ladattuja reittimerkkejä, vihje vain lähellä, projektio vastaa loogista sijaintia, vesi kasvaa ennen sulkemista ja pysyy samassa peitossa sulkemisen jälkeen. |
| Tuotantobuild | TypeScript ja Vite läpäisivät sekä `/`- että `/kh-tech-website/`-peruspolulla. |
| Juuripolun tuotantoselain | Suora peli-URL ja refresh, yksi canvas, ei DEV-hookia, rakennettu Worker, kaikki sivureitit, yhteydenoton nykyinen esittelypalaute, paikallisen raporttiluonnoksen säilyminen ja todellinen PDF-lataus läpäisivät. |
| Pages-polun tuotantoselain | Samat tarkistukset läpäisivät `/kh-tech-website/`-polulla ilman runtime- tai pyyntövirheitä. Testi käynnistää vain paikallisen preview-palvelimen. |
| Assetit | 28 atlasruutua, noin 1,16 MB uusia runtime-kuvia/JSON:ia yhteensä; source/public/dist-tarkistus ja virallisten PNG:iden tavut läpäisivät. Lähde-PNG:t tai konsepti eivät kuulu julkaisuun. |

Tarkistusten tiedostot: `docs/game3-checks/`. Historiallisiin GAME 2.0/2.2- ja WEBSITE 2.0 -raportteihin ei kirjoiteta uuden pelin mittauksia. Testien uudelleen tuottama vanha esimerkkipdf ja generoinnin vanha ajastusartefakti palautetaan ennalleen; tämän työn stressitulos on tallennettu omaan hakemistoonsa.

## Suorituskyky

Windows-kehityskone, headless Chromium 153.0.8010.12, WebGL / ANGLE Direct3D11 / NVIDIA RTX A2000 8 GB Laptop GPU. Mobiilit ovat saman koneen viewport- ja kosketusemulointia. Kuuden sekunnin erillisessä ruutuvälinäytteessä ei otettu pelikaappauksia tai tracea.

| Näkymä | Keskimääräinen FPS | P95 ruutuväli | Efektitaso |
| --- | ---: | ---: | --- |
| 1440×900 | 59,8 | 17,4 ms | full |
| 390×844 | 60,0 | 17,1 ms | full |
| 844×390 | 59,7 | 17,1 ms | full |

Raakatiedostot: `*-benchmark.json`. Automaattinen kevyt taso vähentää pisaroita ja rengaskerroksia, jos ruututoimitus jää alle 40 FPS:n. Reduced motion vähentää liikettä erikseen. GPU-raskasta maailman sumennusta tai fluidifysiikkaa ei lisätty. Työkohteiden 12 Worker-generoinnin yhteydessä pääsäie toimitti 863 animaatioruutua noin 15,7 sekunnissa; pisin väli oli 116,5 ms. Täysin katkottomuutta ei väitetä.

Vite ilmoittaa edelleen Phaserin noin 1,23 MB:n pakkaamattomasta moottorichunkista (noin 340 kB gzip). Peli ja uudet kuvat latautuvat erillään yrityssivustosta. Runtime-atlas käyttää uudelleen yhtä tekstuuria; suuret muokattavat lähdekuvat eivät mene distiin.

## Jäljellä olevat erot ja rajat

Muutos on selvästi suurempi kuin SVG-uudelleenväritys: hahmo, materiaalit, kalusteet, seinäjärjestelmä ja vesi on vaihdettu. Referenssin art direction on lähempänä, mutta **täyttä konseptin visuaalista vastaavuutta ei väitetä**. Konseptin yksittäinen huone on käsin sommiteltu ja tiheämmin kalustettu; validoidut proseduraaliset huoneet ovat tarkoituksella väljempiä ja suorakulmaisia. Valo on kevyistä pinnoista koostettua, ei oikea kolmiulotteinen varjokartta. Seinän ja kalusteiden materiaalien valot eivät reagoi dynaamisesti jokaiseen lamppuun. Hahmon kahden ruudun sivukävely on yksinkertaisempi ja askelten ero pienempi kuin käsin animoidussa laajassa hahmosarjassa. Otsikkohahmon ja pelihahmon mittasuhteet eroavat hieman käyttötarkoituksen vuoksi.

Fyysisiä Android-/iOS-laitteita, pitkän pelisession lämpö-/akkukäyttäytymistä tai itsenäistä pelaajatutkimusta ei testattu. Tässä toimitetaan paikallisesti katselmoitava versio ja tarkat todisteet, ei lupausta fyysisen puhelimen 60 FPS:stä. Yrityssivuston, raportin, PDF:n tai palvelinlähetyksen toimintoja ei muutettu; tämä työ ei ota sähköpostipalvelua käyttöön.

Grafiikan lähteet, promptit ja uusinta: [GAME_3_0_ASSET_MANIFEST.md](GAME_3_0_ASSET_MANIFEST.md).
