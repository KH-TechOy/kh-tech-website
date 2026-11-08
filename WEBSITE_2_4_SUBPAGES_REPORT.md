# WEBSITE 2.4 — alasivujen taustat ja Liquid Glass

Toteutettu 8.11.2026 `main`-haaralla. Palvelut-, Yritys- ja Yhteystiedot-sivujen yläherot käyttävät nyt etusivun kanssa samaa Liquid Glass -ilmettä ja pyydettyjä kuvia tässä järjestyksessä:

| Reitti | PNG-lähde | Optimoitu asset-nimi |
| --- | --- | --- |
| `/palvelut/` | `docs/website_bg_4.png` | `services` |
| `/yritys/` | `docs/website_bg_5.png` | `about` |
| `/yhteystiedot/` | `docs/website_bg_6.png` | `contact` |

Nykyiset suomenkieliset otsikot, kappaleet, linkit ja typografian hierarkia säilyivät. Teksti on edelleen HTML:ää alkuperäisessä keskitetyssä containerissa vasemmalle tasattuna. Palvelukorttien ja yritystietojen sisältöön, lomakelogiikkaan, etusivun lasiosioihin, raportti-PWA:han, PDF:ään, autentikointiin, peliin tai julkaisutyönkulkuun ei tehty muutoksia.

## Toteutus ja rajaus

- `src/Website.tsx`: nykyinen `SectionBackground` tukee kolmea uutta kuvaa. `PageHero` saa valinnaisen `image`-asetuksen, jota käytetään vain näillä kolmella sivulla. Ilman asetusta tietosuoja- ja 404-hero säilyvät entisellään. Etusivun komponenttikutsut ja kuvan oletusasetukset säilyivät.
- `src/subpage-backgrounds.css`: kaikki uudet asettelusäännöt on rajattu `.page-hero--cinematic`-heroihin. Sivukohtaiset kuvakohdistukset, paneelileveys, padding ja mobiilirajaus.
- `src/homepage-backgrounds.css` on muuttamaton. Sen nykyisiä `.cinematic-section`, `.section-background` ja `.kh-glass`-tyylejä käytetään uudelleen.
- `scripts/build-website-backgrounds.py --subpages`: pakkaa vain uudet kuvat; etusivun kuvat ja niiden manifesti säilyvät muuttamattomina.
- `scripts/review-subpage-glass.mjs`: lähtötilan vertailu, tuotannon selainkatselmointi, kaappaukset, kuvien eheyden ja näkyvyyden tarkistus sekä regressiot.
- `README.txt`, `IDEA.md` ja `CODEX_PROMPT.md`: nykyisen työn kuvaus ja tarkistusohjeet.

Lisäksi toteutettiin käyttäjän erikseen hyväksymä pieni CSS-korjaus yhteystietojen tablettinäkymään. Vanha `.contact-method:nth-of-type(1)` osui sekä ensimmäiseen puhelinlinkkiin että palvelualueen `div`-elementtiin, jolloin ne olivat samassa ruudukon solussa. `src/style.css`:n kaksi rivisijoittelusääntöä rajattiin `a.contact-method`-linkkeihin. Palvelualue asettuu nyt seuraavalle vapaalle riville. Teksti, linkit, työpöytä-/puhelinasettelu ja lomakkeen toiminta säilyivät.

## Kuvien optimointi

Alkuperäiset PNG:t säilyivät muuttamattomina. [Manifesti](docs/website24-checks/background-assets.json) sisältää SHA-256-tiivisteet, pakkausasetukset, mobiilirajaukset sekä kaikkien tiedostojen mitat ja koot.

| Kuva | Alkuperäinen PNG | Suurin WebP, 1672 px | Mobiili-WebP, 720 px |
| --- | ---: | ---: | ---: |
| Palvelut | 1 863 701 tavua | 99 558 tavua | 72 508 tavua |
| Yritys | 1 975 846 tavua | 114 834 tavua | 75 050 tavua |
| Yhteystiedot | 1 814 525 tavua | 85 330 tavua | 51 648 tavua |

Assetit ovat paikallisia: `public/website/{services,about,contact}-{800,1200,1672}.webp` ja `public/website/{services,about,contact}-mobile-{480,720}.webp`. Pillow/WebP quality 84, method 6. Kolmen suurimman kuvan yhteiskoko on **299 722 tavua**, noin **94,7 % pienempi** kuin PNG-lähteiden 5 654 072 tavua. Kaikki 15 vaihtoehtoa yhteensä 913 192 tavua; selain valitsee `picture`/`srcset`/`sizes`-asetusten perusteella sopivan tiedoston.

Hero-kuvilla on `loading="eager"`, `fetchPriority="high"` ja `decoding="async"`. Ne ovat absoluuttisessa taustakerroksessa, joten kuvan valmistuminen ei muuta tekstin tai heron geometriaa. Kuormauksen viivästämiseen perustuva tarkistus vahvisti saman hero-koon ennen ja jälkeen kuvan dekoodauksen kaikissa yhdeksässä sivu-/näyttökokoyhdistelmässä. Tämä tarkistus koskee kuvien aiheuttamaa asettelumuutosta, ei koko sovelluksen alustuksen CLS-mittausta.

Kaikki URL:t muodostetaan nykyisellä `url()`/Viten `BASE_URL`-apufunktiolla. Ei ulkoista kuvahostingia, uusia Node-riippuvuuksia eikä muutoksia tuotannon normaaliin build-komentoon. Python/Pillow tarvitaan vain WebP-kuvien uusintaan.

## Lasityyli ja responsiivisuus

Yksi yhtenäinen paneeli per hero: nykyinen tumma `rgba(12,25,35,.70)`-pinta, läpikuultava reuna, hienovarainen sisäreunan valo ja pehmeä varjo. Blur 18 px työpöydällä/tabletilla, puhelimessa pienennetty 12 px:iin; ei animaatiota tai päällekkäisiä blur-kerroksia. Kulmat 24 px / puhelimessa 22 px. Ilman backdrop-filter-tukea käytetään nykyistä peittävämpää `.94`-varataustaa. WebKit-prefiksi säilyy.

- Työpöytä: koko näytön levyinen tausta, noin 420 px:n hero ja nykyinen keskitetty max-width-container. Lasin padding 32 px sijoitetaan nykyisen tekstiryhmän ympärille. Pääotsikon nykyinen fonttikoko säilyy; tarvittaessa otsikko rivittyy paneelin leveyteen.
- Tabletti: padding 28 px ja paneelille rajattu leveys, jotta oikean reunan putkisto jää näkyviin. Kaappausten perusteella paneelia kavennettiin vielä 40 px.
- Puhelin: omat kuvarajaukset, kuvien pääkohteelle noin 200 px tilaa paneelin yläpuolella, lähes täysleveä paneeli ja sisäpadding 25×22 px. Sisältöjärjestys säilyy.
- Kuvien kohdistus on yksilöllinen. Palveluiden käsipyörä, yrityssivun siniset venttiilikahvat ja yhteystietojen sininen kahva pysyvät näkyvissä. Kuvien reunoja rajautuu peittävässä taustassa tarkoituksella.

Tekstin konservatiivinen vähimmäiskontrasti on **4,63:1** myös täysin valkoisen kuvan päällä. Kontrasti tarkistettiin CSS-väreistä ja alfa-arvosta sekä kuvakaappauksista. Nykyinen `prefers-reduced-motion`-tuki säilyy, ja sen toiminta tarkistettiin selaimessa.

## Visuaalinen QA

Kaikki kolme lähdekuvaa ja nykyiset sivut tarkastettiin ennen muutoksia. [Lähtötilan vertailu](docs/website24-checks/before.json) sisältää herotekstit, alapuolisen HTML:n tiivisteet, keskeiset tyylit sekä etusivun HTML-/tyylivertailun.

Ensimmäisten [kaappausten](docs/website24-screenshots/pass1) jälkeen palveluiden kuvakohdistusta nostettiin, tabletin lasipaneeleita kavennettiin ja hyväksytty yhteystietoruudukon virhe korjattiin. Lopulliset kaappaukset tarkastettiin silmämääräisesti:

| Näyttökoko | Palvelut | Yritys | Yhteystiedot |
| --- | --- | --- | --- |
| 390×844 | [kuva](docs/website24-screenshots/final/mobile-palvelut.png) | [kuva](docs/website24-screenshots/final/mobile-yritys.png) | [kuva](docs/website24-screenshots/final/mobile-yhteystiedot.png) |
| 768×1024 | [kuva](docs/website24-screenshots/final/tablet-palvelut.png) | [kuva](docs/website24-screenshots/final/tablet-yritys.png) | [kuva](docs/website24-screenshots/final/tablet-yhteystiedot.png) |
| 1440×900 | [kuva](docs/website24-screenshots/final/desktop-palvelut.png) | [kuva](docs/website24-screenshots/final/desktop-yritys.png) | [kuva](docs/website24-screenshots/final/desktop-yhteystiedot.png) |

[Blur-varatyylin simulaatio](docs/website24-screenshots/final/mobile-contact-fallback.png). Herojen rajaukset, luettavuus, paneelien reunat ja tabletin yhteystietojen erilliset rivit tarkastettiin. Vaakaylivuotoa ei havaittu.

## Tarkistukset

- `npx.cmd tsc -b`: hyväksytty.
- `npm.cmd test`: **55/55**, 9 testitiedostoa. Mukana 1 000 seedin peligeneraattoritarkistus; [tulos](docs/website24-checks/generation-stress.json).
- `npm.cmd run build`: hyväksytty juuripolulla sekä `/kh-tech-website/`-polulla.
- `npm.cmd run test:website`, tuotannon juuri: **14 hyväksyttyä, 4 tarkoituksella ohitettua**, ei virheitä. [Tulokset](docs/website24-checks/root-browser.json).
- `npm.cmd run test:website`, tuotannon Pages-polku: **14 hyväksyttyä, 4 tarkoituksella ohitettua**, ei virheitä. [Tulokset](docs/website24-checks/pages-browser.json). Ohitetut migraatio- ja offline-testien mobiilitoistot suoritetaan työpöytäprojektissa.
- Uusi selainkatselmointi tuotannon juuripolulla: **9/9** sivu-/näyttökokoyhdistelmää hyväksytty; [tulos](docs/website24-checks/final-root.json).
- Sama katselmointi tuotannon Pages-polulla: **9/9** hyväksytty; [tulos](docs/website24-checks/final-pages.json). Molemmissa ajoissa etusivu, lähdekuvien tiivisteet ja kaikkien optimoitujen taustojen tuotantokopiot tarkistettu. Ei selain- tai HTTP-virheitä.
- `node scripts/check-website-assets.mjs`: hyväksytty; viralliset logot, PDF-tunnus, PWA-ikonit, offline-paketti ja tuotantoon kuulumattomien lähteiden poissulut.

Katselmointi vertaa herotekstejä sekä kaikkien heron alapuolisten osioiden HTML:ää lähtötilanteeseen. Keskeiset alapuoliset tyylit säilyvät samoina lukuun ottamatta hyväksytyn tablettikorjauksen aiheuttamaa yhteystieto-osion korkeuden muutosta. Puhelin-, sähköposti- ja palvelualuerivien päällekkäisyys tarkistetaan erikseen. Etusivun HTML ja mitatut tyylit pysyvät samoina kaikissa kolmessa koossa. Kuvien pääkohteille on näkyvyystarkistus, jota kaappausten silmämääräinen tarkastelu täydentää. Navigointi ja suora sivupäivitys testataan jokaisella sivulla kaikissa kolmessa koossa.

Nykyiset sivuston selaintestit tarkistavat lisäksi sivureitit, valikot, näppäimistökäytön, lomakkeen validoinnin ja esittelytilan, raporttiluonnoksen, valokuvat, esikatselun, oikean PDF-latauksen sekä tuotannon offline-raportin. Pelin aloitus ja yksi canvas tarkistetaan. Ei todellista sähköpostilähetystä.

## Toistaminen ja rajaukset

```powershell
# Vain jos oma Chromium-polku tarvitaan:
$env:GAME_BROWSER_EXECUTABLE='C:/polku/chrome.exe'
npx.cmd tsc -b
npm.cmd test
$env:VITE_BASE_PATH='/' # Myös /kh-tech-website/ tarkistettu
npm.cmd run build
$env:WEBSITE_PRODUCTION='1'
node scripts/review-subpage-glass.mjs
$env:WEBSITE_CHECKS='docs/website24-checks'
$env:WEBSITE_SCREENSHOTS='.playwright-artifacts/website24-regression'
npm.cmd run test:website
```

Kuvien uusinta tarvittaessa: `python scripts/build-website-backgrounds.py --subpages` (Pillow). Poista tuotantotestin ympäristömuuttujat tai käytä uutta PowerShell-ikkunaa ennen tavallista kehityspalvelinta.

Testattu Chromiumin työpöytä- sekä mobiilin näyttö-/kosketusemuloinnilla. Fyysistä puhelinta tai Safari-laitetta ei testattu. Blur-varatyyli tarkistettiin CSS-simulaatiolla, ei vanhalla selaimella. Nykyinen buildin suuren Phaser-chunkin huomautus säilyy; peli ladataan erikseen. Työ tallennetaan paikallisena commitina `main`-haaralle. Ei pushia tai deployta.
