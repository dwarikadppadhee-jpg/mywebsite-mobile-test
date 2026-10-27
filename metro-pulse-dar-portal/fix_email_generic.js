const fs = require('fs');
let appJs = fs.readFileSync('app.js', 'utf8');

const newBodies = `function professionalReminderBody(employee,viewer,reminderDate,note){
  const extra=String(note||"").trim();
  return [
    "Dear Team,",
    "",
    "This is a gentle reminder to please log in and submit your DAR for today.",
    "",
    "Consistent reporting helps us maintain efficiency and track project progress accurately.",
    extra ? \`\\n\${extra}\` : "",
    "",
    "Thank you,",
    "Management Team"
  ].filter(line=>line!==null&&line!==undefined).join("\\n");
}
function reminderBulkBody(employees,viewer,reminderDate,note){
  return professionalReminderBody(employees[0], viewer, reminderDate, note);
}
function buildOutlookMailtoUrl(employees,viewer,subject,reminderDate,note){
  const emailList = employees.map(u=>String(u.email||"").trim()).filter(Boolean).join(";");
  const greeting = professionalReminderBody(null, viewer, reminderDate, note);
  return \`mailto:?bcc=\${encodeURIComponent(emailList)}&subject=\${encodeURIComponent(subject)}&body=\${encodeURIComponent(greeting)}\`;
}
function buildOutlookWebComposeUrl(employees,viewer,subject,reminderDate,note){
  const bcc = employees.map(u=>String(u.email||"").trim()).filter(Boolean).join(";");
  const body = professionalReminderBody(null, viewer, reminderDate, note);
  
  // Use explicit encodeURIComponent to strictly enforce %20 for spaces. URLSearchParams uses +
  const queryString = \`bcc=\${encodeURIComponent(bcc)}&subject=\${encodeURIComponent(subject)}&body=\${encodeURIComponent(body)}\`;
  
  return \`https://outlook.office.com/mail/deeplink/compose?\${queryString}\`;
}`;

appJs = appJs.replace(
  /function professionalReminderBody[\s\S]*?https:\/\/outlook\.office\.com\/mail\/deeplink\/compose\?\$\{queryString\}`;?\s*\}/,
  newBodies
);


fs.writeFileSync('app.js', appJs);
console.log("Rewrote generic email bodies and URL constructors.");
