# KH-Tech Oy – WEBSITE 2.0

Paikallinen toimitus 7.11.2026. Olemassa oleva yrityssivusto, työraportti-PWA ja PDF uudistettiin viralliseen KH-Tech-ilmeeseen. Työ tehtiin nykyisellä `main`-haaralla. Sivustoa, Apps Scriptiä tai sähköpostitoimitusta ei julkaistu, pushettu tai otettu käyttöön.

## Sivusto ja säilytetty sisältö

Lähtöaineistona luettiin IDEA, CODEX_PROMPT, README, nykyinen React/CSS, raportti, PDF, validointi, Apps Script -lähteet ja käyttöönotto-ohjeet, tuotantotarkistuslista sekä Vite/Pages-konfiguraatio. Toimitetut logo ja pisaratunnus avattiin visuaalisesti. Sisältö tarkistettiin [KH-Tech Oy:n viralliselta sivustolta](https://kh-tech.fi/).

Säilytetty faktasisältö: KH-Tech Oy, Y-tunnus 3413645-9, yrittäjä ja LVI-asentaja Tomi Honka, 040 073 6199, tomi.honka@kh-tech.fi, Helsinki/Uusimaa ja julkinen Lohjan postiosoite. Sivuston viesti suomalaisesta LVI-osaamisesta, yrittäjäsuvun taustasta, asiakkaan tarpeista, luotettavuudesta ja viimeistellystä lopputuloksesta kirjoitettiin luonnolliseksi suomenkieliseksi sisällöksi. Kokemusvuosia, sertifikaatteja, takuita, päivystystä, hintoja tai asiakasarvioita ei keksitty.

Neljä vahvistettua palvelua esitetään asiakasta palvelevin kuvauksin: LVI-huolto, putkimuutostyöt, lämmitys- ja käyttövesiverkostojen tasapainotus sekä käyttövesi- ja viemärisaneeraukset. Palvelukortista avautuva yhteydenotto valitsee palvelun valmiiksi.

Etusivulla ovat virallinen tunnus, selkeä LVI-viesti, tarjouspyyntö- ja soittopainikkeet, palvelut, yritysesittely, vahvistettavat yritystiedot, yhteydenotto ja hillitty Putkimestari-esittely. Palvelut-, yritys-, yhteystiedot- ja tietosuojasivut saivat yhtenäisen ulkoasun. Navigaatiossa näkyy aktiivinen sivu; mobiilivalikko ja Escape-näppäin toimivat. Alatunnisteessa ovat oikeat yhteystiedot, Y-tunnus ja sivulinkit.

## Brändi ja visuaalinen järjestelmä

Ilme käyttää mustaa/hiilenharmaata, valkoista ja vaaleanharmaata sekä hillittyä sinistä. Typografia perustuu laitteen omiin Segoe UI / Arial -fontteihin; ulkoisia fonttipalveluita ei tarvita. Väljät palstat, rauhalliset rajaukset ja pienet hover-siirtymät tukevat yrityssivustoa. Reduced motion poistaa siirtymät. Keksittyjä luottamusmerkkejä tai mittarilukuja ei käytetä.

Virallisen logon ja ikonin muotoa, kirjaimia tai värejä ei piirretä uudelleen. Alkuperäiset PNG:t kopioidaan sellaisinaan ja niiden kuvasuhde säilyy. Tunnus näkyy navigaatiossa, alatunnisteessa, yritystiedoissa, raportissa, esikatselussa ja PDF:n jokaisella sivulla. Tummassa alatunnisteessa tunnus asetetaan valkoiselle alustalle.

Etusivun tekninen putkistokuvitus on tätä tehtävää varten kirjoitettua SVG-taidetta. Sitä ei esitetä kuvana toteutetusta asiakastyöstä. Henkilövalokuvia tai alkuperäisen sivuston kolmannen osapuolen kuvia ei kopioitu. Tarkempi tiedostoluettelo ja alkuperät: [BRAND_ASSET_MANIFEST.md](BRAND_ASSET_MANIFEST.md).

## Yhteydenottolomake ja palvelin

Lomake säilyttää aiemmat tiedot: nimi, puhelin/sähköposti, sijainti, palvelu, kiireellisyys, toivottu yhteydenottotapa, kuvaus, tietosuojakuittaus ja honeypot. Kentät ryhmiteltiin yhteystietoihin ja työn tarpeeseen. Valittua vastauskanavaa vastaava yhteystieto vaaditaan. Virheet näkyvät kentän yhteydessä sekä kohdistettavassa virheyhteenvedossa, jonka linkit vievät kenttiin. Virhe ei tyhjennä syötettyjä tietoja. Kiireellinen valinta näyttää soittovaihtoehdon ilman päivystyslupausta.

Nykyinen GitHub Pages -lomake **ei ollut kytketty** Apps Script -luonnokseen. Se säilyi esittelytilassa ja kertoo sen ennen täyttämistä sekä lähetysyrityksen jälkeen. Testissä varmistetaan, ettei lomake tee POST-pyyntöä eikä väitä viestiä toimitetuksi. Puhelin- ja sähköpostilinkit ovat aidot.

`apps-script/`-palvelinfunktiot ja Google-hostattu luonnos säilytettiin muuttumattomina. Palvelinpuolen istunto-, vanhenemis- ja lähetysrajaukset säilyvät. Sisäistä vastaanottajaa tai salasanaa ei tuotu selaimeen. Oikeaa sähköpostia ei lähetetty eikä toimitusta väitetä testatuksi. Backendin käyttöönotto vaatii edelleen erillisen palvelin-/CORS-ratkaisun, asetukset ja hyväksytyn toimitustestin aiemman ohjeen mukaisesti.

## Raporttityökalu

`/report/` käyttää virallista logoa, suuria mobiilikenttiä, neljän pakollisen perustiedon etenemistä ja neljää selkeää osiota: kohde, työ, materiaalit/kuvat ja viimeistely. Työaika, palvelu, työtunnit, työvaiheet, määrät, huomiot, jatkotoimet ja vapaaehtoinen asiakkaan kuittaus säilyvät. Yön yli jatkuvaa työaikaa ei estetty.

Vanhojen luonnosten avaimet ja tietomuoto säilyvät. Lukeminen kestää virheellisen JSON:n tai estetyn tallennustilan. Luonnos tallennetaan 450 ms:n viiveellä ja viimeinen tila tallennetaan myös sivulta poistuttaessa. Kuvan tyyppi ja kuva tallentuvat samassa tilassa. Vanha raporttitunnus, materiaalit, palvelunimike ja kuvien luokat säilyvät. Tyhjäksi poistettua luonnosta ei tallenneta uudelleen henkilötietoineen. Tallennusvirheestä annetaan näkyvä ilmoitus; paikallista PDF:ää voi silti käyttää.

Kameralle ja kuvakirjastolle on omat ohjaimet. Enintään kuusi kuvaa; lisäys pienentää kuvan enintään 1600 pikselin pitkälle sivulle ja tuottaa JPEG:n laadulla 0,76. Kuvan voi luokitella ennen/aikana/jälkeen ja poistaa. Liian suuren tai lukukelvottoman kuvan käsittely antaa virheilmoituksen. Testeissä käytetään omia synteettisiä kuvia, ei asiakastietoja.

Esikatselu näyttää raportin sisällön paperimaisessa, brändätyssä näkymässä. Natiivi dialogi tukee Escapea ja palauttaa kohdistuksen esikatselupainikkeeseen. PDF:n varsinainen sivutus lasketaan vientivaiheessa, joten HTML-esikatselua ei väitetä PDF:n pikselintarkaksi esitykseksi.

Raportti on edelleen paikallinen PDF-työkalu. Asiakaspuolen salasanaa, tekaistua kirjautumista, tietokantaa tai automaattista sähköpostilähetystä ei lisätty. Luonnos ja kuvat säilyvät selaimessa poistamiseen asti, eivätkä ne ole käyttäjäkohtaisesti salattuja. Tämä kerrotaan käyttöliittymässä ja tietosuojasivulla. Ladattu PDF poistetaan tarvittaessa erikseen laitteen latauksista.

## PDF ja offline-käyttö

PDF:n A4-layout sisältää alkuperäisen logon, tunnuksen, työpäivän, asiakkaan ja kohteen, työntekijän, työajan ja tunnit, työn kuvauksen, työvaiheet, materiaalitaulukon, huomiot, jatkotoimet sekä valinnaisen kuittauksen. Teksti jatkuu riveittäin uusille sivuille; osioiden ja materiaalitaulukon otsikot toistuvat. Jokainen työkuva saa oman oikein skaalatun sivunsa. Alatunnisteessa ovat yritystiedot, raporttitunnus ja sivunumero/kokonaismäärä.

Erillinen PyMuPDF-renderöinti tarkisti 14-sivuisen raportin, jossa on pitkä suomenkielinen kuvaus, 55 materiaaliriviä ja kuusi työkuvaa. Kuvauksen ja jatkotoimien viimeiset merkit sekä viimeinen materiaali säilyivät. Ääkköset ovat luettavaa ja haettavaa tekstiä. Jokaisella sivulla on alkuperäinen logo, kuvasuhteet säilyvät, ja teksti pysyy sivulla ilman alatunnisteen päälle kirjoittamista. Todelliset renderöidyt sivut on tallennettu katselmointiin.

Tuotantobuild generoi sisältöön sidotun service worker -version ja raportin tarvitsemien hash-nimettyjen tiedostojen esilatausluettelon. Myös PDF-moduuli ja logot ovat käytettävissä offline-tilassa onnistuneen ensimmäisen verkkokäynnin ja workerin asennuksen jälkeen. Kehitystilassa uutta workeria ei rekisteröidä. Päivitys aktivoituu service workerin tavallisen elinkaaren mukaan, eikä keskeneräistä lomaketta pakoteta lataamaan uudelleen.

Offline-testissä havaittu `Vary: Origin` -ero esilatauksen ja moduulipyyntöjen välillä korjattiin ohittamalla Vary-täsmäytys vain julkisten staattisten tiedostojen välimuistissa. Cache käsittelee tunnetut julkiset HTML-reitit ja staattiset assetit; POST-pyyntöjä, ulkopuolisia origineja tai API-vastauksia ei välimuistiteta. Tekninen tausta: [Cache.match ja ignoreVary](https://developer.mozilla.org/en-US/docs/Web/API/Cache/match).

## SEO, saavutettavuus ja lataus

Suorat HTML-reitit ja Pages-rakenne säilyivät. Sivukohtaiset title- ja description-tiedot päivitettiin; etusivulla on vahvistettuihin yritystietoihin perustuva LocalBusiness-JSON-LD. Lohjan postiosoite sekä Helsinki/Uusimaa-palvelualue tukevat paikallista hakua ilman keksittyjä aluepalvelusivuja. Raportti on merkitty `noindex,nofollow`. Favicon ja PWA-ikonit perustuvat viralliseen tunnukseen.

Semanttiset pääalueet ja otsikot, sisältöön siirtyvä linkki, näkyvä näppäimistökohdistus, kenttäkohtaiset virheet, radioryhmät, progress-elementti, kuvatekstit ja kuville annetut vaihtoehtoiset tekstit tukevat käyttöä. Näppäimistö- ja dialogikäyttö testattiin selaimessa. Tämä ei ole muodollinen WCAG- tai ruudunlukija-auditointi.

Yrityssivusto, raportti ja peli ladataan erillisinä React-moduuleina. Pelimoottoria ei ladata etusivulla; tämä varmistetaan verkkopyyntötestillä. PDF-moduuli valmistellaan vasta raportissa. Kuvat saavat mitat ja alempien osioiden kuvat latautuvat laiskasti. Ulkoista fontti- tai kuvapalvelua ei tarvita.

Buildin kokoluokat: päämoduuli noin 147 kB / 48 kB gzip, yrityssivusto 23,5 kB / 7,5 kB gzip ja raportti 22 kB / 7,7 kB gzip. PDF-moduuli on noin 499 kB / 209 kB gzip sisältäen alkuperäisen PNG:n. Phaserin noin 1,23 MB:n chunkista tulee yhä Viten kokovaroitus; se ladataan vain pelissä. Nämä ovat build-kokoja, eivät todellisen mobiiliverkon nopeus- tai Lighthouse-lupauksia.

## Tarkistukset

Viimeisten tuotantotarkistusten kooste on koneellisesti tiedostoissa `docs/website2-checks/root-browser.json` ja `pages-browser.json`. Fyysisiä puhelimia, laitteiden kameraa tai iOS-kotinäyttöasennusta ei ollut käytettävissä; mobiilit ovat Chromiumin näyttökoko- ja kosketusemulointia.

| Tarkistus | Tulos |
| --- | --- |
| TypeScript + Vite, juuri ja `/kh-tech-website/` | Build läpäisty molemmilla peruspoluilla, mukana logon valmistelu ja offline-kuoren generointi. |
| `npm.cmd test` | 47/47 testiä, 7 tiedostoa. Mukana olemassa olevat peli- ja palvelintestit sekä uudet validointi-, luonnos- ja PDF-testit. |
| Tuotannon selaintestit `/` | 14 läpäistyä, 4 tarkoituksellista toisto-ohitusta. |
| Tuotannon selaintestit Pages-polulla | 14 läpäistyä, 4 tarkoituksellista toisto-ohitusta. Raakatulos: `docs/website2-checks/pages-browser.json`. |
| Saavutettavuusmerkintöjen viimeistelyn jälkeinen tarkistus | 3/3 kohdistettua desktop-testiä: lomakkeen kuvausviitteet, nimetty esikatseludialogi ja kohdistus, kuvallinen PDF sekä offline-avaus ja PDF. `docs/website2-checks/pages-focused-browser.json`. |
| Olemassa oleva koko pelin selaintestisarja | 13 läpäistyä, 8 tarkoituksellista toisto-ohitusta. Raakaloki: `docs/website2-checks/game-regression.txt`. Pelilähteet ja -mekaniikka säilyvät. |
| Riippumaton PDF-tarkistus | 14 A4-sivua, 14 logoa, 6 kuvaa, kaikki 55 materiaalia ja tekstin loput mukana; ei sivun ylityksiä tai footer-päällekkäisyyksiä. |
| Viralliset assetit ja tuotantopaketti | Lähde/public/dist-tavut ja PDF:n alkuperäinen PNG yhtäläiset. PWA-ikonikoot oikein. Ei referenssivalokuvaa tai sisäisiä palvelinasetuksia distissä. |
| `npm.cmd audit --omit=dev` | 0 haavoittuvuutta tarkistushetkellä. |

Selaintarkistukset kattavat 1440×900, 390×844 ja 844×390: sivureitit, logot, title/description, palveluvalinnan, puhelinlinkit, ylivuodon, mobiilivalikon, Tab/Escape-käytön, lomakevirheet, kiireellisyyden, esittelytilan ilman POST-lähetystä, raportin etenemisen, kuvien lisäyksen ja luokan, esikatselun, PDF:n oikean latauksen, luonnoksen säilymisen, kuvien/luonnoksen poistamisen sekä pelin avautumisen. Vanhat tiedot ja estetty localStorage sekä offline-avaus/PDF tarkistetaan kerran desktopilla. Tuotantopelissä ei ole kehityksen testikoukkua.

Todelliset koko sivun ja aloitusnäkymän kaappaukset, raportin esikatselut sekä PDF:n renderöinnit ovat `docs/website2-screenshots/`. Kaappauksissa käytetään testitietoja. Tarkastuksessa parannettiin muun muassa mobiilin otsaketilaa, lomakkeen luettavuutta, esikatselun otsakkeen rivitystä, alkuperäisen ikonivärin säilymistä ja dialogista poistumisen kohdistusta.

Windowsissa rinnakkainen PDF-kaappauksen tallennus paljasti Viten tiedostovahdin `EBUSY`-virheen. Kehitysvahdista rajattiin pois `docs/`, Playwright-artifactit ja testitulokset, jotka eivät ole sovelluksen moduuliriippuvuuksia. Tämä estää lukittujen tarkistus-PDF:ien kaataman kehityspalvelimen. Pages-buildin reititys ja julkaisutöiden konfiguraatio säilyivät.

## Rajaukset ja paikallinen tarkistus

Varsinainen sähköpostitoimitus ja henkilöstön palvelinpuolinen kirjautuminen pysyvät aiemmin dokumentoidusti määrittämättä. Tietosuojaseloste täydennetään ennen niiden käyttöönottoa. Fyysisen Android/iOS-laitteen kamera, kotinäyttöasennus, ruudunlukija ja todellinen mobiiliverkko pitää vielä tarkistaa laitteella. PDF:n suomenkielinen teksti ja ääkköset tarkistettiin; kaikkien maailman kirjoitusjärjestelmien fonttitukea ei luvata.

Paikallinen arviointi: `npm.cmd run dev` → `/`, `/yhteystiedot/`, `/report/` ja `/peli/`. Tuotannon offline-tarkistus tehdään buildista ja preview-palvelimesta. Käyttökomennot ovat README:n WEBSITE 2.0 -osiossa. Omistaja arvioi sisällön ja ulkoasun ennen omaa julkaisupäätöstään. Ei automaattista pushia tai deployta.
