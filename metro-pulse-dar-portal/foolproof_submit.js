const fs = require('fs');
let html = fs.readFileSync('portal.html', 'utf8');

// Change type="submit" to type="button" and add an id to the button
html = html.replace(
  /<button type="submit" class="button" style="grid-column: 1 \/ -1; width: max-content; background:var\(--maroon\); color:white; border-radius:8px;">Submit Leave Request<\/button>/,
  '<button type="button" id="btnSubmitLeave" class="button" style="grid-column: 1 / -1; width: max-content; background:var(--maroon); color:white; border-radius:8px;">Submit Leave Request</button>'
);

fs.writeFileSync('portal.html', html);

let appJs = fs.readFileSync('app.js', 'utf8');

// Remove the old listener from inside DOMContentLoaded
appJs = appJs.replace(
  /const leaveForm = document\.getElementById\("leaveForm"\);\s*if \(leaveForm\) \{\s*leaveForm\.addEventListener\("submit", async \(e\) => \{[\s\S]*?\}\);\s*\}/,
  ''
);

// Add the new listener to the button click instead
const newListener = `
  const btnSubmitLeave = document.getElementById("btnSubmitLeave");
  if (btnSubmitLeave) {
    btnSubmitLeave.addEventListener("click", async (e) => {
      e.preventDefault();
      const user = activeUser();
      if (!user) return;
      
      const leaveForm = document.getElementById("leaveForm");
      if (!leaveForm.checkValidity()) {
        leaveForm.reportValidity();
        return;
      }
      
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
      
      try { 
        await saveLeave(newLeave); 
      } catch (e) {}
      
      leaveForm.reset();
      const modeSelect = document.getElementById("leaveDurationMode");
      modeSelect.value = "multi";
      modeSelect.dispatchEvent(new Event("change"));
      
      renderLeaveSection(user);
      showToast("Leave application submitted successfully!");
    });
  }
`;

// Insert the new listener into the DOMContentLoaded block
appJs = appJs.replace(
  /const dateLabel = document\.getElementById\("leaveDateLabel"\);/,
  'const dateLabel = document.getElementById("leaveDateLabel");\n  ' + newListener
);

fs.writeFileSync('app.js', appJs);

console.log("Made leave submission foolproof by using type='button'.");
