const TZ = "Asia/Jerusalem";
const OPEN_DAYS = new Set([0, 1, 2, 3, 4]); // Sun–Thu
const OPEN_MIN = 8 * 60;
const CLOSE_MIN = 17 * 60;

function israelParts(at = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  const dayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return { day: dayMap[weekday] ?? 0, minutes: hour * 60 + minute };
}

export type ShopStatus = {
  open: boolean;
  label: string;
  next: string;
};

export function shopStatus(at = new Date()): ShopStatus {
  const { day, minutes } = israelParts(at);
  if (OPEN_DAYS.has(day) && minutes >= OPEN_MIN && minutes < CLOSE_MIN) {
    return { open: true, label: "פתוח עכשיו", next: "נסגר ב־17:00" };
  }
  if (OPEN_DAYS.has(day) && minutes < OPEN_MIN) {
    return { open: false, label: "סגור עכשיו", next: "נפתח היום ב־08:00" };
  }
  if (day === 4 && minutes >= CLOSE_MIN) {
    return { open: false, label: "סגור עכשיו", next: "נפתח ביום א׳ 08:00" };
  }
  if (day === 5 || day === 6) {
    return { open: false, label: "סגור בסופ״ש", next: "נפתח ביום א׳ 08:00" };
  }
  return { open: false, label: "סגור עכשיו", next: "נפתח מחר ב־08:00" };
}
