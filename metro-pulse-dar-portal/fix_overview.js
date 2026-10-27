const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf8');

const regex = /const hierarchy=document\.getElementById\("organizationHierarchy"\);\r?\n\s*if\(hierarchy\)\{[\s\S]*?\}\r?\n\s*\}/m;
code = code.replace(regex, 'renderReportingStructure();');

fs.writeFileSync('app.js', code);
