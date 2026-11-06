# Toteutusraportti

Peliä koskeva 5.11.2026 tilanne on historiallinen. Putkimestari on korvattu 6.11.2026 Phaser 3 -toteutuksella; ajantasainen peliraportti on [GAME_2_0_REPORT.md](GAME_2_0_REPORT.md).

Päivitetty 5.11.2026. Tämä on paikallinen esittelyversio; sitä ei ole julkaistu.

## Toteutettu

- Vite/React/TypeScript-sivusto suomeksi, responsiivinen etusivu, palvelut, yritys, yhteystiedot, tietosuojaluonnos sekä staattiset suorat HTML-reitit Pages-julkaisua varten.
- Julkiset yrityksen perustiedot ja palveluluokat perustuvat KH-Tech Oy:n julkiseen verkkosivuun. Alkuperäistä logoa/kuvia ei kopioida; sivustolla on oma typografinen merkki ja koodipohjainen LVI-kuvitus. Kaikki julkiset tiedot tarvitsevat silti yrityksen hyväksynnän.
- Yhteydenottolomakkeen kentät, validointi, kiireellisyysvaroitus, honeypot ja tietosuojakuittaus. Staattinen sivu ilmoittaa lähettämättömyydestä ja tarjoaa puhelin-/julkisen sähköpostiyhteyden; ei väärää lähetysvahvistusta.
- `/report/`: paikallinen luonnos, yksilöllinen tunnus, kohde-/työ-/palvelu-/työtunti-/materiaali-/kuva-/jatkotoimikentät, kuvien pienennys, poistaminen, PDF:n lataus ja PWA-kuori. Ei kirjautumista, palvelinlähetystä eikä tietokantaa. Raportin automaattinen sähköpostitus on pois käytöstä. Paikalliset kuvat/luonnokset voivat sisältää henkilötietoja ja tallentuvat selaimen paikalliseen tallennustilaan.
- `/peli/`: oma canvas-peli, satunnaiset kentät ja BFS-saavutettavuustarkistus, näppäimistö ja mobiilin suuntapainikkeet/toimintopainike, 90 sekunnin ensitaso, tasojen vaikeutuminen, tauko/uudelleenaloitus/voitto/häviö.
- `apps-script/`: Google Apps Script -lähde yhteydenottopyynnölle, MailApp-viestille, palvelinpuolen kirjautumis-/istuntofunktioille ja PDF-liitefunktiolle. Se ei ole yhdistetty GitHub Pagesin selaimeen. CORS-rajoitusten vuoksi ohje suosittelee GAS-hostattua UI:ta tai erikseen auditoitua palvelinporttia; nykyinen GAS-UI kattaa vain yhteydenottopyynnön. Raporttieditoria ja sähköpostin raporttipolkua ei ole integroitu.
- GitHub Actions Pages -työnkulku, projektipolkujen Vite-tuki, tuotantotarkistuslista ja asennusohje.

## Tarkistukset

- `npm.cmd run build` onnistui sekä oletuspolulla että `VITE_BASE_PATH=/kh-tech-website/`.
- `npm.cmd test`: 16 testiä läpi (validointi, tunnus, Pages-polun ratkaisu, PDF-tuotanto/sivutus/ääkköset, GAS:n sähköpostin muotoilu ja palvelinpuolen pääsynhallinta-/istunnon vanhenemistestit, peliohjaimen näppäinmäppäykset ja 100 proseduraalisen pelikentän saavutettavuus).
- `npm.cmd audit --audit-level=moderate`: 0 haavoittuvuutta tarkistushetkellä.
- Rakennettu `dist/` tarkistettiin: sisäinen vastaanottaja ja keskustelussa mainittu alustava salasana eivät sisälly julkaistavaan JS/HTML/CSS:ään.
- Oikeaa sähköpostia ei lähetetty. Apps Scriptiä ei julkaistu tai konfiguroitu. Sivustoa ei julkaistu.

## Keskeneräiset tuotantoasiat

- Apps Scriptin ulkoinen kirjautuminen ja raporttieditorin käyttöliittymä eivät ole valmiit; työntekijäsalasanaa ei ole asetettu. Raportti on turvallisesti vain paikallinen PDF-työkalu eikä siinä väitetä olevan pääsynhallintaa.
- Apps Script ei yksin tarjoa vahvaa anonyymin lomakkeen väärinkäyttösuojausta tai luotettavaa IP-rajoitusta. Tuntiraja on vain paras-effort CacheService-raja. Julkista lähetyspäätepistettä ei ole otettu käyttöön.
- Lomakkeen Google-hostattu UI ja Apps Script -toimitus edellyttävät tilin asetuksia, Google-kiintiöiden tarkistusta, suostumuksen ja tietosuojatietojen hyväksyntää sekä vastaanotettua testiviestiä.
- PDF-fonttien ulkoasu, valokuvat ja tulostus on tarkistettava oikeilla mobiililaitteilla. Browser UI -visuaalitarkastusta ei voitu tehdä tässä ympäristössä.
- Pelin ohjain on mobiilin suuntanäppäimistö, ei analoginen joystick. Peliä ei ole testattu kosketuslaitteella.
- Yrityksen logo, kuvat, tietosuojaseloste, yhteystietojen vahvistus ja domain-julkaisu odottavat omistajan hyväksyntää.

Tuotantoon ei saa siirtyä ennen kuin [tuotantotarkistuslista](PRODUCTION_CHECKLIST.md) on käsitelty, turvallinen sähköpostivirta toteutettu ja testattu, sekä henkilöstön pääsynhallinta ratkaistu.
