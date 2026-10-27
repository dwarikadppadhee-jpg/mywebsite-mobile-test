const fs = require('fs');
let html = fs.readFileSync('portal.html', 'utf8');

// 1. Re-add the History button next to the Export button
html = html.replace(
  /<button id="btnLeaveExport"/,
  '<button id="btnLeaveHistoryAdmin" class="btn hidden" style="background:var(--maroon); color:white; border:none; padding:8px 16px; border-radius:8px; cursor:pointer;"><i class="fa-solid fa-clock-rotate-left" style="margin-right:8px;"></i>History</button>\n      <button id="btnLeaveExport"'
);

// 2. Ensure Submit Leave Request button is type="submit"
// Wait, in fix_leave_form.js I used <button type="submit" ...>Submit Leave Request</button>
// So it is already type="submit" if that script ran correctly.
// Let's explicitly replace it just in case.
html = html.replace(
  /<button type="button" id="btnSubmitLeave" class="button" style="grid-column: 1 \/ -1; width: max-content; background:var\(--maroon\); color:white; border-radius:8px;">Submit Leave Request<\/button>/,
  '<button type="submit" id="btnSubmitLeave" class="button" style="grid-column: 1 / -1; width: max-content; background:var(--maroon); color:white; border-radius:8px;">Submit Leave Request</button>'
);

fs.writeFileSync('portal.html', html);

let appJs = fs.readFileSync('app.js', 'utf8');

// 3. Fix app.js to use leaveForm submit event instead of btnSubmitLeave click event.
// Replace:
// btnSubmitLeave.addEventListener("click", async (e) => {
// With:
// const leaveForm = document.getElementById("leaveForm");
// if (leaveForm) { leaveForm.addEventListener("submit", async (e) => {
const oldSubmitListener = /btnSubmitLeave\.addEventListener\("click", async \(e\) => \{/;
const newSubmitListener = `const leaveForm = document.getElementById("leaveForm");
  if (leaveForm) {
    leaveForm.addEventListener("submit", async (e) => {`;
    
appJs = appJs.replace(oldSubmitListener, newSubmitListener);

// We need to change the closing bracket of that listener.
// In app.js:
//       showToast("Leave application submitted successfully!");
//     });
//   }
// Let's replace:
//       showToast("Leave application submitted successfully!");
//     });
//   }
// with:
//       showToast("Leave application submitted successfully!");
//     });
//   }

// Also remove `const leaveForm = document.getElementById("leaveForm");` inside the listener to prevent redeclaration if using const.
appJs = appJs.replace(
  /const leaveForm = document\.getElementById\("leaveForm"\);\s*if \(!leaveForm\.checkValidity\(\)\) \{\s*leaveForm\.reportValidity\(\);\s*return;\s*\}/,
  `// Form validity is handled by native browser submit`
);

fs.writeFileSync('app.js', appJs);
console.log("Updated app.js for leave form submit fix");
