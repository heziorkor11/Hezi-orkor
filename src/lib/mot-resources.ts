/** Official data.gov.il CKAN resource IDs for Israeli MOT vehicle registries.
 *  IDs can rotate; keep them here only. No API key is required.
 */
export const CKAN_DATASTORE_URL = "https://data.gov.il/api/3/action/datastore_search";

export type MotRegistryId =
  | "private"
  | "import"
  | "public"
  | "heavy"
  | "motorcycle"
  | "inactive"
  | "inactive-no-degem"
  | "cancelled";

export type MotResource = {
  id: MotRegistryId;
  resourceId: string;
  labelHe: string;
  /** Two-wheelers are identified so we never map them onto car fitment. */
  twoWheeler?: boolean;
};

/** Lookup order: active private/commercial first, then other useful registries. */
export const MOT_RESOURCES: MotResource[] = [
  {
    id: "private",
    resourceId: "053cea08-09bc-40ec-8f7a-156f0677aff3",
    labelHe: "רכב פרטי ומסחרי פעיל",
  },
  {
    id: "import",
    resourceId: "03adc637-b6fe-402b-9937-7c3d3afc9140",
    labelHe: "רכב ביבוא אישי",
  },
  {
    id: "public",
    resourceId: "cf29862d-ca25-4691-84f6-1be60dcb4a1e",
    labelHe: "רכב ציבורי פעיל",
  },
  {
    id: "heavy",
    resourceId: "cd3acc5c-03c3-4c89-9c54-d40f93c0d790",
    labelHe: "רכב כבד",
  },
  {
    id: "motorcycle",
    resourceId: "bf9df4e2-d90d-4c0a-a400-19e15af8e95f",
    labelHe: "רכב דו-גלגלי",
    twoWheeler: true,
  },
  {
    id: "inactive",
    resourceId: "f6efe89a-fb3d-43a4-bb61-9bf12a9b9099",
    labelHe: "רכב לא פעיל",
  },
  {
    id: "inactive-no-degem",
    resourceId: "6f6acd03-f351-4a8f-8ecf-df792f4f573a",
    labelHe: "רכב לא פעיל",
  },
  {
    id: "cancelled",
    resourceId: "851ecab1-0622-4dbe-a6c7-f950cf82abf9",
    labelHe: "רכב בביטול סופי",
  },
];

/** Identity fields only. Never request chassis, color, or ownership columns. */
export const MOT_SAFE_FIELDS = [
  "tozeret_nm",
  "tozar",
  "kinuy_mishari",
  "shnat_yitzur",
  "ramat_gimur",
  "degem_manoa",
  "sug_delek_nm",
  "degem_nm",
  "nefah_manoa",
  "sug_rechev_nm",
  "tozar_manoa",
] as const;

const SENSITIVE_FIELD =
  /^(mispar_rechev|misgeret|mispar_shilda|shilda|baalut|tzeva_cd|tzeva_rechev|mispar_manoa|_full_text)$/i;

export function isSensitiveMotField(name: string) {
  return SENSITIVE_FIELD.test(String(name || "").trim());
}

export function pickSafeMotRecord(raw: Record<string, unknown> | null | undefined) {
  const out: Record<string, unknown> = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [key, value] of Object.entries(raw)) {
    if (isSensitiveMotField(key)) continue;
    if (key === "_id") continue;
    out[key] = value;
  }
  return out;
}
