export function DemoBanner({ className = "mb-4.5" }: { className?: string }) {
  return (
    <div className={`${className} rounded-md border border-line-strong bg-elevated px-3.5 py-2.5 text-sm text-accent-warm`}>
      הזמנה לפי דרישה. מחיר מחירון באתר — לפני תשלום נאשר התאמה ומלאי בוואטסאפ. לפני התקנה נא לאשר התאמה לפי
      מספר רכב או מק״ט OE.
    </div>
  );
}
