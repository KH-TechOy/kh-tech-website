import React from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Phone,
  Menu,
  X,
  Wrench,
  GitBranch,
  SlidersHorizontal,
  Waves,
  MapPin,
  Check,
  Gamepad2,
} from "lucide-react";
import { Brand, company, services, url } from "./brand";
import Contact from "./Contact";
import "./homepage-backgrounds.css";
import "./subpage-backgrounds.css";
import "./privacy.css";

const PrivacyNotice = React.lazy(() => import("./PrivacyNotice"));

type SubpageBackground = "services" | "about" | "contact" | "privacy";

function SectionBackground({
  image,
  primary = false,
}: {
  image: "hero" | "company" | "game" | SubpageBackground;
  primary?: boolean;
}) {
  const asset = (suffix: string) => url(`website/${image}${suffix}.webp`);
  const subpage = image === "services" || image === "about" || image === "contact" || image === "privacy";
  const imageWidth = subpage ? 1672 : 1774;
  return (
    <picture className="section-background" aria-hidden="true">
      {image !== "privacy" && <source
        media="(max-width: 600px)"
        srcSet={`${asset("-mobile-480")} 480w, ${asset("-mobile-720")} 720w`}
        sizes={subpage ? "150vw" : "220vw"}
      />}
      <img
        src={asset(`-${imageWidth}`)}
        srcSet={subpage
          ? `${asset("-800")} 800w, ${asset("-1200")} 1200w, ${asset("-1672")} 1672w`
          : `${asset("-960")} 960w, ${asset("-1280")} 1280w, ${asset("-1774")} 1774w`}
        sizes={image === "privacy" ? "(max-width: 600px) 250vw, (max-width: 1100px) 130vw, 100vw" : subpage ? "(max-width: 1100px) 130vw, 100vw" : "(max-width: 1100px) 180vw, 100vw"}
        width={imageWidth}
        height={subpage ? 941 : 887}
        alt=""
        loading={primary ? "eager" : "lazy"}
        fetchPriority={primary ? "high" : "auto"}
        decoding="async"
      />
    </picture>
  );
}

const icons = [Wrench, GitBranch, SlidersHorizontal, Waves];
function Header({ path }: { path: string }) {
  const [open, setOpen] = React.useState(false),
    toggle = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape" && open) {
        setOpen(false);
        toggle.current?.focus();
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);
  return (
    <header className="header">
      <a className="brand" href={url()} aria-label="KH-Tech Oy – etusivu">
        <Brand />
      </a>
      <button
        ref={toggle}
        className="menu-toggle"
        type="button"
        aria-label={open ? "Sulje valikko" : "Avaa valikko"}
        aria-expanded={open}
        aria-controls="site-navigation"
        onClick={() => setOpen(!open)}
      >
        {open ? <X /> : <Menu />}
      </button>
      <nav
        id="site-navigation"
        className={"nav " + (open ? "open" : "")}
        aria-label="Päävalikko"
      >
        {[
          ["Palvelut", "/palvelut"],
          ["Yritys", "/yritys"],
          ["Yhteystiedot", "/yhteystiedot"],
        ].map(([label, route]) => (
          <a
            key={route}
            href={url(route + "/")}
            aria-current={path === route ? "page" : undefined}
          >
            {label}
          </a>
        ))}
        <a className="nav-cta" href={"tel:" + company.tel}>
          <Phone size={16} />
          {company.phone}
        </a>
      </nav>
    </header>
  );
}
function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-main">
        <div className="footer-intro">
          <a
            href={url()}
            aria-label="KH-Tech Oy – etusivu"
            className="footer-brand"
          >
            <Brand />
          </a>
          <h2>
            Hyvä työnjälki
            <br />
            alkaa kuuntelemisesta.
          </h2>
          <p>Suomalaista LVI-osaamista koteihin ja kiinteistöihin.</p>
        </div>
        <div>
          <h3>Ota yhteyttä</h3>
          <a href={"tel:" + company.tel}>{company.phone}</a>
          <a href={"mailto:" + company.email}>{company.email}</a>
          <p>
            Tomi Honka
            <br />
            Helsinki ja Uusimaa
          </p>
        </div>
        <div>
          <h3>Tutustu</h3>
          <a href={url("palvelut/")}>Palvelut</a>
          <a href={url("yritys/")}>Yritys</a>
          <a href={url("yhteystiedot/")}>Yhteystiedot</a>
          <a href={url("peli/")}>Putkimestari-peli</a>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>
          © {new Date().getFullYear()} KH-Tech Oy <i /> Y-tunnus{" "}
          {company.businessId}
        </span>
        <span>Lohja · Helsinki · Uusimaa</span>
        <a href={url("tietosuoja/")}>Tietosuoja</a>
      </div>
    </footer>
  );
}
export function PageHero({
  eyebrow,
  title,
  copy,
  image,
}: {
  eyebrow: string;
  title: string;
  copy: string;
  image?: SubpageBackground;
}) {
  const content = (
    <>
      <div className="eyebrow">{eyebrow}</div>
      <h1>{title}</h1>
      <p>{copy}</p>
    </>
  );
  return (
    <section className={image ? `page-hero cinematic-section page-hero--cinematic page-hero--${image}` : "page-hero"}>
      {image && <SectionBackground image={image} primary />}
      <div className="container">
        {image ? <div className="subpage-hero-content kh-glass">{content}</div> : content}
      </div>
    </section>
  );
}
function ServiceCards({ detailed = false }: { detailed?: boolean }) {
  return (
    <div className={"service-grid " + (detailed ? "detailed" : "")}>
      {services.map((service, i) => {
        const Icon = icons[i];
        return (
          <article className="service-card" id={service.id} key={service.id}>
            <div className="service-card-top">
              <Icon size={27} strokeWidth={1.5} />
              <span>{service.number}</span>
            </div>
            <h3>{service.title}</h3>
            <p>{service.description}</p>
            {detailed && <p className="service-detail">{service.detail}</p>}
            <a href={url("yhteystiedot/?palvelu=" + service.id)}>
              Kysy tästä palvelusta <ArrowUpRight size={18} />
            </a>
          </article>
        );
      })}
    </div>
  );
}
function ContactBand() {
  return (
    <section className="contact-band">
      <div className="container band-inner">
        <div>
          <span className="eyebrow">SUUNNITELLAANKO TYÖSI YHDESSÄ?</span>
          <h2>Kerro, mitä kohteesi tarvitsee.</h2>
          <p>
            Pieni korjaus tai laajempi putkityö – ota yhteyttä ja kysy lisää.
          </p>
        </div>
        <div className="band-actions">
          <a className="button light-button" href={url("yhteystiedot/")}>
            Pyydä tarjous <ArrowRight size={18} />
          </a>
          <a href={"tel:" + company.tel} className="band-phone">
            <Phone size={17} />
            {company.phone}
          </a>
        </div>
      </div>
    </section>
  );
}
function Home() {
  return (
    <>
      <section className="hero cinematic-section">
        <SectionBackground image="hero" primary />
        <div className="container hero-grid">
          <div className="hero-copy kh-glass">
            <div className="eyebrow">
              <span /> KH-TECH OY · HELSINKI JA UUSIMAA
            </div>
            <h1>
              Suomalaista
              <br />
              LVI-osaamista.
              <br />
              <em>Huolellista työnjälkeä.</em>
            </h1>
            <p className="lead">
              Toimiva talotekniikka tekee arjesta sujuvampaa. Huollamme,
              muutamme ja saneeraamme kotien ja kiinteistöjen putkistoja
              asiakkaan tarpeita kuunnellen.
            </p>
            <div className="hero-actions">
              <a className="button primary" href={url("yhteystiedot/")}>
                Pyydä tarjous <ArrowUpRight size={19} />
              </a>
              <a className="button secondary" href={"tel:" + company.tel}>
                <Phone size={17} />
                {company.phone}
              </a>
            </div>
            <div className="hero-note">
              <MapPin size={16} /> Lohjalta Helsinkiin ja Uudellemaalle
            </div>
          </div>
        </div>
      </section>
      <section className="trust-strip" aria-label="Yritystiedot">
        <div className="container trust-items">
          <div>
            <small>YRITYS</small>
            <strong>KH-Tech Oy</strong>
          </div>
          <div>
            <small>YHTEYSHENKILÖ</small>
            <strong>Tomi Honka</strong>
          </div>
          <div>
            <small>PALVELUALUE</small>
            <strong>Helsinki / Uusimaa</strong>
          </div>
          <div>
            <small>Y-TUNNUS</small>
            <strong>{company.businessId}</strong>
          </div>
        </div>
      </section>
      <section className="section container">
        <div className="section-heading">
          <div>
            <span className="eyebrow">MITÄ VOIMME TEHDÄ PUOLESTASI?</span>
            <h2>
              LVI-työt arjen tarpeista
              <br />
              putkiston uudistamiseen.
            </h2>
          </div>
          <a className="text-link" href={url("palvelut/")}>
            Tutustu palveluihin <ArrowUpRight size={18} />
          </a>
        </div>
        <ServiceCards />
      </section>
      <section className="company-section cinematic-section">
        <SectionBackground image="company" />
        <div className="container company-grid">
          <div className="company-copy kh-glass">
            <span className="eyebrow">TEKIJÄ YRITYKSEN TAKANA</span>
            <h2>
              Tuttu tekijä.
              <br />
              Viimeistelty lopputulos.
            </h2>
            <p className="lead">
              KH-Techin yrittäjä Tomi Honka on LVI-asentaja, jolle asiakkaan
              tarpeet ja toiveet ovat työn lähtökohta.
            </p>
            <p>
              Yrityksen taustalla on yrittäjäsuvun innostus alaan. Työtä
              ohjaavat luotettavuus, viimeistelty työnjälki ja asiakkaan
              tyytyväisyys – ensimmäisestä yhteydenotosta työn valmistumiseen.
            </p>
            <a className="text-link" href={url("yritys/")}>
              Tutustu yritykseen <ArrowUpRight size={18} />
            </a>
          </div>
        </div>
      </section>
      <ContactBand />
      <section className="game-teaser cinematic-section">
        <SectionBackground image="game" />
        <div className="container game-teaser-grid">
          <div className="game-teaser-copy kh-glass">
            <span className="eyebrow">
              <Gamepad2 size={17} /> PIENI TAUKO PUTKITÖISTÄ
            </span>
            <h2>Sinusta putkimestari?</h2>
            <p>
              Sulje hanat, kerää työkalut ja ratko putkipulma. KH-Techin
              Putkimestari-pelissä pääset kokeilemaan itse.
            </p>
            <a className="button secondary" href={url("peli/")}>
              Pelaa Putkimestaria <ArrowUpRight size={18} />
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
function About() {
  return (
    <>
      <PageHero
        eyebrow="YRITYS"
        image="about"
        title="Osaamista ja asennetta. Asiakasta varten."
        copy="KH-Tech Oy tuo suomalaista LVI-osaamista koteihin ja kiinteistöihin Helsingissä ja Uudellamaalla."
      />
      <section className="section container about-grid">
        <div>
          <span className="eyebrow">TOMI HONKA · YRITTÄJÄ JA LVI-ASENTAJA</span>
          <h2>
            Jokainen projekti
            <br />
            on meille tärkeä.
          </h2>
          <p className="lead">
            Yrityksen perustana ovat yrittäjäsuvusta syntynyt innostus, alan
            osaaminen ja yhteistyökumppanit. Tomi Honka vie KH-Techin töitä
            eteenpäin asiakkaan tarpeet ja toiveet huomioiden.
          </p>
          <p>
            Luotettavuus, viimeistelty lopputulos ja asiakastyytyväisyys ovat
            yrityksen työn lähtökohtia. Palvelemme niin yksittäisissä
            LVI-huolloissa kuin vaativammissa putkiremonttitarpeissa.
          </p>
          <a className="button primary" href={url("yhteystiedot/")}>
            Ota yhteyttä Tomiin <ArrowUpRight size={18} />
          </a>
        </div>
        <aside className="company-info-card">
          <Brand />
          <h3>KH-Tech Oy</h3>
          <dl className="company-details">
            <div>
              <dt>Y-tunnus</dt>
              <dd>{company.businessId}</dd>
            </div>
            <div>
              <dt>Yhteyshenkilö</dt>
              <dd>Tomi Honka</dd>
            </div>
            <div>
              <dt>Palvelualue</dt>
              <dd>{company.area}</dd>
            </div>
            <div>
              <dt>Postiosoite</dt>
              <dd>{company.address}</dd>
            </div>
          </dl>
          <a href={"tel:" + company.tel}>
            <Phone size={17} />
            {company.phone}
          </a>
          <a href={"mailto:" + company.email}>{company.email}</a>
        </aside>
      </section>
      <section className="values-section">
        <div className="container values-grid">
          {[
            [
              "Kuuntelemme",
              "Työ suunnitellaan asiakkaan tarpeiden ja kohteen tilanteen mukaan.",
            ],
            [
              "Teemme huolellisesti",
              "Tavoitteena on toimiva talotekniikka ja viimeistelty työnjälki.",
            ],
            [
              "Sovimme yhdessä",
              "Käydään läpi työn tarve ja eteneminen ennen toteutusta.",
            ],
          ].map(([title, copy]) => (
            <article key={title}>
              <Check />
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>
      <ContactBand />
    </>
  );
}
function Privacy() {
  return (
    <>
      <PageHero
        eyebrow="TIETOSUOJA"
        image="privacy"
        title="Tiedä, mihin tietosi jäävät."
        copy="Näin KH-Tech Oy käsittelee yhteydenottajien, asiakkaiden ja verkkopalvelun käyttäjien henkilötietoja."
      />
      <React.Suspense fallback={<div className="container privacy-notice" role="status">Ladataan tietosuojaselostetta…</div>}>
        <PrivacyNotice />
      </React.Suspense>
    </>
  );
}
export default function Website({ path }: { path: string }) {
  return (
    <div className="site-page">
      <a className="skip-link" href="#main-content">
        Siirry sisältöön
      </a>
      <Header path={path} />
      <main id="main-content" tabIndex={-1}>
        {path === "/" ? (
          <Home />
        ) : path === "/palvelut" ? (
          <>
            <PageHero
              eyebrow="PALVELUT"
              image="services"
              title="Putkityöt, jotka palvelevat arkeasi."
              copy="Huollosta saneeraukseen – LVI-työt koteihin ja kiinteistöihin Helsingissä ja Uudellamaalla."
            />
            <section className="section container">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">NELJÄ TAPAA AUTTAA</span>
                  <h2>Kohteesi tarpeen mukaan.</h2>
                </div>
                <p className="section-intro">
                  Kerro tilanteesta. Sovitaan työn sisältö ja eteneminen
                  yhdessä.
                </p>
              </div>
              <ServiceCards detailed />
            </section>
            <ContactBand />
          </>
        ) : path === "/yritys" ? (
          <About />
        ) : path === "/yhteystiedot" ? (
          <>
            <PageHero
              eyebrow="YHTEYSTIEDOT"
              image="contact"
              title="Miten voimme auttaa?"
              copy="Kysy LVI-työstä tai kerro suunnitelmistasi. Saat yhteyden suoraan yrityksen yrittäjään."
            />
            <Contact />
          </>
        ) : path === "/tietosuoja" ? (
          <Privacy />
        ) : (
          <>
            <PageHero
              eyebrow="404"
              title="Sivua ei löytynyt."
              copy="Tarkista osoite tai jatka sivuston etusivulle."
            />
            <section className="section container">
              <a className="button primary" href={url()}>
                Etusivulle <ArrowRight size={18} />
              </a>
            </section>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
