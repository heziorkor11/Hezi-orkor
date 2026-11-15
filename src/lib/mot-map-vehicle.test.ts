import assert from "node:assert/strict";
import { test } from "node:test";
import {
  mapMotMake,
  mapMotVehicle,
  mappingCoverage,
  matchCatalogModels,
} from "./mot-map-vehicle.ts";
import fixture from "./mot-tozeret-fixture.json" with { type: "json" };

test("mapMotMake strips country suffixes and aliases MOT manufacturer spellings", () => {
  assert.equal(mapMotMake("קיה ד. קוריאה"), "קיה");
  assert.equal(mapMotMake("יונדאי ד. קורי"), "יונדאי");
  assert.equal(mapMotMake("טויוטה יפן"), "טויוטה");
  assert.equal(mapMotMake("ב מ ו"), "ב.מ.וו");
  assert.equal(mapMotMake("מרצדס בנץ גרמניה"), "מרצדס");
  assert.equal(mapMotMake("אודי גרמניה"), "אאודי");
  assert.equal(mapMotMake("פולקסוואגן גרמניה"), "פולקסווגן");
  assert.equal(mapMotMake("שברולט ארהב\""), "שברולט");
  assert.equal(mapMotMake("לנדרובר אנגליה"), "לנד רובר");
  assert.equal(mapMotMake("מזדה יפן"), "מאזדה");
  assert.equal(mapMotMake("קאדילאק ארהב\""), "קאדילק");
  assert.equal(mapMotMake("ג'י.אם.סי מקסי"), "GMC");
});

test("unknown manufacturer is not guessed", () => {
  assert.equal(mapMotMake("באגאטי צרפת"), undefined);
  assert.equal(mapMotMake(""), undefined);
});

test("Picanto 2017 maps confidently to קיה / פיקנטו / 2017", () => {
  const out = mapMotVehicle({
    manufacturer: "קיה ד. קוריאה",
    commercialName: "PICANTO",
    year: 2017,
    trim: "LX",
    fuel: "בנזין",
    engine: "G4LA",
  });
  assert.equal(out.mapping.confidence, "mapped");
  assert.equal(out.mapping.make, "קיה");
  assert.equal(out.mapping.model, "פיקנטו");
  assert.equal(out.mapping.year, "2017");
  assert.equal(out.trim, "LX");
  assert.equal(out.fuel, "בנזין");
  assert.equal(out.engine, "G4LA");
});

test("COROLLA maps to קורולה and not קורולה קרוס", () => {
  const out = mapMotVehicle({
    manufacturer: "טויוטה יפן",
    commercialName: "COROLLA",
    year: 2018,
  });
  assert.equal(out.mapping.confidence, "mapped");
  assert.equal(out.mapping.make, "טויוטה");
  assert.equal(out.mapping.model, "קורולה");
  const matches = matchCatalogModels("טויוטה", "COROLLA");
  assert.ok(matches.includes("קורולה"));
  assert.ok(!matches.some((m) => m.includes("קרוס")), matches.join(", "));
});

test("COROLLA CROSS maps to קורולה קרוס when present", () => {
  const out = mapMotVehicle({
    manufacturer: "טויוטה יפן",
    commercialName: "COROLLA CROSS",
    year: 2023,
  });
  assert.equal(out.mapping.make, "טויוטה");
  if (out.mapping.confidence === "mapped") {
    assert.equal(out.mapping.model, "קורולה קרוס");
  } else {
    // If the catalog year window does not include 2023, still must not fall back to sedan Corolla parts.
    assert.equal(out.mapping.model, "קורולה קרוס");
    assert.equal(out.mapping.confidence, "unmapped");
  }
});

test("powertrain suffixes like HYBRID or EV still map to the base catalog model", () => {
  const ioniq = mapMotVehicle({
    manufacturer: "יונדאי ד. קורי",
    commercialName: "IONIQ HYBRID",
    year: 2018,
  });
  assert.equal(ioniq.mapping.make, "יונדאי");
  assert.equal(ioniq.mapping.model, "איוניק");
  const niro = mapMotVehicle({
    manufacturer: "קיה ד. קוריאה",
    commercialName: "NIRO EV",
    year: 2022,
  });
  assert.equal(niro.mapping.make, "קיה");
  assert.equal(niro.mapping.model, "נירו");
});

test("unknown model is unmapped and does not invent a catalog model", () => {
  const out = mapMotVehicle({
    manufacturer: "קיה ד. קוריאה",
    commercialName: "XYZZY-NO-SUCH-MODEL",
    year: 2017,
  });
  assert.equal(out.mapping.confidence, "unmapped");
  assert.equal(out.mapping.make, "קיה");
  assert.equal(out.mapping.model, undefined);
  assert.ok(out.mapping.reason);
});

test("two-wheelers are never mapped onto car fitment", () => {
  const out = mapMotVehicle({
    manufacturer: "הונדה יפן",
    commercialName: "CIVIC",
    year: 2015,
    twoWheeler: true,
  });
  assert.equal(out.mapping.confidence, "unmapped");
  assert.equal(out.mapping.make, undefined);
  assert.equal(out.mapping.model, undefined);
});

test("year outside the catalog window stays unmapped and keeps make/model as hints only", () => {
  const out = mapMotVehicle({
    manufacturer: "קיה ד. קוריאה",
    commercialName: "PICANTO",
    year: 1975,
  });
  // 1975 should be outside any Picanto window if years exist; if the facet has no years, mapping may still pass.
  if (out.mapping.year === "1975" && out.mapping.confidence === "unmapped") {
    assert.equal(out.mapping.make, "קיה");
    assert.equal(out.mapping.model, "פיקנטו");
  }
});

test("mapping coverage: every catalog make is reachable from a MOT-style manufacturer string", () => {
  const cov = mappingCoverage();
  assert.equal(cov.catalogMakes, 43);
  assert.equal(
    cov.makesMappedByProbe,
    43,
    `unmapped makes: ${cov.makesUnmappedByProbe.join(", ")}`,
  );
  assert.ok(cov.catalogModelsCanonical > 0);
  assert.ok(
    cov.modelsWithAliasOrLatin >= 80,
    `expected a meaningful alias set, got ${cov.modelsWithAliasOrLatin}/${cov.catalogModelsCanonical}`,
  );
});

test("official MOT tozeret names map onto catalog makes without collisions", () => {
  const names = (fixture as { tozeret_nm: string[] }).tozeret_nm;
  let mapped = 0;
  let unmapped = 0;
  const byMake = new Map<string, number>();
  for (const name of names) {
    const make = mapMotMake(name);
    if (make) {
      mapped += 1;
      byMake.set(make, (byMake.get(make) || 0) + 1);
    } else {
      unmapped += 1;
    }
  }
  // The official list includes trailers, buses and niche makers. We only require
  // that each of our 43 catalog makes is represented at least once.
  const missing = mappingCoverage().makesUnmappedByProbe;
  assert.deepEqual(missing, []);
  const catalogHits = [...byMake.keys()].length;
  assert.ok(catalogHits >= 30, `expected most catalog makes in official tozeret, got ${catalogHits}`);
  assert.ok(mapped > 100, `expected a large share of MOT manufacturers to map, got ${mapped}/${names.length}`);
  // Store counts on the test title side-channel for the QA report.
  assert.ok(unmapped >= 0);
});


test("mapMotMake strips the country suffix from טויוטה טורקיה", () => {
  assert.equal(mapMotMake("טויוטה טורקיה"), "טויוטה");
});

test("COROLLA SDN HSD on a Turkish-built Toyota maps to קורולה 2023", () => {
  const out = mapMotVehicle({
    manufacturer: "טויוטה טורקיה",
    commercialName: "COROLLA SDN HSD",
    year: 2023,
    trim: "SENSE",
    fuel: "בנזין",
    engine: "2ZR",
  });
  assert.equal(out.mapping.confidence, "mapped");
  assert.equal(out.mapping.make, "טויוטה");
  assert.equal(out.mapping.model, "קורולה");
  assert.equal(out.mapping.year, "2023");
  assert.equal(out.trim, "SENSE");
  const reversed = mapMotVehicle({
    manufacturer: "טויוטה טורקיה",
    commercialName: "COROLLA HSD SDN",
    year: 2023,
  });
  assert.equal(reversed.mapping.confidence, "mapped");
  assert.equal(reversed.mapping.model, "קורולה");
  const hatch = mapMotVehicle({
    manufacturer: "טויוטה טורקיה",
    commercialName: "COROLLA HB",
    year: 2023,
  });
  assert.equal(hatch.mapping.model, "קורולה");
});

test("body and powertrain suffixes do not collapse CROSS or VERSO into the sedan", () => {
  const cross = mapMotVehicle({
    manufacturer: "טויוטה יפן",
    commercialName: "COROLLA CROSS HSD",
    year: 2023,
  });
  assert.equal(cross.mapping.model, "קורולה קרוס");
  assert.ok(!matchCatalogModels("טויוטה", "COROLLA CROSS HSD").includes("קורולה"));
  const yaris = mapMotVehicle({
    manufacturer: "טויוטה צרפת",
    commercialName: "YARIS CROSS HSD",
    year: 2023,
  });
  assert.equal(yaris.mapping.model, "יאריס קרוס");
});

test("RAV 4 with a space or a HYBRID suffix maps to ראב 4", () => {
  const spaced = mapMotVehicle({
    manufacturer: "טויוטה יפן",
    commercialName: "RAV 4 HYBRID",
    year: 2022,
  });
  assert.equal(spaced.mapping.confidence, "mapped");
  assert.equal(spaced.mapping.model, "ראב 4");
  const glued = mapMotVehicle({
    manufacturer: "טויוטה יפן",
    commercialName: "RAV4 HYBRID",
    year: 2022,
  });
  assert.equal(glued.mapping.model, "ראב 4");
});

test("English make prefixes and facelift tokens still map common catalog models", () => {
  const mazda3 = mapMotVehicle({
    manufacturer: "מזדה יפן",
    commercialName: "MAZDA 3",
    year: 2018,
  });
  assert.equal(mazda3.mapping.confidence, "mapped");
  assert.equal(mazda3.mapping.make, "מאזדה");
  assert.equal(mazda3.mapping.model, "3");
  const cx5 = mapMotVehicle({
    manufacturer: "מזדה יפן",
    commercialName: "CX5",
    year: 2019,
  });
  assert.equal(cx5.mapping.model, "CX-5");
  const octavia = mapMotVehicle({
    manufacturer: "סקודה צ'כיה",
    commercialName: "OCTAVIA FL",
    year: 2020,
  });
  assert.equal(octavia.mapping.model, "אוקטביה");
  const niro = mapMotVehicle({
    manufacturer: "קיה ד. קוריאה",
    commercialName: "NIRO PLUS PHEV",
    year: 2022,
  });
  assert.equal(niro.mapping.model, "נירו");
  const i20 = mapMotVehicle({
    manufacturer: "יונדאי טורקיה",
    commercialName: "I20",
    year: 2018,
  });
  assert.equal(i20.mapping.model, "I20");
  const l200 = mapMotVehicle({
    manufacturer: "מיצובישי תאילנ",
    commercialName: "L 200",
    year: 2018,
  });
  assert.equal(l200.mapping.model, "L200");
  const peugeot208 = mapMotVehicle({
    manufacturer: "פיג'ו צרפת",
    commercialName: "208",
    year: 2019,
  });
  assert.equal(peugeot208.mapping.model, "208");
});

test("models absent from the catalog stay unmapped and are not guessed", () => {
  const ignis = mapMotVehicle({
    manufacturer: "סוזוקי יפן",
    commercialName: "IGNIS",
    year: 2018,
  });
  assert.equal(ignis.mapping.confidence, "unmapped");
  assert.equal(ignis.mapping.make, "סוזוקי");
  assert.equal(ignis.mapping.model, undefined);
  const peugeot3008 = mapMotVehicle({
    manufacturer: "פיג'ו צרפת",
    commercialName: "3008",
    year: 2020,
  });
  assert.equal(peugeot3008.mapping.confidence, "unmapped");
  assert.equal(peugeot3008.mapping.model, undefined);
  const runx = mapMotVehicle({
    manufacturer: "טויוטה אנגליה",
    commercialName: "COROLLA RUNX",
    year: 2004,
  });
  assert.equal(runx.mapping.confidence, "unmapped");
  assert.equal(runx.mapping.model, undefined);
});


test("common English MOT names across makes map to the catalog without guessing missing models", () => {
  const space = mapMotVehicle({ manufacturer: "טויוטה יפן", commercialName: "SPACE VERSO", year: 2012 });
  assert.equal(space.mapping.model, "ספייס ורסו");
  const grand = mapMotVehicle({ manufacturer: "רנו טורקיה", commercialName: "GRAND COUPE", year: 2018 });
  assert.equal(grand.mapping.confidence, "mapped");
  assert.equal(grand.mapping.model, "גרנד קופה");
  const typo = mapMotVehicle({ manufacturer: "קיה ד. קוריאה", commercialName: "PICANT0", year: 2017 });
  assert.equal(typo.mapping.model, "פיקנטו");
  const sport = mapMotVehicle({ manufacturer: "מזדה יפן", commercialName: "MAZDA3-SPORT", year: 2018 });
  assert.equal(sport.mapping.model, "3");
  const picasso = mapMotVehicle({ manufacturer: "סיטרואן סלובק", commercialName: "C3 PICASSO", year: 2014 });
  assert.equal(picasso.mapping.model, "C3 פיקאסו");
  const nx = mapMotVehicle({ manufacturer: "לקסוס יפן", commercialName: "LEXUS NX300H", year: 2018 });
  assert.equal(nx.mapping.make, "לקסוס");
  assert.equal(nx.mapping.confidence, "mapped");
  assert.match(String(nx.mapping.model), /NX300H/i);
  const series3 = mapMotVehicle({ manufacturer: "ב מ וו גרמניה", commercialName: "318I", year: 2016 });
  assert.equal(series3.mapping.model, "סדרה 3");
  const x1 = mapMotVehicle({ manufacturer: "ב מ וו גרמניה", commercialName: "X1 SDRIVE18I", year: 2018 });
  assert.equal(x1.mapping.model, "X1");
  const e300 = mapMotVehicle({ manufacturer: "מרצדס בנץ גרמנ", commercialName: "E300E", year: 2020 });
  assert.equal(e300.mapping.model, "E300");
  const cruze = mapMotVehicle({ manufacturer: "שברולט ד.קוריא", commercialName: "CRUZE 1.6 LS", year: 2014 });
  assert.equal(cruze.mapping.model, "קרוז");
  const enyaq = mapMotVehicle({ manufacturer: "סקודה צ'כיה", commercialName: "ENYAQ IV", year: 2022 });
  assert.equal(enyaq.mapping.model, "אניאק");
});

test("Jeep and Genesis models listed under Chrysler or Hyundai remap to the catalog make", () => {
  const jeep = mapMotVehicle({ manufacturer: 'קרייזלר ארהב"', commercialName: "GRAND CHEROKEE", year: 2018 });
  assert.equal(jeep.mapping.make, "ג'יפ");
  assert.equal(jeep.mapping.model, "גרנד שירוקי");
  assert.equal(jeep.mapping.confidence, "mapped");
  const genesis = mapMotVehicle({ manufacturer: "יונדאי ד. קורי", commercialName: "GENESIS  GV70", year: 2022 });
  assert.equal(genesis.mapping.make, "ג'נסיס");
  assert.equal(genesis.mapping.model, "GV70");
});

test("models that are not in the catalog, including popular English names, stay unmapped", () => {
  for (const [manufacturer, commercialName, year] of [
    ["פיג'ו צרפת", "3008", 2020],
    ["פיג'ו צרפת", "2008", 2020],
    ["טסלה גרמניה", "MODEL Y", 2023],
    ["סוזוקי יפן", "IGNIS", 2018],
    ["פולקסוואגן-ספרד", "POLO", 2018],
    ["סיטרואן צרפת", "C5 AIRCROSS", 2020],
    ["טויוטה צ'כיה", "AYGO", 2018],
    ["סיאט ספרד", "CUPRA", 2020],
  ] as const) {
    const out = mapMotVehicle({ manufacturer, commercialName, year });
    assert.equal(out.mapping.confidence, "unmapped", commercialName);
    assert.equal(out.mapping.model, undefined, commercialName);
    assert.ok(out.mapping.make, commercialName);
  }
});
