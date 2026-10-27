const fs = require('fs');
let appJs = fs.readFileSync('app.js', 'utf8');

const regex = /function renderLeaveSection\(user\) \{[\s\S]*?\}\s*function renderUserManagement\(\) \{/;

const newLogic = `function renderLeaveSection(user) {
  const empView = document.getElementById("leaveEmployeeView");
  const mgrView = document.getElementById("leaveManagerView");
  const historyBtn = document.getElementById("btnLeaveHistoryAdmin");
  
  if (!empView || !mgrView) return;
  
  if (isLevel1(user) || isAdmin(user)) {
    // Show Manager Dashboard
    empView.classList.add("hidden");
    mgrView.classList.remove("hidden");
    if (historyBtn) historyBtn.classList.remove("hidden");
    
    const allLeaves = leaves();
    const todayStr = dateKey(new Date());
    
    const onLeaveToday = allLeaves.filter(l => {
      if (l.leaveType === "single" || l.leaveType === "half") return l.startDate === todayStr;
      return todayStr >= l.startDate && todayStr <= l.endDate;
    });
    
    const futureLeaves = allLeaves.filter(l => {
      return l.startDate > todayStr;
    }).sort((a,b) => a.startDate.localeCompare(b.startDate));
    
    const todayContainer = document.getElementById("leaveManagerTodayList");
    if (todayContainer) {
      if (onLeaveToday.length === 0) {
        todayContainer.innerHTML = '<div class="empty-state">No one is on leave today.</div>';
      } else {
        todayContainer.innerHTML = onLeaveToday.map(l => \`
          <div class="stack-item" style="border-left: 3px solid var(--maroon);">
            <div style="font-weight:bold;">\${escapeHtml(l.employeeName)} (\${escapeHtml(l.employeeId)})</div>
            <div style="font-size:0.8rem; color:#666;">\${l.leaveType === 'half' ? 'Half Day ('+l.whichHalf+')' : (l.leaveType === 'multi' ? 'Multi-day' : 'Full Day')}</div>
            <div style="font-size:0.85rem; margin-top:4px; font-style:italic;">"\${escapeHtml(l.remarks)}"</div>
          </div>
        \`).join('');
      }
    }
    
    const futureContainer = document.getElementById("leaveManagerFutureList");
    if (futureContainer) {
      if (futureLeaves.length === 0) {
        futureContainer.innerHTML = '<div class="empty-state">No upcoming leaves scheduled.</div>';
      } else {
        futureContainer.innerHTML = futureLeaves.map(l => \`
          <div class="stack-item" style="border-left: 3px solid #2f9e44;">
            <div style="font-weight:bold;">\${escapeHtml(l.employeeName)} (\${escapeHtml(l.employeeId)})</div>
            <div style="font-size:0.8rem; color:#666;">\${l.startDate} \${l.leaveType==='multi' ? 'to '+l.endDate : ''} (\${l.leaveType})</div>
            <div style="font-size:0.85rem; margin-top:4px; font-style:italic;">"\${escapeHtml(l.remarks)}"</div>
          </div>
        \`).join('');
      }
    }
    
  } else {
    // Show Employee Form & History
    empView.classList.remove("hidden");
    mgrView.classList.add("hidden");
    if (historyBtn) historyBtn.classList.add("hidden");
    
    const myLeaves = leaves().filter(l => l.employeeId === user.employeeId).sort((a,b) => b.timestamp - a.timestamp);
    const histContainer = document.getElementById("leaveHistoryList");
    if (histContainer) {
      if (myLeaves.length === 0) {
        histContainer.innerHTML = '<div class="empty-state">No leave history found.</div>';
      } else {
        histContainer.innerHTML = myLeaves.map(l => \`
          <div class="stack-item">
            <div style="display:flex; justify-content:space-between;">
               <strong style="color:var(--maroon);">\${l.leaveType.toUpperCase()} LEAVE</strong>
               <span style="font-size:0.75rem; color:#888;">\${new Date(l.timestamp).toLocaleDateString()}</span>
            </div>
            <div style="font-size:0.85rem; margin-top:4px;">
              Date(s): \${l.startDate} \${l.leaveType==='multi' ? ' to ' + l.endDate : ''} \${l.leaveType==='half' ? '('+l.whichHalf+')' : ''}
            </div>
            <div style="font-size:0.85rem; margin-top:4px; font-style:italic; color:#555;">
              Reason: \${escapeHtml(l.remarks)}
            </div>
          </div>
        \`).join('');
      }
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // Duration Mode Logic
  const modeSelect = document.getElementById("leaveDurationMode");
  const fromDateGroup = document.getElementById("leaveFromDateGroup");
  const toDateGroup = document.getElementById("leaveToDateGroup");
  const halfGroup = document.getElementById("leaveHalfTypeGroup");
  const toDateInput = document.getElementById("leaveToDate");
  const dateLabel = document.getElementById("leaveDateLabel");
  
  if (modeSelect) {
    modeSelect.addEventListener("change", (e) => {
      const mode = e.target.value;
      if (mode === "multi") {
        toDateGroup.classList.remove("hidden");
        halfGroup.classList.add("hidden");
        toDateInput.required = true;
        dateLabel.innerHTML = 'From Date <span class="required">*</span>';
      } else if (mode === "single") {
        toDateGroup.classList.add("hidden");
        halfGroup.classList.add("hidden");
        toDateInput.required = false;
        dateLabel.innerHTML = 'Date <span class="required">*</span>';
      } else if (mode === "half") {
        toDateGroup.classList.add("hidden");
        halfGroup.classList.remove("hidden");
        toDateInput.required = false;
        dateLabel.innerHTML = 'Date <span class="required">*</span>';
      }
    });
  }

  // Handle Leave Submission
  const leaveForm = document.getElementById("leaveApplicationForm");
  if (leaveForm) {
    leaveForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const user = activeUser();
      if (!user) return;
      
      const mode = document.getElementById("leaveDurationMode").value;
      const start = document.getElementById("leaveFromDate").value;
      const end = mode === "multi" ? document.getElementById("leaveToDate").value : start;
      const half = mode === "half" ? document.getElementById("leaveHalfType").value : "";
      const remarks = document.getElementById("leaveRemarks").value;
      
      if (mode === "multi" && start > end) {
        return alert("End date cannot be before start date.");
      }
      
      const newLeave = {
        id: "LV-" + Date.now(),
        employeeId: user.employeeId,
        employeeName: user.name,
        leaveType: mode,
        startDate: start,
        endDate: end,
        whichHalf: half,
        remarks: remarks,
        timestamp: Date.now()
      };
      
      const allLeaves = leaves();
      allLeaves.push(newLeave);
      writeStore(STORAGE_KEYS.leaves, allLeaves);
      
      leaveForm.reset();
      // reset UI
      modeSelect.value = "multi";
      modeSelect.dispatchEvent(new Event("change"));
      
      renderLeaveSection(user);
      showToast("Leave application submitted successfully!");
    });
  }
  
  const histBtn = document.getElementById("btnLeaveHistoryAdmin");
  if (histBtn) {
    histBtn.addEventListener("click", () => {
      showSection("historySection");
    });
  }
  
  const mgrDateCheck = document.getElementById("leaveManagerDateCheck");
  if (mgrDateCheck) {
    mgrDateCheck.addEventListener("change", (e) => {
      const targetStr = e.target.value;
      if (!targetStr) return;
      
      const allLeaves = leaves();
      const onLeaveThatDay = allLeaves.filter(l => {
        if (l.leaveType === "single" || l.leaveType === "half") return l.startDate === targetStr;
        return targetStr >= l.startDate && targetStr <= l.endDate;
      });
      
      const resContainer = document.getElementById("leaveManagerDateResult");
      if (onLeaveThatDay.length === 0) {
        resContainer.innerHTML = '<div class="empty-state">No one is on leave on this date.</div>';
      } else {
        resContainer.innerHTML = onLeaveThatDay.map(l => \`
          <div class="stack-item" style="border-left: 3px solid #228be6;">
            <div style="font-weight:bold;">\${escapeHtml(l.employeeName)} (\${escapeHtml(l.employeeId)})</div>
            <div style="font-size:0.8rem; color:#666;">\${l.leaveType === 'half' ? 'Half Day ('+l.whichHalf+')' : (l.leaveType === 'multi' ? 'Multi-day' : 'Full Day')}</div>
            <div style="font-size:0.85rem; margin-top:4px; font-style:italic;">"\${escapeHtml(l.remarks)}"</div>
          </div>
        \`).join('');
      }
    });
  }
});

function renderUserManagement() {`;

if (appJs.match(regex)) {
  appJs = appJs.replace(regex, newLogic);
  fs.writeFileSync('app.js', appJs);
  console.log("Replaced renderLeaveSection in app.js");
} else {
  console.log("Regex did not match!");
}
