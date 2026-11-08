# Pelipainikkeiden ja ohjauksen korjaus – 8.11.2026

Tämä on ennen painikkeiden yhdistämistä tehty tutkimus. Lopullinen yhden Toiminta-painikkeen toteutus ja hyväksytyt tarkistukset on kuvattu tiedostossa `docs/action-review/README.md`.

Kävelyanimaatio säilytettiin. Tämä muutos korjaa pelin käyttöliittymän aktivoinnin ja syötteen elinkaaren.

## Toistetut viat

- Välilyönti valitun käsipainikkeen tai taukopainikkeen päällä päätyi pelin yleiseksi laatikon työntökomennoksi. Käsipainikkeen Space-aktivointi epäonnistui ennen korjausta kaikissa kolmessa näyttökoossa (`before.json`).
- Tavallinen click-aktivointi ilman pointerdown-tapahtumaa ohitettiin, jos sen detail-arvo ei ollut nolla. Toimintopainikkeet tarvitsevat myös itsenäisen click-polun.
- Taukopainikkeen tavallinen click-käsittely ei reagoinut toiseen sormeen, kun ensimmäinen piti joystickia pohjassa. Tämä toistettiin aidolla kahden kosketuspisteen selaintapahtumalla sekä pysty- että vaakamobiilissa (`keyboard-fixed-before-touch-fix.json`).
- Pelkkä moottorin analogisyötteen nollaus ei tyhjentänyt Reactin joystickin aktiivista pointer-tunnistetta, jos ohjain poistui tauon/korjauksen vuoksi. Syöte nollataan nyt myös komponentin puolella.
- Liian kaukana tehty toimintopainallus saattoi antaa saman tekstin kuin jatkuva opastus, jolloin näkyvä palaute suodatettiin pois. Nyt painallus kertoo selvästi, että kohdetta pitää lähestyä.

## Toteutus

Pelin painikkeet käyttävät yhteistä `src/game2/ActionButton.tsx`-komponenttia: hiiri, kynä, kosketus, ei-ensisijainen kosketus sekä natiivi click/Space/Enter. Pointer capture pitää vapautuksen mukana, painalluspalaute poistetaan peruutuksessa, ja jo käsiteltyyn painallukseen kuuluva click ohitetaan. Erillistä click-aktivointia ei estetä. Ääni- ja fullscreen-toiminnot aktivoidaan vapautuksessa selaimen käyttäjäaktivointia varten.

Näppäimistön Space ja Enter jätetään valitulle HTML-painikkeelle tai linkille. Pelialueella Space toimii edelleen työntönä ja E vuorovaikutuksena. SVG-kuvakkeen painaminen tunnistetaan sen ympäröivän painikkeen kautta, eikä pelialueen fokusvaraus vie painikkeen fokusta. Ohjeiden ja asetusten sulkeminen palauttaa pelialueen fokuksen.

Joystickin React-tila nollataan tauossa, korjausnäkymään siirryttäessä, muissa ei-pelattavissa vaiheissa ja ikkunan fokuksen menetyksessä. Näin seuraava kosketus hyväksytään. Pelaajan liikkeen, animaation, törmäysten, generaattorin tai tehtävien sääntöjä ei muuteta.

## Tarkistukset

Painikkeita testataan niiden SVG-kuvakkeista hiirellä ja kosketuksella, ei pelkästään E-/Space-pikanäppäimillä. Uudet regressiot kattavat:

- Koko opastus: käsipainikkeella hana, laatikkopainikkeella työnnöt, käsipainikkeella korjaus ja kosketuksella/hiirellä putkipulma voittoon.
- Valitun painikkeen Space ja Enter, myös tauko, jatkaminen ja uudelleenaloitus.
- Click-only-aktivointi ja näkyvä etäisyyspalaute.
- Joystick pohjassa + toinen sormi tauolle; paluu peliin ja uusi joystick-kosketus. Myös hanan sulkeminen toisella sormella ohjaimen ollessa kosketuksessa.
- Laatikon siirron peruminen, ohjeiden avaaminen/sulkeminen, ohjaimen säätö, äänten kytkeminen, alusta aloittaminen ja alkuvalikkoon palaaminen.
- Pitkä hiiripainallus putkipalaan tuottaa yhden neljänneskäännöksen.

Selaintestit käyttivät oikeita näppäin-, hiiri- ja CDP-kosketustapahtumia. Pelaajaa ei teleportattu testikoukulla. Kolme viewportia: 1440×900, 390×844 ja 844×390. Fyysistä puhelinta ei ollut käytettävissä.

`multitouch.json` sisältää erillisen pysty-/vaakatarkistuksen. Välivaiheen epäonnistumiset säilyvät vian toistamisen todisteina. `full-browser.json` on kahden painikkeen väliajo: 32 läpäisyä, 9 toisto-ohitusta ja yksi vika, jossa viimeisen putkipalan kosketus avasi vahingossa seuraavan tason voiton päälle. Tämä korjattiin yhteisellä, näkymänvaihdon yli säilyvällä syötesuojalla; lopullinen `docs/action-review/focused-browser.json` läpäisi myös kyseisen vaakanäkymän kosketusläpipeluun. Vanhoja välivaiheen kuvia ei sisällytetä tähän toimitukseen. Historialliset GAME 2.x- ja WEBSITE 2.0 -mittaukset säilyvät. Työ main-haaralla, ei pushia tai deployta.
