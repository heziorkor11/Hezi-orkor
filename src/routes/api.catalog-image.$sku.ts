import { createFileRoute } from "@tanstack/react-router";

const handle = async ({ request }: { request: Request }) => {
  const { adminApi } = await import("@/lib/admin/api.server");
  return adminApi(request);
};

export const Route = createFileRoute("/api/catalog-image/$sku")({
  server: { handlers: { GET: handle } },
});
