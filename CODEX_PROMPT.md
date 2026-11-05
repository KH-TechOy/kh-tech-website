# KH-Tech Oy – toteutusohje

Lue `IDEA.md`, `CODEX_PROMPT.md` ja `README.txt` kokonaan ennen toteutusta. Toteuta KH-Tech Oy:lle suomenkielinen Vite/React/TypeScript-sivusto, työraportin mobiili-PWA ja omaperäinen putkenkorjauspeli. Päivitä nämä suunnittelutiedostot nykyvaatimuksia vastaaviksi ennen koodausta.

## Toimitettavat osat

1. Julkinen sivusto: etusivu, palvelut, yritys, yhteystiedot/lomake, tietosuoja, yhteystiedot ja mobiilikäytettävyys. Käytä vain `IDEA.md`:ssä annettuja yritystietoja ja merkitse ne tarkistettaviksi. Ei keksittyjä suosituksia, kuvia, pätevyyksiä tai päivystystä. Älä paljasta sisäistä vastaanottajaa.
2. `/report/`: paikallisesti toimiva, mobiiliystävällinen raporttieditori, ID, kuvat, tallennuksen tietosuojailmoitus, ammattimainen ladattava A4-PDF ja PWA-perustuki. Automaattinen lähetys sallitaan vasta todennetun palvelinpuolen kirjautumisen jälkeen; epäonnistuessa lataus toimii.
3. `/peli/`: pelattava, alkuperäinen korjauspeli mobiili- ja näppäimistöohjauksin; satunnaiskenttien ratkeavuus varmistetaan, aloitusaika 90 sekuntia.
4. Google Apps Script -lähdekoodi ja tarkat käyttöönotto-ohjeet yhteydenottojen ja raporttien sähköpostitukseen. Asetukset ja tunnukset vain Script Properties -palvelinpuolella. Selvitä käytännön CORS-, käyttöoikeus-, kiintiö- ja väärinkäyttörajoitteet. Älä väitä integraatiota testatuksi ilman todellista testiviestiä. Jos GAS ei tarjoa vaadittua turvallisuutta, estä tuotantolähetys ja dokumentoi sopiva maksuttoman tason vaihtoehto.
5. Päivitetty README, `.env.example` tarvittaessa, Pages-työnkulku, `IMPLEMENTATION_REPORT.md`, testit ja tuotantovalmiuden tarkistuslista.

## Turvallisuus

GitHub Pages on staattinen eikä voi suojata salaisuuksia tai vahvistaa salasanaa. Älä sisällytä keskustelussa jaettua salasanaehdotusta, sen tiivistettä, yksityistä sähköpostiosoitetta, tokenia tai palvelinavainta julkiseen JS:ään, dokumenttiin tai git-historiaan. Työraportti ei saa lähettää luottamuksellisia tietoja ilman palvelinpuolen käyttöoikeuden tarkistusta ja vanhenevaa istuntoa. Mikäli turvallista kirjautumista ei ole, toimitus on estetty ja käyttöliittymä kertoo paikallisesta PDF-latauksesta. Apps Scriptin julkinen rajapinta tarvitsee väärinkäytön torjunnan, kokorajat, validoinnin ja todentamisen; pelkkä honeypot ei riitä tuotantoturvaksi.

Yhteydenottolomake ei saa ilmoittaa lähetystä ilman backendin vahvistusta. Julkinen puhelin- ja sähköpostivaihtoehto on sallittu. Älä tallenna raportteja pysyvään tietokantaan tai Driveen. Selitä paikallisten luonnosten ja kuvien säilyminen.

## Työtapa ja valmistuminen

Etene itsenäisesti paikallisessa repossa. Käytä puuttuvien brändimateriaalien tilalla alkuperäistä typografiaa ja grafiikkaa. Tee Pages-projektipolku toimivaksi ja mahdolliseksi vaihtaa oman verkkotunnuksen juureen. Aja saatavilla olevat asennus-, build-, testaus- ja lint-komennot; korjaa virheet. Tee paikallinen git-commit, mutta älä julkaise, deployaa, lähetä oikeaa testiviestiä tai ota maksullisia palveluita käyttöön ilman omistajan hyväksyntää. Kirjaa toteutunut tila, testit, rajaukset, ulkoinen käyttöönotto ja omistajan hyväksyntää odottavat asiat raporttiin. Älä väitä sovellusta tuotantovalmiiksi, jos turvallisuus tai toimitus on kesken.
