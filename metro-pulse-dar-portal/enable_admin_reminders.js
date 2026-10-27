const fs = require('fs');
let appJs = fs.readFileSync('app.js', 'utf8');

// 1. Update canUseEmailReminders
appJs = appJs.replace(
  /function canUseEmailReminders\(u\)\{ return isLevel1\(u\); \}/,
  'function canUseEmailReminders(u){ return isLevel1(u) || isAdmin(u); }'
);

// 2. Update navConfig for Admin
appJs = appJs.replace(
  /if\(isAdmin\(user\)\)return\[\{id:"orgOverviewSection",label:"Overview"\},\{id:"complianceSection",label:"DAR Review"\},\{id:"leaveSection",label:"Leave"\},\{id:"userManagementSection",label:"User Management"\}\];/,
  'if(isAdmin(user))return[{id:"orgOverviewSection",label:"Overview"},{id:"complianceSection",label:"DAR Review"},{id:"leaveSection",label:"Leave"},{id:"userManagementSection",label:"User Management"},{id:"emailReminderSection",label:"Email Reminders"}];'
);

fs.writeFileSync('app.js', appJs);
console.log("Updated app.js to enable Email Reminders for Admin.");
