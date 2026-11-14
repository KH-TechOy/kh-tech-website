# REPORT 2.0 D — käytettävyyskatselmointi

## Toteutetut muutokset

- Arkiston tavalliset toimet: **Lähetä arkistoon**, **Tarkista lähetys**, **Lataa arkistotiedostot**, **Merkitse arkistoiduksi**. Lyhyet tilat Arkistointi kesken / Arkistoitu / Vaatii tarkistuksen. Vastaanotto, poisto ja kehittäjän tiedot avataan erikseen. Ei SHA-256-/Firestore-/API-opiskelua normaalin arkistoinnin edellytyksenä.
- Käsin arkistoiminen kertoo tiedostojen tarkistusvastuun, perustelun ja sen, ettei kuittaus vahvista sähköpostia. Epäselvän postituksen uusiminen pysyy estettynä.
- Materiaalihaulla ja avaamispainikkeella on yksi yhteinen focus-within-reunus. Molemmat säilyvät näppäimistö- ja kosketuskäytössä. Muilla toiminnoilla hillitty focus-visible-kehys ja erillinen väli tekstiin.
- Erillinen kuvasähköposti on kokonaan `.report-workspace`-ruudukon ulkopuolella editorin jälkeen, saman sisältöleveyden sisällä. Se ei kuulu sticky-sivupalkkiin. Selainmittauksessa löydetty 1152/1160 px leveysero korjattiin.
- Uusi PDF-allekirjoitus mahtuu 65 × 20 mm:n alueeseen ja tulee lähelle allekirjoitusviivaa. Alkuperäisen 2,5:1-piirtoalueen mittasuhteet säilyvät; käyttämätön tyhjä tila rajataan pisteiden ympäriltä. Suurta ympäröivää laatikkoa ei piirretä. Vektoriviivoja ei rasteroida, venytetä tai muuteta. Vanhojen arkistojen PDF-ulkoasu säilyy muuttumattomana. Selainesikatselun allekirjoitus käyttää samaa rajausta.
- Tuonnin **Tyhjennä valinta** tyhjentää natiivin tiedostosyötteen, tulkinnan ja viestit. Valinnan sukupolvitunnus estää keskeneräisen lukupyynnön palauttamasta tyhjennettyä esikatselua.
- Adminin **Hallinta** kokoaa työt, arkistot, poiston tarkistuksen, tarjouspyynnöt ja säilytysasetukset. Palautus tekee uuden työn, poiston toiminnot ovat selitteensä takana. Sisäinen raportti ei ilmesty julkiseen sivunavigaatioon.
- **Yhteenvedot** on oma sivunsa. Hyväksytyt ovat oletusrajaus; aikaväli, työntekijä ja asiakashaku ovat näkyviä. Sivutettu haku kertoo keskeneräisyydestään ja estää viennin ennen kaikkien sivujen hakemista. Koostetaulukko saa oman vaakavierityksen; koko sivu ei vieri sivusuunnassa.
- CONTACT-pyynnön käsintuonti on selkeästi nimetty. Tilaus syntyy vasta Adminin päätöksellä; pyynnön toivottua ajankohtaa ei esitetä vahvistettuna varauksena. Tuonnin lomakeluonnos käyttää nykyistä UID-kohtaista elävää lomaketilaa, ja vanhemman tallennuksen valmistuminen ei tyhjennä uudempaa syötettä.
- Toistuva tallennuksen tietosuojakuvaus on luettavissa **Tallennus ja tietosuoja** -avaimesta. Päivämääräsyöte käyttää muun sovelluksen suomalaista syöttötapaa, desimaalit pilkkua ja valintalistat vähintään 48 px:n kosketuskorkeutta. Tarjouspyynnön tilat ja pitkä tekstikenttä noudattavat samaa suomenkielistä ilmettä.

## Tarkistusmenetelmä

Synteettiset tiedot, paikallinen Firebase Auth/Firestore ja oikea Report Worker -handler. GAS-koodi suoritetaan rajatussa VM:ssä, MailApp on testivastine. Oikeita viestejä, tuotannon käyttäjiä tai asiakastietoja ei käytetä.

Kohdekoot: 1440×900, 768×1024, 390×844 ja 844×390. D-selainajon lähde `e2e/reportStabilization.playwright.ts`, konfiguraatio `playwright.report-d.config.ts`. Testit tarkistavat yhteisen fokuskehyksen, kuvasähköpostin sijainnin/leveyden, dokumentin vaakaylivuodon, yhteenveto- ja tarjousnäkymät, säilytyskäytännön, manuaalisen arkistopalautuksen ja tuonnin täydellisen tyhjennyksen.

Aidot kaappaukset tallennetaan paikallisesti `.playwright-artifacts/report20d/screenshots/`-kansioon. PDF:t `.playwright-artifacts/report20d/signature-<näyttökoko>.pdf`. Lopullinen toteutunut visuaalinen arvio ja testimäärät kirjataan [tulosraporttiin](REPORT_2_0_D_RESULT.md); tämä ei ole väite fyysisestä puhelintestistä.
