# Report 2.0 C – visuaalinen tarkistus

Oikean React-sovelluksen paikalliset Chromium-kaappaukset, synteettinen asiakas ja eristetyt Firebase-emulaattorit. Ei tuotantotietoja tai oikeita sähköposteja.

| Etuliite | Näyttö |
|---|---|
| desktop | 1440×900 |
| mobile | 390×844, kosketus |
| tablet | 768×1024, kosketus |

`*-employee-signature-panel.png`: työntekijän vahvistettu, lukittu allekirjoitus. `*-admin-archive-confirmed-panel.png`: ylläpitäjän lopulliset lataukset, erillinen arkistotila, tiedostotarkistus ja nimenomainen poistotoiminto. Poisto on näissä kuvissa sallittu **vain testipalvelun synteettisellä nollapäivän politiikalla**; tuotannossa se on oletuksena suljettu.

Kuvat tarkastettiin: tekstin rivittyminen, kosketuspainikkeiden koko, paneelien reunat, allekirjoituksen mittasuhteet, mobiilin arkistosijainti ja vaakavierityksen puuttuminen. Koko sivun kaappaukset ja renderöidyt PDF-sivut ovat paikallisissa `.playwright-artifacts/report20c/`-tiedostoissa; repoon tallennetaan vain nämä pienet paneelikaappaukset. Myös kahden sivun lopullinen synteettinen PDF tarkastettiin: logo, verottomat/verolliset summat, allekirjoitus ja hyväksyntä mahtuvat oikein.

Toistaminen: `node scripts/run-report-tests.mjs --archive-only`. Windowsilla tarvittaessa `GAME_BROWSER_EXECUTABLE` osoittaa asennettuun Chromiumiin. Fyysisiä NFC-kortteja/kynälaitteita tai oikeaa Googlen postilaatikkoa ei simuloida toimivaksi näillä kuvilla. Koko testitulos ja käyttöönottoportit: [REPORT_2_0_C_RESULT.md](../../REPORT_2_0_C_RESULT.md).
