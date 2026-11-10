# Tuotantoon siirtymisen tarkistuslista

CONTACT 3.1, 10.11.2026: käyttäjä ilmoittaa aiemman lomaketoimituksen varmennetuksi. Uuden version paikalliset testit ja järjestys GAS → Worker → frontend kuvataan [CONTACT_3_1_REPORT.md](CONTACT_3_1_REPORT.md):ssä; käyttöönoton jälkeistä oikeaa testiä ei ole tehty tässä työssä. Muut oikeudelliset, raporttitodennuksen ja laitetestauksen hyväksynnät säilyvät avoimina. Alla oleva 9.11. lähtötilanne ei ole uuden version live-testitulos.

Päivitetty 9.11.2026. Julkaisua ei ole hyväksytty. Yksityiskohtaiset vahvistettavat faktat, omistajan päätökset ja todisteet: [PRIVACY_APPROVAL_CHECKLIST.md](PRIVACY_APPROVAL_CHECKLIST.md). Nykytilan tekninen näyttö: [PRIVACY_DATA_FLOW_AUDIT.md](PRIVACY_DATA_FLOW_AUDIT.md). Yhteydenoton palvelinlähde ja paikallinen testaus on toteutettu CONTACT 3.0:ssa; palvelinten käyttöönotto ja oikea vastaanottotesti puuttuvat. [Manuaaliset käyttöönottoaskeleet](CONTACT_3_0_SETUP.md).

1. Julkinen sivusto ja visuaalinen hyväksyntä.
   - [ ] Sisältö, viralliset tunnukset ja responsiivisuus hyväksytty.
   - [ ] Lopullinen domain, host, HTTPS ja Pages-ympäristön julkaisuhyväksyntä varmistettu. Nykyinen main-push voi käynnistää deployn; tässä työssä ei pushata.
2. Tietosuojaseloste ja todelliset tietovirrat.
   - [ ] Oikeusperusteet, roolit, toimittajat/sopimukset, säilytys, siirrot, oikeuspyynnöt ja loukkausmenettelyt vahvistettu.
   - [ ] Lopullisen hostin evästeet ja pyynnöt tarkistettu; ei-välttämät tekniikat estetty ennen asianmukaista suostumusta tai poistettu.
3. Oikea yhteydenottosähköposti.
   - [x] Palvelinlähde, salainen vastaanottajakonfiguraatio, validointi, väärinkäytön torjunta ja virhe-/kaksoislähetysmenettelyt toteutettu ja paikallisesti testattu testivastineilla.
   - [ ] Oikeat Google/Cloudflare-palvelimet, avaimet, widget, siivousajastus ja palvelusopimukset määritetty sekä hyväksytty.
   - [ ] Todellinen viesti vastaanotettu ja virhetapaukset testattu. Lähetyspainike avataan vasta tämän jälkeen.
4. Turvallinen henkilöstötodennus.
   - [ ] Palvelinpuolinen identiteetti, valtuutus, vanheneva istunto, uloskirjautuminen ja oikeuksien peruminen testattu. Ei selaimen salasanaratkaisua tai jaettua GAS-salasanaa tuotantoturvana.
   - [ ] NFC avaa tavallisen suoran HTTPS-URL:n, tarvittaessa kirjautumisen kautta. Ei henkilötietoja, kortti-ID:tä tai salaisuutta URL:ssa. Julkisessa navigaatiossa ei raporttilinkkiä.
5. Raportti, PDF, toimitus ja PWA.
   - [ ] Luonnosten ja kuvien käyttäjä-/laitesuojaus, säilytys ja poisto hyväksytty.
   - [ ] Oikea PDF-toimitus testattu hyväksytyn henkilöstöistunnon kautta.
   - [ ] PDF, kamera, asennus, NFC, offline ja päivitykset testattu fyysisellä iPhonella ja Androidilla.
6. Lopullinen tuotannon hyväksyntä.
   - [ ] Tietoturva-, toiminnallisuus- ja mobiilihyväksyntä tehty; testitulokset vastaavat lopullista ympäristöä.
   - [ ] Omistaja hyväksynyt selosteen ja julkaisun. Keskeneräistä toimintoa ei esitetä käyttövalmiina.

Näiden ehtojen täyttyminen ei seuraa pelkästä buildin tai yksikkötestien läpäisystä. Ei automaattista pushia tai deployta.
