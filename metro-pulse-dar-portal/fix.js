
const url = "https://rxqjyuwinqfupmnyhvub.supabase.co/rest/v1/metro_reports?report_date=eq.2026-06-17";
const headers = {
  "apikey": "sb_publishable_FOnSEY-Ph87zkWm_eEM8RQ_mFWalcuV",
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4cWp5dXdpbnFmdXBtbnlodnViIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjE1OTExNCwiZXhwIjoyMDkxNzM1MTE0fQ.RnW5qEaZKJoLJsbxA64J11aaB3tcDB1Qu35XHUo-4io",
  "Content-Type": "application/json"
};

async function run() {
  const req = await fetch(url, { headers });
  const data = await req.json();
  for (const r of data) {
    if (JSON.stringify(r.points).includes("15h")) {
      console.log("Found user:", r.employee_id, JSON.stringify(r.points));
      
      const newPoints = r.points.map(p => {
        if (p.totalTime && p.totalTime.includes("15h")) {
          p.totalTime = "6h 0m";
          p.text = p.text + " (Fixed time from 15h to 6h)";
        }
        return p;
      });
      console.log("New points:", JSON.stringify(newPoints));
      const updateUrl = `https://rxqjyuwinqfupmnyhvub.supabase.co/rest/v1/metro_reports?id=eq.${r.id}`;
      const updateReq = await fetch(updateUrl, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ points: newPoints })
      });
      console.log("Update res status:", updateReq.status);
    }
  }
}
run();

