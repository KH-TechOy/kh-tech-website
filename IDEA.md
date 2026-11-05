# KH-Tech Oy – tuotteen määrittely

Päivitetty 5.11.2026. Tämä dokumentti määrittää julkisen verkkosivuston, henkilöstön työraportti-PWA:n, putkiremonttipelin sekä sähköposti- ja kirjautumisintegraatioiden vaatimukset.

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

Itsenäinen, omaperäinen ylhäältä kuvattu putkenkorjauspeli ilman tiliä tai palvelinta. Pelaaja liikkuu proseduraalisessa, ratkaistavaksi tarkistetussa kentässä, etsii osat ja työkalut, sulkee venttiilin ja korjaa vuodon ennen ajan päättymistä. Ensimmäinen taso kestää 90 sekuntia ja vaikeus nousee maltillisesti. Uudelleenaloitus, tauko ja seuraava taso. Näppäimistö WASD/nuolet ja toimintanäppäimet; mobiilissa virtuaaliohjain ja toimintopainike. Älä käytä Brawl Starsin assetteja tai hahmoja.

## Tietosuoja, testaus ja julkaisu

Ei pysyvää palvelintietokantaa. Dokumentoi tietovirrat, paikalliset luonnokset, ulkoiset palvelut, käyttöönotto, kiintiöiden epävarmuus ja omistajan toimet. Testaa lomakkeen validointi, sähköpostin muotoilu, valtuutus ja vanhentuminen, PDF/ID, mobiilinäkymät, peliohjaus ja ratkaistavat kentät sekä Pagesin peruspolku. Älä väitä oikeaa sähköpostia testatuksi ilman vahvistettua testiviestiä. Lisää GitHub Actions -julkaisuohje, `.env.example` vain jos ympäristömuuttujia todella käytetään, `IMPLEMENTATION_REPORT.md` sekä tuotantoon siirtymisen tarkistuslista. Rakenna, testaa ja tarkista; commit paikallisesti. Älä deployaa tai julkaise ilman lupaa.
