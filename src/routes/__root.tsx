import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { ShopShell } from "@/components/shop-shell";
import appCss from "../styles.css?url";

const APP_NAME = "חזי אורקור | חלקי חילוף לרכב בנהריה";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
      {
        name: "description",
        content:
          "חזי אורקור בנהריה — חלקי חילוף ואביזרים לרכב. חיפוש לפי סוג חלק, יצרן, דגם ושנה או לפי מק״ט.",
      },
      { name: "theme-color", content: "#0a0a0b" },
      { name: "robots", content: "index, follow" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "icon", type: "image/jpeg", href: "/brand/logo-frame.jpg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;600;700;800&display=swap",
      },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <>
      <HeadContent />
      <AuthProvider>
        <PreviewHostBridge />
        <ShopShell>
          <Outlet />
        </ShopShell>
      </AuthProvider>
      <Scripts />
    </>
  );
}
