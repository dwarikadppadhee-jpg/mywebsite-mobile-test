const fs = require('fs');
let appJs = fs.readFileSync('app.js', 'utf8');

// Replace all instances of \${escapeHtml(l.employeeName)} with \${escapeHtml(getEmpName(l))}
appJs = appJs.replace(/\$\{escapeHtml\(l\.employeeName\)\}/g, '${escapeHtml(getEmpName(l))}');

fs.writeFileSync('app.js', appJs);
console.log("Fixed employeeName display to getEmpName(l) in app.js");
