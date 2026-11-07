# אחסון ניהול Git — אופציונלי, ללא שירות אחסון בתשלום חדש

## מה קיים ומה לא הופעל
- המאגר `heziorkor11/Hezi-orkor` נבדק ב־GitHub ב־7.11.2026 והוא **PUBLIC** (לא מסתמכים על `private` ב־package.json).
- נוסף adapter `ADMIN_STORAGE=git`. מצב Preview הקיים `ephemeral` לא משתנה.
- לא נוצר token; לא הוגדר אף משתנה ב־Vercel; אין חיבור חדש/DB/Marketplace/שירות בתשלום.
- הכניסה נשארת באתר, ב־`/admin`, עם שם משתמש וסיסמה מקומיים. GitHub אינו ספק כניסה ואינו מוצג לעובד.

## שמירה ופרטיות
`admin-data/state.json` הוא JSON מוצפן ב־AES-256-GCM עם nonce חדש בכל כתיבה וקשירה למאגר ולנתיב.
מחירים, שמות ונתוני מוצרים חדשים נשמרים ב־override layer בלבד, לצד מבצעים, עריכת בית, משתמשים,
password hashes, sessions ו־audit. אין שינוי בקבצי קטלוג/מחירי המקור. רק public projection מגיע לחנות;
משתמשים, sessions, audit, הזמנות, token ומפתח הצפנה אינם נשלחים ללקוח.

לפני כל קריאה/טרנזקציה נבדקת פרטיות המאגר דרך GitHub API; בדיקה שנכשלת עוצרת את הפעולה.
**במאגר הציבורי הנוכחי הזמנות, פרטי לקוחות, קובצי PDF ו־audit של הזמנות מוחרגים לחלוטין מהקומיטים,
גם כשה־state מוצפן.** הזמנות אלה נשמרות רק באחסון הזמני של המופע ב־/tmp: עלולות להיעלם בפריסה,
ב־cold start או במעבר מופע. אין להשתמש בכך כארכיון הזמנות ואין להזין פרטי לקוחות אמיתיים בבדיקה.
לשמירת הזמנות קבועה צריך החלטה נפרדת על מאגר פרטי/אחסון פרטי. במאגר שאומת כפרטי אפשר לשמור
הזמנות ב־state המוצפן ו־PDF בתיקיית המדיה הפרטית. אין להפוך מאגר כזה לציבורי עם היסטוריית נתוני לקוחות.

תמונות מוצר/באנר (jpg/png/webp, עד 4MB) נשמרות ב־`admin-data/media/<uuid>.<ext>` דרך API.
הן אינן מוצפנות: במאגר ציבורי **אין להעלות תמונות לקוחות/מסמכים/מידע אישי**, רק תמונות מוצר מותרות.
קובץ PDF במאגר ציבורי נשאר זמני בלבד. קריאה ב־API ממשיכה לבדוק את הקישור למוצר/באנר/הזמנה.

## מה מתן צריך לעשות — רק לאחר החלטה על הפעלה
1. GitHub → תמונת פרופיל → Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token.
2. בחרו Resource owner `heziorkor11`, תוקף קצר (למשל 30 יום), Repository access: **Only select repositories** → `Hezi-orkor` בלבד.
3. Repository permissions: **Contents: Read and write**; Metadata: Read (אוטומטי). אין צורך ב־Administration, Actions או Workflows.
4. העבירו את הערך ישירות להגדרת סוד השרת `ADMIN_GITHUB_TOKEN` — לא לצ'אט, לא ל־Git, לא ל־VITE_* ולא ל־NEXT_PUBLIC_*.
5. צרו מפתח אקראי 32 בתים (64 ספרות hex) במחשב מהימן, למשל `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`.
   שמרו כסוד `ADMIN_GIT_ENCRYPTION_KEY` וגם בגיבוי מאובטח נפרד. אובדן המפתח מאבד גישה ל־state;
   אין להחליף מפתח ללא פענוח/הצפנה מחדש. רוטציית token אינה מחייבת החלפת מפתח.
6. לבדיקה תחילה: להגדיר ב־Vercel **Preview, ענף feature/admin-dashboard בלבד**, ולא Production:

| משתנה | ערך |
|---|---|
| ADMIN_STORAGE | git |
| ADMIN_GITHUB_TOKEN | הסוד החדש |
| ADMIN_GITHUB_REPO | heziorkor11/Hezi-orkor |
| ADMIN_GITHUB_BRANCH | feature/admin-dashboard |
| ADMIN_GIT_ENCRYPTION_KEY | המפתח הסודי, 64 ספרות hex |
| ADMIN_GIT_ALLOWED_HOSTS | אופציונלי: hostnames מדויקים מופרדים בפסיקים, בלי https/path; דומייני Preview של Vercel מותרים אוטומטית |

שם המשתמש, `ADMIN_OWNER_PASSWORD_HASH` ושיטת הכניסה נשארים כפי שהם. אין להעתיק סיסמה גלויה למאגר.
ב־Vercel ענף היעד חייב להתאים בדיוק ל־`VERCEL_GIT_COMMIT_REF`; Preview אינו מורשה לכתוב לענף main.
להשארת דמו זמני משתמשים שוב ב־`ADMIN_STORAGE=ephemeral` ובהגדרות Preview הקיימות.
ל־Production נדרשים אישור/מיזוג נפרדים והגדרת הסודות במכוון; הקוד לבדו לא מפעיל דבר.

## טרנזקציות, פריסה ומגבלות
- GitHub Contents API: GET עם ref מפורש ואז PUT עם branch ו־blob SHA (compare-and-swap).
  התנגשות 409/422 גוררת קריאה מחדש והחלת השינוי עד שלוש פעמים; אין force push/overwrite עיוור.
- כל שינוי state יוצר קומיט, כולל כניסה/יציאה (sessions) ועריכת הרשאות. פעולות קריאה/bootstrap ללא שינוי
  **לא** יוצרות קומיטים. העלאת תמונה היא קומיט נוסף לפני קישור ה־state; במקרה שפעולת הקישור נכשלת
  עשוי להשאר קובץ יתום. אין מחיקה אוטומטית. audit אינו מפתח הצפנה ואינו מכיל סודות גלויים.
- GitHub→Vercel הקיים אמור להפעיל redeploy על קומיט לענף. לא נוספה קריאת deploy API ולא שונו project settings.
  מדיניות דילוגי build/תורים/מגבלות התוכנית עלולה למנוע או לעכב פריסה. מצב READY צריך להיבדק בנפרד.
- חנות, חיפוש ודף מוצר קוראים את אותו adapter ב־SSR וב־public API, לא רק קובץ JSON סטטי.
  עריכה מאושרת זמינה דרך API גם לפני סיום הפריסה; זה אינו transaction אטומי עם deploy.
- אין הבטחה לפריסה חינם ללא הגבלה: GitHub API, Vercel builds/functions/bandwidth והרשאות branch protection
  כפופים למכסות ולתוכנית הקיימת. אין רכישה או חיוב חדש אוטומטי מצד adapter זה. מתאים לתדירות עריכה נמוכה,
  לא למסד נתונים/מסחר עתיר הזמנות. `state.json` מוגבל ל־900KB; אין מחיקת audit אוטומטית.
- ה־token מעניק הרשאת כתיבת תוכן לכל המאגר הנבחר (GitHub אינו מגביל אותו לתיקייה). הקוד כותב רק ל־admin-data/.
  סוד דולף: לבטל token, ליצור חדש ולבדוק היסטוריה. לא לפרסם plaintext בהיסטוריית Git, שקשה למחוק בבטחה.
- לפני שימוש אמיתי יש לבדוק עם token שהבעלים יוצר: הרשאות, branch rules, commit, Vercel redeploy,
  גיבוי מפתח, שחזור והתחברות ממכשיר נוסף. אלה **לא אומתו מול GitHub חי** במסגרת משימה זו.

## בדיקות שבקוד
`npm run test:admin-git` — GitHub API מזויף בלבד: הצפנה, cold reads, התנגשות/עריכות מקבילות,
users/sessions, מחירים/מוצרים/מבצעים/בית/audit, מדיה, הסתרת הזמנות/PDF בציבורי, פרטיות לא ידועה ומפתח שגוי.
`npm run check:built-admin-git` — handler אמיתי מה־build, cwd לקריאה בלבד ו־API מזויף:
כניסה, override + הנחה בדף מוצר/חיפוש/קטגוריה, דף בית, הוספת מוצר, משתמשים ו־audit והחרגת הזמנה ציבורית.
ללא token אמיתי, ללא שינוי repo מרוחק על ידי הבדיקות וללא שירות חדש.

מקורות API:
- https://docs.github.com/en/rest/repos/contents?apiVersion=2026-03-10
- https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens
