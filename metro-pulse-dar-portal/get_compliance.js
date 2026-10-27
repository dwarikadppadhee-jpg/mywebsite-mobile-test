const fs = require('fs');
const html = fs.readFileSync('portal.html', 'utf8');
const match = html.match(/<section class="panel hidden" id="complianceSection">[\s\S]*?<\/section>/);
if (match) {
  console.log(match[0]);
} else {
  console.log("No match");
}
