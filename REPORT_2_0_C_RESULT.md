# Report 2.0 C – toteutustulos

Työ nykyisellä **main**-haaralla. Lähtöversio `8d87de1` (A/A.1/B/B.1). Ei pushia, käyttöönottoa, oikeita sähköposteja tai tuotantotietojen poistoa. Toteutus käyttää nykyistä Firebase Spark / Workers Free -pohjaa ja erillistä maksutonta MailApp-välitystä. Koodiin ei lisätty maksullista palvelua tai laskutuksen aktivointia.

## Toteutetut muutokset

- Admin tarkistaa nykyisen tarkastusrevision, hinnat ja puutteet, vahvistaa lopullisen hyväksynnän. Palvelin lukitsee täsmällisen hyväksytyn revision, hinnat ja mahdollisen allekirjoituksen. Hyväksyntäaika, näyttönimi ja auditointi säilyvät. Korjaaminen luo uuden muokattavan tunnuksen; alkuperäistä ei muuteta eikä allekirjoitusta käytetä uutena kuittauksena.
- Asiakkaan vapaaehtoinen allekirjoitus toimii hiirellä, sormella ja kynällä Pointer Eventseillä. Tasoitettu SVG, normalisoidut ja rajatut vektoripisteet, viimeisen viivan peruminen, tyhjennys, vahvistus ja nimenomainen korvaaminen. Vahvistettu allekirjoitus lukitaan. Vanha kuittausteksti säilyy historiallisissa raporteissa. Ei henkilöllisyyden varmennusväitettä.
- Työntekijän matka/kulut/selite erotettiin suojatuista laskutusasetuksista. Hän näkee edelleen sovitut materiaalien myyntihinnat ja voi täyttää työn operatiiviset tiedot. Hän ei saa tunti-/km-hintaa, ALV-asetuksia, laskutuksen väli-/kokonaissummia, ostohintoja tai täyttä esikatselua/PDF:ää. Jako toteutettiin API:ssa, Firestore-dokumenteissa/säännöissä, kuuntelijoissa ja paikallisten vanhojen palautuskopioiden kohdennetussa siirrossa.
- Uusi `reportFinances` on vain ylläpitäjälle. Vanha schema 2 siirtyy atomisesti skeemaan 3 alkuperäisillä tunnuksilla, revisioilla, vastuilla ja hinnoilla. Virheellistä laskutusta ei korvata nollilla. Mukana oletuksena vain tarkistava ylläpitoskripti; sitä ei ole ajettu tuotantoon.
- Ylläpitäjän yhteenveto, esikatselu, lopullinen PDF ja `.khtreport` sisältävät samat senttipohjaiset verottomat/ALV-/verolliset summat. Testiesimerkki: 276,00 € + 70,38 € = **346,38 €**, asetettu ALV 25,5 %. Verokanta tulee raportin historiallisesta asetuksesta.
- Lopulliset lataukset noutavat hyväksytyn aineiston tuoreeltaan palvelimelta. Selaimen vanhaa paikallista luonnosta ei nimetä lopulliseksi versioksi. Erillinen GAS muodostaa sähköpostin PDF:n itse samasta hyväksytystä JSONista ja jaetusta generaattorista. Selain-/GAS-tavut ja tarkisteet vastaavat testissä täsmälleen toisiaan.
- Arkistotila on erillinen työn hyväksynnästä: odottaa, käsitellään, palvelun hyväksymä mutta vastaanotto varmistamatta, varmennettu, ennen lähetystä epäonnistunut tai tulos epäselvä. Firestore + GAS-päiväkirja estävät kaksoislähetykset ja sokkona uusinnan aikakatkaisun jälkeen.
- Ylläpitäjä voi tarkastaa itse arkistosta ladatut PDF- ja siirtotiedostot: molempien SHA-256:t verrataan palvelimen tarkisteisiin. Vahvistus kirjaa sijainnin, palautettavuuden, tekijän ja ajan. Se ei väitä sähköpostin saapuneen pelkän HTTP-/MailApp-vastauksen perusteella.
- Pilvipoisto vaatii omistajan säilytyspolitiikan, vähimmäisiän, varmennetut tiedostot, ratkaistut lähetys-/kuvatilat, raporttitunnuksen kirjoittamisen ja erillisen vahvistuksen. Se on oletusarvoisesti suljettu. Poistosta jää rajattu tarkistus-/auditointitieto ja tunnuksen uudelleenkäytön estävä merkintä. Ei automaattista poistoa tai varmuuskopioiden välitöntä poistumislupausta.
- `.khtreport`-tuonti validoi version, sisällön, rajat, allekirjoituksen, summat ja tiivisteen. Näyttää arkiston vain luku -näkymässä; uuden muokattavan kopion luonti ei korvaa alkuperäistä tai poistettua tunnusta.
- Paikalliset vapaaehtoiset kuvat voidaan pienentää ja lähettää erillisellä, raporttitunnuksellisella viestillä. Ei kuvia/PDF:iä Firestoreen tai Firebase Storageen. Lyhyt lupa sitoo kuvat revisioon ja tiivisteisiin. Opaque-selainvastaus ei ole onnistumiskuittaus. Liiterajat ja selkeä manuaalinen lataus/toimituspolku; epäselvien kuvien riippumaton tiedostovarmennus sulkee niiden operaation turvallisesti.
- Ylä- ja alatyönkulku jakavat hyväksynnän, arkistotilan, viestin, tiedostovalinnat, vahvistusluonnoksen ja synkronisen pyyntölukon. Ulkoasu ja nykyiset A.1/B/B.1-toiminnot säilyvät. Tietosuojaselosteen tekniset tietovirrat ja omistajan hyväksyntälista päivitettiin; yritystietoja tai käsittelyperusteita ei muutettu oletuksilla.

## Toteutuksen keskeiset tiedostot

Palvelin: `report-api/workStorage.ts`, `work.ts`, `archive.ts`, `archiveRelay.ts`, `worker.ts`, `google.ts`, Firestore Rules/index exemptions. Selain: `reportArchive.ts`, `reportSignature.ts`, `finalPdf.ts`, `reportWorkModel.ts`, editori/pilviluonnokset ja `reportAuth/{SignaturePad,BillingPanels,ArchiveControls,PhotoDelivery,employeePrivacy}.tsx/ts`. Erillinen välitys: `report-relay/Code.gs`, manifesti ja paikallisesti generoitu `PdfLibrary.gs` (ei generoituja megatavuja repoon). Siirto: `scripts/migrate-report-finances.mjs` ja sen TypeScript-toteutus.

Testipalvelu `report-relay/test/harness.mjs` korvaa **vain testeissä** Googlen MailAppin eristetyllä vastaanottolaatikolla ja kieltää oikeat verkkopyynnöt. Tuotanto käyttää oikeaa Code.gs/MailApp-koodia; testipalvelua ei pakata Workeriin tai verkkosivuun.

## Tarkistukset

| Tarkistus | Tulos |
|---|---|
| TypeScript-sovellus ja Report API | Hyväksytty |
| Unit-/malli-/CONTACT-/relay-testit | 153 hyväksyttyä; sisältää generaattorin 1000 siemenellä ajettavan olemassa olevan stressitestauksen |
| Auth/Firestore/Worker-turvatestit emulaattoreissa | 40 hyväksyttyä |
| Report-selaintestit, kaikki aiemmat erät + C | 84 tapausta kolmessa koossa; ensimmäisessä laajassa ajossa 83 hyväksyttyä ja yksi tabletin hintatestin ajoitusvirhe. Katso tarkennus alla. |
| C-kohdennus | Hyväksyntä, allekirjoitus (hiiri/kosketus/kynä), palautus, roolit, ALV, PDF/JSON, arkistovarmennus, poisto ja tuonti 1440×900 / 390×844 / 768×1024 |
| CONTACT 3.1 selaimessa | 30 hyväksyttyä, vain eristetyt lähetysfixturet |
| Tietosuojasivu | 9 hyväksyttyä |
| Pages-tuotantokäännös | Hyväksytty base-polulla `/kh-tech-website/`; sisältöpohjainen PWA-kuori generoitu |
| Julkinen sivusto + asennetun kuoren offline-päivitys | 16 hyväksyttyä, 2 tarkoituksella ohitettua mobiili-offline-duplikaattia; varsinainen tuotannon offline-testi ajettiin työpöydällä |
| Worker-paketti | Paikallinen dry run hyväksytty, ei deployta |

Laajan ajon tabletin hintatestissä ensimmäinen tallennustilan odotus jäi likaiseksi kehityspalvelimen lähdepäivitysten kanssa samassa ajossa. Syöte ei kadonnut. B.1:n koko 27 tapauksen kierros ajettiin uudelleen muuttamatta selainlähteitä kesken ajon: **27/27 hyväksyttyä**, myös aiemmin odottamaan jäänyt tabletin hintatesti. Testiä ei ohitettu tai odotusta löysennetty. Myös C:n kuusi tapausta menivät erillisessä loppukierroksessa läpi kaikissa kolmessa koossa. Paikalliset logit `.playwright-artifacts/report-c-*.log`; epäonnistunutta ensimmäistä ajoa ei raportoida puhtaana 84/84-ajona.

Vite varoittaa suurista PDF-/Firebase-/pelilohkoista, mutta tuotantokäännös onnistuu. Työntekijän PDF-esilatausta ei tehdä, eikä julkinen sivusto lataa Firebasea tai pelimoottoria automaattisesti. Suurten lohkojen jatko-optimointi ei oikeuta siirtämään PDF-generointia Free Workerin CPU-rajan sisään.

Turvatestit kattavat suorat työntekijän Firestore/API-yritykset, vanhan tietomallin siirron, oikeuksien muuttamisen, hyväksynnän version ja lukituksen, allekirjoituksen pilvitallennuksen/ristiriidan, muuttumattoman korjauslähteen, rinnakkaisen lähetyksen, kiintiön, väärän HMAC:n/vanhentuneen luvan, väärät kuvaotsakkeet/mitat/tavut, epäselvän lähetyksen ja myöhäisen uusinnan, väärän vastaanottotarkisteen, säilytysportin ja poistetun tunnuksen uudelleenluonnin eston. Ei oikeita sähköposteja.

Oikeat Chromium-kaappaukset ovat `docs/report20c-checks/`: allekirjoitus ja varmennettu arkistopaneeli kaikissa kolmessa koossa. Kuvat tarkastettiin visuaalisesti: ei leikkaantuvia paneeleita tai vaakavieritystä, painikkeet rivittyvät mobiilissa ja allekirjoitus säilyttää mittasuhteensa. Mobiilin pitkä arkistosijaintiteksti lyhennettiin luettavaksi. Fyysisiä NFC-kortteja, kynälaitteita, iOS MailApp -toimitusta tai oikeaa postilaatikkoa ei testattu paikallisessa emuloinnissa.

## Avoimet käyttöönottoportit

1. Omistaja asentaa erillisen GASin ja yhtenevän PDF-kirjaston, myöntää MailApp-luvan ja asettaa Report Workerin omat salaisuudet. CONTACTin käyttöönotto ei kata tätä. Ilman asetuksia ohjelma tarjoaa tiedostolataukset, ei näennäistä lähetystä.
2. Omistaja julkaisee turvalliset Firestore-säännöt, uuden Workerin ja dokumenttien erottelun ohjeistetussa järjestyksessä, sitten verkkosivun. Vanhat välilehdet päivitetään luonnoksia poistamatta.
3. Oikean GAS-tilin kiintiö, sähköpostin vastaanotto/liitteiden palautus, todellinen Free CPU ja organisaation palveluehdot varmistetaan erikseen synteettisellä hyväksymistestillä. Paikallinen VM ei ole Googlen palvelun tuotantotesti.
4. Omistaja päättää säilytyspolitiikan, postilaatikon/laitearkistojen palautusmenettelyn sekä auditointien/metatietojen hallinnan. Poisto pysyy suljettuna siihen asti. Selainluonnokset ovat salaamattomia ja välilehtikohtaisia, kuvat eivät synkronoidu laitteiden välillä.

Täsmällinen julkaisu-/palautusohje: [SETUP](REPORT_2_0_C_SETUP.md). Luottamusrajat, ajantasaiset viralliset kiintiölähteet ja 10 käyttäjän / 20 päivittäisen työtilauksen arviot: [SECURITY](REPORT_2_0_C_SECURITY.md). Tiedostomuoto ja eheys: [ARCHIVE_FORMAT](REPORT_2_0_C_ARCHIVE_FORMAT.md).
