const fs = require('fs');

let appJs = fs.readFileSync('app.js', 'utf8');

const oldStr = `      <div class="action-row task-card-actions">
        <button type="button" class="compact-button \${completed?"action-reject":"action-approve"}" data-task-toggle-complete="\${escapeHtml(task.id)}">\${escapeHtml(actionLabel)}</button>
      </div>`;

const newStr = `      <div class="action-row task-card-actions">
        \${completed ? \`<span class="status-pill status-approved" style="margin-right:12px;"><i class="fa-solid fa-check"></i> Completed</span>\` : \`<button type="button" class="compact-button action-approve" data-task-toggle-complete="\${escapeHtml(task.id)}">Mark complete</button>\`}
      </div>`;

appJs = appJs.replace(oldStr, newStr);

fs.writeFileSync('app.js', appJs, 'utf8');

console.log("Successfully removed reopen option from renderTasks.");
