const fs = require('fs');
let appJs = fs.readFileSync('app.js', 'utf8');

const regex = /if \(isAdmin\(user\)\) \{\s*empView\.classList\.add\("hidden"\);\s*\} else \{\s*empView\.classList\.remove\("hidden"\);\s*\}/;

const replacement = `empView.classList.add("hidden");`;

appJs = appJs.replace(regex, replacement);

fs.writeFileSync('app.js', appJs);
console.log("Updated renderLeaveSection visibility logic.");
