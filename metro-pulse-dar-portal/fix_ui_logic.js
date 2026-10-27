const fs = require('fs');
let appJs = fs.readFileSync('app.js', 'utf8');

// 1. Fix Version Notes default
appJs = appJs.replace(
  /let currentVersionNotes = \["Initial Release", "Bug fixes and improvements"\];/,
  'let currentVersionNotes = [];'
);

appJs = appJs.replace(
  /list\.innerHTML = currentVersionNotes\.map\(note => `<li style="margin-bottom: \\n8px;">\$\{escapeHtml\(note\)\}<\/li>`\)\.join\(''\);/,
  `if (currentVersionNotes.length === 0) {
          list.innerHTML = '<li style="margin-bottom: 8px;">No new updated</li>';
        } else {
          list.innerHTML = currentVersionNotes.map(note => \`<li style="margin-bottom: 8px;">\${escapeHtml(note)}</li>\`).join('');
        }`
);

// We should also replace the previous line without the newline char if it failed.
appJs = appJs.replace(
  /list\.innerHTML = currentVersionNotes\.map\(note => `<li style="margin-bottom: 8px;">\$\{escapeHtml\(note\)\}<\/li>`\)\.join\(''\);/g,
  `if (currentVersionNotes.length === 0) {
          list.innerHTML = '<li style="margin-bottom: 8px;">No new updated</li>';
        } else {
          list.innerHTML = currentVersionNotes.map(note => \`<li style="margin-bottom: 8px;">\${escapeHtml(note)}</li>\`).join('');
        }`
);

// 2. Fix KPI Card clicks (open drawer)
const oldFilterAll = /document\.getElementById\("filterAllButton"\)\?\.addEventListener\("click",\(\)=>\{complianceFilter="all";renderCompliance\(activeUser\(\)\);\}\);/g;
const newFilterAll = `
  document.getElementById("filterAllButton")?.addEventListener("click",()=>{
      complianceFilter="all"; renderCompliance(activeUser());
      openComplianceDrawer('All', 'All', 'daily');
      setTimeout(() => document.querySelector('#drawerTabs [data-filter="all"]')?.click(), 50);
  });
`;

const oldFilterSub = /document\.getElementById\("filterSubmittedButton"\)\?\.addEventListener\("click",\(\)=>\{complianceFilter="submitted";renderCompliance\(activeUser\(\)\);\}\);/g;
const newFilterSub = `
  document.getElementById("filterSubmittedButton")?.addEventListener("click",()=>{
      complianceFilter="submitted"; renderCompliance(activeUser());
      openComplianceDrawer('All', 'All', 'daily');
      setTimeout(() => document.querySelector('#drawerTabs [data-filter="submitted"]')?.click(), 50);
  });
`;

const oldFilterPen = /document\.getElementById\("filterPendingButton"\)\?\.addEventListener\("click",\(\)=>\{complianceFilter="pending";renderCompliance\(activeUser\(\)\);\}\);/g;
const newFilterPen = `
  document.getElementById("filterPendingButton")?.addEventListener("click",()=>{
      complianceFilter="pending"; renderCompliance(activeUser());
      openComplianceDrawer('All', 'All', 'daily');
      setTimeout(() => document.querySelector('#drawerTabs [data-filter="pending"]')?.click(), 50);
  });
`;

appJs = appJs.replace(oldFilterAll, newFilterAll);
appJs = appJs.replace(oldFilterSub, newFilterSub);
appJs = appJs.replace(oldFilterPen, newFilterPen);


fs.writeFileSync('app.js', appJs);
console.log("Updated app.js for Version Notes and KPI Card clicks");
