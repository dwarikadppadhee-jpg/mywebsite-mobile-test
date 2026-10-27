const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf8');

const navConfigTarget = `function navConfig(user){
  if(isAdmin(user))return[{id:"orgOverviewSection",label:"Overview"},{id:"complianceSection",label:"DAR Review"},{id:"userManagementSection",label:"User Management"}];
  if(isLevel1(user))return[{id:"orgOverviewSection",label:"Overview"},{id:"complianceSection",label:"DAR Review"},{id:"globalTaskSection",label:"Task Assign"},{id:"emailReminderSection",label:"Email Reminders"},{id:"historySection",label:"History"}];
  if(isLevel2(user))return[{id:"darSection",label:"DAR"},{id:"tasksSection",label:"My Tasks"},/*{id:"teamReportsSection",label:"My Team"},{id:"subordinateSection",label:"Task Assign"},*/{id:"historySection",label:"History"}];
  return[{id:"darSection",label:"DAR"},{id:"tasksSection",label:"My Tasks"},{id:"historySection",label:"History"}];
}`;

const navConfigNew = `function navConfig(user){
  if(isAdmin(user))return[{id:"orgOverviewSection",label:"Overview"},{id:"complianceSection",label:"DAR Review"},{id:"userManagementSection",label:"User Management"},{id:"leaveSection",label:"Leave"}];
  if(isLevel1(user))return[{id:"orgOverviewSection",label:"Overview"},{id:"complianceSection",label:"DAR Review"},{id:"globalTaskSection",label:"Task Assign"},{id:"emailReminderSection",label:"Email Reminders"},{id:"historySection",label:"History"},{id:"leaveSection",label:"Leave"}];
  if(isLevel2(user))return[{id:"darSection",label:"DAR"},{id:"tasksSection",label:"My Tasks"},{id:"historySection",label:"History"},{id:"leaveSection",label:"Leave"}];
  return[{id:"darSection",label:"DAR"},{id:"tasksSection",label:"My Tasks"},{id:"historySection",label:"History"},{id:"leaveSection",label:"Leave"}];
}`;
code = code.replace(navConfigTarget, navConfigNew);

const renderPortalTarget = `  renderDar(user);renderAdminIssues();renderUserManagement();renderAdminCollapsibles();renderGlobalTaskForm();`;
const renderPortalNew = `  renderDar(user);renderAdminIssues();renderUserManagement();renderAdminCollapsibles();renderGlobalTaskForm();renderLeaveManagement(user);`;
code = code.replace(renderPortalTarget, renderPortalNew);

const renderLeaveLogic = `
function renderLeaveManagement(user) {
  const container = document.getElementById("leaveSection");
  if (!container) return;

  const appContainer = document.getElementById("leaveApplicationContainer");
  const reviewContainer = document.getElementById("leaveReviewContainer");
  
  if (isLevel1(user) || isAdmin(user)) {
    if (appContainer) appContainer.classList.add("hidden");
    if (reviewContainer) reviewContainer.classList.remove("hidden");
    
    // Populate Review dashboard
    const todayStr = today();
    const allLeaves = leaves().filter(l => {
      const owner = findUser(l.employeeId);
      return owner && userHasAccessToEmployee(user, owner) && user.employeeId !== owner.employeeId;
    });
    
    // Sort leaves
    const todayLeaves = [];
    const futureLeaves = [];
    allLeaves.forEach(l => {
      if (l.startDate <= todayStr && l.endDate >= todayStr) todayLeaves.push(l);
      else if (l.startDate > todayStr) futureLeaves.push(l);
    });
    
    const todayCount = document.getElementById("leaveReviewTodayCount");
    const todayList = document.getElementById("leaveReviewTodayList");
    if (todayCount) todayCount.textContent = todayLeaves.length;
    if (todayList) {
      if (!todayLeaves.length) todayList.innerHTML = "<li>None</li>";
      else todayList.innerHTML = todayLeaves.map(l => {
        const u = findUser(l.employeeId);
        return \`<li><strong>\${escapeHtml(u?.name||l.employeeId)}</strong>: \${escapeHtml(l.remarks||"")} (\${escapeHtml(l.leaveType)})\</li>\`;
      }).join("");
    }
    
    const futureCount = document.getElementById("leaveReviewFutureCount");
    const futureList = document.getElementById("leaveReviewFutureList");
    if (futureCount) futureCount.textContent = futureLeaves.length;
    if (futureList) {
      if (!futureLeaves.length) futureList.innerHTML = "<li>None</li>";
      else futureList.innerHTML = futureLeaves.map(l => {
        const u = findUser(l.employeeId);
        return \`<li><strong>\${escapeHtml(u?.name||l.employeeId)}</strong>: \${escapeHtml(l.startDate)} to \${escapeHtml(l.endDate)} - \${escapeHtml(l.remarks||"")}</li>\`;
      }).join("");
    }
    
  } else {
    if (appContainer) appContainer.classList.remove("hidden");
    if (reviewContainer) reviewContainer.classList.add("hidden");
    
    // Populate Application history
    const historyList = document.getElementById("leaveHistoryList");
    if (historyList) {
      const myLeaves = leaves().filter(l => l.employeeId === user.employeeId).sort((a,b) => new Date(b.submittedAt) - new Date(a.submittedAt));
      if (!myLeaves.length) {
        historyList.innerHTML = '<div class="empty-state">No leave history.</div>';
      } else {
        historyList.innerHTML = myLeaves.map(l => {
          let dateStr = l.startDate;
          if (l.leaveType === "multi") dateStr += ' to ' + l.endDate;
          else if (l.leaveType === "half") dateStr += ' (' + l.halfType + ' half)';
          return \`<article class="assignment-card"><header><div><strong>\${escapeHtml(l.leaveType)} Leave</strong><p>\${escapeHtml(dateStr)}</p></div><span class="status-pill status-approved">Submitted</span></header><p>\${escapeHtml(l.remarks)}</p></article>\`;
        }).join("");
      }
    }
  }
}
`;
code = code.replace("function renderPortal(){", renderLeaveLogic + "\nfunction renderPortal(){");

fs.writeFileSync('app.js', code);
console.log("REPLACED SUCCESS!");
