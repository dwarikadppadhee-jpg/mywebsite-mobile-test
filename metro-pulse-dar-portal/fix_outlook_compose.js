const fs = require('fs');
let appJs = fs.readFileSync('app.js', 'utf8');

const regex = /function openOutlookCompose[\s\S]*?return false;\s*\}/;

const newLogic = `function openOutlookCompose(employees,viewer,subject,reminderDate,note){
  const mailtoUrl=buildOutlookMailtoUrl(employees,viewer,subject,reminderDate,note);
  // We completely skip the Outlook Web Deep Link because Microsoft explicitly blocks the "BCC" parameter in Web Deep Links!
  // We instead use the standard 'mailto:' protocol which flawlessly supports BCC and routes to their default desktop email client.
  window.location.href=mailtoUrl;
  return true;
}`;

if (regex.test(appJs)) {
  appJs = appJs.replace(regex, newLogic);
  fs.writeFileSync('app.js', appJs);
  console.log("Fixed openOutlookCompose to strictly use mailto:");
} else {
  console.log("Regex failed to match openOutlookCompose");
}
