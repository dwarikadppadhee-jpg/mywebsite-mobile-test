const fs = require('fs');
let appJs = fs.readFileSync('app.js', 'utf8');

// 1. Add emailReminderFilter variable
appJs = appJs.replace(
  /let selectedReminderEmployeeIds=new Set\(\);/,
  'let selectedReminderEmployeeIds=new Set();\nlet emailReminderFilter="pending";'
);

// 2. Refactor reminderPendingEmployees to reminderTargetEmployees
const oldReminderPending = `function reminderPendingEmployees(viewer,reminderDate){
  const submitted=new Set(reports().filter(r=>r.date===reminderDate).map(r=>r.employeeId));
  return reminderEligibleEmployees(viewer).filter(u=>!submitted.has(u.employeeId)).sort((a,b)=>String(a.name||"").localeCompare(String(b.name||"")));
}`;

const newReminderTarget = `function reminderTargetEmployees(viewer,reminderDate){
  const submitted=new Set(reports().filter(r=>r.date===reminderDate).map(r=>r.employeeId));
  return reminderEligibleEmployees(viewer).map(u => ({
     ...u,
     hasSubmitted: submitted.has(u.employeeId)
  })).sort((a,b)=>String(a.name||"").localeCompare(String(b.name||"")));
}`;

appJs = appJs.replace(oldReminderPending, newReminderTarget);


// 3. Refactor selectedReminderEmployees
const oldSelectedReminder = `function selectedReminderEmployees(viewer){
  const reminderDate=String(document.getElementById("emailReminderDate")?.value||today());
  const pending=reminderPendingEmployees(viewer,reminderDate);
  const validIds=new Set(pending.map(u=>u.employeeId));
  
[...selectedReminderEmployeeIds].forEach(id=>{if(!validIds.has(id))selectedReminderEmployeeIds.delete(id);});
  return pending.filter(u=>selectedReminderEmployeeIds.has(u.employeeId));
}`;

const newSelectedReminder = `function selectedReminderEmployees(viewer){
  const reminderDate=String(document.getElementById("emailReminderDate")?.value||today());
  const target=reminderTargetEmployees(viewer,reminderDate);
  // Do not purge selections automatically across tabs unless needed, but we probably should
  // filter by validIds so deleted users don't linger.
  const validIds=new Set(target.map(u=>u.employeeId));
  [...selectedReminderEmployeeIds].forEach(id=>{if(!validIds.has(id))selectedReminderEmployeeIds.delete(id);});
  return target.filter(u=>selectedReminderEmployeeIds.has(u.employeeId));
}`;

appJs = appJs.replace(oldSelectedReminder, newSelectedReminder);

// 4. Update renderEmailReminders logic
// Need to find the renderEmailReminders body and apply the filter logic
const oldRenderEmailBody = `function renderEmailReminders(user){
  if(!canUseEmailReminders(user))return;
  const dateInput=document.getElementById("emailReminderDate");
  if(dateInput&&!dateInput.value)dateInput.value=today();
  const reminderDate=String(dateInput?.value||today());
  const pending=reminderPendingEmployees(user,reminderDate);
  const query=String(document.getElementById("emailReminderSearch")?.value||"").trim().toLowerCase();
  const visible=pending.filter(employee=>{
    if(!query)return true;
    const hay=[employee.name,employee.employeeId,employee.department,employee.managerName,employee.email].join(" ").toLowerCase();
    return hay.includes(query);
  });
  const validIds=new Set(pending.map(u=>u.employeeId));
  
[...selectedReminderEmployeeIds].forEach(id=>{if(!validIds.has(id))selectedReminderEmployeeIds.delete(id);});
  const selected=selectedReminderEmployees(user);
  const summary=document.getElementById("emailReminderSummary");
  if(summary){
    const submittedCount=reminderEligibleEmployees(user).length-pending.length;
    summary.innerHTML=\`
      <span><strong>\${escapeHtml(String(pending.length))}</strong> pending DAR</span>
      <span><strong>\${escapeHtml(String(selected.length))}</strong> selected</span>
    \`;
  }
  const recipientPanel=document.getElementById("emailReminderRecipients");
  if(recipientPanel){
    if(!pending.length){
      recipientPanel.className="reminder-recipient-panel empty-state";
      recipientPanel.textContent="Everyone has submitted DAR for this date.";
    }else if(!visible.length){
      recipientPanel.className="reminder-recipient-panel empty-state";
      recipientPanel.textContent="No pending employee matches this search.";
    }else{
      recipientPanel.className="reminder-recipient-panel";
      recipientPanel.innerHTML=visible.map(employee=>{
        const checked=selectedReminderEmployeeIds.has(employee.employeeId)?"checked":"";
        const initials=profileInitials(employee.name,employee.employeeId);
        const hasEmail=Boolean(String(employee.email||"").trim());
        const disabled=hasEmail?"":"disabled";
        const emailStatus=hasEmail?"No DAR":"Email missing";
        return\`
          <label class="reminder-recipient-card \${hasEmail?"":"reminder-recipient-card-disabled"}">
            <input type="checkbox" class="email-reminder-recipient" data-reminder-employee="\${escapeHtml(employee.employeeId)}" \${checked} \${disabled}>
            <span class="reminder-recipient-avatar">\${escapeHtml(initials)}</span>
            <span class="reminder-recipient-main">
              <strong>\${escapeHtml(employee.name||employee.employeeId)}</strong>
              <small>\${escapeHtml(employee.department||"No department")}  \${escapeHtml(employee.employeeId)}</small>
            </span>
            <span class="reminder-recipient-meta">
              <span class="\${hasEmail?"reminder-pill":"reminder-pill-warn"}">\${escapeHtml(emailStatus)}</span>
            </span>
          </label>
        \`;
      }).join("");
      recipientPanel.querySelectorAll(".email-reminder-recipient").forEach(cb=>cb.addEventListener("change",e=>{
        const id=e.target.getAttribute("data-reminder-employee");
        if(e.target.checked)selectedReminderEmployeeIds.add(id);
        else selectedReminderEmployeeIds.delete(id);
        renderEmailReminders(user);
      }));
    }
  }
  const feedback=document.getElementById("emailReminderFeedback");
  if(feedback){
    const missingCount=pending.filter(employee=>!String(employee.email||"").trim()).length;
    feedback.textContent=selected.length
      ? \`\${selected.length} selected pending employee(s) will be added to Outlook.\`
      : missingCount
        ? "Select employees to email (some are missing email addresses)."
        : "Choose a recipient or use Select All to prepare the reminder.";
  }
}`;

// Re-write it carefully
const newRenderEmailBody = `function renderEmailReminders(user){
  if(!canUseEmailReminders(user))return;
  const dateInput=document.getElementById("emailReminderDate");
  if(dateInput&&!dateInput.value)dateInput.value=today();
  const reminderDate=String(dateInput?.value||today());
  
  // 1. Get all targets
  const allTargets = reminderTargetEmployees(user,reminderDate);
  
  // 2. Filter by tab
  let filteredTargets = allTargets;
  if(emailReminderFilter === "pending") filteredTargets = allTargets.filter(u => !u.hasSubmitted);
  if(emailReminderFilter === "submitted") filteredTargets = allTargets.filter(u => u.hasSubmitted);
  
  // 3. Search query
  const query=String(document.getElementById("emailReminderSearch")?.value||"").trim().toLowerCase();
  const visible=filteredTargets.filter(employee=>{
    if(!query)return true;
    const hay=[employee.name,employee.employeeId,employee.department,employee.managerName,employee.email].join(" ").toLowerCase();
    return hay.includes(query);
  });
  
  const validIds=new Set(allTargets.map(u=>u.employeeId));
  [...selectedReminderEmployeeIds].forEach(id=>{if(!validIds.has(id))selectedReminderEmployeeIds.delete(id);});
  
  const selected=selectedReminderEmployees(user);
  
  // Tabs UI update
  document.querySelectorAll('#emailReminderTabs button').forEach(b => {
     b.classList.toggle('active', b.getAttribute('data-filter') === emailReminderFilter);
  });
  
  const summary=document.getElementById("emailReminderSummary");
  if(summary){
    summary.innerHTML=\`
      <span><strong>\${escapeHtml(String(filteredTargets.length))}</strong> \${emailReminderFilter} DAR</span>
      <span><strong>\${escapeHtml(String(selected.length))}</strong> selected overall</span>
    \`;
  }
  
  const recipientPanel=document.getElementById("emailReminderRecipients");
  if(recipientPanel){
    if(!filteredTargets.length){
      recipientPanel.className="reminder-recipient-panel empty-state";
      recipientPanel.textContent=\`No \${emailReminderFilter} employees for this date.\`;
    }else if(!visible.length){
      recipientPanel.className="reminder-recipient-panel empty-state";
      recipientPanel.textContent="No employee matches this search.";
    }else{
      recipientPanel.className="reminder-recipient-panel";
      recipientPanel.innerHTML=visible.map(employee=>{
        const checked=selectedReminderEmployeeIds.has(employee.employeeId)?"checked":"";
        const initials=profileInitials(employee.name,employee.employeeId);
        const hasEmail=Boolean(String(employee.email||"").trim());
        const disabled=hasEmail?"":"disabled";
        
        let statusLabel = "";
        let statusClass = "";
        if(!hasEmail) {
           statusLabel = "Email missing";
           statusClass = "reminder-pill-warn";
        } else {
           if(employee.hasSubmitted) {
              statusLabel = "Submitted";
              statusClass = "reminder-pill-success"; // We can style this or just use reminder-pill
           } else {
              statusLabel = "Pending";
              statusClass = "reminder-pill";
           }
        }
        
        return\`
          <label class="reminder-recipient-card \${hasEmail?"":"reminder-recipient-card-disabled"}">
            <input type="checkbox" class="email-reminder-recipient" data-reminder-employee="\${escapeHtml(employee.employeeId)}" \${checked} \${disabled}>
            <span class="reminder-recipient-avatar">\${escapeHtml(initials)}</span>
            <span class="reminder-recipient-main">
              <strong>\${escapeHtml(employee.name||employee.employeeId)}</strong>
              <small>\${escapeHtml(employee.department||"No department")} • \${escapeHtml(employee.employeeId)}</small>
            </span>
            <span class="reminder-recipient-meta">
              <span class="\${statusClass}" style="\${statusClass === 'reminder-pill-success' ? 'background:#d3f9d8; color:#2b8a3e;' : ''}">\${escapeHtml(statusLabel)}</span>
            </span>
          </label>
        \`;
      }).join("");
      recipientPanel.querySelectorAll(".email-reminder-recipient").forEach(cb=>cb.addEventListener("change",e=>{
        const id=e.target.getAttribute("data-reminder-employee");
        if(e.target.checked)selectedReminderEmployeeIds.add(id);
        else selectedReminderEmployeeIds.delete(id);
        renderEmailReminders(user);
      }));
    }
  }
  
  const feedback=document.getElementById("emailReminderFeedback");
  if(feedback){
    feedback.textContent=selected.length
      ? \`\${selected.length} selected employee(s) will be added to Outlook.\`
      : "Choose recipients to prepare the email.";
  }
}`;

appJs = appJs.replace(oldRenderEmailBody, newRenderEmailBody);

// 5. Update sendEmailReminder feedback texts 
// It looks for "pending" and missing emails.
appJs = appJs.replace(
  /Select at least one pending employee before opening Outlook\./g,
  "Select at least one employee before opening Outlook."
);
appJs = appJs.replace(
  /Reminder logged for \$\{employees\.length\} selected pending employee\(s\)\./g,
  "Reminder logged for ${employees.length} selected employee(s)."
);
appJs = appJs.replace(
  /Opened Outlook compose for \$\{employees\.length\} selected pending employee\(s\)\./g,
  "Opened Outlook compose for ${employees.length} selected employee(s)."
);


fs.writeFileSync('app.js', appJs);
console.log("Replaced Logic 1 in app.js");
