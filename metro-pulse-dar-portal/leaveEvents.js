const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf8');

const leaveEventsStr = `
  // --- Leave Application Form ---
  const leaveType = document.getElementById("leaveType");
  const leaveDateGridMulti = document.getElementById("leaveDateGridMulti");
  const leaveDateGridSingle = document.getElementById("leaveDateGridSingle");
  const leaveHalfTypeGroup = document.getElementById("leaveHalfTypeGroup");
  const leaveDaysCount = document.getElementById("leaveDaysCount");
  
  const updateLeaveDays = () => {
    if (!leaveDaysCount) return;
    const type = leaveType?.value;
    if (type === "single" || type === "half") {
      leaveDaysCount.textContent = "Number of Days: 1";
    } else {
      const start = document.getElementById("leaveFromDate")?.value;
      const end = document.getElementById("leaveToDate")?.value;
      if (start && end) {
        const d1 = new Date(start);
        const d2 = new Date(end);
        const diff = d2 - d1;
        if (diff >= 0) {
          leaveDaysCount.textContent = "Number of Days: " + (Math.floor(diff / (1000 * 60 * 60 * 24)) + 1);
        } else {
          leaveDaysCount.textContent = "Number of Days: Invalid (End date before start date)";
        }
      } else {
        leaveDaysCount.textContent = "Number of Days: 0";
      }
    }
  };

  leaveType?.addEventListener("change", () => {
    const val = leaveType.value;
    if (val === "multi") {
      leaveDateGridMulti?.classList.remove("hidden");
      leaveDateGridSingle?.classList.add("hidden");
      leaveHalfTypeGroup?.classList.add("hidden");
      document.getElementById("leaveFromDate")?.setAttribute("required", "true");
      document.getElementById("leaveToDate")?.setAttribute("required", "true");
      document.getElementById("leaveSingleDate")?.removeAttribute("required");
    } else if (val === "single") {
      leaveDateGridMulti?.classList.add("hidden");
      leaveDateGridSingle?.classList.remove("hidden");
      leaveHalfTypeGroup?.classList.add("hidden");
      document.getElementById("leaveFromDate")?.removeAttribute("required");
      document.getElementById("leaveToDate")?.removeAttribute("required");
      document.getElementById("leaveSingleDate")?.setAttribute("required", "true");
    } else if (val === "half") {
      leaveDateGridMulti?.classList.add("hidden");
      leaveDateGridSingle?.classList.remove("hidden");
      leaveHalfTypeGroup?.classList.remove("hidden");
      document.getElementById("leaveFromDate")?.removeAttribute("required");
      document.getElementById("leaveToDate")?.removeAttribute("required");
      document.getElementById("leaveSingleDate")?.setAttribute("required", "true");
    }
    updateLeaveDays();
  });
  
  document.getElementById("leaveFromDate")?.addEventListener("change", updateLeaveDays);
  document.getElementById("leaveToDate")?.addEventListener("change", updateLeaveDays);

  document.getElementById("leaveApplicationForm")?.addEventListener("submit", async event => {
    event.preventDefault();
    const user = activeUser();
    if (!user) return;
    
    const type = leaveType?.value || "multi";
    let start = "";
    let end = "";
    let half = "";
    
    if (type === "multi") {
      start = document.getElementById("leaveFromDate")?.value;
      end = document.getElementById("leaveToDate")?.value;
    } else {
      start = document.getElementById("leaveSingleDate")?.value;
      end = start;
      if (type === "half") half = document.getElementById("leaveHalfType")?.value;
    }
    
    const remarks = document.getElementById("leaveRemarks")?.value;
    
    const newLeave = {
      id: generateId(),
      employeeId: user.employeeId,
      leaveType: type,
      startDate: start,
      endDate: end,
      halfType: half,
      remarks: remarks,
      submittedAt: new Date().toISOString()
    };
    
    await saveLeave(newLeave);
    event.target.reset();
    leaveType?.dispatchEvent(new Event("change"));
    const feedback = document.getElementById("leaveFeedback");
    if (feedback) feedback.textContent = "Leave application submitted successfully!";
    setTimeout(() => { if (feedback) feedback.textContent = ""; }, 3000);
    renderLeaveManagement(user);
  });
  
  // History Search Panel Toggling
  const historyBtn = document.getElementById("leaveHistoryBtn");
  const historyPanel = document.getElementById("leaveHistorySearchPanel");
  historyBtn?.addEventListener("click", () => {
    historyPanel?.classList.toggle("hidden");
  });
  
  document.getElementById("leaveHistorySearchBtn")?.addEventListener("click", () => {
    const user = activeUser();
    if (!user) return;
    const dateInput = document.getElementById("leaveHistoryDate")?.value;
    const res = document.getElementById("leaveHistorySearchResult");
    if (!res) return;
    if (!dateInput) { res.textContent = "Please select a date to search."; return; }
    
    const targetLeaves = leaves().filter(l => {
      const owner = findUser(l.employeeId);
      return owner && userHasAccessToEmployee(user, owner) && user.employeeId !== owner.employeeId && l.startDate <= dateInput && l.endDate >= dateInput;
    });
    
    if (targetLeaves.length === 0) {
      res.innerHTML = "<em>No leaves found for " + escapeHtml(dateInput) + ".</em>";
    } else {
      res.innerHTML = targetLeaves.map(l => {
        const u = findUser(l.employeeId);
        return \`<div><strong>\${escapeHtml(u?.name||l.employeeId)}</strong>: \${escapeHtml(l.leaveType)} leave - \${escapeHtml(l.remarks)}</div>\`;
      }).join("");
    }
  });

  // --- End Leave Application Form ---
`;

if(!code.includes("leaveApplicationForm")) {
  const marker = `document.addEventListener("submit",async event=>{`;
  code = code.replace(marker, leaveEventsStr + "\n  " + marker);
  fs.writeFileSync('app.js', code);
  console.log("REPLACED SUCCESS!");
} else {
  console.log("ALREADY BOUND OR NO MATCH");
}
