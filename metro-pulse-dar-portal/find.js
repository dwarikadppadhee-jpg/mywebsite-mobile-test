
const url = "https://rxqjyuwinqfupmnyhvub.supabase.co/rest/v1/metro_reports";
const headers = {
  "apikey": "sb_publishable_FOnSEY-Ph87zkWm_eEM8RQ_mFWalcuV",
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4cWp5dXdpbnFmdXBtbnlodnViIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjE1OTExNCwiZXhwIjoyMDkxNzM1MTE0fQ.RnW5qEaZKJoLJsbxA64J11aaB3tcDB1Qu35XHUo-4io",
  "Content-Type": "application/json"
};

async function run() {
  const req = await fetch(url, { headers });
  const data = await req.json();
  for (const r of data) {
    if (r.points) {
       for (const p of r.points) {
           const t = p.totalTime;
           if (t && t.includes("15h")) {
             console.log("FOUND:", r.employee_id, r.report_date, t, p.text);
           }
       }
    }
  }
}
run();

