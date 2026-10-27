const fs = require('fs');
let appJs = fs.readFileSync('app.js', 'utf8');

// The block I added was at the end of app.js. I'll replace the table rendering part of it.
appJs = appJs.replace(
  /\/\/ Render Table[\s\S]*?(?=\/\/ Delegated listener for row toggling)/,
  `// Render sub sections (restored from original)
  renderComplianceEntities(user);
  renderComplianceDepartments(user);
}

`
);

fs.writeFileSync('app.js', appJs);
console.log("Updated renderCompliance to use original Entity/Department rendering");
