const fs = require('fs');
let appJs = fs.readFileSync('app.js', 'utf8');

// 6. Update "Select All" to respect the current visible filter
const oldSelectAll = `  document.getElementById("selectAllReminderEmployees")?.addEventListener("click",()=>{
    const user=activeUser();if(!user)return;
    const reminderDate=String(document.getElementById("emailReminderDate")?.value||today());
    const query=String(document.getElementById("emailReminderSearch")?.value||"").trim().toLowerCase();
    reminderPendingEmployees(user,reminderDate).filter(employee=>{
      if(!String(employee.email||"").trim())return false;
      if(!query)return true;
      const hay=[employee.name,employee.employeeId,employee.department,employee.managerName,employee.email].join(" ").toLowerCase();
      return hay.includes(query);
    }).forEach(employee=>selectedReminderEmployeeIds.add(employee.employeeId));
    renderEmailReminders(user);
  });`;

const newSelectAll = `  document.getElementById("selectAllReminderEmployees")?.addEventListener("click",()=>{
    const user=activeUser();if(!user)return;
    const reminderDate=String(document.getElementById("emailReminderDate")?.value||today());
    const query=String(document.getElementById("emailReminderSearch")?.value||"").trim().toLowerCase();
    
    let allTargets = reminderTargetEmployees(user,reminderDate);
    if(emailReminderFilter === "pending") allTargets = allTargets.filter(u => !u.hasSubmitted);
    if(emailReminderFilter === "submitted") allTargets = allTargets.filter(u => u.hasSubmitted);
    
    allTargets.filter(employee=>{
      if(!String(employee.email||"").trim())return false;
      if(!query)return true;
      const hay=[employee.name,employee.employeeId,employee.department,employee.managerName,employee.email].join(" ").toLowerCase();
      return hay.includes(query);
    }).forEach(employee=>selectedReminderEmployeeIds.add(employee.employeeId));
    
    renderEmailReminders(user);
  });`;

appJs = appJs.replace(oldSelectAll, newSelectAll);

// 7. Add event listener for tabs (document delegation is easiest since tabs are hardcoded now)
const tabListener = `
  // Email Reminder Tabs
  document.getElementById("emailReminderSection")?.addEventListener("click", (e) => {
     if(e.target.classList.contains("tab-btn") && e.target.closest("#emailReminderTabs")) {
         const filter = e.target.getAttribute("data-filter");
         if(filter) {
            emailReminderFilter = filter;
            const user = activeUser();
            if(user) renderEmailReminders(user);
         }
     }
  });
`;

appJs = appJs.replace(
  /document\.getElementById\("clearReminderEmployees"\)\?\.addEventListener\("click",\(\)=>\{/,
  tabListener + '\n  document.getElementById("clearReminderEmployees")?.addEventListener("click",()=>{'
);

fs.writeFileSync('app.js', appJs);
console.log("Replaced Logic 2 in app.js");
