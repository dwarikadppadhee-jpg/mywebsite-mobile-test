const fs = require('fs');
let appJs = fs.readFileSync('app.js', 'utf8');

appJs = appJs.replace(
  /\} pending employee\(s\) need office email first.`\s*:\s*"Select one or more pending employees, then open Outlook\.";\s*\}/,
  ""
);

fs.writeFileSync('app.js', appJs);
console.log("Fixed syntax error 2");
