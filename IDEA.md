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

## Peli (`/peli/`)

Putkimestari 2.0 – Pipe Rescue korvaa alkuperäisen ruutuprototyypin. Peli käyttää Phaser 3:a ja TypeScriptiä, yhtä hallittua peli-instanssia, jatkuvaa delta-aikaan perustuvaa liikettä, kameraseurantaa sekä erillistä testattavaa pelimallia. React hoitaa valikot ja HUD:n vain näytettävän tiedon muuttuessa. Peli ei tarvitse tiliä, palvelinta tai tietokantaa.

Kuusi suunniteltua kenttää: keittiö, kellari, toimisto, pesutupa, huoltokäytävä ja tekninen tila. Ensimmäinen kenttä opastaa ja alkaa 90 sekunnista. Jokaisessa suljetaan venttiili, työnnetään laatikko painokytkimelle, avataan huolto-ovi, kerätään työkalupakki ja tiiviste sekä korjataan vuoto putkia kiertämällä. Laatikoilla on loogiset ruutuaskeleet, kulmajumiin työntäminen estetään ja siirron voi perua. Ovi lukittuu avattuun tilaan. Ratkeavuustarkistus kattaa työntämisen ja kaikkien kohteiden saavutettavuuden; virheellinen kenttä korvataan tunnetusti toimivalla opastuskentällä. Putkipulman yhteys tarkistetaan deterministisesti. Tauko, uudelleenaloitus, häviö, voitto ja seuraava kenttä ovat mukana.

Ohjaus: WASD/nuolet, E vuorovaikutukseen, välilyönti työntämiseen, Escape tauolle; hiiri valikoihin ja pulmaan. Mobiilissa analoginen virtuaalijoystick, suuri toimintopainike ja erillinen työntöpainike; monikosketus, pointer capture, peruutustapahtumat, säädettävä kuollut alue ja normalisoitu vinoliike. Pysty- ja vaaka-asento, safe area ja reduced motion huomioidaan. Alkuperäiset pehmeät ääniefektit ovat oletuksena mykistettyjä.

Visuaalinen referenssi avattu: `docs/putkimestari-2-consept.png`. Sitä ei käytetä taustakuvana tai spriteinä. Sinilakkinen, oransseissa työhaalareissa oleva maskotti ja ympäristökuvitus ovat alkuperäistä SVG-aineistoa `public/game2/`-hakemistossa. Sisäänrakennetun kuvageneroinnin kaksi epäonnistunutta yritystä ja vektorityylin ero maalattuun referenssiin dokumentoidaan. Ei ulkopuolisten pelien hahmoja, assetteja tai logoja. Vain ei-arkaluonteinen eteneminen ja ohjainasetus voivat tallentua paikallisesti.

Selaintarkistukset 390×844, 844×390 ja 1440×900, todelliset peliruudunkaappaukset ja suorituskykymittaus kuuluvat toimitukseen. FPS-luvut ilmoitetaan vain mitattuina testiselain- ja laiteympäristöineen; mobiiliemulointi ei korvaa fyysisiä laitetestejä. Lisätiedot: `GAME_2_0_REPORT.md`. Muutokset pidetään `main`-haaralla. Ei pushia tai deployta ilman käyttäjän erillistä lupaa.

## Tietosuoja, testaus ja julkaisu

Ei pysyvää palvelintietokantaa. Dokumentoi tietovirrat, paikalliset luonnokset, ulkoiset palvelut, käyttöönotto, kiintiöiden epävarmuus ja omistajan toimet. Testaa lomakkeen validointi, sähköpostin muotoilu, valtuutus ja vanhentuminen, PDF/ID, mobiilinäkymät, peliohjaus ja ratkaistavat kentät sekä Pagesin peruspolku. Älä väitä oikeaa sähköpostia testatuksi ilman vahvistettua testiviestiä. Lisää GitHub Actions -julkaisuohje, `.env.example` vain jos ympäristömuuttujia todella käytetään, `IMPLEMENTATION_REPORT.md` sekä tuotantoon siirtymisen tarkistuslista. Rakenna, testaa ja tarkista; commit paikallisesti. Älä deployaa tai julkaise ilman lupaa.
