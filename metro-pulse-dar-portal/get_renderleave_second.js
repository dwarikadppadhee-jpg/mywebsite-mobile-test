const fs = require('fs');
const appJs = fs.readFileSync('app.js', 'utf8');
const lines = appJs.split('\n');
const indexes = [];
lines.forEach((l, i) => { if (l.includes("function renderLeaveSection(user) {")) indexes.push(i); });
console.log(indexes);
if (indexes.length > 1) {
  console.log("--- SECOND DEFINITION ---");
  console.log(lines.slice(indexes[1], indexes[1] + 60).join('\n'));
}
