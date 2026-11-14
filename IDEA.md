REPORT 2.0 D — paikallinen tuotantovakautus
Arkistopalautus erottaa tiedostovahvistuksen sähköpostituloksesta; epäselvää lähetystä ei uusita. Uusi PDF-allekirjoitus koskee vain pdfLayout=2-hyväksyntöjä, vanhojen PDF-tavut säilyvät. Adminin hallinta, sivutetut yhteenvedot ja versionoidut säilytysasetukset eivät anna työntekijälle talous- tai poisto-oikeuksia. CONTACT 3.1 säilyy: tarjouspyynnöt tuodaan Adminin kautta alkuperäisellä viitteellä. Ei TTL-poistoa, uusia maksupalveluja, pushia, deployta tai oikeaa postia. Ohjeet: REPORT_2_0_D_RESULT/SETUP/SECURITY/UX_REVIEW.md.

# KH-Tech Oy – tuotteen määrittely

## CONTACT 3.1 — yksi lähetyspainallus, 10.11.2026

Käyttäjän mukaan aiempi oikea sähköpostitoimitus on varmennettu. Uusi versio sujuvoittaa lomakkeen ilman pysyvää turvatarkistuslaatikkoa tai aktivointipainiketta: Managed Turnstile suoritetaan vasta lähetyksen alkaessa, tarvittaessa haaste avautuu automaattisesti. Puhelin/email/molemmat määräävät pakolliset yhteystiedot myös Workerissa ja Apps Scriptissä. Onnistumisessa lyhyt kiitos, palvelimen pyyntötunnus, oikea Clipboard API -kopiointi ja uusi yhteydenotto. Ei muutoksia HMACiin, rajoittimiin, viitteisiin, idempotenssiin, vastaanottajiin tai raportin/PDF:n toimintaan. CONTACT_3_1_REPORT.md erottaa paikalliset testit, käyttäjän ilmoittaman aiemman toimitusvarmennuksen ja uuden version vielä puuttuvan käyttöönoton jälkeisen live-testin. Ei pushia, deployta tai oikeaa testipostia tässä työssä.

## CONTACT 3.0 — nykyinen yhteydenottotyö, 9.11.2026

Lomakkeen oikea sähköpostipolku valmistellaan Cloudflare Free + Turnstile + erillinen Google Apps Script / MailApp -ratkaisulla. Yksi yrityksen määrittämä vastaanottaja palvelimella, asiakkaan osoite vain tarvittaessa Reply-To. Kryptografinen pyyntötunnus, pysyvä kaksoislähetyssuoja, turvallinen epäselvän tilan tarkistus ja rehelliset virhe-/vahvistusnäkymät. Ei automaattista asiakas- tai markkinointipostia. Raportin ID ja vapaaehtoinen asiakasviite pysyvät erillisinä; raporttitodennusta/PDF-työnkulkua ei muuteta. Omistajan Google-/Cloudflare-asetukset, palvelusopimukset, tietosuojatiedot ja hyväksytty oikea vastaanottotesti ovat edelleen aktivoinnin ehtoja. Lopullisen julkaisun tulevat prioriteetit säilyvät WEBSITE 2.5 -ohjeen mukaisina. Ei pushia, deployta tai oikeaa testisähköpostia tässä paikallisessa toteutuksessa.

## WEBSITE 2.5 – tuotantopalvelun tietosuoja, 8.11.2026

Nykyiset tietovirrat auditoidaan ennen tietosuojatekstin päivitystä. Seloste koskee todellista toteutusta; puuttuvat omistajan tiedot, oikea sähköpostitoimitus, henkilöstötodennus ja hyväksyntätestit ovat julkaisuesteitä. Ei uusia demoja, keksittyä onnistumista, suostumuspakkoa yhteydenottoon tai asiakaspuolen salasanaturvaa. Sisäinen raportti poistetaan julkisesta navigaatiosta, mutta suora osoite säilyy NFC-avausta ja tulevaa oikeaa kirjautumista varten. Tietosuojahero käyttää toimitettua kuvaa 7. Dokumentit: `PRIVACY_DATA_FLOW_AUDIT.md`, `PRIVACY_APPROVAL_CHECKLIST.md`, `WEBSITE_2_5_PRIVACY_REPORT.md`.

## WEBSITE 2.4 – alasivujen taustat, 8.11.2026

Palvelut-, Yritys- ja Yhteystiedot-sivujen nykyisiin heroihin lisätään toimitetut kuvat 4, 5 ja 6 sekä etusivun kanssa yhtenäinen lasipaneeli. Vain herojen esitystapa muuttuu. Nykyinen sisältö, etusivu, palvelukortit, yritystiedot, yhteydenottolomake ja muut sovellukset säilyvät. Optimoidut kuvat ovat paikallisia ja Pages-yhteensopivia; mobiilissa käytetään tarvittaessa omia rajauksia. Tarkistukset: `WEBSITE_2_4_SUBPAGES_REPORT.md`.

Lisäksi hyväksytty rajattu CSS-korjaus: yhteystietojen puhelinlinkki ja palvelualue erotetaan omille ruudukon riveilleen tabletilla. Tekstit, linkit ja lomakkeen toiminta säilyvät.

## WEBSITE 2.3 – etusivun taustat ja lasipaneelit, 8.11.2026

Kolmeen nykyiseen osioon lisätään toimitetut kuvat järjestyksessä: putkisto/venttiili heroon, kupariputket yritysesittelyyn ja Putkimestari-kuva peliesittelyyn. Taustat ulottuvat koko näytön leveydelle; nykyiset HTML-tekstit ja toiminnot säilyvät yhtenäisissä tummissa lasipaneeleissa. Poistetaan vain näiden osioiden vanhat kuvituskortit. Tekstiryhmien puolia tai muun sivuston rakennetta ei vaihdeta. Mobiilissa kuvarajaus ja pystysuuntainen tila suojaavat venttiilin, mittarin ja maskotin kasvojen näkyvyyden. Optimoidut paikalliset WebP-assetit, nykyiset muuttamattomat logot ja Pages-polut; pelin, raportin ja lomakkeen toiminta säilyy. Toteutus ja visuaalinen tarkistus: `WEBSITE_2_3_LIQUID_GLASS_REPORT.md`.

Pelin ohjauspäivitys 8.11.2026: yksi Toiminta-painike hoitaa hanat, laatikon työnnöt ja korjauksen lähimmän kantaman sisällä olevan kohteen mukaan. E ja välilyönti käynnistävät saman toiminnon. Kaksi erillistä toimintopainiketta korvataan tällä ohjauksella; laatikon fyysiset työnnöt, ratkeavuustarkistukset ja opastus säilyvät. Tarkistusraportti: `docs/action-review/README.md`.

## GAME 3.0 – nykyinen pelityö, 7.11.2026

Pelin nykyinen tavoite on kokonainen 2.5D-grafiikkauudistus: alkuperäiset pehmeästi varjostetut rasterihahmot ja kalusteet, jatkuvat teksturoidut seinäpinnat, yhteensopivat putkiliitokset, kasvava ja hanasta pysähtyvä visuaalinen vesi sekä viimeistelty HUD. Ensisijainen referenssi on edelleen `docs/Putkimestari_ 2.png`. Renderöinti tiivistää lattian y-akselin kertoimella 0,72; pelimallin koordinaatit, törmäykset, säännöt ja seeded-generaattori säilyvät.

Tämä korvaa aiempien peliosioiden suuntanuoli- ja ratkaisukorostusvaatimukset: ei pysyviä reittinuolia, seuraavan kohteen huutomerkkejä eikä oikean putkipalan automaattista paljastamista. Tavoitelista, paikalliset toimintovihjeet, tekoihin reagoiva kuvitettu opastus ja korjauspulman oikeat virtausportit säilyvät. Sivuston ja raportin toiminnallisuus ei kuulu tähän muutokseen. Työ main-haaralla, paikallinen arviointi ja commit, ei pushia tai deployta.

Nykyiset dokumentit: `GAME_3_0_VISUAL_REPORT.md`, `GAME_3_0_ASSET_MANIFEST.md`, `GAME_3_0_VISUAL_COMPARISON.md`. Vanhemmat GAME 2.x -kuvaukset ovat historiaa.

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

## WEBSITE 2.0 – nykyinen sivustotyö
Päivitetty 6.11.2026. Uudista olemassa oleva yrityssivusto ja työraportti yhtenäiseen mustaan, valkoiseen ja hiilenharmaaseen KH-Tech-ilmeeseen hillityillä sinisillä korostuksilla. Käytä toimitettuja virallisia logoja muuttamattomina navigaatiossa, alatunnisteessa, raporttityökalussa ja A4-PDF:ssä. Tarkista alkuperäisen kh-tech.fi-sivuston palvelut, Tomi Honka, Y-tunnus 3413645-9, puhelin 040 073 6199, tomi.honka@kh-tech.fi sekä Helsinki/Uusimaa. Säilytä viesti suomalaisesta LVI-osaamisesta, luotettavuudesta, asiakkaan tarpeista ja huolellisesta työnjäljestä ilman keksittyjä pätevyyksiä tai lupauksia.

Tee selkeä etusivu, palvelut, yritysesittely, yhteydenotto ja tietosuoja sekä hillitty peliesittely. Paranna mobiilinavigaatiota, lomakevirheitä, näppäimistökäyttöä, metatietoja ja latautumista. Raporttiin isot kentät, eteneminen, kuvien käsittely ja esikatselu. PDF:ään oikea logo, luotettavat sivunvaihdot, valokuvat ja sivunumerot. Säilytä nykyiset tietosuojasuojaukset, paikallinen tallennus, lomakkeen ja raportin palvelinpuolen koodi. Sivuston lomake ei ole vielä kytketty Apps Script -luonnokseen: älä väitä sähköpostia lähetetyksi tai lisää todentamatonta lähetystä. Ei asiakaspuolen salasanatarkistusta.

Pelin tiedostot ja mekaniikka säilytetään. Työ main-haaralla; paikallinen commit, ei pushia tai deployta. Testaa tyypit, tuotantobuild, nykyiset testit, lomake, pitkä ja monikuvainen PDF, responsiivisuus, PWA ja Pages-polut. Tallenna aidot selainkaappaukset. Dokumentoi WEBSITE_2_0_REPORT.md ja BRAND_ASSET_MANIFEST.md sekä päivitä README.
