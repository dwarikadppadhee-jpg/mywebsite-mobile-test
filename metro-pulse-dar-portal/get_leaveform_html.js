const fs = require('fs');
const html = fs.readFileSync('portal.html', 'utf8');
const match = html.match(/<form id="leaveForm"[\s\S]*?<\/form>/);
console.log(match ? match[0] : "Not found");
