import { createFileRoute } from "@tanstack/react-router";
import { AdminDashboard } from "@/components/admin-dashboard";
import adminCss from "@/styles/admin.css?url";
export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "ניהול החנות | חזי אורקור" },
      { name: "robots", content: "noindex, nofollow, noarchive" },
    ],
    links: [{ rel: "stylesheet", href: adminCss }],
  }),
  component: AdminDashboard,
});
