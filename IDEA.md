# KH-Tech Oy – tuotteen määrittely

Päivitetty 6.11.2026. Tämä dokumentti määrittää julkisen verkkosivuston, henkilöstön työraportti-PWA:n, putkiremonttipelin sekä sähköposti- ja kirjautumisintegraatioiden vaatimukset.

## Tavoite ja rajaukset

Toteuta suomenkielinen, mobiiliystävällinen KH-Tech Oy:n sivusto, reiteillä `/`, `/palvelut/`, `/yritys/`, `/yhteystiedot/`, `/tietosuoja/`, `/report/` ja `/peli/`. Käytä Viteä, Reactia ja TypeScriptiä, jos olemassa olevaa soveltuvaa toteutusta ei ole. Sivuston tulee tukea GitHub Pagesin projektipolkua sekä myöhempää omaa verkkotunnusta. Älä julkaise tai siirrä verkkotunnusta ilman omistajan hyväksyntää.

Ei Firebasea, pysyvää sovellustietokantaa, maksullista sähköpostipalvelua eikä julkiseen koodiin tallennettuja tunnuksia. Ilmaiset palvelut ovat käyttökiintiöiden ja ehtojen alaisia. Älä väitä sovellusta tuotantovalmiiksi, jos kirjautuminen, sähköpostin toimitus tai tietosuoja on testaamatta.

## Yritystiedot ja sisältö

KH-Tech Oy:n julkiselta verkkosivulta (https://kh-tech.fi/) on tarkistettu: Y-tunnus 3413645-9, julkinen yhteyshenkilö Tomi Honka, puhelin 040 073 6199, julkinen sähköposti tomi.honka@kh-tech.fi, postiosoite Laiturikatu 14 C 49, 08100 Lohja ja toiminta-alue Helsinki/Uusimaa. Sivulla luetellaan LVI-huolto, putkimuutostyöt, lämmitys- ja käyttövesiverkostojen tasapainotus sekä käyttövesi- ja viemärisaneeraukset. Tiedot tarkistettiin 5.11.2026 ja ne pitää hyväksyttää yrityksen omistajalla ennen uuden sivuston julkaisua.

Älä keksi sertifikaatteja, asiakasarvioita, referenssejä, hintoja, päivystystä, kokemusta, valokuvia tai takuita. Puuttuvan logon ja valokuvien tilalla voi käyttää omaa abstraktia grafiikkaa ja tekstilogoa. Sisäinen toimitusosoite asetetaan vain palvelinpuolen asetuksiin; sitä ei näytetä julkisessa käyttöliittymässä eikä asiakaspuolen paketissa.

## Julkinen sivusto ja yhteydenottopyyntö

Tee selkeä etusivu, palvelusivut, yritysesittely, yhteystiedot, yksityisyysluonnos, hakukoneiden metatiedot sekä saavutettavat navigaatio- ja soittolinkit. Yritystiedot ja tietosuojateksti merkitään omistajan tarkistettaviksi. Suomenkielisessä yhteydenottolomakkeessa ovat nimi, sähköposti, puhelin, sijainti, palvelu, kiireellisyys (tavallinen/pian/kiireellinen), yhteydenottotapa, ongelman kuvaus ja tietosuojailmoituksen kuittaus. Kiireellisen pyynnön yhteydessä kerrotaan, ettei lomake takaa välitöntä apua, ja näytetään vahvistettava julkinen puhelin.

Palvelin lähettää pyynnöt Script Properties -asetuksissa olevalle vastaanottajalle MailAppilla. Tarkista syötteet ja kokorajat, käytä honeypot-suojakenttää ja kohtuullista väärinkäytön rajoitusta. Älä näytä onnistumista ilman palvelimen hyväksyntää. Apps Scriptin CORS-, anonyymi käyttö-, kiintiö- ja rajoitusominaisuudet on todennettava käytännössä; julkinen GAS-päätepiste ei itsessään tarjoa luotettavaa IP-kohtaista rajoitusta. Jos turvallista selaimen ja GAS:n välistä siirtoa ei voida todentaa, pidä lomake poissa tuotantokäytöstä tai käytä dokumentoitua, maksuttoman tason palvelinta. Ei salaisuuksia selaimessa.

## Työraportti-PWA (`/report/`)

Mobiili ensin, asennettava kun selain tukee ja offline-kuori, kameran käyttöön sopiva valokuvaus, kosketuskäyttö ja paikallinen PDF-lataus. Raportti sisältää yksilöllisen ID:n `KHT-YYYYMMDD-XXXXXX`, päivämäärän, alku-/loppuajat, asiakkaan ja kohteen, osoitteen, työntekijän, työn kuvauksen ja tehtävät, materiaalit määrineen, työtunnit, ennen-/jälkeenkuvat, huomiot, jatkotoimet sekä valinnaisen asiakkaan kuittauksen. Luo ammattimainen, tekstiä sisältävä A4-PDF, sivunumerot ja kuville sopiva skaalaus. ID näkyy PDF:ssä, tiedostonimessä, sähköpostin otsikossa ja vahvistuksessa.

Sovellus ei saa lähettää raporttia tai asiakkaan tietoja palvelimelle ennen todellista palvelinpuolen käyttöoikeustarkistusta. Keskustelussa mainittu salasanaehdotus on vain väliaikainen eikä sitä saa käyttää tai sisällyttää koodiin, dokumentaatioon, selaimen tallennustilaan tai sen julkiseen tiivisteeseen. Tuotannon salasana asetetaan salaisesti palvelimelle. Istunnot vanhenevat ja uloskirjautuminen mitätöi ne; suojaa yritykset. Jos vaatimuksia ei voida toteuttaa turvallisesti, raporttityökalu on paikallinen PDF-generaattori ja sähköpostitoimitus estetään.

Paikallinen luonnos voi sisältää henkilötietoja ja valokuvia. Kerro tallennuksen sijainti ja poisto-ohje; käytä lyhyttä säilyvyyttä, ei laitekäyttäjien välistä luottamusta, ja tarjoa poistaminen. Sähköpostin epäonnistuessa PDF on ladattavissa.

## Peli ('/peli/')

Putkimestari 2.2 – Pipe Rescue jatkaa toimivaa Phaser 3 / TypeScript -toteutusta. Yksi siivottava Phaser-instanssi piirtää maailman; erillinen malli hoitaa jatkuvan delta-aikaliikkeen ja törmäykset. React hoitaa valikot, tavoitteet ja ohjauksen vain näytettävän tiedon muuttuessa. Ei tiliä, pelipalvelinta tai tietokantaa.

Viralliset logot on toimitettu nimillä 'docs/kh-tech-logo-musta.png' ja 'docs/favicon-kh-tech.png'. Käytä alkuperäisiä PNG-tiedostoja muuttamatta niiden muotoa, mittasuhteita tai värejä. Tunnukset näkyvät otsikossa, HUD:ssa, hahmon lakissa ja työvaatteissa, työkalupakissa, yhdessä ympäristökyltissä, voittonäkymässä ja etusivun peliesittelyssä. Nuorella aikuisella maskotilla on musta lippalakki, tummat työvaatteet, lyhyet ruskeat hiukset ja puhtaat kasvot ilman partaa tai viiksiä. Neljä suuntaa, idle ja kaksi kävelyruutua säilyvät.

Ensisijainen visuaalinen referenssi on tarkastettu 'docs/Putkimestari_ 2.png' (toimitetussa nimessä on välilyönti). Se ei ole taustakuva eikä sprite sheet. Paikallinen hahmoreferenssivalokuva on tarkastettu, mutta sitä ei julkaista eikä upoteta grafiikkaan. Polku on .gitignoressa. Omat SVG-assetit säilyttävät alkuperäisen pelin kuvitusta; niiden vektorityyli ei vastaa täsmälleen konseptin maalattua pintaa.

Opastus etenee pelaajan teoista: liiku → sulje hana → kerää välineet → työnnä laatikko → korjaa vuoto → "Hyvä! Homma hoidettu!". Näkyvissä on yksi lyhyt suomenkielinen ohje, kuvitettu kohde ja suuntanuoli. Ohjain, toimintopainike, työntö ja ensimmäiset putkien käännöt korostetaan vuorollaan. Opastus alkaa 90 sekunnista ja pitää kellon pysähdyksissä; ohittaminen aloittaa normaalin laskurin. Ohjevalikossa ovat kuvitetut kontrollit. Viivästyneelle pelaajalle annetaan toimintaa koskeva muistutus.

Opastuksen jälkeen kentät generoidaan 32-bittisestä seedistä Web Workerissa. Rakenteellisesti vaihtelevat huonejaot, seinät, kalusteet, reitit, tavoitteet ja laatikkotehtävät; kuusi teemaa: keittiö, kylpyhuone, kellari, kodinhoitohuone, toimisto ja tekninen tila. Vaikeus 1–12 tuo lisäventtiilejä, kolmannen osan ja pidempiä putkipulmia; valinnainen tarkastus antaa viisi lisäsekuntia. Aika lasketaan ratkaisun kävelymatkasta, työnnöistä ja putkipulman koosta. Kenttäkoodi (esimerkiksi KHT-12345678-D6) ja osoitteen seed mahdollistavat uusinnan. Kenttiä ei kierretä kuuden listana.

Laatikkopulma rakennetaan käänteisillä laillisilla vedoilla ja hyväksytään vain erillisen tilahakuratkaisijan jälkeen. Tarkistus kattaa venttiilit ja välineet ennen ovea, työnnöt, avattavan oven ja vuodon. Myös pelinaikainen työntö torjutaan, jos se jättäisi jäljellä olevan työn ratkaisemattomaksi. Siirron voi perua; ovi pysyy avattuna. Yritysmäärä ja hakutilat rajataan, ja häiriössä käytetään validoitua determinististä varakenttää.

Ohjaus: WASD/nuolet, E sulkemiseen/korjaukseen, välilyönti työntöön, Escape tauolle; hiiri valikoihin ja putkipulmaan. Mobiilissa vasen analogijoystick ja kaksi oikeaa painiketta, monikosketus, pointer capture/cancel, säädettävä kuollut alue ja normalisoitu vinoliike. Pysty/vaaka, safe area, reduced motion ja oletuksena mykistetyt alkuperäiset äänet säilyvät. Tauko, uudelleenaloitus, häviö, voitto ja seuraava kenttä toimivat. Voiton "Ota yhteyttä" johtaa sivuston oikealle yhteystietoreitille.

Testaa vähintään 1 000 eri seediä useilla vaikeuksilla, koko opastus ja generoitu kenttä aidoilla syötteillä, mobiilin monikosketus, kolme näyttökokoa, tuotannon juuri- ja Pages-polut sekä sivuston lomake ja PDF-lataus. Tallenna todelliset kaappaukset ja mittaukset. Fyysisiä puhelintestejä tai lasten käyttäjätestejä ei voi korvata emuloinnilla. Uudet dokumentit: GAME_2_2_REPORT.md, GAME_2_2_ASSETS.md ja GAME_2_2_LEVEL_GENERATION.md. Säilytä GAME 2.0:n asset- ja katselmointidokumentit. Työ suoraan main-haaralla; paikallinen commit, ei pushia eikä deployta.

## Tietosuoja, testaus ja julkaisu

Ei pysyvää palvelintietokantaa. Dokumentoi tietovirrat, paikalliset luonnokset, ulkoiset palvelut, käyttöönotto, kiintiöiden epävarmuus ja omistajan toimet. Testaa lomakkeen validointi, sähköpostin muotoilu, valtuutus ja vanhentuminen, PDF/ID, mobiilinäkymät, peliohjaus ja ratkaistavat kentät sekä Pagesin peruspolku. Älä väitä oikeaa sähköpostia testatuksi ilman vahvistettua testiviestiä. Lisää GitHub Actions -julkaisuohje, `.env.example` vain jos ympäristömuuttujia todella käytetään, `IMPLEMENTATION_REPORT.md` sekä tuotantoon siirtymisen tarkistuslista. Rakenna, testaa ja tarkista; commit paikallisesti. Älä deployaa tai julkaise ilman lupaa.
