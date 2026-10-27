const fs = require('fs');
const appJs = fs.readFileSync('app.js', 'utf8');
const lines = appJs.split('\n');
const start = lines.findIndex(l => l.includes("function renderLeaveSection(user) {"));
console.log(lines.slice(start, start + 60).join('\n'));
