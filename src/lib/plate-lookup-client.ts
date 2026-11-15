import { isValidIlPlate, normalizeIlPlate } from "./order-quote";
import type { PlateLookupResult } from "./mot-plate-lookup";
import { useOrderForm, writeSavedVehicle } from "./order-form";
import { isMappedPlateResult, writePlateSession } from "./plate-session";
import type { ListingSearch } from "./catalog-types";

export async function fetchVehicleByPlate(raw: string): Promise<PlateLookupResult> {
  const plate = normalizeIlPlate(raw);
  if (!isValidIlPlate(plate)) {
    return { ok: false, error: "invalid", message: "יש להזין מספר רכב ישראלי בן 7 או 8 ספרות." };
  }
  const res = await fetch("/api/vehicle-by-plate", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ plate }),
  });
  try {
    return (await res.json()) as PlateLookupResult;
  } catch {
    return {
      ok: false,
      error: "upstream",
      message: "לא הצלחנו לשאול את מאגר משרד הרישוי. נסו שוב או בחרו רכב ידנית.",
    };
  }
}

export async function applyPlateLookup(opts: {
  plate: string;
  result: PlateLookupResult;
  path: string;
  search?: ListingSearch;
  navigate: (opts: { to: "/results"; search: ListingSearch }) => unknown | Promise<unknown>;
}) {
  const plate = normalizeIlPlate(opts.plate);
  const data = opts.result;
  if (!data.ok && data.error === "invalid") return data;
  writePlateSession({ plate, result: data, at: Date.now() });
  if (isMappedPlateResult(data) && data.ok && data.found) {
    const mapping = data.vehicle.mapping;
    writeSavedVehicle({
      plate,
      make: mapping.make,
      model: mapping.model,
      year: mapping.year || "",
    });
    useOrderForm.getState().setMany({
      plate,
      make: mapping.make,
      model: mapping.model,
      year: mapping.year || "",
    });
    const current = opts.path === "/results" ? opts.search || {} : {};
    await opts.navigate({
      to: "/results",
      search: {
        ...current,
        q: undefined,
        page: undefined,
        make: mapping.make,
        model: mapping.model,
        year: mapping.year,
      },
    });
    return data;
  }
  // Unmapped / not found / error: go to results without a vehicle filter so we
  // never list unrelated parts. The results page hides the catalog grid while
  // a non-mapped plate session is active. Still persist the typed plate so it
  // can be included in a WhatsApp quote or the cart.
  writeSavedVehicle({ plate });
  useOrderForm.getState().setMany({ plate });
  const current = opts.path === "/results" ? opts.search || {} : {};
  await opts.navigate({
    to: "/results",
    search: {
      type: current.type,
      q: undefined,
      category: current.category,
      sub: current.sub,
      page: undefined,
    },
  });
  return data;
}
