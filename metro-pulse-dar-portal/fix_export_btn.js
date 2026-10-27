const fs = require('fs');
let html = fs.readFileSync('portal.html', 'utf8');

const oldExport = /<button class="button button-secondary export-menu-toggle" id="exportMenuButton" type="button" aria-haspopup="true" aria-expanded="false">[\s\S]*?<\/button>/;
const newExport = `<button class="button export-menu-toggle" id="exportMenuButton" type="button" aria-haspopup="true" aria-expanded="false" style="background-color: var(--maroon); color: white; border-radius: 20px; padding: 6px 16px; font-size: 0.8rem; border:none;">
  <i class="fa-solid fa-download" aria-hidden="true" style="margin-right:5px;"></i>
  <span>Report Export</span>
</button>`;

html = html.replace(oldExport, newExport);
fs.writeFileSync('portal.html', html);
console.log("Updated Report Export button in portal.html");
