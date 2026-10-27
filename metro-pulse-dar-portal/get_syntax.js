const fs = require('fs');
const appJs = fs.readFileSync('app.js', 'utf8');
const lines = appJs.split('\n');
console.log(lines.slice(6865, 6890).join('\n'));
