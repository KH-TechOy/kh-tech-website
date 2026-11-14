# REPORT 2.0 D — turvallisuusrajat

## Valtuutus

`/management` vaatii Firebase ID-tokenin, aktiivisen Auth-tilin sekä nykyisen Admin-profiilin. Jokainen palvelun toiminto varmentaa käyttäjän myös tietokantatransaktiossa. Employee ei voi lukea yhteenvetoja/talousarvoja, tuoda tarjouspyyntöjä, säätää käytäntöjä, palauttaa peruttuja töitä tai poistaa pilvitietoja. Sivun navigaatio ei ole valtuutusraja. Firestoren nykyinen sulkeva oletussääntö estää `settings`- ja `quotationRequests`-polkujen kaikki suorat selainoperaatiot, myös Adminin. Ei julkista signup-/Firestore-kirjoituspolkua. HTTP-rungon raja on 32 KiB, jotta rajattujen kenttien UTF-8-tavut mahtuvat myös ääkkösillä; kenttäkohtaiset pituus-/muototarkistukset säilyvät.

Skeema 3 säilyy: raportin operatiivinen runko ja vain Adminin `reportFinances` ovat erillään. Ostohinnat säilyvät yksityisinä. Uuden hyväksynnän materiaaliostojen otos tallentuu yksityiseen finanssidokumenttiin; hinnaston myöhempi muuttaminen ei muuta hyväksyttyä yhteenvetoa. Puuttuvaa historiallista ostohintaa ei päätellä nykyhinnastosta. Enintään 20 eri nimikkeen ostohinnat luetaan hyväksynnässä; muut merkitään puuttuviksi. Työvoiman todellisia kustannuksia ei ole käytettävissä, joten arviota ei kutsuta yrityksen todelliseksi kokonaiskatteeksi.

Hallinnasta editoriin välitetty raporttivalinta nollataan istunnon sulkemisessa. Toinen käyttäjä ei peri edellisen käyttäjän raporttitunnusta editorin aloitusvalinnaksi. UID-kohtaiset omat luonnokset säilyvät; palvelinvarmennus on edelleen varsinainen pääsyraja. Tämä testataan vaihtamalla Administa Employeeen ilman sivun uudelleenlatausta.

## Arkisto ja palautus

Hyväksyntä, viestipalvelun hyväksyntä, riippumaton arkistovarmennus ja pysyvä poisto pysyvät erillään. Arkistointi ei poista raporttia. Epäselvä lähetys ei saa uutta operaatiotunnusta automaattisesti. GASin muuttumaton MailApp-idempotenssi ja toimitusloki säilyvät.

Uusi owner recovery tarkistaa .khtreportin alkuperäisen kanonisen sisällön ja hyväksytyn otoksen palvelimella. PDF valitaan selaimessa, sen otsake/kokoraja ja SHA-256 tarkistetaan selaimessa. Jos luotettu relay-hash on olemassa, sen on täsmättävä. Muuten kyse on **Adminin nimenomaisesta auditoidusta tiedostovakuutuksesta**, ei riippumattomasta PDF:n sisällön todistuksesta. Ensimmäisen vastaanoton UID, aika, syy ja molempien tiedostojen tarkisteet säilyvät. PDF:tä ei siirretä API:in eikä tallenneta Firestoreen. Tälle polulle ei anneta oikeutta ohittaa luotettua PDF-varmennusta, epäselvää sähköpostia tai pysyvän poiston säilytysehtoja.

Manuaalinen kuittaus ei väitä postia lähetetyksi. Viivästynyt alkuperäinen operaatio voi edelleen päättyä; sen epävarmuus säilytetään. GAS-operaation sulkeminen vastaanoton perusteella estää myöhemmän viivästyneen pyynnön lähetyksen. Ensimmäistä kuittausta tai hyväksyntää ei korvata uusintaklikkauksella. Tarkistuskutsun yhteysvirhe ei alenna jo varmennettua vastaanottotilaa.

Sama ensimmäisen kuittauksen suoja koskee erillisiä kuvaliitteitä: uusinta säilyttää alkuperäisen vastaanottajan ja ajan sekä ensimmäisen auditointitapahtuman. Hyväksytyn raportin erikseen vahvistettu pilvipoisto säilyttää myös kuvamanifestin ja kuittauksen tarkistusmetatiedoissa, ei kuvatavuja.

Diagnostiikassa näkyvät vain sallitut koodit. Googlen HTML/raakavirhe, URL, HMAC, avaimet, pyynnön sisällöt ja asiakkaan tiedot eivät tule vikaviesteihin. Statuskutsu ei koskaan lähetä postia. Frontendin arkistokutsun 60 sekunnin odotus kattaa relayn kaksi rajattua 25 sekunnin verkkovaihetta; aikakatkaisu ei todista sivuvaikutuksen puuttumista.

## Säilytys ja poisto

Oletus on poisto estetty ilman nimenomaista käytäntöä ja palvelimen turvakytkintä. `settings/retention` säilyttää versiot, voimaantulopäivät ja perustelut; samassa transaktiossa syntyy erillinen auditointitapahtuma. Vanha revisio ei voi korvata uudempaa. Voimaantuloa ei takauteta. Korkeintaan 20 versiota; täyttyminen ei poista vanhoja merkintöjä. Minimiajan täyttyminen on vain näkyvä kelpoisuusehto. Ei Cloud Scheduleria, TTL:ää tai automaattista kahden vuoden poistoa.

Hyväksytyn työn poisto vaatii Adminin, nykyisen raportti- ja käytäntöversion, arkistoidut täsmäävät alkuperäistiedostot, varmennetun PDF-vertailun, ratkaistut viesti-/kuvaoperaatiot, palautettavuuden ja erillisen vahvistuksen siitä, ettei muita säilytysvelvoitteita ole. Sovellus ei itsenäisesti tunne kaikkia oikeudellisia pidätysvelvoitteita; omistajan on tarkistettava ne ennen hyväksyntää. Paikallisen luonnoksen poisto ei poista pilviraporttia.

Tarpeettoman hyväksymättömän työn erillinen poisto estää hyväksytyt ja tarkastuksessa olevat raportit sekä arkistometatietoja sisältävät työt. Vahvistus, perustelu, revisio ja säilytystarkistus vaaditaan. Raportti, yksityiset finanssit ja vastaava työtilaus poistetaan atomisesti; sama ID suljetaan hautakivellä. Auditointi, tarjouspyyntö ja lähdekopioiden viittaukset jäävät ratkaistaviksi hautakiven kautta. Peruttu työ palautetaan uudella ID:llä ja ilman allekirjoitusta/hyväksyntää, alkuperäinen perumishistoria säilyy. Hyväksyttyjä alkuperäisiä ei avata muokattaviksi.

## Yhteenvedot ja tarjouspyynnöt

Palvelin lukee korkeintaan 10 lähdedokumenttia pyynnössä sekä rajatut vastaavat finanssi-/arkistotiedot. Ei rajatonta tilausta tai automaattista koko tietokannan latausta. Alikutsuja ei moninkertaisteta listatransaktion automaattisilla uusintakierroksilla. Suodattimet käsitellään palvelimella; seuraava sivu vaatii käyttäjän toiminnon. Kun seuraavia sivuja on, käyttöliittymä kertoo summien osittaisuuden ja estää viennin. Sivutus ei ole koko haun historian kattava atominen aikaleima; keskeneräiset työt voivat muuttua haun aikana ja ne merkitään arvioiksi. Yrityksen summat deduplikoidaan raporttitunnuksella. Työntekijäkohtaiset tunnit/km ovat erikseen ilmoitettu tasajako, eivät keksitty henkilökohtainen työajanseuranta.

CSV on UTF-8 BOM + puolipiste + CRLF + desimaalipilkku. Solut lainataan ja laskentataulukon kaavat neutraloidaan. PDF/CSV käyttävät samoja suodatettuja rivejä kuin näyttö. Koosteita ei tallenneta julkiseen osoitteeseen tai lokiin; käyttäjä vastaa ladattujen tiedostojen säilytyksestä. Selaimen Blob-URL:t vapautetaan.

CONTACT säilyy ennallaan. Tarjouspyynnön tuonti on Adminin käsin tekemä kirjaus alkuperäisestä sähköpostista; se ei ole kryptografinen todiste CONTACT-viestistä. Viite + normalisoidun sisällön tarkiste estää tuplat ja ristiriitaisen uudelleenkirjoituksen. Päätös ja työtilauksen luonti tapahtuvat yhdessä transaktiossa. Uusinta palauttaa olemassa olevan tilauksen. Ei työntekijän automaattista osoittamista, asiakkaan automaattista hyväksyntää tai uutta asiakaspostia.

## PDF-yhteensopivuus

Vain uudet hyväksynnät saavat `approval.pdfLayout: 2`. Vanhojen C-arkistojen puuttuva kenttä tarkoittaa alkuperäistä allekirjoituspiirtoa, jonka golden-tarkiste säilyy. D:n pieni allekirjoitus ja viiva piirretään yhdestä yhteisestä generaattorista selaimeen ja GASiin. .khtreportin versionumero säilyy 1, sallittu layout-arvo on täsmälleen 2. Otoksen tarkiste kattaa myös layout-valinnan. Vanhoja hyväksyttyjä/arkistoituja tiedostoja ei kirjoiteta uudelleen.

Tuotantohyväksynnän rajat ja maksuttomien palvelujen viralliset lähteet: [käyttöönotto](REPORT_2_0_D_SETUP.md). Paikalliset emulaattorit ja MailApp-vastine eivät todista oikeaa postilaatikkovastaanottoa tai Workers Freen todellista CPU-kestoa.
