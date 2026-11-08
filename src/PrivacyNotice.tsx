import type { ReactNode } from "react";
import { company } from "./brand";

const sections: Array<{ id: string; title: string; content: ReactNode }> = [
  { id: "rekisterinpitaja", title: "Kuka vastaa henkilötietojen käsittelystä?", content: <>
    <p>Rekisterinpitäjä on <strong>{company.name}</strong>, Y-tunnus {company.businessId}.</p>
    <address>{company.address}<br />Tietosuoja-asioiden yhteyshenkilö: {company.person}<br />
      <a href={"mailto:" + company.email}>{company.email}</a><br />
      <a href={"tel:" + company.tel}>{company.phone}</a></address>
    <p>Voit käyttää näitä yhteystietoja kaikissa tämän selosteen tarkoittamissa tietosuoja-asioissa. Yhteyshenkilön ilmoittaminen ei tarkoita, että yritykselle olisi nimetty erillinen tietosuojavastaava.</p>
  </> },
  { id: "tiedot", title: "Mitä henkilötietoja käsitellään?", content: <>
    <p>Puhelin- tai sähköpostiyhteydenotossa käsitellään antamiasi yhteystietoja ja asian selvittämiseen tarvittavaa viestin sisältöä, esimerkiksi työn tarvetta, kohdetta ja ajankohtaa.</p>
    <p>Verkkolomakkeen kenttiä ovat nimi, puhelin, sähköposti, sijainti, palvelu, työn ajankohta, toivottu yhteydenottotapa ja kuvaus. <strong>Verkkolähetys ei ole käytössä:</strong> kenttiin kirjoitettuja tietoja ei välitetä KH-Techille eikä sovellus tallenna niistä luonnosta selaimen pysyvään tallennustilaan.</p>
    <p>Työraporttityökalun nykyinen paikallinen toiminto käsittelee asiakkaan tai yrityksen nimeä, kohteen osoitetta, työntekijää, työn kuvausta, päivää ja aikoja, viitettä, materiaaleja, tunteja, tehtäviä, huomioita, jatkotoimia, vapaaehtoista tekstimuotoista asiakaskuittausta sekä enintään kuutta työkuvaa. Raportilla on yksilöllinen tunnus. Työkalun henkilöstötodennus ja sähköpostitoimitus eivät ole käytössä.</p>
    <p>Sivun lataus välittää julkaisupalvelulle IP-osoitteen ja verkkopyyntöön liittyviä teknisiä tietoja. Pelin paikallinen ohjainasetus ei sisällä nimeä, yhteystietoa tai pelaajatunnistetta.</p>
  </> },
  { id: "lahteet", title: "Mistä tiedot saadaan?", content: <>
    <p>Tiedot saadaan ensisijaisesti sinulta, kun otat yhteyttä, täytät kenttiä tai valitset raporttiin kuvia. Tekniset pyyntötiedot tulevat selaimesta verkkoyhteyden mukana.</p>
    <p>Työkohteen tietoja voi antaa myös asiakkaan edustaja tai työn suorittava työntekijä. Jos tieto koskee muuta henkilöä, käsittelyyn tarvitaan asianmukainen peruste ja henkilölle on kerrottava tietojen lähde, tarkoitus ja muut tarpeelliset tiedot. Tiedot annetaan lain edellyttämässä ajassa, esimerkiksi ensimmäisen yhteydenoton yhteydessä ja soveltuvissa tilanteissa viimeistään kuukauden kuluessa. Jos tietoja luovutetaan toiselle vastaanottajalle, informointi tehdään viimeistään ensimmäisen luovutuksen yhteydessä. Työraporttien tuotantoprosessia ei ole vielä otettu käyttöön.</p>
  </> },
  { id: "tarkoitukset", title: "Miksi tietoja käsitellään?", content: <>
    <p>Yhteydenottotietoja tarvitaan kysymykseen vastaamiseen, työn tarpeen selvittämiseen sekä pyytämäsi tarjouksen tai toimeksiannon valmisteluun ja hoitamiseen.</p>
    <p>Raportin paikallisia tietoja käytetään työn dokumentointiin ja käyttäjän pyytämän PDF-tiedoston muodostamiseen. Ohjainasetus säilyttää itse valitsemasi pelituntuman. Offline-välimuisti mahdollistaa aiemmin ladatun raporttityökalun käytön ilman verkkoyhteyttä.</p>
    <p>Tässä verkkosovelluksessa ei ole uutiskirjettä, kohdennettua markkinointia tai kävijäanalytiikkaa. Julkaisupalvelun teknisiä tietoja voidaan käsitellä sen turvallisuustarkoituksiin.</p>
  </> },
  { id: "oikeusperusteet", title: "Mihin käsittelyn oikeusperusteet perustuvat?", content: <>
    <p>Kun luonnollinen henkilö pyytää tarjousta tai tilaa palvelun itselleen, tarpeellisten yhteydenottotietojen käsittely voi perustua sopimusta edeltäviin toimiin tai sopimuksen täyttämiseen (GDPR 6 artiklan 1 kohdan b alakohta).</p>
    <p>Yritysasiakkaan yhteyshenkilön kanssa asioinnin perusteena voi olla oikeutettu etu hoitaa yritysten välistä yhteydenottoa ja sopimussuhdetta (6 artiklan 1 kohdan f alakohta). Edun ja henkilön oikeuksien tasapaino on arvioitava käyttötarkoituskohtaisesti. Yrityksen oikeutettu etu ei sellaisenaan oikeuta ei-välttämättömään päätelaitetallennukseen.</p>
    <p>Tavallinen yhteydenotto ei edellytä erillistä tietosuojasuostumusta. Selosteen lukeminen ei ole suostumus markkinointiin. Sivustolla ei ole erillistä suostumukseen perustuvaa markkinointitarkoitusta.</p>
    <p>Yrityksen muiden prosessien lakisääteisiä velvoitteita, oikeutettujen etujen arviointeja ja työraporttien tuotantokäsittelyn perusteita ei ole vahvistettu tämän verkkopalvelun käyttöönottoa varten. Ne on ratkaistava ennen kyseisten toimintojen julkaisemista.</p>
  </> },
  { id: "tarpeellisuus", title: "Onko tietojen antaminen pakollista?", content: <>
    <p>Sivuston ja tietosuojaselosteen lukeminen ei vaadi nimen tai yhteystietojen antamista. Sivun lataaminen kuitenkin edellyttää teknistä verkkopyyntöä julkaisupalveluun.</p>
    <p>Yhteydenottoon vastaaminen tarvitsee toimivan vastauskanavan ja riittävät tiedot asiasta. Lomakkeen validaatiossa vaaditaan nimi, kuvaus ja valittua vastaustapaa vastaava puhelin tai sähköposti. Muu yhteystieto, sijainti ja palvelu ovat valinnaisia. Lomakkeen täyttäminen ei lähetä pyyntöä.</p>
    <p>Paikallisen raportin PDF tarvitsee asiakkaan tai yrityksen, kohteen osoitteen, työntekijän ja työn kuvauksen. Asiakaskuittaus ja valokuvat ovat vapaaehtoisia. Älä anna tietoja laajemmin kuin työn dokumentointi edellyttää.</p>
  </> },
  { id: "tallennus", title: "Käytetäänkö evästeitä tai paikallista tallennusta?", content: <>
    <p>Verkkosovellus ei aseta omia HTTP-evästeitä eikä käytä analytiikka- tai markkinointiseurantaa. Selaimen paikallinen tallennus ja offline-välimuisti ovat eri asioita kuin palvelimelle lähettäminen.</p>
    <dl className="privacy-storage">
      <div><dt>Yhteydenottolomake</dt><dd>Kentät ovat sivun muistissa. Sovellus ei tallenna niitä localStorageen tai lähetä niitä taustapalveluun. Selaimen oma lomaketäyttö ja historia riippuvat selaimesi asetuksista.</dd></div>
      <div><dt>Raporttiluonnos ja kuvat</dt><dd>Tallentuvat raporttia käytettäessä automaattisesti tämän selaimen localStorageen. Tiedot pysyvät, kunnes luonnos poistetaan tai selain poistaa ne. Automaattista aikarajaa ei ole.</dd></div>
      <div><dt>Pelin ohjainasetus</dt><dd>Itse liukusäätimellä valitsemasi ohjainasetus säilyy paikallisesti ilman asetettua vanhenemisaikaa. Tämän version peli ei tallenna voittoja tai parasta tasoa pysyvästi. Aiemman version tasomerkintä voi jäädä selaimeen, kunnes poistat sivustotiedot.</dd></div>
      <div><dt>Offline-välimuisti</dt><dd>Raporttityökalun käynnistys voi tallentaa sivukuoren, ohjelmat ja kuvat Cache Storage -välimuistiin. Vanhat sovellusvälimuistit korvataan päivityksessä. Välimuisti ei ole raporttiluonnoksen säilytyspaikka.</dd></div>
    </dl>
    <p>Voit poistaa raportin tiedot työkalun <strong>Poista luonnos</strong> -toiminnolla. Koko paikallisen tallennuksen, vanhat pelitiedot ja offline-välimuistit voit poistaa selaimen sivustotietojen asetuksista. Ladatut PDF:t poistetaan erikseen laitteen tiedostoista.</p>
    <p>Pelkkä sivuston käyttö ei tarkoita suostumusta seurantaan. Jos palveluun lisätään ei-välttämätöntä tallennusta tai ulkopuolisia seurantapalveluita, ne edellyttävät erillistä arviointia ja tarvittaessa ennakkosuostumusta. Tällaista seurantaa ei ole otettu käyttöön.</p>
  </> },
  { id: "kasittelijat", title: "Ketkä käsittelevät henkilötietoja KH-Techin lukuun?", content: <>
    <p>Yhteydenotot on tarkoitettu KH-Tech Oy:lle. Sähköposti-, puhelin- ja mahdollisten muiden toimittajien roolit sekä henkilötietojen käsittelyä koskevat sopimukset on vahvistettava yrityksen todellisten palvelusopimusten perusteella.</p>
    <p>Tämän sovelluksen lomake ja raportti eivät ole yhdistettyjä sähköpostipalveluun, asiakastietokantaan tai henkilöstötodennuksen palveluun. Niiden palveluntarjoajista tai sopimuksista ei anneta vahvistamatonta lupausta.</p>
  </> },
  { id: "palveluntarjoajat", title: "Mitä ulkopuolisia palveluja verkkosivu käyttää?", content: <>
    <p>Tämän sivustoversion julkaisumääritys käyttää GitHub Pagesia. GitHub ilmoittaa tallentavansa Pages-kävijöiden IP-osoitteita turvallisuustarkoituksiin. Lue <a href="https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages#data-collection" rel="noreferrer">GitHub Pagesin tietojen keruusta</a> ja <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement" rel="noreferrer">GitHubin tietosuojalausuma</a>.</p>
    <p>Sovelluksen kuvat, fonttivalinnat ja ohjelmat toimitetaan paikallisina sivustoresursseina. Sivulla ei ole kolmannen osapuolen karttaa, videota, chatia, analytiikkapikseliä tai ulkoista fonttipalvelua. Tavallinen ulkoinen linkki avaa toisen palvelun vasta, kun valitset sen.</p>
    <p>Puhelin- ja sähköpostilinkit avaavat oman sovelluksesi. Näiden viestien välitykseen osallistuvat puhelin- ja sähköpostipalvelut. Yrityksen lopullinen julkaisuympäristö ja viestipalvelujen toimittajaluettelo on vielä vahvistettava ennen tuotantojulkaisua.</p>
  </> },
  { id: "luovutukset", title: "Luovutetaanko tietoja muille?", content: <>
    <p>Verkkosovellus ei lähetä lomakkeen sisältöä, raporttia tai sen kuvia ulkopuolisille palveluille. Jos itse lähetät sähköpostin, soitat tai jaat ladatun PDF:n, viestin tai tiedoston sisältö välittyy valitsemaasi kanavaa pitkin vastaanottajalle.</p>
    <p>Yrityksen mahdolliset muut tietojen vastaanottajaryhmät, viranomaisluovutusten perusteet ja asiakirjojen käsittelykäytännöt on vahvistettava ennen sähköisen asioinnin käyttöönottoa. Paikallisesti toimiva sovellus ei osoita, ettei yrityksellä olisi erillistä käsittelyä sähköpostissa tai muissa järjestelmissä.</p>
  </> },
  { id: "siirrot", title: "Siirretäänkö tietoja EU- tai ETA-alueen ulkopuolelle?", content: <>
    <p>Pelkästään laitteella käsiteltäviä raportteja ei tämän sovelluksen toimesta siirretä ulkomaiselle palvelimelle. Tämä ei koske julkaisupalvelun teknisiä pyyntötietoja tai itse lähettämääsi sähköpostia.</p>
    <p>GitHub on kansainvälinen palveluntarjoaja. Yrityksen käytössä olevien sopimusten mukaisia käsittelymaita, mahdollisia ETA-alueen ulkopuolisia siirtoja ja niiden sovellettavia suojatoimia ei ole vielä vahvistettu. Emme siksi lupaa, että kaikki tiedot pysyisivät Suomessa tai ETA-alueella.</p>
    <p>Sovellettava siirtoperuste, mahdolliset lisäsuojat ja tapa saada niistä jäljennös on vahvistettava ennen tuotantokäyttöä. Yleinen palveluntarjoajan tietosuojalausuma ei yksin todista KH-Techin sopimukseen sovellettua siirtosuojaa. Lisätietoa saat tämän selosteen yhteyshenkilöltä.</p>
  </> },
  { id: "sailytys", title: "Kuinka kauan tietoja säilytetään?", content: <>
    <p>Sovellus ei tallenna yhteydenottolomakkeen luonnosta pysyvästi. Raportin luonnos ja itse valitsemasi peliasetus eivät vanhene sovelluksessa automaattisesti. Niiden poistaminen on kuvattu paikallisen tallennuksen kohdassa. Selain voi poistaa tietoja myös omien tallennusrajojensa tai asetustensa vuoksi.</p>
    <p>PDF jää laitteen tiedostoihin, kunnes se poistetaan siellä. Luonnoksen poistaminen tai sovelluksen päivittäminen ei poista ladattua PDF:ää. Selaimen välimuistin ja luonnoksen poistot ovat erillisiä toimintoja.</p>
    <p>Yrityksen sähköposti-, asiakas- ja lokitietojen tarkkoja säilytysaikoja tai niiden vahvistettuja määräytymisperusteita ei ole saatu tätä käyttöönottoa varten. Niitä ei korvata keksityillä päivämäärillä tai aikarajoilla. Nämä tiedot on vahvistettava ennen tuotantojulkaisua; tekninen paikallisen tallennuksen kesto ei ole yrityksen säilytyspolitiikka.</p>
  </> },
  { id: "tietoturva", title: "Miten tiedot suojataan?", content: <>
    <p>Lomake- ja raporttitiedot eivät kulje tästä sovelluksesta taustapalveluun. Selainluonnos ei kuitenkaan ole sovelluksen käyttäjäkohtaisesti salaama tai henkilöstökirjautumisella suojattu. Samaa laitetta ja selainprofiilia käyttävä henkilö voi päästä paikallisiin tietoihin.</p>
    <p>Käytä raporttitoimintoa vain omalla laitteellasi, vältä yhteiskäyttöprofiilia ja poista luonnos käytön jälkeen. Oikean henkilöstötodennuksen, palvelinpuolisten käyttöoikeuksien ja hyväksyttyjen säilytyskäytäntöjen puuttuessa työkalua ei ole avattu tuotantokäyttöön asiakastiedoilla.</p>
    <p>HTTPS-asetukset, palveluntarjoajien käyttöoikeudet, lokit, varmuuskopiot ja tietoturvaloukkausten toimintamalli on tarkistettava lopullisessa julkaisuympäristössä. Tässä selosteessa ei väitetä testaamattomia suojatoimia toteutetuiksi.</p>
  </> },
  { id: "arkaluonteiset", title: "Käsitelläänkö arkaluonteisia henkilötietoja?", content: <>
    <p>Sivuston tarkoitus ei ole kerätä erityisiä henkilötietoryhmiä, kuten terveys-, uskonto- tai ammattiliittotietoja, eikä rikostuomioihin liittyviä tietoja. Älä lisää niitä viesteihin, vapaisiin tekstikenttiin tai kuviin.</p>
    <p>Kuvaa työ ja tarpeellinen tekninen kohde. Vältä henkilöitä, henkilöllisyysasiakirjoja ja tarpeettomia yksityiselämän yksityiskohtia. Vapaamuotoiset kentät tai valokuva eivät itsessään anna oikeutta käsitellä mitä tahansa henkilötietoja.</p>
  </> },
  { id: "paatokset", title: "Tehdäänkö tietojen perusteella automaattisia päätöksiä?", content: <>
    <p>Sovelluksessa ei tehdä sinua koskevia oikeusvaikutuksia tai vastaavia merkittäviä vaikutuksia aiheuttavia automaattisia päätöksiä eikä markkinointiprofilointia. Pelin kenttien muodostus ja PDF:n tekninen kokoaminen eivät ole tällaisia henkilötietopäätöksiä.</p>
  </> },
  { id: "oikeudet", title: "Mitä oikeuksia sinulla on?", content: <>
    <p>Oikeuksien soveltuminen riippuu käsittelystä ja sen oikeusperusteesta. Voit soveltuvin edellytyksin:</p>
    <ul><li>saada tietoa käsittelystä ja pääsyn omiin tietoihisi;</li><li>pyytää virheellisen tiedon korjaamista, tietojen poistamista tai käsittelyn rajoittamista;</li><li>vastustaa oikeutettuun etuun perustuvaa käsittelyä henkilökohtaiseen tilanteeseesi liittyvällä perusteella;</li><li>saada itse antamasi tiedot siirrettävässä muodossa, kun käsittely on automaattista ja perustuu suostumukseen tai sopimukseen;</li><li>peruuttaa mahdollisen erilliseen tarkoitukseen antamasi suostumuksen vaikuttamatta sitä edeltäneen käsittelyn lainmukaisuuteen.</li></ul>
    <p>Kaikki oikeudet eivät ole ehdottomia. Esimerkiksi lain edellyttämä säilytys voi rajoittaa poistamista. Tällä sivustolla ei käytetä suostumukseen perustuvaa markkinointia. <a href="https://tietosuoja.fi/rekisteroidyn-oikeudet" rel="noreferrer">Tietosuojavaltuutetun ohje rekisteröidyn oikeuksista</a>.</p>
  </> },
  { id: "pyynnot", title: "Miten käytät oikeuksiasi?", content: <>
    <p>Lähetä pyyntö osoitteeseen <a href={"mailto:" + company.email}>{company.email}</a> tai ota yhteyttä puhelimitse numeroon <a href={"tel:" + company.tel}>{company.phone}</a>. Voit myös kirjoittaa rekisterinpitäjän postiosoitteeseen. Kerro, mitä tietoja ja oikeutta pyyntö koskee. Älä lähetä henkilötunnusta tai henkilöllisyysasiakirjaa varmuuden vuoksi.</p>
    <p>Pyytäjän henkilöllisyys voidaan tarvittaessa varmistaa tarkoitukseen nähden tarpeellisilla tiedoilla. Pyyntöön on vastattava ilman aiheetonta viivytystä ja yleensä viimeistään kuukaudessa. Jos lain edellytykset täyttyvät, määräaikaa voidaan jatkaa enintään kahdella kuukaudella; jatkosta ja syistä ilmoitetaan ensimmäisen kuukauden aikana. Mahdollinen epääminen perustellaan. Oikeuksien käyttäminen on lähtökohtaisesti maksutonta.</p>
    <p>KH-Tech ei voi etänä lukea tai poistaa vain selaimeesi jäänyttä luonnosta tai laitteen PDF-tiedostoa. Voit poistaa ne itse edellä kuvatulla tavalla. Yritykselle erikseen toimitettuja tietoja koskevan pyynnön voit osoittaa yhteyshenkilölle.</p>
  </> },
  { id: "valitus", title: "Miten teet valituksen valvontaviranomaiselle?", content: <>
    <p>Jos katsot, että henkilötietojasi käsitellään lainvastaisesti, sinulla on oikeus saattaa asia tietosuojavaltuutetun käsiteltäväksi. Voit ensin pyytää KH-Techiltä selvitystä tai oikaisua; tämä ei poista oikeuttasi tehdä valitusta.</p>
    <p><a href="https://tietosuoja.fi/ilmoitus-tietosuojavaltuutetulle" rel="noreferrer">Ohje ja ilmoitus tietosuojavaltuutetulle</a>. Evästeiden ja vastaavien päätelaitetekniikoiden sääntelyä valvoo Suomessa <a href="https://kyberturvallisuuskeskus.fi/fi/viestintaverkkojen-ja-palveluiden-saantely/evasteet" rel="noreferrer">Traficom</a>.</p>
  </> },
  { id: "paivitykset", title: "Milloin selostetta päivitetään?", content: <>
    <p>Selosteen tiedot on tarkistettu <time dateTime="2026-11-08">8.11.2026</time>. Selostetta on muutettava, jos tietojen käyttötarkoitus, vastaanottajat, säilytys tai palveluntarjoajat muuttuvat. Uudesta tarkoituksesta ja sen perusteista on kerrottava ennen uutta käsittelyä, ja mahdollinen suostumus pyydettävä erikseen.</p>
    <p>Tämä seloste kuvaa nykyistä verkkosovellusta, ei vahvista keskeneräisiä toimintoja käyttöön otetuiksi. Sähköinen lomakelähetys ja henkilöstön suojattu raporttiasiointi ovat pois käytöstä. Niiden käyttöönotto sekä edellä yksilöidyt toimittaja-, säilytys- ja siirtotiedot edellyttävät vahvistusta ennen tuotantojulkaisua.</p>
    <p>Selosteen perustana ovat toteutuksen tarkistus ja <a href="https://eur-lex.europa.eu/legal-content/FI/TXT/?uri=CELEX:32016R0679" rel="noreferrer">EU:n yleinen tietosuoja-asetus</a>. Seloste ei yksin osoita koko palvelun lainmukaisuutta.</p>
  </> },
];

export default function PrivacyNotice() {
  return <div className="container privacy-notice">
    <div className="privacy-intro">
      <p className="eyebrow">TIETOSUOJASELOSTE · PÄIVITETTY <time dateTime="2026-11-08">8.11.2026</time></p>
      <p>Tämä seloste koskee KH-Tech Oy:n verkkopalvelun yhteydenottoja, selaimen paikallisia toimintoja ja teknisiä tietoja. Saat yhteyden yritykseen puhelimitse tai sähköpostilla. Verkkolomakkeen lähetys ja henkilöstön suojattu raporttipalvelu eivät ole käytössä.</p>
      <details className="privacy-index"><summary>Siirry suoraan aiheeseen</summary><nav aria-label="Tietosuojaselosteen aiheet"><ol>{sections.map(section => <li key={section.id}><a href={"#" + section.id}>{section.title}</a></li>)}</ol></nav></details>
    </div>
    {sections.map((section, index) => <section className="privacy-section" id={section.id} key={section.id} tabIndex={-1} aria-labelledby={section.id + "-title"}>
      <h2 id={section.id + "-title"}><span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>{section.title}</h2>
      {section.content}
    </section>)}
  </div>;
}
