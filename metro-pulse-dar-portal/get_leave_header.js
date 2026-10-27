const fs = require('fs');
const html = fs.readFileSync('portal.html', 'utf8');
const match = html.match(/<div style="display:flex; gap:10px; align-items:center;">[\s\S]*?<\/div>/);
console.log(match ? match[0] : "Not found");
