const fs = require('fs');
const appJs = fs.readFileSync('app.js', 'utf8');
const lines = appJs.split('\n');
console.log(lines.slice(6765, 6800).join('\n'));
