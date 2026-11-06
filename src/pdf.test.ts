import { describe, it, expect } from "vitest";
import { buildPdf } from "./pdf";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
describe("report PDF", () => {
  it("creates a searchable Finnish report with its report ID", () => {
    const doc = buildPdf({
      id: "KHT-20261105-ABCDEF",
      form: {
        customer: "Testiasiakas",
        address: "Esimerkkikatu 1",
        worker: "Asentaja",
        date: "2026-11-05",
        description: "Ääkköset: yö, ääni",
        tasks: "Liitos kiristetty",
        materials: [{ name: "Tiiviste", quantity: "1", unit: "kpl" }],
      },
      photos: [],
    });
    const bytes = doc.output("arraybuffer");
    expect(bytes.byteLength).toBeGreaterThan(1000);
    expect(doc.getNumberOfPages()).toBe(1);
    expect(doc.output()).toContain("KHT-20261105-ABCDEF");
    expect(doc.output()).toContain("Ääkköset");
  });
  it("splits long reports across A4 pages", () => {
    const doc = buildPdf({
      id: "KHT-20261105-ABCDEF",
      form: {
        customer: "Test",
        address: "Esimerkkikatu 1",
        worker: "Asentaja",
        description: "Työ ".repeat(5000),
      },
      photos: [],
    });
    expect(doc.getNumberOfPages()).toBeGreaterThan(1);
  });
});

it("exports a long, six-photo report with Finnish text and all materials for independent rendering checks", () => {
  const photos = Array.from({ length: 6 }, (_, index) => ({
    data:
      "data:image/jpeg;base64," +
      readFileSync(
        "e2e/fixtures/" + (index % 2 ? "after" : "before") + ".jpg",
      ).toString("base64"),
    category: index % 2 ? "after" : "before",
  }));
  const doc = buildPdf({
    id: "KHT-20261107-ABCDEF",
    form: {
      customer: "Testiasiakas – Ääkköset Oy",
      address: "Testikatu 1, ei asiakaskohde",
      city: "Lohja",
      worker: "Testaaja",
      date: "2026-11-07",
      start: "08:00",
      end: "10:30",
      hours: "2,5",
      description:
        "Ääkköset: yö, ääni, öljy. Liitos tarkistettu ja putkiston toiminta todettu.\n".repeat(
          150,
        ) + "KUVAUKSEN LOPPU",
      tasks: "Liitos avattu. Tiiviste vaihdettu. Toiminta tarkistettu.",
      materials: Array.from({ length: 55 }, (_, index) => ({
        name:
          "Tarvike " +
          (index + 1) +
          " / " +
          (index === 20 ? "pitkä materiaalin nimi ".repeat(20) : "Tiiviste"),
        quantity: "2,5",
        unit: "kpl",
      })),
      followup: "JATKOTOIMIEN LOPPU: uusi tarkastus sovitaan tarvittaessa.",
      notes: "Testiraportti, ei asiakastietoja.",
    },
    photos,
  });
  expect(doc.getNumberOfPages()).toBeGreaterThan(10);
  expect(doc.output()).toContain("KUVAUKSEN LOPPU");
  expect(doc.output()).toContain("JATKOTOIMIEN LOPPU");
  expect(doc.output()).toContain("Tarvike 55");
  mkdirSync("docs/website2-checks", { recursive: true });
  writeFileSync(
    "docs/website2-checks/long-six-photo-report.pdf",
    Buffer.from(doc.output("arraybuffer")),
  );
});
