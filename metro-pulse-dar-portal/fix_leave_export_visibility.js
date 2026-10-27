const fs = require('fs');
let appJs = fs.readFileSync('app.js', 'utf8');

appJs = appJs.replace(
  /const historyBtn = document\.getElementById\("btnLeaveHistoryAdmin"\);/g,
  `const historyBtn = document.getElementById("btnLeaveHistoryAdmin");
  const exportBtn = document.getElementById("btnLeaveExport");
  const exportMonth = document.getElementById("leaveExportMonth");
  // Set default export month to current month
  if (exportMonth && !exportMonth.value) {
    const today = new Date();
    exportMonth.value = today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, '0');
  }`
);

appJs = appJs.replace(
  /if \(historyBtn\) historyBtn\.classList\.remove\("hidden"\);/g,
  `if (historyBtn) historyBtn.classList.remove("hidden");
    if (exportBtn) exportBtn.classList.remove("hidden");
    if (exportMonth) exportMonth.classList.remove("hidden");`
);

appJs = appJs.replace(
  /if \(historyBtn\) historyBtn\.classList\.add\("hidden"\);/g,
  `if (historyBtn) historyBtn.classList.add("hidden");
    if (exportBtn) exportBtn.classList.add("hidden");
    if (exportMonth) exportMonth.classList.add("hidden");`
);

fs.writeFileSync('app.js', appJs);
console.log("Updated renderLeaveSection to show export button instead of history button");
