# Report 2.0 C – PdfLibrary.gs:n syntaksikorjaus

13.11.2026, main. Ei pushia, deployta tai oikeita sähköposteja. CONTACT 3.1:n koodi, Firebase-asetukset ja Cloudflaren salaisuudet eivät muutu.

## Tarkka juurisyy

Käyttäjän ilmoittama rivi **13727** löytyi paikallisesta aiemmin generoidusta tiedostosta täsmälleen:

```js
const divisor = 10n ** BigInt(fraction.length), units = BigInt(whole || "0") * divisor + BigInt(fraction || "0");
```

Virheen aiheuttava syntaksi on erityisesti numeroliteraali **`10n`** ja sen `n`-pääte. Seuraavalla rivillä oli myös `2n`, ALV-laskennassa `5000n` ja `10000n`. Ne tulivat suoraan `src/reportWorkModel.ts`:n tarkasta senttilaskennasta. Generointi käytti `target: es2020`, joka säilytti BigInt-literaalit. Node/V8:n `vm` hyväksyi ne, joten aiempi paikallinen ajonaikatesti ei havainnut Googlen tallennusparserin raportoimaa yhteensopivuusongelmaa.

Tämä ei edellytä kopioinnin rikkoutumista: samat normaalit ASCII-merkit `1`, `0`, `n` olivat jo paikallisessa generointituloksessa kyseisellä rivillä. Tarkistettu lähtötiedosto oli kelvollista UTF-8:aa ilman BOM:ia. Pakkaaja ei ollut katkaissut merkkijonoa tai lisännyt virheellistä escapea. Kyseessä on generointikohteen ja Googlen projektissa havaitun tallennussyntaksin yhteensopivuusvirhe.

## Pienin luotettava korjaus

- Kanonisen `reportWorkModel.ts`:n laskenta käyttää nyt kokonais-/jäännösosaan jaettua kertolaskua. Vahvistetuilla raporttirajoilla kaikki välitulokset ovat täsmällisiä kokonaislukuja. ALV:n laskenta jakaa verottoman summan ennen kertomista korkean senttisumman ja prosenttipisteiden epätarkkuuden estämiseksi. Laskenta ei tarvitse BigInt-literaaleja **tai** BigInt-konstruktoria. Raporttien kentät, hinnat, ALV-asetus, formaattiversio, allekirjoitus ja hyväksyntä eivät muutu.
- Generointi kohdistetaan ES2019-skriptiin, käytetään IIFE-muotoa ja koodiliteraalien ASCII-escapeja. Tekstiresurssien suomenkielinen sisältö säilyy samana ajonaikana. Valmis tiedosto kirjoitetaan UTF-8:na.
- `scripts/check-report-gas.mjs` jäsentää **koko** PdfLibraryn ja Code.gs:n Acornin ES2019-skriptikieliopilla sekä estää BigInt-riippuvuuden. Tarkistus suoritetaan jo generoinnissa ennen kirjoitusta. Erillinen `npm run check:report:relay` tarkistaa myös tallennetun tiedoston. Tämä on konservatiivinen paikallinen yhteensopivuusportti, ei väite että Googlen tallennusparseri olisi Acorn.
- ES2019-portti on tarkoituksella tiukka: vanhassa täydessä tiedostossa se havaitsee ensin myös kirjaston ES2020-optional chaining -syntaksin rivillä 6262. Pakkaaja alentaa sen nyt automaattisesti. Erillinen regressiotesti toistaa nimenomaan rivin 13727 BigInt-virheen. Google dokumentoi muitakin V8-ympäristön poikkeuksia, joten Node-version hyväksyntä yksin ei riitä. [Google V8](https://developers.google.com/apps-script/guides/v8-runtime), [esbuild target](https://esbuild.github.io/api/#target), [Acornin kielioppiversio](https://github.com/acornjs/acorn/tree/master/acorn#interface).
- `npm run report:relay` on lisätty saman generoinnin nimeksi. Aiempi `report:relay:bundle` toimii edelleen. Lukittu Acorn on vain kehitys-/generointiriippuvuus, ei selain- tai Worker-riippuvuus. Muiden riippuvuuksien lukituksia ei muutettu.

## Tavutarkka yhteensopivuus

Ennen muutosta tallennettiin olemassa olevan synteettisen hyväksytyn testiraportin PDF, `.khtreport` ja tarkisteet. Korjauksen jälkeen golden-regressiotesti vaatii täsmälleen samat arvot:

| Aineisto | SHA-256 |
|---|---|
| PDF (87974 tavua) | `d4649035d8c9abd66bd22ca29850989c66e7eba4c94b13caf491aa5cefb311ce` |
| `.khtreport` | `b20b8bc1e1ed54dde51af174e73f55b238bdcceeb55324da06606c005c8f1a33` |
| Hyväksytty sisältö | `3b65dbba3c0b2d479c0c472807176291e4139ae00f4a085a7f82e91a16fbc2ac` |

Lisäksi 10000 siemenellistä määrän/hinnan tapausta, raja- ja puolikkaan sentin tapaukset sekä suurimmat raporttisummat eri ALV-kannoilla ja jäännöksillä verrataan **alkuperäiseen BigInt-laskentaan testeissä**. BigInt on vain riippumaton Node-testiorakkeli. Rajattu Apps Script -testiympäristö ajaa oikean generoidun tiedoston BigInt-, Intl-, DOM- ja fetch-rajapintojen puuttuessa ja tuottaa edelleen saman PDF:n/arkistotarkisteet kuin selainpuolen generaattori.

## Tarkistukset ja rajoitus

Tarkistukset hyväksytty puhtaan lukitun riippuvuusasennuksen jälkeen:

- **160/160** unit-/malli-/relay-testiä (sisältää 10000 määrän/hinnan orakkelivertailua, 35 suurten ALV-summien/jäännösten yhdistelmää ja alkuperäiset golden-tarkisteet).
- **42/42** nykyistä palvelin-, Auth- ja Firestore-turvatestiä paikallisissa emulaattoreissa.
- **6/6** C-selaintestiä: hyväksyntä, allekirjoitus, todellinen selain-PDF/siirtotiedosto, eristetyn sähköpostin tarkisteet, vastaanoton varmennus ja hallittu poisto/tuonti koossa 1440×900, 390×844 ja 768×1024.
- TypeScript, Report API:n tyyppitarkistus ja tuotantokäännös Pages-polulla `/kh-tech-website/` hyväksytty. Viten ennestään suuria JS-lohkoja koskeva huomautus ei estä käännöstä.
- Molemmat `npm run report:relay` ja `npm run report:relay:bundle` tuottivat saman validoidun tiedoston. `npm run check:report:relay` hyväksyi koko PdfLibraryn (14049 riviä) ja Code.gs:n. UTF-8:n virheellisyyden regressiotesti hylkää rikkinäiset tavut.

Paikalliset ajolokit: `.playwright-artifacts/report-gas-fix-{unit,security,browser,build,types}.log`. Ennen korjausta tallennetut synteettiset vertailutiedostot ovat vain paikallisessa `.playwright-artifacts/report-relay-before-gas-fix/`-hakemistossa, eivät julkaistavia lähteitä.

Googlen editoriin ei ole tästä ympäristöstä tallennettu tai julkaistu tiedostoa. Paikallinen koko tiedoston kielioppitarkistus, rajattu GAS-ajonaikatesti ja tavutarkka vertailu eivät ole Googlen oman tallennuspalvelun etätesti. Käyttäjä varmistaa editorin tallennuksen kopioituaan alla olevan kokonaisen tiedoston. Älä muuta HMAC-salaisuuksia, kiintiöitä tai hyväksyttyjä raportteja tämän syntaksikorjauksen vuoksi.

## Kopioitava tiedosto

Aja repon juuressa `npm run report:relay` (Windows PowerShellin suorituspolitiikan vaatiessa `npm.cmd run report:relay`). Kopioi **vain tiedoston sisältö**, ilman Markdown-aitoja tai päätemerkintöjä:

`C:\Users\mfi0alta\Desktop\SoftwareDevelopment\kh-tech_sivut\.playwright-artifacts\report-relay\PdfLibrary.gs`

Tämän generoidun **kooditiedoston** koko on 810847 tavua, UTF-8 ilman BOM:ia, lähdetiedoston SHA-256 `118e31c3067e9b6d766b497b89d44635cb988cda1479e95a3c1b4c6084af077f`. Tämä on koodin tunniste; yllä olevan taulukon PDF-/arkistotarkisteet ovat eri asia.

Korvaa sillä KH-Tech Report Archive -projektin **PdfLibrary.gs:n koko aiempi sisältö** ja tallenna editorissa. Älä kopioi `.playwright-artifacts/report-relay-before-gas-fix/`-kansion vianmäärityskopiota tai muuta pelkkää rivinumeroa käsin. Code.gs ja manifesti säilyvät tässä korjauksessa ennallaan. Generoitua megatavuluokan artefaktia ei commitoida; kanoninen lähde, tarkistin, npm-komennot ja regressiotestit ovat repossa.
