export const base = import.meta.env.BASE_URL;
export const url = (path = "") => base + path.replace(/^\//, "");
export const company = {
  name: "KH-Tech Oy",
  businessId: "3413645-9",
  person: "Tomi Honka",
  phone: "040 073 6199",
  tel: "+358400736199",
  email: "tomi.honka@kh-tech.fi",
  area: "Helsinki ja Uusimaa",
  address: "Laiturikatu 14 C 49, 08100 Lohja",
};
export function Brand({
  className = "",
  label = "KH-Tech Talotekniikka",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <img
      className={"brand-logo " + className}
      src={url("brand/kh-tech-logo.png")}
      width="1340"
      height="424"
      alt={label}
    />
  );
}
export const services = [
  {
    id: "huolto",
    number: "01",
    title: "LVI-huolto",
    short: "Pidetään arki toimivana.",
    description:
      "Vuotava hana, toimimaton vesikaluste tai huoltoa tarvitseva putkisto? Selvitämme tilanteen ja sovimme tarvittavasta huollosta tai korjauksesta.",
    detail:
      "Kerro, mikä laite tai putkiston osa tarvitsee huomiota ja miten vika ilmenee. Kuvasta voi olla apua työn suunnittelussa.",
  },
  {
    id: "muutostyot",
    number: "02",
    title: "Putkimuutostyöt",
    short: "Putkisto tilan tarpeisiin.",
    description:
      "Kun kodin tai kiinteistön tilat muuttuvat, myös putkisto voi tarvita muutoksia. Toteutamme putkimuutoksia osana remonttia tai erillisenä työnä.",
    detail:
      "Kerro suunnitellusta remontista, kohteen sijainnista ja toivotusta aikataulusta. Käydään yhdessä läpi tarvittavat putkityöt.",
  },
  {
    id: "tasapainotus",
    number: "03",
    title: "Verkostojen tasapainotus",
    short: "Tasaisemmin toimiva verkosto.",
    description:
      "Lämmitys- ja käyttövesiverkostojen tasapainotuksessa säädetään verkoston toimintaa suunniteltujen virtaamien mukaiseksi.",
    detail:
      "Jos lämmön jakautuminen tai verkoston toiminta mietityttää, kerro havainnoistasi. Selvitetään kohteen tasapainotustarve.",
  },
  {
    id: "saneeraus",
    number: "04",
    title: "Käyttövesi- ja viemärisaneeraukset",
    short: "Uutta elämää putkistolle.",
    description:
      "Putkiston uusiminen on osa kiinteistön kunnossapitoa. Teemme käyttövesi- ja viemärisaneerauksiin liittyviä LVI-töitä kohteen tarpeen mukaan.",
    detail:
      "Kerro kiinteistöstä ja suunnitellun saneerauksen laajuudesta. Sovitaan, miten työ etenee ja mitä sen suunnittelussa huomioidaan.",
  },
];
