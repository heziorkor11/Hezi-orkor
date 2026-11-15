import assert from "node:assert/strict";
import { test } from "node:test";
import { clearSavedVehicle, readIdentifiedVehicle, readSavedVehicle, writeSavedVehicle } from "./order-form.ts";
import { writePlateSession, clearPlateSession } from "./plate-session.ts";

class MemoryStorage {
  private data = new Map<string, string>();
  get length() {
    return this.data.size;
  }
  clear() {
    this.data.clear();
  }
  getItem(key: string) {
    return this.data.has(key) ? this.data.get(key)! : null;
  }
  key(i: number) {
    return [...this.data.keys()][i] ?? null;
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
  setItem(key: string, value: string) {
    this.data.set(key, String(value));
  }
}

function installStorage() {
  const local = new MemoryStorage();
  const session = new MemoryStorage();
  (globalThis as { window?: unknown; localStorage?: Storage; sessionStorage?: Storage }).window = globalThis;
  (globalThis as { localStorage?: Storage }).localStorage = local as unknown as Storage;
  (globalThis as { sessionStorage?: Storage }).sessionStorage = session as unknown as Storage;
  return { local, session };
}

test("saved vehicle keeps the plate across writes of the same make/model/year", () => {
  installStorage();
  writeSavedVehicle({ plate: "45773203", make: "טויוטה", model: "קורולה", year: "2023" });
  writeSavedVehicle({ make: "טויוטה", model: "קורולה", year: "2023" });
  assert.deepEqual(readSavedVehicle(), {
    make: "טויוטה",
    model: "קורולה",
    year: "2023",
    plate: "45773203",
  });
});

test("changing the identified vehicle without a plate drops the previous plate", () => {
  installStorage();
  writeSavedVehicle({ plate: "45773203", make: "טויוטה", model: "קורולה", year: "2023" });
  writeSavedVehicle({ make: "מאזדה", model: "3", year: "2018" });
  assert.deepEqual(readSavedVehicle(), { make: "מאזדה", model: "3", year: "2018", plate: undefined });
});

test("a plate-only write keeps a previously saved make/model/year", () => {
  installStorage();
  writeSavedVehicle({ make: "טויוטה", model: "קורולה", year: "2023" });
  writeSavedVehicle({ plate: "457-73-203" });
  assert.equal(readSavedVehicle().plate, "45773203");
  assert.equal(readSavedVehicle().make, "טויוטה");
});

test("readIdentifiedVehicle falls back to an active plate session", () => {
  installStorage();
  writePlateSession({
    plate: "45773203",
    at: Date.now(),
    result: {
      ok: true,
      found: true,
      plate: "45773203",
      vehicle: {
        manufacturer: "טויוטה טורקיה",
        commercialName: "COROLLA",
        year: "2023",
        mapping: { make: "טויוטה", model: "קורולה", year: "2023", confidence: "mapped", reason: "test" },
      },
    } as never,
  });
  assert.deepEqual(readIdentifiedVehicle(), {
    plate: "45773203",
    make: "טויוטה",
    model: "קורולה",
    year: "2023",
  });
  clearPlateSession();
  clearSavedVehicle();
  assert.deepEqual(readIdentifiedVehicle(), { plate: undefined, make: undefined, model: undefined, year: undefined });
});
