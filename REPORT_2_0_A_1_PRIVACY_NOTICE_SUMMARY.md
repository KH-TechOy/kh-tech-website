# Report 2.0 A.1 — tietosuojaselosteen tekstikorjaus

Korjattu `src/PrivacyNotice.tsx`:n kolme raporttiluonnosta koskevaa tekstikohtaa:

- Tilapäinen sessionStorage-tallennus, kirjautuneen käyttäjän UID-erottelu ja oman luonnoksen jatkaminen samalla hyväksytyllä tilillä samassa välilehdessä.
- Uloskirjautuminen ja käyttöesto eivät poista luonnosta automaattisesti; käyttöesto sulkee pääsyn. Käyttäjä voi poistaa luonnoksen erikseen.
- Selainmuistia ei salata. Välilehden sulkeminen, selaintietojen tyhjennys tai selaimen häiriö voi hävittää luonnoksen. Raportin sisältöä ja kuvia ei vielä synkronoida Firestoreen.

Suomenkielinen teksti tarkistettu. Kaikki 19 osiota ja sivurakenne säilyvät; lähdevertailu vahvisti 16 muun osion pysyneen muuttumattomina. Yritystiedot, oikeusperusteet, muut säilytystiedot ja muu GDPR-sisältö säilytettiin. Raporttisovellusta, CONTACT 3.1:tä, Workeria, peliä tai testien lähteitä ei muutettu.

**Varmennus:** tuotantobuild `/kh-tech-website/`-polulla (sisältää TypeScript-tarkistuksen) läpäisi. Olemassa olevat tietosuojasivun Playwright-testit läpäisivät **9/9** työpöytä-, puhelin- ja tablettikoossa. Testipalvelimella ulkoiset yhteys- ja raporttipalveluasetukset olivat tyhjät testien nykyisten oletusten mukaisesti; oikeita viestejä ei lähetetty. Mobiilin tallennusosion todellinen kaappaus tarkastettiin. Buildin ennestään tunnetut suurten JS-chunkien kokovaroitukset säilyvät.

Ei pushia tai deployta. Tämä korjaa A.1-tulosraportissa erikseen mainitun julkisen selosteen vanhentuneen poistamisväitteen.
