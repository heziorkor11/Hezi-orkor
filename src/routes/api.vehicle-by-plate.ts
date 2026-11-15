import { createFileRoute } from "@tanstack/react-router";
import { normalizeIlPlate } from "@/lib/order-quote";
import { clientIpFromRequest, consumeRateLimit } from "@/lib/mot-ckan";
import { invalidPlateResult, lookupVehicleByPlate } from "@/lib/mot-plate-lookup";

async function plateFromRequest(request: Request) {
  const url = new URL(request.url);
  const fromQuery = url.searchParams.get("plate") || url.searchParams.get("p") || "";
  if (fromQuery) return fromQuery;
  const ctype = request.headers.get("content-type") || "";
  if (ctype.includes("application/json")) {
    try {
      const body = (await request.json()) as { plate?: unknown };
      return String(body?.plate || "");
    } catch {
      return "";
    }
  }
  if (ctype.includes("application/x-www-form-urlencoded") || ctype.includes("multipart/form-data")) {
    try {
      const form = await request.formData();
      return String(form.get("plate") || "");
    } catch {
      return "";
    }
  }
  return "";
}

function json(data: unknown, init: { status?: number; retryAfterMs?: number } = {}) {
  const headers = new Headers({
    "content-type": "application/json; charset=utf-8",
    "cache-control": "private, max-age=60",
  });
  if (init.retryAfterMs && init.retryAfterMs > 0) {
    headers.set("retry-after", String(Math.ceil(init.retryAfterMs / 1000)));
  }
  return new Response(JSON.stringify(data), { status: init.status ?? 200, headers });
}

const handle = async ({ request }: { request: Request }) => {
  const raw = await plateFromRequest(request);
  const plate = normalizeIlPlate(raw);
  if (!plate) {
    return json({ ...invalidPlateResult(), ok: false }, { status: 400 });
  }

  const ip = clientIpFromRequest(request);
  const gate = consumeRateLimit(ip);
  if (!gate.ok) {
    return json(
      {
        ok: false,
        error: "rate_limited",
        message: "השירות עמוס כרגע, נסו שוב בעוד רגע.",
        retryAfterMs: gate.retryAfterMs,
      },
      { status: 429, retryAfterMs: gate.retryAfterMs },
    );
  }

  const result = await lookupVehicleByPlate(plate);
  if (!result.ok) {
    const status =
      result.error === "invalid" ? 400 : result.error === "rate_limited" ? 429 : result.error === "timeout" ? 504 : 503;
    return json(result, { status, retryAfterMs: result.retryAfterMs });
  }
  return json(result, { status: 200 });
};

export const Route = createFileRoute("/api/vehicle-by-plate")({
  server: { handlers: { GET: handle, POST: handle } },
});
