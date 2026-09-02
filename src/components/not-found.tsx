import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export function NotFoundComponent() {
  return (
    <div className="mx-auto max-w-xl px-5 py-16 text-center">
      <p className="mb-2 text-xs font-extrabold tracking-[0.28em] text-accent-warm">404</p>
      <h1 className="mb-2 text-2xl tracking-tight">העמוד לא נמצא</h1>
      <p className="mb-6 leading-relaxed text-muted">
        הקישור שבור או שהחלק ירד מהקטלוג. חפשו לפי מק״ט, או שלחו לנו בוואטסאפ.
      </p>
      <div className="flex flex-col justify-center gap-2 sm:flex-row">
        <Link to="/">
          <Button>חזרה לדף הבית</Button>
        </Link>
        <Link to="/help">
          <Button variant="accent">לא מצאת? דברו איתנו</Button>
        </Link>
      </div>
    </div>
  );
}
