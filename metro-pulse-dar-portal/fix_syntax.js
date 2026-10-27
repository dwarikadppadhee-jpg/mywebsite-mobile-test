const fs = require('fs');
let appJs = fs.readFileSync('app.js', 'utf8');

appJs = appJs.replace(
  /const btnSubmitLeave = document\.getElementById\("btnSubmitLeave"\);\s*if \(btnSubmitLeave\) \{\s*const leaveForm = document\.getElementById\("leaveForm"\);\s*if \(leaveForm\) \{\s*leaveForm\.addEventListener\("submit", async \(e\) => \{/,
  `const leaveForm = document.getElementById("leaveForm");
  if (leaveForm) {
    leaveForm.addEventListener("submit", async (e) => {`
);

fs.writeFileSync('app.js', appJs);
console.log("Syntax error fixed.");
