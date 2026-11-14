# לוח ניהול האתר (חזי אורקור)

לוח הניהול ב־`/admin` מאפשר שליטה על קטלוג, תגים, קטגוריות, מבצעי בית, משתמשים והזמנות. הוא לא משנה את התנהגות החנות מלבד שני דברים: תגים על תמונת המוצר, ושמירת הזמנה לתיבת הדואר כשהלקוח שולח הזמנת וואטסאפ מהעגלה.

## אחסון

הריפו `heziorkor11/Hezi-orkor` הוא **ציבורי**. לכן:

- שינויי קטלוג (מחירים, שמות, הסתרה, קטגוריות, תגים, מבצעים, יומן פעילות בלי פרטי לקוח) נשמרים לקובצי JSON ב־`public/catalog/` דרך GitHub API, ועולים לאתר תוך כ־2–5 דקות אחרי redeploy.
- **הזמנות וחשבונות ניהול (סיסמאות כגיבוב scrypt בלבד) לא נשמרות בריפו הציבורי.** הן נכתבות למאגר הפרטי `heziorkor11/hezi-orkor-data` רק אחרי שהמערכת וידאה שהוא private: הזמנות בייצור ב־`orders/orders.json` ובהזמנות Preview/מקומי ב־`orders/preview/orders.json` (או `ADMIN_DATA_ORDERS_PATH` אם הוגדר לנתיב מותר), משתמשים בייצור ב־`admin/private-users.json`, ומשתמשי Preview ב־`admin/preview/private-users.json` (או `ADMIN_DATA_USERS_PATH` אם הוגדר לנתיב מותר) כדי שלא יתערבבו עם הייצור.
- יומן הפעילות נשמר במאגר הפרטי: בייצור `admin/activity.json`, וב-Preview/מקומי `admin/preview/activity.json` (או `ADMIN_DATA_ACTIVITY_PATH` אם הוגדר לנתיב מותר). קובץ ה-PDF של הזמנה נשמר ליד ההזמנות (`orders/pdfs/` בייצור, `orders/preview/pdfs/` ב-Preview). מוצרים חדשים, תמונות שהועלו ותגי מלאי נשמרים בריפו הציבורי כשכבת JSON (`product-additions.json`, `image-overrides.json`, `stock-overrides.json`) ותמונות ב-`public/catalog/admin-images/`.
- הגדרות דוא״ל הן משתני סביבה בלבד. תגיות נשמרות בריפו הציבורי. סשן הוא עוגייה חתומה (בלי רשימת ביטול על הדיסק); אחרי מחיקת עובד הסשן שלו נדחה.
- בלי מאגר פרטי, הזמנות ומשתמשים נשמרים רק באחסון זמני של המופע (`/tmp` ב־Vercel או `.data/admin` מקומית) ונמחקים ב-redeploy. לפני כל כתיבה למאגר הפרטי המערכת בודקת שהוא אכן private.

## תפקידים

- **מאסטר**: מחירים, קטגוריות, תגים, הסתרה, תמונות (העלאה מהדאשבורד + תהליך קיים), מבצעי החודש, משתמשים, הזמנות, ביטול שינויים, סנכרון גיליון Google, הוספת מוצר.
- **עובד**: הוספה/עריכה של מוצרים (בלי מחיר — המאסטר משלים אחר כך) + החלפת תמונה + צפייה בהזמנות. שינוי עולה מיד, נרשם ביומן (לפני/אחרי), ונשלח דוא״ל למאסטר עם קישור «בטל» חתום. ביטול של מוצר חדש **מסתיר** אותו ולא מוחק.
- **מאסטר, דוא״ל**: במסך `/admin/mail-preview` אפשר לשלוח «שלח מייל בדיקה» לתיבת `ADMIN_NOTIFY_EMAIL`. המייל מסומן כדוגמה, וקישור «בטל» (`/admin/revert?sample=1`) לא מבטל שינוי אמיתי.

## משתני סביבה

אסור לשים סודות ב-git או בצ'אט. אין קובץ `.env` בקומיט.

### חובה לייצור (או לשימור קבוע)

| משתנה | מי מספק | הערות |
|---|---|---|
| `ADMIN_GITHUB_TOKEN` | מתן | Fine-grained personal access token, הרשאת Contents: Read and write **רק** לריפו הנבחר (Hezi-orkor, ובהמשך גם למאגר הפרטי אם יאושר). |
| `ADMIN_SESSION_SECRET` | אפשר לייצר אקראית (32+ תווים) | חתימת עוגיות הסשן וקישורי הביטול. |
| `ADMIN_MASTER_PASSWORD` או `ADMIN_MASTER_PASSWORD_HASH` | מתן (סיסמת ייצור) | סיסמת המאסטר. בייצור לא להשתמש בסיסמת תצוגה. |
| `GMAIL_USER` | מתן | חשבון Gmail לשליחת התראות. |
| `GMAIL_APP_PASSWORD` | מתן | סיסמת אפליקציה של Google (חינם). |
| `ADMIN_NOTIFY_EMAIL` | מתן | כתובת לקבלת התראות וקישור «בטל». |

### אופציונלי

| משתנה | ברירת מחדל / הערות |
|---|---|
| `ADMIN_MASTER_USERNAME` | `matan` |
| `ADMIN_MASTER_NAME` | מתן יחזקאלי |
| `ADMIN_WORKER_USERNAME` / `ADMIN_WORKER_PASSWORD` / `ADMIN_WORKER_NAME` | יצירת עובד ראשוני (לתצוגה: `yoav`) |
| `ADMIN_GITHUB_REPO` | `heziorkor11/Hezi-orkor` |
| `ADMIN_GITHUB_BRANCH` | ענף הפריסה (`VERCEL_GIT_COMMIT_REF` או `main`) |
| `ADMIN_DATA_GITHUB_REPO` | מאגר הזמנות ומשתמשים פרטי, רק אחרי אישור ווידוא שהוא private |
| `ADMIN_DATA_GITHUB_BRANCH` | ברירת מחדל כמו ענף הקטלוג (`main`) |
| `ADMIN_DATA_USERS_PATH` | נתיב קובץ המשתמשים במאגר הפרטי. ברירת מחדל: `admin/private-users.json` בייצור, `admin/preview/private-users.json` ב-Preview/מקומי |
| `ADMIN_DATA_ORDERS_PATH` | נתיב קובץ ההזמנות במאגר הפרטי. ברירת מחדל: `orders/orders.json` בייצור, `orders/preview/orders.json` ב-Preview/מקומי |
| `ADMIN_PUBLIC_ORIGIN` | בסיס הקישור ב«בטל» (ייצור: https://hezi-orkor.vercel.app) |
| `ADMIN_PREVIEW_DEMO` | `1` ב-Preview כדי להפעיל את הלוח בלי אסימון GitHub (שינויים זמניים) |
| `ADMIN_LOCAL_ENABLED` | `1` לפיתוח מקומי |

בייצור (`VERCEL_ENV=production`) מצב תצוגה לא נדלק לעולם. בלי סיסמת מאסטר וסוד סשן הלוח כבוי.

### מה אפשר להגדיר אוטומטית ב-Preview

- `ADMIN_SESSION_SECRET` אקראי
- `ADMIN_PREVIEW_DEMO=1`
- משתמשים לדוגמה: `matan` (מאסטר) ו-`yoav` (עובד) עם סיסמאות תצוגה אקראיות — **הסיסמאות עצמן לא נכתבות כאן**
- בלי `ADMIN_GITHUB_TOKEN` / Gmail השינויים והדוא״ל לא יהיו עמידים; ממשק הניהול והזמנות הדוגמה עדיין עובדים על האחסון הזמני

## אבטחה

- עוגיית סשן: `HttpOnly`, `SameSite=Lax`, `Secure` ב-Vercel, שם `__Host-hezi-admin` בפריסה
- סיסמאות ב-scrypt
- הגבלת קצב לכניסה ולהזנת הזמנות
- `/admin` ו-`/api/admin` עם `noindex`
- קישור «בטל» חתום ב-HMAC, עם תוקף, חד-פעמי אחרי שימוש
- מסלול `POST /api/orders` ציבורי (בלי authMiddleware), עם הגבלת קצב; כישלון השמירה לא חוסם את שליחת הוואטסאפ


## Hook לסנכרון מוצרים (Sheets / ייצוא)

כל שינוי קטלוג בדאשבורד (הוספה, עריכה, מחיר, תמונה, תג, הסתרה) קורא ל-`notifyProductChange` ב-`src/lib/admin/notify-product-change.ts`. בלי `SHEETS_SYNC_URL` זו פעולת no-op. אם המשתנה מוגדר, נשלח POST JSON עם כותרת הסוד המשותף `SHEETS_SYNC_SECRET` (מערך הסביבה באותו שם). לא לשלוח את הסוד בצ׳אט. חיבור Google Sheets עצמו מטופל בנפרד.

