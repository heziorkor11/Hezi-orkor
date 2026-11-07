# תמונות אמיתיות ראשונות — 7.11.2026

חלוקה יציבה לשתי קבוצות: תמונה אמיתית לפי מיפוי הקטלוג/מדיניות הרכיב, ואז תמונה חסרה/ייצוגית.
הסדר הפנימי הקיים נשמר בכל קבוצה. החיפוש/סינון פועלים קודם, החלוקה על כל התוצאה לפני pagination.
כך גם עמודים מאוחרים לא מחביאים תמונות אמיתיות מאחורי placeholders בעמוד קודם.
מוחל גם על מוצרים מומלצים בבית, תוצאות חיפוש חי (אותו loader) ומוצרים קשורים לפני limit.
אין שינוי בנתוני מקור, מחיר, שם, הסתרה או תמונות; אין הורדת תמונות חדשות.
הסיווג אינו בדיקת HTTP חיה של כל צילום: כשל רשת עתידי עדיין מפעיל fallback של רכיב התמונה.
כיום כל raw image בשורות המקור הוא /products/ מייצג שכבר נדחה; התמונות האמיתיות מגיעות ממיפויי SKU.
הבדיקה נכשלת אם בעתיד יופיע raw image אמיתי בלי תמיכה במטא־דאטת הדירוג, כדי למנוע מיון שגוי שקט.
בדיקות: מדיניות placeholder משותפת, יציבות/אי־שינוי קלט, מיון לפני דפדוף בעמוד ראשון/מעבר/אחרון,
חיפוש תוספים בעברית וכרטיסי הבית. ה־handler האמיתי נבדק ללא רשת ומתוך cwd לקריאה בלבד.


## Follow-up QA (PR #18)
The branch is based on current main `cdf63a7` and includes merged #16 and #17 (no rebase needed; no history rewritten). Reported preview-only empty fluids page 2/additives could not be reproduced against either the emitted handler or browser-path catalog loading with static fixtures. Added explicit regression gates: fluids pages have 60+32 of 92; Hebrew תוספים search and additives category each return 17; all expected SKUs and image-first ordering preserved, with no duplicates. The client-path test executes catalog code with `window` defined and serves exact static JSON assets; it is NOT browser/hydration/Deployment Protection QA. Runtime logs for the old deployment showed no records in the inspected window. No speculative functional changes have been made.

If fresh preview browser QA still fails, inspect status/content-type/body for `/catalog/sku-map.json`, `/catalog/chunks/53.json`, `/catalog/chunks/58.json`, and browser console errors. SSR tests cannot prove client networking or hydration works through a deployment checkpoint. An empty rendered list is not evidence source data was removed.
