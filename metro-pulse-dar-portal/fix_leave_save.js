const fs = require('fs');
let appJs = fs.readFileSync('app.js', 'utf8');

// Fix the saveLeave call
appJs = appJs.replace(
  /if \(typeof cloudSaveLeave === 'function'\) await cloudSaveLeave\(newLeave\);/,
  'await saveLeave(newLeave);'
);

fs.writeFileSync('app.js', appJs);
console.log("Fixed leave save function call.");
