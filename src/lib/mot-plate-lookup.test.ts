import assert from "node:assert/strict";
import { test } from "node:test";
import { lookupVehicleByPlate } from "./mot-plate-lookup.ts";
import { clearMotCkanCache } from "./mot-ckan.ts";
import { isValidIlPlate, normalizeIlPlate, formatIlPlate } from "./order-quote.ts";
import { MOT_RESOURCES } from "./mot-resources.ts";

test("plate input must be 7 or 8 digits", () => {
  assert.equal(isValidIlPlate("12-345-67"), true);
  assert.equal(isValidIlPlate("123-45-678"), true);
  assert.equal(isValidIlPlate("123456"), false);
  assert.equal(isValidIlPlate("123456789"), false);
  assert.equal(isValidIlPlate("abc"), false);
  assert.equal(normalizeIlPlate("12-345-67"), "1234567");
  assert.equal(formatIlPlate("12345678"), "123-45-678");
});

test("invalid plates never call the datastore", async () => {
  let called = 0;
  const fetchMock: typeof fetch = async () => {
    called += 1;
    throw new Error("should not fetch");
  };
  const r = await lookupVehicleByPlate("12345", { fetch: fetchMock });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.error, "invalid");
  assert.equal(called, 0);
});

test("a confident registry hit is mapped and does not expose a plate in the payload", async () => {
  clearMotCkanCache();
  const fetchMock: typeof fetch = async () =>
    ({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({
        success: true,
        result: {
          records: [
            {
              mispar_rechev: 1234567,
              misgeret: "SECRET-VIN",
              tozeret_nm: "קיה ד. קוריאה",
              kinuy_mishari: "PICANTO",
              shnat_yitzur: 2017,
              ramat_gimur: "LX",
              degem_manoa: "G4LA",
              sug_delek_nm: "בנזין",
            },
          ],
        },
      }),
    }) as Response;
  const r = await lookupVehicleByPlate("12-345-67", { fetch: fetchMock });
  assert.equal(r.ok, true);
  if (!(r.ok && r.found)) throw new Error("expected hit");
  assert.equal(r.source, "private");
  assert.equal(r.vehicle.mapping.confidence, "mapped");
  assert.equal(r.vehicle.mapping.make, "קיה");
  assert.equal(r.vehicle.mapping.model, "פיקנטו");
  assert.equal(r.vehicle.mapping.year, "2017");
  const dumped = JSON.stringify(r);
  assert.equal(dumped.includes("1234567"), false);
  assert.equal(dumped.includes("SECRET-VIN"), false);
  clearMotCkanCache();
});

test("unmapped commercial names still return MOT details without a parts filter", async () => {
  clearMotCkanCache();
  const fetchMock: typeof fetch = async () =>
    ({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({
        success: true,
        result: {
          records: [
            {
              tozeret_nm: "קיה ד. קוריאה",
              kinuy_mishari: "NO-SUCH-MODEL",
              shnat_yitzur: 2020,
              ramat_gimur: "EX",
              sug_delek_nm: "בנזין",
            },
          ],
        },
      }),
    }) as Response;
  const r = await lookupVehicleByPlate("12345678", { fetch: fetchMock });
  assert.equal(r.ok && r.found, true);
  if (!(r.ok && r.found)) throw new Error("expected hit");
  assert.equal(r.vehicle.mapping.confidence, "unmapped");
  assert.equal(r.vehicle.mapping.model, undefined);
  assert.equal(r.vehicle.commercialName, "NO-SUCH-MODEL");
  assert.equal(r.vehicle.trim, "EX");
  clearMotCkanCache();
});

test("upstream rate limits become a Hebrew error without a vehicle filter", async () => {
  clearMotCkanCache();
  const fetchMock: typeof fetch = async () =>
    ({
      ok: false,
      status: 429,
      headers: new Headers({ "retry-after": "3" }),
      json: async () => ({}),
    }) as Response;
  const r = await lookupVehicleByPlate("1234567", { fetch: fetchMock });
  assert.equal(r.ok, false);
  if (r.ok) throw new Error("expected fail");
  assert.equal(r.error, "rate_limited");
  assert.ok(r.message.includes("עמוס"));
  clearMotCkanCache();
});

test("resource config starts with the official private vehicles registry", () => {
  assert.equal(MOT_RESOURCES[0].id, "private");
  assert.equal(MOT_RESOURCES[0].resourceId, "053cea08-09bc-40ec-8f7a-156f0677aff3");
  assert.ok(MOT_RESOURCES.some((r) => r.twoWheeler));
});
