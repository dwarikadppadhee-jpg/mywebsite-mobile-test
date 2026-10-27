const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf8');

code = code.replace('if (isLevel1(user)) {', 'if (isLevel1(user) || isAdmin(user)) {');

fs.writeFileSync('app.js', code);
