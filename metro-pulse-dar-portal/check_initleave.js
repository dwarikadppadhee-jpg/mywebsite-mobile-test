const fs = require('fs');
const appJs = fs.readFileSync('app.js', 'utf8');
const lines = appJs.split('\n');
const start = lines.findIndex(l => l.includes("function initLeaveInteractions()"));
console.log(lines.slice(start, start + 100).join('\n'));
