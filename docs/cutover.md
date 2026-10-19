# מעבר home.ccinvest.co.il ל-Cloudflare — רשימת צעדים

הסדר חשוב. כל שלב מסתיים בבדיקה.

## 1. הדומיין פעיל ב-Cloudflare
1. Cloudflare (sarah@) → Account home → ccinvest.co.il.
2. הסטטוס צריך להיות **Active** (מגיע גם מייל). אם עדיין Pending — **Check nameservers now**, ולחכות.
3. בדיקה: ccinvest.co.il (וורדפרס) ו-www עדיין נפתחים, ומייל ל-sarah@ccinvest.co.il מגיע.

## 2. חיבור home ל-Worker
1. Cloudflare → ccinvest.co.il → **DNS → Records** → מחק את רשומת **A home → 185.158.133.1** (זו Lovable).
2. Cloudflare → **Workers & Pages → ccinvest → Settings → Domains & Routes → Add → Custom domain**.
3. הזן `home.ccinvest.co.il` → **Add domain**. התעודה (SSL) נוצרת תוך כמה דקות.
4. בדיקה: https://home.ccinvest.co.il נפתח, והאדמין ב-https://home.ccinvest.co.il/admin/login.

## 3. ניתוק Lovable
1. Lovable → הפרויקט → **Settings → Domains** → הסר את home.ccinvest.co.il.
2. Lovable → **GitHub** → **Disconnect** (כדי ש-Lovable לא ידחוף יותר שינויים ל-repo).
3. (בהמשך, כשהכול יציב) אפשר למחוק את הפרויקט ב-Lovable.

## 4. איחוד הענף הראשי (Claude עושה)
1. Claude ממזג את `cloudflare-migration` לתוך `main` ומסיר את הוראות Lovable מ-AGENTS.md.
2. Cloudflare → Worker ccinvest → **Settings → Build → Branch control** → Production branch = `main`.
3. בדיקה: build חדש מ-main מסתיים ב-Ready.

## 5. בדיקת לידים
1. בדף מפורסם כלשהו → טופס יצירת קשר → שליחה עם פרטי בדיקה.
2. בדיקה: הליד מופיע באדמין → **לידים**, ומייל מגיע ל-sarah@ ול-corinne@.
3. למחוק את ליד הבדיקה (או לבקש מ-Claude).

## 6. ניקוי הישן (אחרי 24/10)
1. ב-Supabase הישן (ארגון **ccinvest**, FREE) ההגבלה מוסרת ב-24/10. אם שרה צריכה תמונות מדפים ישנים — להוריד עכשיו מ-**Storage → page-media**.
2. אחרי זה: ארגון ccinvest → **Settings → Delete organization**.
3. ב-claude.ai → **Settings → Connectors → Supabase** → לחבר מחדש את הארגון הראשי של אור (office@abdvir.co.il's Org), שנותק כשחיברנו את CC Invest.
