# Report 2.0 C.2 – rajattu jatkokehityssuunnitelma

Tämä on suunnitelma. Alla olevia hallintatoimintoja ei ole toteutettu tai julkaistu C:n turvallisuustäsmennyksessä. Nykyinen ohjelma ei palauta peruttua raporttia eikä suorita säilytysajan perusteella automaattisia poistoja.

## Perumisen hallittu palautus

Pienen C.2-erän mahdollinen lisäys: vain aktiiviselle Adminille selkeä peruttujen työtilausten luettelo ja nimenomaisesti vahvistettava palautustoimi. Ennen toteutusta ratkaistaan, avataanko uusi työtilaus-/raporttikopio vai palautetaanko sama peruttu tunnus versioidulla, auditoidulla tilasiirrolla. Oletusarvoinen turvallinen lähtökohta on uusi muokattava kopio, jossa alkuperäinen perumistila ja syy säilyvät lähdehistoriassa.

Palautus näyttää alkuperäisen tunnuksen, perumissyyn, ajankohdan, vastuuhenkilöt ja palautuksen perustelun. Palvelin tarkistaa Adminin, nykyisen revision ja kohteen tilan. Myöhäinen vanha selainluonnos ei saa palauttaa työtä. Toisto ei saa luoda kaksoiskopiota tai korvata perumisen auditointia. Uudelle työlle pyydetään tarvittaessa uusi allekirjoitus ja tehdään normaali tarkastus/hyväksyntä. Peruttu työ ei muutu arkistossa hyväksytyksi valmiiksi työksi.

Hyväksytyn raportin alkuperäistä ei avata, peruta tai muuteta tämän toiminnon kautta. Myöhempi korjaus kulkee jo olemassa olevan uuden kopion kautta ja säilyttää lähdetunnuksen/revision.

## Säilytyksen hallinta Adminille

Mahdollinen pieni näkymä: suodatus arkiston varmennuksen, vähimmäisajan ja poiston eston mukaan, vain luku -tilassa oleva nykyinen politiikka sekä yksittäisen raportin palautettavuuden tarkistus. Yrityksen omistaja vahvistaa ensin oikeudelliset/operatiiviset säilytysajat ja politiikan muutosten voimaantulon. Kahden vuoden aikaa ei oleteta yleiseksi poistoperusteeksi.

Mahdollinen politiikan muokkaus tarvitsee palvelinpuolisen roolirajan, version ja auditoinnin. Sitä ei lisätä nykyiseen C-erään. Politiikka tai ajan täyttyminen ei itsessään poista raporttia. Mahdollinen tuleva poistotoiminto säilyttää nykyiset tiedostovarmennuksen, ratkaistun toimitustilan, revision, tunnuksen ja erillisen Admin-vahvistuksen ehdot. Mitään taustalla ajettavaa tai joukkomuotoista poistoa ei pidä tulkita hyväksytyksi tällä suunnitelmalla.

Metatietojen, auditointihistorian, sähköpostin, laitearkistojen ja palveluntarjoajan varmistusten säilytys käsitellään erikseen omistajan vahvistamassa menettelyssä. Älä lupaa kaikkien kopioiden välitöntä poistumista.

## Rajat ja hyväksyminen

Säilytä Firebase Spark ja Workers Free: sivutetut pienet metatietokyselyt, rajatut transaktiot, ei kuvia raporttidokumentteihin, maksullista TTL:ää, Cloud Functionsia tai ajastettua poistoa. Hinnoittelu-/rooli-/viimeisen Adminin suoja ja CONTACT säilyvät.

Ennen C.2-julkaisua testataan Admin/Employee-rajat, samanaikainen palautus, vanhan revision hylkäys, idempotenssi, alkuperäisen auditoinnin muuttumattomuus, arkiston molempien tiedostojen palautus, säilytysrajan täsmällinen ylitys sekä mobiilikäyttö. Erillinen tuleva käyttöönottopäätös tarvitaan; tämä suunnitelma ei ole lupa deployhin tai tuotantopoistoihin.
