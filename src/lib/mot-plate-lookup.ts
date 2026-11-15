/** Orchestrate plate validation, CKAN lookup, and conservative catalog mapping. */
import { isValidIlPlate, normalizeIlPlate } from "./order-quote.ts";
import { lookupPlateRecord, type CkanDeps, type MotRecordHit } from "./mot-ckan.ts";
import {
  mapMotVehicle,
  yearNumber,
  type MotDisplayVehicle,
  type MotVehicleFields,
} from "./mot-map-vehicle.ts";

export type PlateLookupOk = {
  ok: true;
  found: true;
  source: MotRecordHit["resource"]["id"];
  sourceLabel: string;
  vehicle: MotDisplayVehicle;
};

export type PlateLookupEmpty = {
  ok: true;
  found: false;
  message: string;
};

export type PlateLookupFail = {
  ok: false;
  error: "invalid" | "rate_limited" | "upstream" | "timeout";
  message: string;
  retryAfterMs?: number;
};

export type PlateLookupResult = PlateLookupOk | PlateLookupEmpty | PlateLookupFail;

function field(hit: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = hit[key];
    if (value == null) continue;
    const s = String(value).replace(/\s+/g, " ").trim();
    if (s) return s;
  }
  return "";
}

function toVehicleFields(hit: MotRecordHit): MotVehicleFields {
  const rec = hit.fields;
  const manufacturer = field(rec, "tozeret_nm", "tozar");
  const commercialName = field(rec, "kinuy_mishari", "degem_nm");
  const year = yearNumber(rec.shnat_yitzur);
  const trim = field(rec, "ramat_gimur") || undefined;
  const fuel = field(rec, "sug_delek_nm") || undefined;
  const engine = field(rec, "degem_manoa") || undefined;
  const displacement = yearNumber(rec.nefah_manoa); // reuse? no, displacement can be 998 etc
  const nefahRaw = rec.nefah_manoa;
  const nefah = typeof nefahRaw === "number" ? nefahRaw : Number(String(nefahRaw ?? "").replace(/\D/g, ""));
  return {
    manufacturer,
    commercialName,
    year,
    trim,
    fuel,
    engine,
    displacement: Number.isFinite(nefah) && nefah >= 50 && nefah <= 9000 ? Math.trunc(nefah) : undefined,
    vehicleType: field(rec, "sug_rechev_nm") || undefined,
    twoWheeler: Boolean(hit.resource.twoWheeler),
  };
}

export function invalidPlateResult(): PlateLookupFail {
  return {
    ok: false,
    error: "invalid",
    message: "יש להזין מספר רכב ישראלי בן 7 או 8 ספרות.",
  };
}

export async function lookupVehicleByPlate(rawPlate: string, deps: CkanDeps = {}): Promise<PlateLookupResult> {
  const plate = normalizeIlPlate(rawPlate);
  if (!isValidIlPlate(plate)) return invalidPlateResult();

  try {
    const hit = await lookupPlateRecord(plate, deps);
    if (!hit) {
      return {
        ok: true,
        found: false,
        message: "הרכב לא נמצא במאגרי משרד הרישוי הפתוחים. אפשר לבחור יצרן ודגם ידנית.",
      };
    }
    const fields = toVehicleFields(hit);
    const vehicle = mapMotVehicle(fields);
    return {
      ok: true,
      found: true,
      source: hit.resource.id,
      sourceLabel: hit.resource.labelHe,
      vehicle,
    };
  } catch (err) {
    const code = err && typeof err === "object" && "code" in err ? String((err as { code: string }).code) : "upstream";
    if (code === "rate_limited") {
      const retryAfterMs =
        err && typeof err === "object" && "retryAfterMs" in err
          ? Number((err as { retryAfterMs?: number }).retryAfterMs)
          : 15_000;
      return {
        ok: false,
        error: "rate_limited",
        message: "השירות עמוס כרגע, נסו שוב בעוד רגע.",
        retryAfterMs: Number.isFinite(retryAfterMs) ? retryAfterMs : 15_000,
      };
    }
    if (code === "timeout") {
      return {
        ok: false,
        error: "timeout",
        message: "מאגר משרד הרישוי לא הגיב בזמן. נסו שוב או בחרו רכב ידנית.",
      };
    }
    return {
      ok: false,
      error: "upstream",
      message: "לא הצלחנו לשאול את מאגר משרד הרישוי. נסו שוב או בחרו רכב ידנית.",
    };
  }
}
