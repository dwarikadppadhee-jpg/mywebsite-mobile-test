const fs = require('fs');
let appJs = fs.readFileSync('app.js', 'utf8');

const updatedLoadVersionData = `
function loadVersionData() {
  const savedVersion = localStorage.getItem("appVersion");
  if (savedVersion) currentAppVersion = savedVersion;
  
  const savedNotes = localStorage.getItem("appVersionNotes");
  if (savedNotes) {
    try { currentVersionNotes = JSON.parse(savedNotes); } catch(e){}
  }
  
  // Update UI
  const verEls = document.querySelectorAll('.version-number');
  verEls.forEach(el => el.textContent = currentAppVersion);

  // Update live admin display if present
  const liveVer = document.getElementById("liveVersionNumber");
  if (liveVer) liveVer.textContent = currentAppVersion;
  
  const liveNotes = document.getElementById("liveVersionNotesList");
  if (liveNotes) {
     if (currentVersionNotes && currentVersionNotes.length > 0) {
         liveNotes.innerHTML = currentVersionNotes.map(n => "<li>" + escapeHtml(n) + "</li>").join("");
     } else {
         liveNotes.innerHTML = "<li>No release notes provided.</li>";
     }
  }
}
`;

appJs = appJs.replace(/function loadVersionData\(\) \{[\s\S]*?\}\s*function initVersionControl\(\)/, updatedLoadVersionData + "\nfunction initVersionControl()");

// Also, the user says "should only visible not any other which is now appearing." 
// This means we should clear the adminVersionNotes field after saving, or leave it. 
// "instantly reflect the Version number live as welll as all the change Details added by the admin like added this feature or any other should only visible not any other which is now appearing."
// It seems they want the live display to ONLY show the current notes. This is achieved by our `#liveVersionNotesList` replacing the generic placeholder.
// Let's also make it so the input fields get cleared out after save? Or maybe populated with the current data.
// In saveVersionBtn handler:
// verInput.value = ""; notesInput.value = "";
const saveBtnRegex = /saveBtn\.addEventListener\("click", \(\) => \{[\s\S]*?showToast\("Version details updated successfully!"\);/g;

let saveBtnMatch = appJs.match(saveBtnRegex)[0];
saveBtnMatch += "\n      verInput.value = '';\n      notesInput.value = '';";

appJs = appJs.replace(saveBtnRegex, saveBtnMatch);

fs.writeFileSync('app.js', appJs);
console.log("Updated Version Control logic");
