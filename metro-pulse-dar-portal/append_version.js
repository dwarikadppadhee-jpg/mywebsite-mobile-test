const fs = require('fs');
let appJs = fs.readFileSync('app.js', 'utf8');

const versionLogic = `
// =========================================================================
// VERSION CONTROL LOGIC
// =========================================================================
let currentAppVersion = "V1.0.0";
let currentVersionNotes = ["Initial Release", "Bug fixes and improvements"];

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
}

function initVersionControl() {
  loadVersionData();
  
  // Admin save button
  const saveBtn = document.getElementById("saveVersionBtn");
  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      const verInput = document.getElementById("adminVersionInput");
      const notesInput = document.getElementById("adminVersionNotes");
      
      if (!verInput.value.trim()) return alert("Please enter a version number.");
      
      const newVer = verInput.value.trim();
      const newNotes = notesInput.value.split("\\n").filter(n => n.trim().length > 0);
      
      localStorage.setItem("appVersion", newVer);
      localStorage.setItem("appVersionNotes", JSON.stringify(newNotes));
      
      loadVersionData();
      showToast("Version details updated successfully!");
    });
  }
  
  // Clicks on version number to show modal
  document.addEventListener("click", (e) => {
    if (e.target.closest(".version-number") || e.target.closest(".whats-new-arrow-label")) {
      const modal = document.getElementById("versionModal");
      const title = document.getElementById("modalVersionTitle");
      const list = document.getElementById("modalVersionList");
      
      if (modal && title && list) {
        title.textContent = currentAppVersion;
        list.innerHTML = currentVersionNotes.map(note => \`<li style="margin-bottom: 8px;">\${escapeHtml(note)}</li>\`).join('');
        modal.classList.remove("hidden");
      }
    }
  });
  
  const closeBtn = document.getElementById("closeVersionModal");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      document.getElementById("versionModal").classList.add("hidden");
    });
  }
}

// Attach initVersionControl to DOMContentLoaded
document.addEventListener("DOMContentLoaded", initVersionControl);
`;

appJs += "\n" + versionLogic;

fs.writeFileSync('app.js', appJs);
console.log("Version control logic appended.");
