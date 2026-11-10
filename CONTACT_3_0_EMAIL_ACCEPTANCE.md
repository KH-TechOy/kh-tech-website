# Oikean sähköpostitoimituksen hyväksymistesti

**CONTACT 3.1, 10.11.2026:** käyttäjä ilmoittaa aiemman version oikean toimituksen onnistuneeksi. Se ei ole tämän uuden version käyttöönoton jälkeinen testitulos. Päivitetyn lomakkeen testi alkaa yhdestä Lähetä pyyntö -painalluksesta; Turnstile käynnistyy itse ja näyttää haasteen vain tarvittaessa. Tarkista nyt myös puhelin/sähköposti/molemmat, tunnuksen kopiointi sekä tuore token jokaisella uudelleenyrityksellä. Ei oikeita testisähköposteja tämän paikallisen työn osana.

Tila 9.11.2026: **ei suoritettu, ei lupaa oikeiden viestien lähettämiseen**. Tämä menettely ei lähetä mitään automaattisesti. Käytä vain selvästi synteettisiä tietoja ja hyväksyttyjä testiyhteystietoja. Älä kirjaa yksityistä vastaanottajaosoitetta, koko viestiä, tokenia tai palvelinavainta julkiseen raporttiin.

## Edellytykset

- [ ] Omistaja on hyväksynyt erikseen palvelinten julkaisun ja tämän oikeita sähköposteja lähettävän testin. Google/Cloudflare-asetukset ja sopimukset tarkistettu [setup-ohjeesta](CONTACT_3_0_SETUP.md).
- [ ] Google `/exec`, oikea deploy-versio, MailApp-valtuutus, vastaanottajakonfiguraatio, cleanup-trigger sekä Cloudflare Free / SQLite / Turnstile toimivat.
- [ ] Testi käyttää hyväksyttyä HTTPS-originia ja sen oikeaa Turnstile-widgetiä. Tuotannon suojauksia ei ohiteta testiavainparilla tai testilipulla.
- [ ] Postilaatikon valtuutettu käyttäjä voi tarkistaa saapumisen, myös spam-kansion. Testimäärä ja käytettävät kiintiöt sovittu.

Varaa testit riittävän pitkälle aikavälille: IP-raja laskee myös virheelliset yritykset ja status-tarkistukset, enintään 5 yritystä / 10 minuutin aikaikkuna. Odota tarvittaessa seuraavaa ikkunaa. Älä poista tuotantosuojauksia testin ajaksi tai tulkitse rate-rajoituksen 429-vastausta kenttävalidaation tulokseksi.

## Testit käyttäjän hyväksynnän jälkeen

1. Avaa oikea yhteystietoreitti suoraan ja päivitä sivu sekä GitHub Pages -projektipolulla että sovitulla custom domainilla, jos sellainen on käytössä. Tarkista turvatarkistuksen lataus ja ettei salaisuuksia/vastaanottajaa näy verkko- tai JS-vastauksissa. Lomake ei saa paljastaa Google `/exec`-URL:ia.
2. Täytä yksilöity synteettinen pyyntö; valitse sähköposti yhteydenottotavaksi ja anna hyväksytty testiosoite. Suorita turvatarkistus ja paina Lähetä **kerran**. Kirjaa sivun pyyntötunnus, aika/aikavyöhyke, build-/deploymentversiot ja havaittu tila. Loading estää toisen painalluksen.
3. Valtuutettu vastaanottaja vahvistaa postilaatikosta **täsmälleen yhden saapuneen** viestin. Pelkkä Lähetetyt-kansion kopio ei ole vastaanottotodiste, varsinkaan lähettäjän ja vastaanottajan ollessa samalla tilillä. Tarkista saapuneen viestin kansio/luokitus ja tarvittaessa alkuperäiset toimitusotsakkeet yksityisesti. Vertaa tunnus aiheen, sisällön ja selaimen välillä. Tarkista kaikki lomakekentät, ääkköset, rivinvaihdot, Reply-To ja julkaisutilin sender. Reply-To-testi tehdään avaamalla vastausluonnos; vastausviestiä ei tarvitse lähettää.
4. Testaa kiireellinen pyyntö erikseen sovitun testimäärän puitteissa. Aiheen `[KIIREELLINEN]`, sisällön ajankohta ja käyttöliittymän teksti eivät lupaa päivystystä tai vasteaikaa. Puhelimella vastaamisen valinta ei vaadi sähköpostia; Reply-To jää silloin pois.
5. Toista **sama HTTP-pyyntö samalla requestKey-arvolla** hallitusti uuden oikean Turnstile-tokenin kanssa. Tarkista sama tunnus ja postilaatikosta ettei uutta viestiä syntynyt. Tokenia ei tallenneta raporttiin. Testaa myös samanaikaiset napinpainallukset: toinen pyyntö ei saa uutta hyväksyttyä toimitusta.
6. Simuloi selaimessa katkeava verkkovastaus yhden hyväksytyn testin yhteydessä. Päivitä sivu ja käytä **Tarkista lähetyksen tila**. Tarkistus ei saa lähettää uutta viestiä. Varmista palautuva sama tunnus ja viestin määrä postilaatikosta. Älä tulkitse puuttuvaa vahvistusta varmaksi lähettämättömyydeksi.
7. Testaa virheellinen token/hostname/origin, liian suuri pyyntö, virheelliset kentät, täytetty honeypot ja ylimääräinen `to`-kenttä. Ne hylätään ennen MailAppia. Kiintiön tahallisen kuluttamisen sijaan tarkista palvelinrajoittimen virhe hallitussa staging-ympäristössä; dokumentoi jos tätä ei voida todentaa aidosti.
8. Tarkista verkko-/palvelinvirheen hyödyllinen virheilmoitus ja ettei onnistumista näytetä. Älä katkaise tuotantopalvelimen asetuksia oikeiden asiakaspyyntöjen aikana.
9. Tarkista siivous: tekninen testimerkintä poistuu 48 tunnin jakson jälkeen onnistuneessa ajastuksessa. Vanhan avaimen uudelleenkäyttö hylätään eikä lähetä postia. Poista testiviestit yrityksen sovitun käytännön mukaan; kirjaa havainto ilman viestisisältöä.
10. Tarkista 390×844, 768×1024 ja 1440×900 sekä fyysisen Androidin/iPhonen lomake, näppäimistö, Turnstile, virhe- ja vahvistusnäkymä. Raportti/PDF/PWA eivät saa muuttua. Testaa todellinen NFC-avaus erillisessä henkilöstötodennuserässä.

## Hyväksynnän kirjaus

Kirjaa yksityiseen yrityksen dokumentaatioon hyväksyjä, päivä, palvelin-/frontendversiot, testit, pyyntötunnukset, vastaanottajan saapumishavainto, viestien lukumäärä, Reply-To-tulos, virhetilanteet ja avoimet puutteet. Julkiseen `CONTACT_3_0_REPORT.md`:hen riittää todennettu tulos ilman henkilötietoja.

**Pelkkä MailAppin onnistunut paluu, mock-testi, HTTP 200, CORS-vastaus tai selaimen vahvistus ei läpäise postilaatikkotestiä.** Ennen tätä hyväksyntää älä ilmoita integraatiota todistetusti toimivaksi tai tuotantovalmiiksi.
