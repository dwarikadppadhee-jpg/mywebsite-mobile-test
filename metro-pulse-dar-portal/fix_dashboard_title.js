const fs = require('fs');
let appJs = fs.readFileSync('app.js', 'utf8');

const titleLogic = `
  // Clickable Dashboard Title
  document.getElementById("clickableDashboardTitle")?.addEventListener("click", () => {
     openComplianceDrawer('All', 'All', 'daily');
  });
`;

appJs = appJs.replace(
  /document\.getElementById\("exportMenuButton"\)\?\.addEventListener\("click",event=>\{/g,
  titleLogic + "\n  document.getElementById(\"exportMenuButton\")?.addEventListener(\"click\",event=>{"
);

fs.writeFileSync('app.js', appJs);
console.log("Added clickable dashboard title logic");
