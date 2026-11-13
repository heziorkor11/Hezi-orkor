import { createFileRoute } from "@tanstack/react-router";
import { AdminGate } from "@/components/admin/shell";
import adminCss from "@/styles/admin.css?url";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "ניהול האתר · חזי אורקור" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [{ rel: "stylesheet", href: adminCss }],
  }),
  component: AdminGate,
});
