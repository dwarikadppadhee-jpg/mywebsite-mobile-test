const fs = require('fs');

let appJs = fs.readFileSync('app.js', 'utf8');

// 1. Remove modal listener and init logic
const modalLogicStart = appJs.indexOf('// ─── Task Time Modal Logic');
const modalLogicEnd = appJs.indexOf('function initApp(){', modalLogicStart);
if (modalLogicStart !== -1 && modalLogicEnd !== -1) {
  appJs = appJs.substring(0, modalLogicStart) + appJs.substring(modalLogicEnd);
}
appJs = appJs.replace('function initApp(){\n  initTaskTimeModal();', 'function initApp(){');

// 2. Revert renderTasks to use window.prompt instead of opening modal
const oldModalTrigger = `    if (!task.completed) {
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

const newPromptLogic = `    if (!task.completed) {
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

appJs = appJs.replace(oldModalTrigger, newPromptLogic);

fs.writeFileSync('app.js', appJs, 'utf8');

console.log("Successfully reverted task time to system prompt.");
