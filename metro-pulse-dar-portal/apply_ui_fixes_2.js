const fs = require('fs');

let appJs = fs.readFileSync('d:/All websites/DAR/metro-pulse-dar-portal/app.js', 'utf8');

// Fix 1: Notification filtering
const appChunk1Old = `function headerAlertsForUser(user){
  if(!user)return[];
  const seenAt=readHeaderAlertSeenAt(user.employeeId);
  const seenTime=seenAt?new Date(seenAt).getTime():0;
  const notifItems=notifications().filter(n=>n.targetId===user.employeeId).map(n=>({
    id:n.id,targetId:n.targetId,kind:n.kind||"notification",
    title:n.title||"DAR Alert",message:n.message,createdAt:n.createdAt,
    actorName:n.actorName||"",reportId:n.reportId||""
  }));
  const annItems=announcementsForUser(user).map(a=>({
    id:a.id,targetId:user.employeeId,kind:"announcement",
    title:a.title||"Metro Daily",message:a.content,createdAt:a.createdAt,
    actorName:a.authorName||"Admin",reportId:""
  }));
  return [...notifItems,...annItems]
    .filter(i=>new Date(i.createdAt).getTime()>seenTime)
    .sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
}
function headerAlertSeenKey(employeeId){ return STORAGE_KEYS.headerAlertSeenPrefix+employeeId; }
function readHeaderAlertSeenAt(employeeId){
  if(!employeeId)return null;
  const val=localStorage.getItem(headerAlertSeenKey(employeeId));
  try{return val?JSON.parse(val):null;}catch(e){return null;}
}
function markHeaderAlertsSeen(employeeId,seenAt=nowIso()){ localStorage.setItem(headerAlertSeenKey(employeeId),JSON.stringify(seenAt)); }
function unreadHeaderAlertCount(user){
  return headerAlertsForUser(user).length;
}`;
const appChunk1New = `function headerAlertsForUser(user){
  if(!user)return[];
  const notifItems=notifications().filter(n=>n.targetId===user.employeeId).map(n=>({
    id:n.id,targetId:n.targetId,kind:n.kind||"notification",
    title:n.title||"DAR Alert",message:n.message,createdAt:n.createdAt,
    actorName:n.actorName||"",reportId:n.reportId||""
  }));
  const annItems=announcementsForUser(user).map(a=>({
    id:a.id,targetId:user.employeeId,kind:"announcement",
    title:a.title||"Metro Daily",message:a.content,createdAt:a.createdAt,
    actorName:a.authorName||"Admin",reportId:""
  }));
  return [...notifItems,...annItems]
    .sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
}
function unreadHeaderAlertCount(user){
  const seenAt=readHeaderAlertSeenAt(user.employeeId);
  const seenTime=seenAt?new Date(seenAt).getTime():0;
  return headerAlertsForUser(user).filter(i=>new Date(i.createdAt).getTime()>seenTime).length;
}`;

appJs = appJs.replace(appChunk1Old, appChunk1New);

// Fix 2: Profile Grid Layout
const appChunk2Old = `form.innerHTML=\`<div class="profile-grid profile-grid-text-only"><div class="profile-photo-card profile-initial-card"><div class="profile-initial-avatar" aria-hidden="true">\${escapeHtml(initials)}</div><div class="profile-photo-meta"><strong>\${escapeHtml(target.name)}</strong><span>\${escapeHtml(target.employeeId)}</span><span>\${escapeHtml(ROLE_LABELS[target.level]||target.level)} | \${escapeHtml(target.department)}</span></div></div><div class="profile-main-stack"><section class="profile-summary-card">`;
const appChunk2New = `form.innerHTML=\`<div class="profile-main-stack"><section class="profile-summary-card">`;
appJs = appJs.replace(appChunk2Old, appChunk2New);

const appChunk2OldEnd = `</section>\${editable?\`<section class="profile-edit-card full-span"><div class="profile-card-header"><div><p class="section-tag">Edit Profile</p><h3>Update Contact Details</h3></div></div><div class="profile-edit-grid"><label>Phone<input id="profilePhone" type="text" value="\${escapeHtml(profile.phone||"")}" placeholder="Enter phone number" \${fieldState}></label><label>Email<input id="profileEmail" type="email" value="\${escapeHtml(profile.email||"")}" placeholder="Enter email address" \${fieldState}></label><label>Location<input id="profileLocation" type="text" value="\${escapeHtml(profile.location||"")}" placeholder="Enter location" \${fieldState}></label><label>DOB<input id="profileDob" type="date" value="\${escapeHtml(profile.dob||target.dob||"")}" \${fieldState}></label></div><div class="profile-actions full-span"><button class="button \${editable?"":"hidden"}" type="submit">Save Profile</button><p class="helper-text">Only text profile data is saved.</p></div></section>\`:""}</div></div>\`;`;
const appChunk2NewEnd = `</section>\${editable?\`<section class="profile-edit-card full-span"><div class="profile-card-header"><div><p class="section-tag">Edit Profile</p><h3>Update Contact Details</h3></div></div><div class="profile-edit-grid"><label>Phone<input id="profilePhone" type="text" value="\${escapeHtml(profile.phone||"")}" placeholder="Enter phone number" \${fieldState}></label><label>Email<input id="profileEmail" type="email" value="\${escapeHtml(profile.email||"")}" placeholder="Enter email address" \${fieldState}></label><label>Location<input id="profileLocation" type="text" value="\${escapeHtml(profile.location||"")}" placeholder="Enter location" \${fieldState}></label><label>DOB<input id="profileDob" type="date" value="\${escapeHtml(profile.dob||target.dob||"")}" \${fieldState}></label></div><div class="profile-actions full-span"><button class="button \${editable?"":"hidden"}" type="submit">Save Profile</button><p class="helper-text">Only text profile data is saved.</p></div></section>\`:""}</div>\`;`;
appJs = appJs.replace(appChunk2OldEnd, appChunk2NewEnd);

// Fix 4: Task time prompt -> Modal
const appChunk4Old = `    if (!task.completed) {
      const hoursStr = window.prompt(\`Hours spent on "\${task.title}":\`, "0");
      if (hoursStr === null) return;
      const minutesStr = window.prompt(\`Minutes spent on "\${task.title}":\`, "0");
      if (minutesStr === null) return;
      
      const hours = parseInt(hoursStr) || 0;
      const minutes = parseInt(minutesStr) || 0;
      
      if (hours === 0 && minutes === 0) {
        window.alert("Please enter a valid duration.");
        return;
      }
      
      await cloudUpdateTaskCompletion(id, true, user);
      
      const taskPoint = {
        id: \`PT-\${Date.now()}-task\`,
        text: \`Completed assigned task: \${task.title}\`,
        rawText: \`Completed assigned task: \${task.title}\`,
        totalTime: \`\${hours}h \${minutes}m\`,
        attachmentName: "", attachmentData: "", attachmentSize: "",
        createdAt: nowIso()
      };
      
      const existingReport = reports().find(r => r.employeeId === user.employeeId && r.date === today());
      const appendResult = existingReport ? mergeDraftPointsIntoReport(existingReport, [taskPoint]) : null;
      
      const report = appendResult?.report || {
        id: \`RPT-\${user.employeeId}-\${today()}\`,
        employeeId: user.employeeId, employeeName: user.name,
        managerId: user.managerId || "", managerName: user.managerName || "",
        date: today(), type: task.type || "internal",
        title: task.type === "project" ? "Project-Specific DAR" : "DAR",
        projectName: task.type === "project" ? task.title : "",
        approvalStatus: "pending",
        reviewedBy: "", reviewedAt: "", reviewComment: "",
        submittedAt: nowIso(), points: [taskPoint]
      };
      
      await cloudUpsertReport(report);
      showToast("Task Completed", "Time logged and DAR point added.");
      renderPortal();
    }`;

const appChunk4New = `    if (!task.completed) {
      const modal = document.getElementById("taskTimeModal");
      const title = document.getElementById("taskTimeModalTitle");
      if(modal && title) {
        title.textContent = \`Complete Task: \${truncateText(task.title, 30)}\`;
        document.getElementById("taskTimeHours").value = "0";
        document.getElementById("taskTimeMinutes").value = "0";
        window.activeCompleteTaskId = id;
        modal.classList.remove("hidden");
      }
    }`;
appJs = appJs.replace(appChunk4Old, appChunk4New);

// Add activeCompleteTaskId definition and Modal event listeners at the bottom of app.js
const appChunk4AddOld = `document.addEventListener("DOMContentLoaded",initPortal);`;
const appChunk4AddNew = `
window.activeCompleteTaskId = null;
document.getElementById("taskTimeForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if(!window.activeCompleteTaskId) return;
  const hours = parseInt(document.getElementById("taskTimeHours").value) || 0;
  const minutes = parseInt(document.getElementById("taskTimeMinutes").value) || 0;
  if (hours === 0 && minutes === 0) {
    window.alert("Please enter a valid duration.");
    return;
  }
  const id = window.activeCompleteTaskId;
  window.activeCompleteTaskId = null;
  document.getElementById("taskTimeModal")?.classList.add("hidden");
  
  const task = tasks().find(t=>t.id===id);
  const user = activeUser();
  if(!task || !user) return;
  
  await cloudUpdateTaskCompletion(id, true, user);
  
  const taskPoint = {
    id: \`PT-\${Date.now()}-task\`,
    text: \`Completed assigned task: \${task.title}\`,
    rawText: \`Completed assigned task: \${task.title}\`,
    totalTime: \`\${hours}h \${minutes}m\`,
    attachmentName: "", attachmentData: "", attachmentSize: "",
    createdAt: nowIso()
  };
  
  const existingReport = reports().find(r => r.employeeId === user.employeeId && r.date === today());
  const appendResult = existingReport ? mergeDraftPointsIntoReport(existingReport, [taskPoint]) : null;
  
  const report = appendResult?.report || {
    id: \`RPT-\${user.employeeId}-\${today()}\`,
    employeeId: user.employeeId, employeeName: user.name,
    managerId: user.managerId || "", managerName: user.managerName || "",
    date: today(), type: task.type || "internal",
    title: task.type === "project" ? "Project-Specific DAR" : "DAR",
    projectName: task.type === "project" ? task.title : "",
    approvalStatus: "pending",
    reviewedBy: "", reviewedAt: "", reviewComment: "",
    submittedAt: nowIso(), points: [taskPoint]
  };
  
  await cloudUpsertReport(report);
  showToast("Task Completed", "Time logged and DAR point added.");
  renderPortal();
});

document.getElementById("closeTaskTimeModal")?.addEventListener("click", () => {
  document.getElementById("taskTimeModal")?.classList.add("hidden");
  window.activeCompleteTaskId = null;
});

document.addEventListener("DOMContentLoaded",initPortal);`;
appJs = appJs.replace(appChunk4AddOld, appChunk4AddNew);

// Fix 5: Notifications for Task Assignment
const taskFormGlobalOld1 = `const result=await assignTasksFromRows(bulkRows,viewer,eligibleTargets,feedback);
      event.target.reset();renderPortal();const nextFeedback=document.getElementById("globalTaskFeedback");if(nextFeedback)nextFeedback.textContent=result.message;return;`;
const taskFormGlobalNew1 = `const result=await assignTasksFromRows(bulkRows,viewer,eligibleTargets,feedback);
      event.target.reset();renderPortal();showToast("Tasks Assigned", result.message);return;`;
appJs = appJs.replace(taskFormGlobalOld1, taskFormGlobalNew1);

const taskFormGlobalOld2 = `const ok=await assignTasksFromRows([{target_id:targetId,type,title,notes,due_date:dueDate}],viewer,eligibleTargets,feedback);
    if(ok.success){event.target.reset();renderPortal();const nextFeedback=document.getElementById("globalTaskFeedback");if(nextFeedback)nextFeedback.textContent="Task assigned successfully.";}
  });`;
const taskFormGlobalNew2 = `const ok=await assignTasksFromRows([{target_id:targetId,type,title,notes,due_date:dueDate}],viewer,eligibleTargets,feedback);
    if(ok.success){event.target.reset();renderPortal();showToast("Task Assigned", "Task assigned successfully.");}
  });`;
appJs = appJs.replace(taskFormGlobalOld2, taskFormGlobalNew2);

const taskFormManagerOld1 = `const result=await assignTasksFromRows(bulkRows,viewer,eligibleTargets,feedback);
      event.target.reset();renderPortal();const nextFeedback=document.getElementById("managerTaskFeedback");if(nextFeedback)nextFeedback.textContent=result.message;return;`;
const taskFormManagerNew1 = `const result=await assignTasksFromRows(bulkRows,viewer,eligibleTargets,feedback);
      event.target.reset();renderPortal();showToast("Tasks Assigned", result.message);return;`;
appJs = appJs.replace(taskFormManagerOld1, taskFormManagerNew1);

const taskFormManagerOld2 = `const ok=await assignTasksFromRows([{target_id:targetId,type,title,notes,due_date:dueDate}],viewer,eligibleTargets,feedback);
    if(ok.success){event.target.reset();renderPortal();const nextFeedback=document.getElementById("managerTaskFeedback");if(nextFeedback)nextFeedback.textContent="Task assigned successfully.";}
  });`;
const taskFormManagerNew2 = `const ok=await assignTasksFromRows([{target_id:targetId,type,title,notes,due_date:dueDate}],viewer,eligibleTargets,feedback);
    if(ok.success){event.target.reset();renderPortal();showToast("Task Assigned", "Task assigned successfully.");}
  });`;
appJs = appJs.replace(taskFormManagerOld2, taskFormManagerNew2);


fs.writeFileSync('d:/All websites/DAR/metro-pulse-dar-portal/app.js', appJs);

let css = fs.readFileSync('d:/All websites/DAR/metro-pulse-dar-portal/styles.css', 'utf8');

// Fix 3: Theme Toggle Maroon
const cssThemeOld1 = `body[data-page="portal"].portal-logged-in .theme-switch-btn.is-active {
    background: #ffffff !important;
    color: #333333 !important;
  }`;
const cssThemeNew1 = `body[data-page="portal"].portal-logged-in .theme-switch-btn.is-active {
    background: #c0002a !important;
    color: #ffffff !important;
  }`;
css = css.replace(cssThemeOld1, cssThemeNew1);

const cssThemeOld2 = `.theme-switch-btn.is-active {
    background: #ffffff !important;
    color: #333333 !important;
  }`;
const cssThemeNew2 = `.theme-switch-btn.is-active {
    background: #c0002a !important;
    color: #ffffff !important;
  }`;
css = css.replace(cssThemeOld2, cssThemeNew2);

fs.writeFileSync('d:/All websites/DAR/metro-pulse-dar-portal/styles.css', css);

console.log("Fixes applied successfully.");
