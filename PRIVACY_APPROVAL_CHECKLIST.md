# Tietosuojan ja tuotantojulkaisun hyväksyntälista

Päiväys 8.11.2026. **Julkaisua ei ole hyväksytty.** Toteutuksen tekninen tarkistus ja kattava selosteteksti eivät yksin tee palvelusta GDPR:n mukaista tai tuotantovalmiiksi. Tätä listaa ei ole korvattu oletetuilla säilytysajoilla, sopimuksilla, suostumuksilla tai siirtosuojilla.

## Jo todennettu — ei tarkoita oikeudellista hyväksyntää

- [x] Yrityksen nimi, Y-tunnus, osoite, Tomi Honka sekä julkinen sähköposti/puhelin vastaavat [yrityksen omaa sivustoa](https://kh-tech.fi/) ja `src/brand.tsx`:ää (8.11.2026).
- [x] Sovelluksen tietovirrat, tallennusavaimet, irrallinen GAS-koodi sekä julkaisutapa on tarkastettu: [auditointi](PRIVACY_DATA_FLOW_AUDIT.md).
- [x] React-sivuston sähköpostitoimitukselle tai henkilöstöistunnolle ei löydy toteutettua integraatiota. Niitä ei merkitä toimiviksi eikä todellisesta toimitustestistä ole näyttöä.
- [x] Ei löydetty sovellukseen integroituja analytiikka-/mainontaskriptejä, kartta-/videoupotuksia tai Cloudflare-palvelua.

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
