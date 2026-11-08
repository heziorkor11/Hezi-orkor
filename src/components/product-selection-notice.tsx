/** Quiet guidance; does not replace statutory cancellation/return rights. */
export function ProductSelectionNotice() {
  return (
    <>
    <p data-product-selection-notice className="mt-3 text-xs font-normal leading-relaxed text-muted">
      בחירת החלק המתאים לרכב באחריות הלקוח. נשמח לבדוק עבורך את ההתאמה לפני ההזמנה.
      החזרת מוצר אפשרית רק באריזה מקורית סגורה ושלמה, שלא נפתחה ולא נפגעה.
      הכול בכפוף להוראות הדין.
    </p>
    <p data-final-price-notice className="mt-2 text-xs font-normal leading-relaxed text-muted">
      המחירים באתר עשויים להשתנות. המחיר הסופי ייקבע בהצעת מחיר שנשלח אליך לאחר אימות פרטי המשלוח.
    </p>
    </>
  );
}
