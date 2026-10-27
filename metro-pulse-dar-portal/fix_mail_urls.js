const fs = require('fs');
let appJs = fs.readFileSync('app.js', 'utf8');

// Fix buildOutlookMailtoUrl
const oldMailto = `function buildOutlookMailtoUrl(employees,viewer,subject,reminderDate,note){
  const to=employees.map(u=>String(u.email||"").trim()).filter(Boolean).map(encodeURIComponent).join(",");
  const greeting=employees.length===1?professionalReminderBody(employees[0],viewer,reminderDate,note):reminderBulkBody(employees,viewer,reminderDate,note);
  return \`mailto:\${to}?subject=\${encodeURIComponent(subject)}&body=\${encodeURIComponent(greeting)}\`;
}`;

const newMailto = `function buildOutlookMailtoUrl(employees,viewer,subject,reminderDate,note){
  const emailList = employees.map(u=>String(u.email||"").trim()).filter(Boolean).join(";");
  const greeting = employees.length===1 ? professionalReminderBody(employees[0],viewer,reminderDate,note) : reminderBulkBody(employees,viewer,reminderDate,note);
  // Use BCC for all so they don't see each other's emails, just like the user requested.
  // Leave To blank.
  return \`mailto:?bcc=\${encodeURIComponent(emailList)}&subject=\${encodeURIComponent(subject)}&body=\${encodeURIComponent(greeting)}\`;
}`;

appJs = appJs.replace(oldMailto, newMailto);

// Fix buildOutlookWebComposeUrl
const oldWeb = `function buildOutlookWebComposeUrl(employees,viewer,subject,reminderDate,note){
  const to=employees.map(u=>String(u.email||"").trim()).filter(Boolean).join(";");
  const body=employees.length===1?professionalReminderBody(employees[0],viewer,reminderDate,note):reminderBulkBody(employees,viewer,reminderDate,note);
  const params=new URLSearchParams({to,subject,body});
  return \`https://outlook.office.com/mail/deeplink/compose?\${params.toString()}\`;
}`;

const newWeb = `function buildOutlookWebComposeUrl(employees,viewer,subject,reminderDate,note){
  const bcc = employees.map(u=>String(u.email||"").trim()).filter(Boolean).join(";");
  const body = employees.length===1 ? professionalReminderBody(employees[0],viewer,reminderDate,note) : reminderBulkBody(employees,viewer,reminderDate,note);
  
  // URLSearchParams uses '+' for spaces. Outlook Web expects '%20' for spaces in deeply linked params.
  const params = new URLSearchParams({bcc, subject, body});
  let queryString = params.toString().replace(/\\+/g, '%20');
  
  return \`https://outlook.office.com/mail/deeplink/compose?\${queryString}\`;
}`;

appJs = appJs.replace(oldWeb, newWeb);

fs.writeFileSync('app.js', appJs);
console.log("Fixed mail URLs");
