const fs = require('fs');
let appJs = fs.readFileSync('app.js','utf8');

// The regex matches exactly the button that says "Reopen"
const targetRegex = /<button type="button" class="button button-secondary" data-complete-task="\${escapeHtml\(t\.id\)}">\${t\.completed\?"Reopen":"Mark complete"}<\/button>/g;
const replacement = '${t.completed ? `<span class="status-pill status-approved" style="margin-right:12px;"><i class="fa-solid fa-check"></i> Completed</span>` : `<button type="button" class="button button-secondary" data-complete-task="${escapeHtml(t.id)}">Mark complete</button>`}';

appJs = appJs.replace(targetRegex, replacement);

fs.writeFileSync('app.js', appJs, 'utf8');
console.log("Successfully removed all remaining Reopen buttons!");
