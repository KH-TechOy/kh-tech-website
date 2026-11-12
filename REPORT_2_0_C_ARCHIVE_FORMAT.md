# Report 2.0 C – siirrettävä arkisto

Pääte `.khtreport`, UTF-8 JSON, MIME `application/vnd.kh-tech.report+json`. Versio 1, enimmäiskoko 150000 tavua. Ei ZIP-kirjastoa, verkkoriippuvuutta, kuvia tai salaisuuksia. Tiedosto sisältää henkilötietoja ja ylläpitäjän laskutustietoja; säilytä vain yrityksen hallitussa arkistossa.

| Kenttä | Sisältö |
|---|---|
| `format`, `version` | `KH-Tech Report`, `1` |
| `report.id`, `revision` | Alkuperäinen KHT-tunnus ja täsmällinen hyväksytty revisio |
| `report.form` | Asiakas/kohde, päivä/ajat, työntekijän raporttiin kirjattu nimi, kuvaus, tunnit, työvaiheet, huomiot, jatkotoimet, vanha kuittausteksti ja materiaalirivit |
| `form.materials` | Nimi, määrä, yksikkö, historiallinen `unitPriceCents`, mahdollinen katalogi-/rivitunnus; ei ostohintaa tai katetta |
| `report.operations` | Matka km, muut kulut sentteinä ja selite |
| `report.billing` | Hyväksytyt tunti-/km-hinnat, operatiiviset kulut ja `vatBasisPoints`; 2550 tarkoittaa 25,5 % |
| `report.signature` | `null` tai version 1 rajattu vektoriallekirjoitus |
| `report.approval` | UTC-aika, suomalainen näyttöaika, hyväksyjän näyttönimi ja sama revisio |
| `quotationReference`, `schedule`, `comment`, `source?` | Tarjousviite, aiempi sovittu aika, ylläpitäjän kommentti, mahdollisen kopion alkuperäinen tunnus/revisio |
| `totals` | Materiaalit/rivisummat, työ, matka, muut kulut, veroton summa, ALV ja verollinen summa kokonaisina sentteinä |
| `integrity` | `algorithm: SHA-256`, kanonisen muun ylätason sisällön heksatiiviste |

Allekirjoitus: `version:1`, `strokes:[{points:[x,y,x,y,…]},…]`. Pisteet kokonaislukuja välillä 0–10000 molemmilla akseleilla, enintään 40 viivaa / 1024 pistettä yhteensä. Ei sisäkkäisiä taulukoita Firestoressa. `confirmedAt` on käyttäjän vahvistusaika, `recordedAt` palvelimen tallennusaika. `context` sisältää raporttitunnuksen, asiakkaan ja päivän. Näytön ja PDF:n piirtoalueen suhde on 2,5:1. Allekirjoitus on vapaaehtoinen dokumentointimerkintä, ei varmennettu henkilöllisyys tai hyväksytty sähköinen allekirjoitus.

Kanonisointi: objektien avaimet järjestetään JavaScriptin oletusmerkkijärjestykseen rekursiivisesti, taulukoiden järjestys säilyy, arvot JSON-esityksinä ilman välilyöntejä. `integrity` jätetään sisällön tiivisteestä pois. Valmis vienti on koko objektin kanoninen JSON + yksi LF. SHA-256 eheyden tarkistus **ei** todista alkuperää: ylläpitäjä voi tuoda ulkoisen tiedoston tarkasteluun, mutta se ei saa alkuperäisen pilvihyväksynnän valtuutusta.

Tuonti tarkistaa version, avaimet, tyypit, rajat, pakolliset kentät, allekirjoituksen asiayhteyden, senttihinnat, laskettujen summien vastaavuuden sekä tiivisteen. Tuntemattoman version tiedostoa ei tulkita arvauksella. Tuonti näyttää sisällön vain luku -näkymässä. Uusi muokattava kopio vaatii ylläpitäjän vahvistuksen ja uuden KHT-tunnuksen: hyväksyntä ja allekirjoitus nollataan, lähderevisio säilyy, alkuperäistä ei korvata. Poistettujen alkuperäisten tunnuksia ei voi luoda uudelleen.

Lopullinen PDF muodostetaan vain palvelimelta tuoreeltaan noudetusta hyväksytystä aineistosta tai validoidusta tuontitiedostosta. GAS luo sähköpostin PDF:n itse samasta aineistosta; asiakas ei voi toimittaa mielivaltaista PDF:ää arkistolähetykseen. Päiväys ja PDF FileID ovat deterministiset. Palvelin säilyttää koko siirtotiedoston ja PDF:n SHA-256:t, jotta ylläpitäjän itse arkistosta valitsemat liitteet voidaan verrata tavutasolla. PDF-generaattorin myöhempi muutos voi muuttaa PDF-tavuja: säilytä vastaanotettu alkuperäinen PDF, siirtotiedosto ja kyseisen julkaisun lähdeversio yhdessä. JSON pysyy itsenäisesti luettavana.

Kuvatoimitus on erillinen eikä kuulu `.khtreport`-pakettiin. Kuvien paikallinen saatavuus ei ole edellytys tekstiraportin hyväksynnälle.
