const fs = require('fs');

// 1. Update portal.html to include taskTimeModal
let portalHtml = fs.readFileSync('portal.html', 'utf8');
if (!portalHtml.includes('id="taskTimeModal"')) {
  const modalHtml = `
    <!-- Task Time Modal -->
    <div id="taskTimeModal" class="modal-backdrop hidden">
      <div class="modal-card" style="max-width: 400px;">
        <div class="modal-header">
          <h3 id="taskTimeModalTitle">Complete Task</h3>
          <button type="button" class="icon-toggle" id="closeTaskTimeModal" aria-label="Close">
            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
          </button>
        </div>
        <div class="modal-body">
          <p class="helper-text" style="margin-bottom: 16px;">Log the total time spent on this task.</p>
          <form id="taskTimeForm" class="form-grid">
            <div style="display: flex; gap: 12px;">
              <label style="flex: 1;">
                Hours
                <input type="number" id="taskTimeHours" min="0" value="0" required>
              </label>
              <label style="flex: 1;">
                Minutes
                <input type="number" id="taskTimeMinutes" min="0" max="59" value="0" required>
              </label>
            </div>
            <button type="submit" class="button button-secondary" style="margin-top: 8px;">Log Time & Complete Task</button>
          </form>
        </div>
      </div>
    </div>
  `;
  // Insert before the closing body tag
  portalHtml = portalHtml.replace('</body>', modalHtml + '\n</body>');
  fs.writeFileSync('portal.html', portalHtml, 'utf8');
}

// 2. Update styles.css for modal generic styling if missing, but modal-backdrop and modal-card already exist!
// Wait, looking at portal.html, other modals like gate-auth-panel exist, but does 'modal-backdrop' exist?
// Let's add basic styles just in case to the end of styles.css.
let stylesCss = fs.readFileSync('styles.css', 'utf8');
if (!stylesCss.includes('.modal-backdrop')) {
  const css = `
.modal-backdrop { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); }
.modal-backdrop.hidden { display: none !important; }
.modal-card { background: var(--panel); border-radius: 12px; padding: 20px; width: 90%; box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.modal-header h3 { margin: 0; font-size: 1.25rem; color: var(--text); }
body.theme-dark .modal-card { background: var(--panel); box-shadow: 0 10px 30px rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.08); }
`;
  stylesCss += css;
  fs.writeFileSync('styles.css', stylesCss, 'utf8');
}

// 3. Update app.js
let appJs = fs.readFileSync('app.js', 'utf8');

// 3a. Phone View Hours Fix
const oldMobileHTML = 'const mobileHTML=visibleReports.map(report=>{';
if (appJs.includes(oldMobileHTML)) {
  const oldMobileLine = '<p>${escapeHtml(report.points.length)} DAR point${report.points.length===1?"":"s"}</p>';
  const newMobileLine = '<p>${escapeHtml(report.points.length)} DAR point${report.points.length===1?"":"s"} • ${escapeHtml(reportTotalTime(report)||"0h 0m")}</p>';
  appJs = appJs.replace(oldMobileLine, newMobileLine);
}

// 3b. Realtime Sidebar Sync Fix
const oldSidebarDraft = 'function renderSidebarDarStream(user){\n  const container=document.getElementById("sidebarDarStream");if(!container)return;\n  const draft=getDraft(user);';
const newSidebarDraft = `function renderSidebarDarStream(user){
  const container=document.getElementById("sidebarDarStream");if(!container)return;
  const draft=getDraft(user);
  const todayReport = reports().find(r => r.employeeId === user.employeeId && r.date === today());
  const combinedPoints = [...(draft.points || []), ...(todayReport ? todayReport.points : [])].sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt));
  const unifiedDraft = { points: combinedPoints };`;
if (appJs.includes(oldSidebarDraft)) {
  appJs = appJs.replace(oldSidebarDraft, newSidebarDraft);
  // Also we need to replace `draft.points` with `unifiedDraft.points` in the rest of renderSidebarDarStream.
  appJs = appJs.replace(/if\(!draft\.points\.length\)/g, 'if(!unifiedDraft.points.length)');
  appJs = appJs.replace(/container\.innerHTML=draft\.points\.map/g, 'container.innerHTML=unifiedDraft.points.map');
}

// 3c. Modal Logic & Reopen Prevention in renderTasks
const oldRenderTasksBody = `    if (!task.completed) {
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
    } else {
      await cloudUpdateTaskCompletion(id, false, user);
    }

    renderPortal();`;

const newRenderTasksBody = `    if (!task.completed) {
      // Open Modal
      const modal = document.getElementById("taskTimeModal");
      const titleEl = document.getElementById("taskTimeModalTitle");
      const hoursEl = document.getElementById("taskTimeHours");
      const minsEl = document.getElementById("taskTimeMinutes");
      if (!modal || !titleEl || !hoursEl || !minsEl) return;
      
      titleEl.textContent = \`Log time for: \${task.title}\`;
      hoursEl.value = "0";
      minsEl.value = "0";
      modal.classList.remove("hidden");
      
      // We will handle the actual completion in the modal submit listener inside initApp
      // Store the active task id in a global or on the form
      window.activeTaskToComplete = id;
    }`;

appJs = appJs.replace(oldRenderTasksBody, newRenderTasksBody);

// We need to disable the button when it's completed
appJs = appJs.replace(
  '<button type="button" class="button button-secondary" data-complete-task="${escapeHtml(t.id)}">${t.completed?"Reopen":"Mark complete"}</button>',
  '${t.completed ? `<span class="status-pill status-approved" style="margin-right:12px;"><i class="fa-solid fa-check"></i> Completed</span>` : `<button type="button" class="button button-secondary" data-complete-task="${escapeHtml(t.id)}">Mark complete</button>`}'
);

// We also need to add the global listener for the Modal
const modalLogic = `
// ─── Task Time Modal Logic ───────────────────────────────────────
function initTaskTimeModal() {
  const modal = document.getElementById("taskTimeModal");
  const closeBtn = document.getElementById("closeTaskTimeModal");
  const form = document.getElementById("taskTimeForm");
  
  if (!modal || !closeBtn || !form) return;
  
  closeBtn.addEventListener("click", () => {
    modal.classList.add("hidden");
    window.activeTaskToComplete = null;
  });
  
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!window.activeTaskToComplete) return;
    
    const id = window.activeTaskToComplete;
    const task = tasks().find(t=>t.id===id);
    const user = activeUser();
    if (!task || !user) return;
    
    const hours = parseInt(document.getElementById("taskTimeHours").value) || 0;
    const minutes = parseInt(document.getElementById("taskTimeMinutes").value) || 0;
    
    if (hours === 0 && minutes === 0) {
      window.alert("Please enter a valid duration.");
      return;
    }
    
    modal.classList.add("hidden");
    window.activeTaskToComplete = null;
    
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
}
`;

appJs = appJs.replace('function initApp(){', modalLogic + '\nfunction initApp(){\n  initTaskTimeModal();');

fs.writeFileSync('app.js', appJs, 'utf8');

console.log("Successfully applied all implementations.");
