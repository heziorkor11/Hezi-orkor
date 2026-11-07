import { createFileRoute } from "@tanstack/react-router";
const handle = async ({ request }: { request: Request }) => {
  const { adminApi } = await import("../lib/admin/api.server");
  return adminApi(request);
};
export const Route = createFileRoute("/api/admin/$")({
  server: { handlers: { GET: handle, POST: handle, PATCH: handle, PUT: handle } },
});
