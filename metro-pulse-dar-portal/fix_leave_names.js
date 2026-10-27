const fs = require('fs');
let appJs = fs.readFileSync('app.js', 'utf8');

// Replace the simple \${escapeHtml(l.employeeName)} with a dynamic lookup in renderLeaveSection
appJs = appJs.replace(
  /const allLeaves = leaves\(\);/g,
  `const allLeaves = leaves();
    const getEmpName = (l) => { 
      const u = users().find(u => u.employeeId === l.employeeId);
      return u ? u.name : l.employeeName; 
    };`
);

appJs = appJs.replace(
  /\\\$\\{escapeHtml\(l\.employeeName\)\\}/g,
  `\${escapeHtml(getEmpName(l))}`
);

fs.writeFileSync('app.js', appJs);
console.log("Fixed leave employee names in app.js");
