const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf8');

const oldNavConfigMatch = code.match(/function navConfig\(user\)\{[\s\S]*?\n\}/);
if (oldNavConfigMatch) {
  const newNavConfig = `function navConfig(user){
  if(isAdmin(user))return[{id:"orgOverviewSection",label:"Overview"},{id:"complianceSection",label:"DAR Review"},{id:"leaveSection",label:"Leave"},{id:"userManagementSection",label:"User Management"}];
  if(isLevel1(user))return[{id:"orgOverviewSection",label:"Overview"},{id:"complianceSection",label:"DAR Review"},{id:"leaveSection",label:"Leave"},{id:"globalTaskSection",label:"Task Assign"},{id:"emailReminderSection",label:"Email Reminders"},{id:"historySection",label:"History"}];
  if(isLevel2(user))return[{id:"darSection",label:"DAR"},{id:"leaveSection",label:"Leave"},{id:"tasksSection",label:"My Tasks"},{id:"historySection",label:"History"}];
  return[{id:"darSection",label:"DAR"},{id:"leaveSection",label:"Leave"},{id:"tasksSection",label:"My Tasks"},{id:"historySection",label:"History"}];
}`;
  code = code.replace(oldNavConfigMatch[0], newNavConfig);
  fs.writeFileSync('app.js', code);
  console.log("Nav config updated");
} else {
  console.log("Could not find navConfig");
}
