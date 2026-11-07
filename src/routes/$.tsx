import { createFileRoute, notFound } from "@tanstack/react-router";
import { NotFoundComponent } from "@/components/not-found";
export const Route = createFileRoute("/$")({
  loader: () => {
    throw notFound();
  },
  notFoundComponent: NotFoundComponent,
  head: () => ({
    meta: [{ title: "העמוד לא נמצא | חזי אורקור" }, { name: "robots", content: "noindex, follow" }],
  }),
});
