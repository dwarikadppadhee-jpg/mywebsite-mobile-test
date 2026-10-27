const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf8');

const regex = /function customHolidays\(\) \{\s*return readStore\(STORAGE_KEYS\.holidays,\[\]\)\.map\(normalizeHoliday\)\.filter\(Boolean\);\s*\}/;

const newStr = `function customHolidays() {
  return readStore(STORAGE_KEYS.holidays,[]).map(normalizeHoliday).filter(Boolean);
}
function entities() {
  return readStore(STORAGE_KEYS.entities, []) || [];
}`;

if(regex.test(code)) {
  code = code.replace(regex, newStr);
  fs.writeFileSync('app.js', code);
  console.log("REPLACED SUCCESS!");
} else {
  console.log("NO MATCH");
}
