# Tietosuojan ja tuotantojulkaisun hyväksyntälista

## REPORT 2.0 A — henkilöstöpalvelun julkaisuportit, 10.11.2026

Paikallinen Firebase-/Worker-toteutus ja emulaattorit eivät merkitse seuraavia kohtia hyväksytyiksi. Alempien historiallisten osioiden avoin todennus tarkoittaa nyt erityisesti lopullisen ympäristön varmennusta. [Toteutus](REPORT_2_0_A_RESULT.md), [asetukset](REPORT_2_0_FIREBASE_SETUP.md), [turvarajat](REPORT_2_0_SECURITY.md).

- [ ] Vahvista yrityksen omistamat Firebase Spark- ja Workers Free -tilit, ei korttia/laskutusta, kiintiöiden seurannan vastuuhenkilö ja käyttökatkojen hyväksyntä.
- [ ] Hyväksy Firebase Authin, Firestoren ja Cloudflaren todelliset sopimukset/DPA:t, käsittelijäroolit, valittu EU-tietokanta-alue ja mahdolliset kansainväliset siirrot suojineen. EU-Firestore ei tarkoita, että Auth ja Cloudflare käsittelisivät kaiken ETA:ssa.
- [ ] Vahvista työntekijöiden profiilien/roolien/auditoinnin oikeusperuste ja henkilöstön informointi. Ei keksittyä suostumusta tai automaattista oikeusperustehyväksyntää.
- [ ] Määritä profiilien, inaktiivisten tilien ja auditoinnin säilytys-/poistomenettely, tietopyynnöt, lokien todellinen retentio, pääsynvalvonta ja vastuuhenkilöt. Koodissa ei ole automaattista auditoinnin vanhenemista tai maksullista TTL:ää.
- [ ] Tunnista ja vie/poista vanhat yhteiset localStorage-luonnokset. Uusi kirjautuminen ei salaa aiempaa paikallista tietoa. Hyväksy tab-kohtaisen plaintext-luonnoksen rajat ja hallittujen henkilökohtaisten laitteiden käytäntö.
- [ ] Varmenna ensimmäinen admin luotetulla operaattorilla, laskuri, toinen ylläpitäjä, IAM/MFA, palvelutiliavaimen turvallinen säilytys/rotaatio sekä profiili ensin -hätäesto ja palautumismenettely. Ei julkista bootstrap-endpointia.
- [ ] Hyväksy keskeneräisten luontien ja attempting-tilaan jääneiden palautusviestien manuaalinen selvitys ilman sokeaa uudelleenlähetystä.
- [ ] Testaa oikean projektin kirjautuminen, sähköpostipalautuksen todellinen vastaanotto/kertakäyttö, Firestore Rules, eston vaikutus vanhaan tokeniin, viimeinen admin ja Free CPU -raja. Testaa fyysiset NFC-kortit ja asennettu PWA työntekijöiden laitteilla.
- [ ] Sovi maksuton varmuuskopio-/palautussuunnitelma ja kiintiöiden täyttymisen menettely. Pilviraportit, liitteiden arkisto ja raporttien sähköposti eivät ole vielä operatiivisia; niitä ei julkaista toimivina.

## CONTACT 3.1 — tilapäivitys 10.11.2026

Käyttäjä ilmoittaa aiemman oikean sähköpostitoimituksen varmennetuksi. Tämä ei yksin vahvista tietosuojasopimuksia, siirtoperusteita tai raportin henkilöstötodennusta; niiden avoimet kohdat säilyvät. Uuden version automaattinen Turnstile, molemmat-yhteydenottotapa ja kopiointi testataan paikallisesti, ja käyttöönoton jälkeinen live-toimitus varmennetaan erikseen. Katso [CONTACT_3_1_REPORT.md](CONTACT_3_1_REPORT.md). Alla olevat päivätyt CONTACT 3.0 -havainnot kuvaavat sen paikallisen toteutuserän tilaa.

## CONTACT 3.0 — lisäehdot ennen lomakelähetyksen avaamista, 9.11.2026

- [ ] Vahvista omistajan Google-kuluttajatilin ja Cloudflare Free / Turnstile / SQLite -tilien soveltuvuus yrityksen henkilötietojen käsittelyyn. Tilin omistaminen ei todista DPA:ta tai siirtoperustetta. Jos ehdot eivät riitä, älä aktivoi lähetystä.
- [ ] Vahvista sähköpostin todellinen säilytysaika, käyttöoikeudet, poistovastuu ja palveluntarjoajien lokit/siirrot. Uuden teknisen ledgerin 48 h ei ole postilaatikon säilytysaika.
- [ ] Hyväksy roskapostisuojan käyttötapaus ja Turnstilen henkilötietokäsittely ennen sen lataamista asiakkaille. Se ladataan vain konfiguroidun lomakkeen käyttäjän käynnistämästä tarkistuksesta; ei markkinointiseurantaa.
- [ ] Varmista Workerin alarmit ja Googlen tunnin välein ajettava cleanup: tekniset merkinnät poistuvat tarkistusjakson jälkeen. Ei sisältöä palvelimen tietokantaan tai viestilokeihin.
- [ ] Tarkista palvelimella hallittu vastaanottaja ja HMAC-avaimet yksityisesti; niitä ei dokumentoida julkiseen repoon. Rajaa tilit vähimmillä oikeuksilla.
- [ ] Hyväksy ja suorita [oikea toimitustesti](CONTACT_3_0_EMAIL_ACCEPTANCE.md); saapumista ei ole vielä todistettu. Aktivoi Vite-asetukset/julkaisubuild vasta tämän ja tietosuojan hyväksymisen jälkeen.

Muut aiemmat julkaisuesteet säilyvät. [Käyttöönotto](CONTACT_3_0_SETUP.md) ja [CONTACT_3_0_REPORT.md](CONTACT_3_0_REPORT.md) erottavat lähdekoodin, paikalliset testivastineet ja vielä puuttuvan oikean käyttöönoton.

Päiväys 8.11.2026. **Julkaisua ei ole hyväksytty.** Toteutuksen tekninen tarkistus ja kattava selosteteksti eivät yksin tee palvelusta GDPR:n mukaista tai tuotantovalmiiksi. Tätä listaa ei ole korvattu oletetuilla säilytysajoilla, sopimuksilla, suostumuksilla tai siirtosuojilla.

## Jo todennettu — ei tarkoita oikeudellista hyväksyntää

- [x] Yrityksen nimi, Y-tunnus, osoite, Tomi Honka sekä julkinen sähköposti/puhelin vastaavat [yrityksen omaa sivustoa](https://kh-tech.fi/) ja `src/brand.tsx`:ää (8.11.2026).
- [x] Sovelluksen tietovirrat, tallennusavaimet, irrallinen GAS-koodi sekä julkaisutapa on tarkastettu: [auditointi](PRIVACY_DATA_FLOW_AUDIT.md).
- [x] CONTACT 3.0:n yhteydenottopolun lähdekoodi on toteutettu, mutta palvelimia ei julkaistu tai todellista toimitusta testattu. Henkilöstöistuntoa ei ole toteutettu. Niitä ei merkitä tuotantokäytössä toimiviksi.
- [x] Ei analytiikka-/mainontaskriptejä tai kartta-/videoupotuksia. Cloudflare/Turnstile-koodi on lisätty CONTACT 3.0:ssa; ilman uusia Vite-asetuksia sitä ei käytetä selaimessa.

## 1. Julkinen sivusto ja visuaalinen hyväksyntä

- [ ] Omistaja hyväksyy nykyisen julkisen sivuston sisällön ja ulkoasun. Tämän erän selosteesta ei saa poistaa puutteiden näkyvyyttä ilman niiden ratkaisemista.
- [ ] Vahvista lopullinen ensisijainen URL, GitHub Pagesin tai muun hostin tili, mahdollinen CDN/proxy ja HTTPS-asetukset. Repon Pages-työnkulku ei todista nykyisen kh-tech.fi-palvelun hostia.
- [ ] Varmista tuotantoympäristön julkaisuhyväksyntä ennen seuraavaa pushia: nykyinen Pages-työnkulku voi julkaista `main`-pushista. Tässä erässä ei pushata/deployata.

## 2. Tietosuojaseloste ja todelliset tietovirrat — julkaisuesteet

Jokaisesta kohdasta tarvitaan yrityksen päätös ja todennettava lähde, esimerkiksi sopimus, palvelun asetukset tai hyväksytty toimintamalli. Yksityistä sisäistä ilmoitusosoitetta, salasanaa tai tokenia ei saa liittää julkiseen repositorioon; kirjaa vain rooli ja missä tieto on turvallisesti hallinnassa.

- [ ] Vahvista rekisterinpitäjän rooli asiakas-, työntekijä- ja työraporttitiedoille sekä mahdollinen asiakkaan lukuun tapahtuva käsittely. Nimeä vastuuhenkilöt ja tarvittaessa dokumentoi käsittelysopimukset.
- [ ] Vahvista tietosuoja-asioiden yhteyshenkilö ja arvioi tietosuojavastaavan nimeämisvelvollisuus. Tomi Honkan julkinen yhteystieto ei todista DPO-nimitystä tai sen tarpeettomuutta.
- [ ] Hyväksy käyttötarkoituskohtaiset oikeusperusteet: luonnollisen henkilön tarjous/toimeksianto, yrityksen yhteyshenkilö, työn dokumentointi, työntekijän tiedot ja tekniset lokit. Oikeutetun edun kohteisiin tarvitaan tarpeellisuus-/tasapainoarviointi; lakisääteisiin velvoitteisiin täsmällinen säädös ja tietoryhmät.
- [ ] Vahvista kaikki oikeasti käytettävät posti-, puhelin-, hosting-, ylläpito-, varmuuskopio- ja alihankintapalvelut. Erota käsittelijät, alikäsittelijät ja itsenäiset rekisterinpitäjät. Sopimusten olemassaoloa ei päätellä yleisistä markkinointisivuista.
- [ ] Vahvista käsittelymaat, mahdolliset EU/ETA-siirrot ja juuri KH-Techin tiliin sovellettava GDPR V luvun peruste. Tarvittaessa riittävyyspäätös / sopimuslausekkeet, siirtoarvio ja lisäsuojat sekä rekisteröidyn tapa saada niistä jäljennös. DPF:n tai DPA:n soveltuvuutta ei ole vahvistettu.
- [ ] Määrittele yhteydenottojen, tarjousten, sähköpostien, valmistuneiden töiden, raporttien, valokuvien, varmuuskopioiden ja lokien todelliset säilytysajat tai yksilöidyt määräytymiskriteerit. Kuka poistaa tiedot, mistä ja miten poisto varmennetaan? Ei yleistä "tarpeen mukaan" -lausetta todellisten käytäntöjen korvikkeeksi.
- [ ] Hyväksy selainluonnosten säilytys, mahdollinen ajallinen vanheneminen ja laitehallinta ennen asiakastietoja. Nykyinen raporttiluonnos ja kuvat eivät vanhene automaattisesti eivätkä ole käyttäjäkohtaisesti salattuja. PDF:n poisto on erillinen.
- [ ] Vahvista käyttöoikeudet todellisessa sähköpostissa/asiakasprosessissa, luovutusten vastaanottajaryhmät ja lakiperusteiset luovutukset. Vain sovelluksen ulosmenevien kutsujen puuttuminen on todennettu.
- [ ] Päätä työntekijän tai asiakkaan edustajan antamien kolmannen henkilön tietojen informointi (GDPR 14): lähde, vastuut, määräajat, yhteydenottotapa ja mahdolliset perustellut poikkeukset. Henkilötietojen kuvaaminen kotona/työmaalla on arvioitava erikseen.
- [ ] Sovi oikeuspyyntöjen vastaanotto, tarpeellinen henkilöllisyyden varmennus, yhden kuukauden määräaikaseuranta sekä tietoturvaloukkausten käsittely ja soveltuvat ilmoitusajat.
- [ ] Hyväksy käyttäjän pyytämän peliasetuksen ja raportin paikallisen toiminnon tallennuksen välttämättömyys käyttötapauksittain Traficomin ohjeen mukaan. Automaattinen tarpeeton pelitason kirjoitus on poistettu; vanhojen selainmerkintöjen poistosta kerrotaan selosteessa.
- [ ] Tarkista lopullisen hostin vastausevästeet, verkkopyynnöt, lokit ja mahdolliset ulkoiset lisäykset aidossa tuotantoympäristössä. Lähdekoodiin ei lisätä evästebanneria ilman tarvetta. Ei-välttämättömät lisäykset estetään ennen suostumusta tai jätetään pois.
- [ ] Vertaa mahdollinen erillinen omistajan tietosuojaluonnos toteutukseen. Sitä ei ollut tämän keskustelun saatavilla olevassa aineistossa/repoissa. Hyväksy lopullinen seloste vasta, kun edellä olevat tosiasiat on lisätty ja ristiriidat ratkaistu.

## 3. Oikea yhteydenottosähköposti — ei vielä käytössä

- [ ] Valitse ja toteuta tuotannon endpoint; vahvista palvelusopimukset ja salainen vastaanottajakonfiguraatio. Irrallinen GAS-lähde ei ole valmis React-integraatio eikä sen olemassaolo ole käyttöönottotodiste.
- [ ] Toteuta palvelinpuolinen validointi, väärinkäytön torjunta, kokorajat, CORS ja tarvittava alkuperä-/pyyntösuojaus. Ei `no-cors`-onnistumisväitteitä. Ei tietosuostumuspakkoa sopimusasiointiin.
- [ ] Testaa oikea viesti lähettäjältä vastaanottajan postilaatikkoon. Varmenna vastaanotto, epäonnistumiset, aikakatkaisut, uudelleenyritykset ja kaksoislähetyksen esto. Toimitusvahvistuksen semantiikka on erotettava pelkästä jonoon hyväksynnästä.
- [ ] Poista käyttöliittymän lähetysesto vasta toimivan, hyväksytyn integraation jälkeen. Älä korvaa estoa simuloidulla onnistumisella.

## 4. Henkilöstötodennus ja NFC-suoraosoite — julkaisueste

- [ ] Toteuta todellinen palvelinpuolinen henkilöstöidentiteetti ja raporttien/toimitusten käyttöoikeustarkistus. Ei selaimeen upotettua salasanaa, pelkkää piilotettua linkkiä, staattista NFC-salaisuutta tai noindex-suojausta.
- [ ] Testaa luvaton suora URL, istunnon vanheneminen, uloskirjautuminen, käyttöoikeuksien peruminen, väärinkäytön rajoitukset ja offline-tilan asiakastietojen suojaus. Irrallisen GAS-luonnoksen jaettu salasana/cache-token ei ole hyväksytty ratkaisu.
- [ ] NFC-korttiin kirjoitetaan normaali HTTPS-suoraosoite, esimerkiksi tuotannon hyväksytty `/report/` tai Pagesin projektipolun vastaava reitti. Ei nimeä, henkilötunnusta, kortin tunnistetta, salasanaa tai istuntotokenia URL:iin. Kadonnut kortti ei saa antaa käyttöoikeutta.
- [ ] Kortin avaus ohjaa tarvittaessa oikeaan kirjautumiseen ja sen jälkeen samaan raporttiin. Reitti, päivitys ja manifestin aloitusosoite säilyvät; ne on teknisesti testattu, fyysistä NFC-korttia ei tässä erässä.

## 5. Raportin PDF, toimitus, mobiili ja PWA

- [ ] Hyväksy paikallisen luonnoksen suojaus ja työsuhteen päättymisen/kadonneen laitteen menettely. Nykyinen samaan origin-/selainprofiiliin perustuva tallennus ei ole työntekijäkohtainen.
- [ ] Toteuta ja vastaanota oikea PDF-sähköposti päästä päähän hyväksytyn henkilöstöistunnon kautta; testaa kokorajat, liitteet ja virhepalautus.
- [ ] Tarkista PDF:n sisältö, kuvien tarpeellisuus, ääkköset, monisivuisuus ja säilytys-/poistomenettelyt todellisilla hyväksymistapauksilla.
- [ ] Testaa NFC-avaus, kamera/tiedostovalitsin, asennus, päivitys, offline ja istuntorajat fyysisellä iPhonella ja Androidilla. Selainemulointi ei korvaa laitetestiä.

## 6. Lopullinen tuotannon hyväksyntä

- [ ] Tietoturvatarkastus, oikeus-/roolimallit ja henkilötietojen virta-auditointi päivitetty toteutuneeseen lopulliseen ympäristöön.
- [ ] Nykyiset unit-, selain-, mobiili-, suoraosoite-, PDF-, PWA- ja turvallisuustestit hyväksytty; oikeat toimitustestit yksilöity ilman yksityisiä tietoja julkisissa raporteissa.
- [ ] Omistaja hyväksynyt selosteen ja julkaisemisen erikseen. Yksikään yllä oleva julkaisueste ei jää avoimeksi eikä käyttöliittymä esitä keskeneräistä toimintoa käyttövalmiina.

Hyväksyntä kirjataan yrityksen hallitsemaan asianmukaiseen dokumentaatioon päivämäärän, hyväksyjän ja todisteiden kanssa. Tämä tarkistuslista sisältää avoimia tehtäviä, ei keksittyjä hyväksyntöjä.
