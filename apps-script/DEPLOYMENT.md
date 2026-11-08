# Apps Script – käyttöönotto (ei vielä tuotantoon)

WEBSITE 2.5: tämä on vanha erillinen integraatiolähde, ei nykyisen sivuston toimiva sähköposti- tai kirjautumispalvelu. Pakollinen tietosuojakuittaus on poistettu sekä tästä lähteestä että Reactista. Yksikkötestien MailApp-mock ei todista oikeaa toimitusta. Tuotannon henkilöstöidentiteetti, käyttöoikeudet, sopimukset ja oikea vastaanottotesti puuttuvat; noudata ensisijaisesti `PRIVACY_APPROVAL_CHECKLIST.md`:n vaiheita. Alla olevat testikäyttöönoton vaiheet eivät ole tuotannon hyväksyntä.

Tämä lähdekoodi on luonnos. Se sisältää Apps Scriptin omalla `google.script.run`-rajapinnalla toimivan Google-hostatun yhteydenottolomakkeen sekä palvelinpuoliset funktiot työntekijän kirjautumiseen, istuntoon ja PDF-liitteen lähettämiseen. Se ei ole vielä kytketty GitHub Pagesin lomakkeeseen tai työraporttiin. Julkinen GitHub Pages ei voi käyttää `google.script.run`-rajapintaa toisesta originista. Tavallinen `fetch` Apps Scriptin web-sovellukseen törmää CORS/redirect-rajoituksiin ja `no-cors` ei palauta luotettavaa hyväksyntää. Käytä GAS:n omaa HTMLService-hostattua näkymää tai rakenna ja auditoi erillinen rajapintapalvelin; älä väitä suoraa CORS-integraatiota toimivaksi.

## Asennus

1. Luo Apps Script -projekti yrityksen Google-tilillä ja liitä `Code.gs` sekä `Index.html` tiedostoihin.
2. Project Settings > Script Properties: lisää `RECIPIENT_EMAIL` (yksityinen sisäinen vastaanottaja) ja `STAFF_PASSWORD` (uusi, yksilöllinen, vähintään 14 merkin salasana). Älä käytä chatissa mainittua ehdotussalasanaa. Lisää salasana vain Script Properties -käyttöliittymässä.
3. Tarkista `MailApp`-kiintiö, web-sovelluksen käyttöoikeusmalli, tiedostokoko, CacheService-käyttäytyminen ja ajantasaiset Google-ehdot yrityksen tililtä. Kiintiöt voivat muuttua.
4. Testaa ensin vain omistajan hallitsemassa kopiossa. Web appin “execute as me” + “anyone” tarkoittaa, että julkinen endpoint käyttää omistajan MailApp-kiintiötä. Tämän koodin tuntikohtainen script-cache-raja ei ole IP-pohjainen eikä riitä yksin tuotantoon.
5. Julkaisu: Deploy > New deployment > Web app. Rajaa access mahdollisimman tiukasti; jos vain kirjautuneet Google-käyttäjät voivat käyttää sitä, ulkopuolisten asiakkaiden lomake ei toimi. Älä valitse anonyymiä julkista käyttöä ennen väärinkäytön torjunnan ja hyväksyntävirran arviointia.
6. Testaa oikea viesti sekä väärä lomake, bottiloukkukenttä, kokorajat, kirjautumisen esto, istunnon vanheneminen ja uloskirjautuminen. Vahvista sähköpostin saapuminen vastaanottajan postilaatikosta.

## Rajat ja jatkotoimet

- `submitContact` lähettää MailApp-viestin ja palauttaa hyväksynnän vain sen jälkeen, kun `sendEmail` on palautunut. Lähetyksen jälkeinen selaimen verkkovirhe voi silti tehdä tilasta epäselvän; lisää yksilöivä pyyntötunnus/idempotenssi ennen tuotantoa.
- Apps Script ei tarjoa luotettavaa anonyymin asiakkaan IP-osoitetta tässä toteutusmallissa. CacheService on väliaikainen eikä takaa pysyvyyttä. Tarvitaan CAPTCHA/Turnstile tai rajattu asiakasportti ja hälytys, jos julkinen käyttö otetaan käyttöön.
- `login`/`emailReport`-funktiot on tarkoitettu Apps Scriptin hostatusta käyttöliittymästä kutsuttavaksi, eivät GitHub Pagesin cross-origin `fetch`-kutsuiksi. Nykyinen `Index.html` ei vielä sisällä raporttieditoria eikä siten mahdollista PDF-raportin lähettämistä sivulta.
- Tunnus on väliaikainen CacheService-token; Apps Scriptin CacheService ei takaa tarkkaa TTL:ää, ja tämä luonnos ei tarjoa salasanojen hash/upgrade-prosessia, CSRF-ratkaisua eikä riippumatonta tietoturva-auditointia. Älä käytä henkilötietoja ennen näiden täydentämistä.
- Kiintiöt määräytyvät tilin ja muuttuvien Google-ehtojen mukaan. Ei luvata ilmaisuutta tai toimitusvarmuutta.

Tuotantoon siirtyminen estetään, kunnes yritys hyväksyy erillisen tietoturva-arvion ja vastaanotto-/kirjautumisvirrat on toteutettu ja todennettu.
