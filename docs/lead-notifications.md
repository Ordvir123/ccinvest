# Lead notification emails

The contact form saves every lead to Supabase (`leads` table, visible in Admin → Leads),
then asks a Google Apps Script web app — running in Sarah's Google account — to email it.

## Apps Script (in sarah@ccinvest.co.il → script.google.com → New project)

```js
const SECRET = "PASTE-THE-SAME-SECRET-AS-IN-CLOUDFLARE";
const TO = "sarah@ccinvest.co.il,corinne@ccinvest.co.il";

function doPost(e) {
  const d = JSON.parse(e.postData.contents);
  if (d.secret !== SECRET) return ContentService.createTextOutput("forbidden");
  MailApp.sendEmail({ to: TO, subject: d.subject, htmlBody: d.html, replyTo: d.replyTo, name: "CC Invest — Site" });
  return ContentService.createTextOutput("ok");
}
```

Deploy → New deployment → Web app → Execute as **Me**, Who has access **Anyone**.

## Cloudflare Worker secrets
- `LEADS_WEBHOOK_URL` — the web app URL (`https://script.google.com/macros/s/.../exec`)
- `LEADS_WEBHOOK_SECRET` — same value as `SECRET` above
