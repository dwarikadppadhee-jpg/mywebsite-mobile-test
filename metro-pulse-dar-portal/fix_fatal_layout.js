const fs = require('fs');
let html = fs.readFileSync('portal.html', 'utf8');

// Fix the extra </div> in emailReminderSection
// The block is:
//                 </div>
//               </div>
//               </div>
//               <div class="full-span reminder-summary-strip" style="display:flex; justify-content:space-between; align-items:center;">

html = html.replace(/<\/div>\s*<\/div>\s*<\/div>\s*<div class="full-span reminder-summary-strip"/, 
  `</div>\n              </div>\n              <div class="full-span reminder-summary-strip"`);

// Fix Leave Form ID in app.js
let appJs = fs.readFileSync('app.js', 'utf8');
appJs = appJs.replace(/const leaveForm = document\.getElementById\("leaveApplicationForm"\);/g, 'const leaveForm = document.getElementById("leaveForm");');

// In case leaveForm is referred to elsewhere:
// Actually, earlier I had `document.getElementById("leaveForm")?.addEventListener("submit", ...`
// Let's make sure it's strictly correct.

fs.writeFileSync('portal.html', html);
fs.writeFileSync('app.js', appJs);
console.log("Fixed layout mismatch and leave form ID.");
