const fs = require('fs');
let html = fs.readFileSync('portal.html', 'utf8');

// The line is: <section class="panel hidden" id="leaveSection" style="background:var(--bg); border:none; box-shadow:none;">
html = html.replace(
  /<section class="panel hidden" id="leaveSection" style="background:var\(--bg\);/g,
  '<section class="panel hidden" id="leaveSection" style="background:#ffffff;'
);

fs.writeFileSync('portal.html', html);
console.log("Updated background color for leaveSection to #ffffff");
