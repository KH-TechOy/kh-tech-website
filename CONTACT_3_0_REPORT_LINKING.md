# Tarjouspyynnön liittäminen tulevaan työraporttiin

Tarjouspyyntö saa Workerissa palvelimen ajan ja `crypto.getRandomValues`-satunnaislähteen perusteella tunnuksen `KHT-YYYYMMDD-XXXXXXXXXXXX`. Päivä on Europe/Helsinki; jälkiosa on 6 satunnaistavua / 12 isoa heksamerkkiä. Tunnus ei sisällä nimeä, IP:tä tai muuta asiakastietoa. Satunnaistunnusta ei pidetä käyttöoikeutena tai todisteena työn tilaamisesta.

Sama tunnus on ilmoituksen aiheessa, tekstissä ja selaimen palvelinvahvistuksessa. Se säilyy samana saman idempotenssiavaimen kaikissa tuloksissa. Google tarkistaa myös harvinaisen tunnustörmäyksen ennen lähettämistä. Tunnuksen muodollinen oikeellisuus ei todista todellista pyyntöä: tulevan palvelimen on varmennettava yhteys hyväksytyn henkilöstöistunnon kautta ja tarvittaessa yrityksen viestistä/asiakasjärjestelmästä.

Nykyisen raportin oma `id` ja PDF-toiminto säilyivät muuttamattomina (`KHT-YYYYMMDD-XXXXXX`). Jo nykyinen vapaaehtoinen **Asiakkaan viite** -tekstikenttä voi sisältää tarjouspyyntötunnuksen ja tallentuu/PDF:ään kuten aiemmin. Se ei korvaa raportin omaa tunnusta. Ei automaattista URL-täyttöä, henkilötietojen liitosta tai palvelinhakua ilman todennusta.

Seuraava raporttierä voi erottaa viitteen omaksi valinnaiseksi skeemakentäksi:

```ts
type ReportLink = {
  reportId: string; // raportin oma tunnus
  quotationRequestReference?: string; // /^KHT-\d{8}-[A-F0-9]{12}$/
};
```

Toteuta silloin versionoitu migraatio ilman vanhan vapaan asiakasviitteen ylikirjoittamista, palvelinpuolinen käyttöoikeus-/olemassaolotarkistus ja erillinen PDF:n otsikoitu viitekenttä. Älä käytä NFC-korttiin kirjoitettua URL:ia tai pyyntötunnusta kirjautumistokenina. Raportin autentikointia, mallia tai PDF-työnkulkua ei muutettu tässä erässä.
