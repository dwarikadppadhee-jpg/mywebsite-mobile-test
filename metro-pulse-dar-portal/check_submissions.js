const url = 'https://rxqjyuwinqfupmnyhvub.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4cWp5dXdpbnFmdXBtbnlodnViIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjE1OTExNCwiZXhwIjoyMDkxNzM1MTE0fQ.RnW5qEaZKJoLJsbxA64J11aaB3tcDB1Qu35XHUo-4io';

async function check() {
  const headers = {
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json'
  };

  const reportsRes = await fetch(`${url}/rest/v1/metro_reports?report_date=eq.2026-06-13&select=*`, { headers });
  const reports = await reportsRes.json();
  console.log("Today Reports:", reports.length);
  reports.forEach(r => {
    console.log(`Report: ${r.employee_name} (${r.employee_id}) - submitted_at: ${r.submitted_at} - Points: ${r.points ? r.points.length : 0}`);
  });
}

check().catch(console.error);
