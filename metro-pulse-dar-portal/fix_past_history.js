const fs = require('fs');

let html = fs.readFileSync('portal.html', 'utf8');

const pastLeavesHtml = `
        <!-- Past Leaves Card -->
        <div class="panel" style="background:var(--panel); border:1px solid var(--line); border-radius:12px; padding:24px; position:relative; overflow:hidden; min-height: 250px;">
          <!-- Watermark -->
          <i class="fa-solid fa-clock-rotate-left" style="position:absolute; right:-20px; bottom:-20px; font-size:120px; color:rgba(128,128,128,0.04); z-index:0;"></i>
          
          <div style="display:flex; align-items:center; gap:10px; border-bottom:2px solid #888; padding-bottom:12px; margin-bottom:20px; position:relative; z-index:1;">
            <div style="background:rgba(128,128,128,0.1); color:#888; width:32px; height:32px; border-radius:8px; display:flex; align-items:center; justify-content:center;">
              <i class="fa-solid fa-clock-rotate-left"></i>
            </div>
            <h3 style="margin:0; font-family:'Barlow', sans-serif; color:var(--text); font-size:1.1rem; font-weight:700;">Past history</h3>
          </div>
          <div id="leaveManagerPastList" class="stack-list" style="position:relative; z-index:1; max-height:300px; overflow-y:auto; padding-right:10px;"></div>
        </div>
`;

// Insert after the Upcoming Leaves Card
html = html.replace(
  /(<div id="leaveManagerFutureList" class="stack-list".*?<\/div>\s*<\/div>)/,
  '$1\n' + pastLeavesHtml
);

// Also make the other cards use var(--panel) and var(--line) for proper dark mode support
html = html.replace(
  /<div style="background:#fffcfc; border:1px solid #ffe3e3; border-radius:12px; padding:24px; position:relative; overflow:hidden; min-height: 250px;">/g,
  '<div class="panel" style="padding:24px; border-radius:12px; position:relative; overflow:hidden; min-height: 250px;">'
);
html = html.replace(
  /<div style="background:#f6fbf7; border:1px solid #d3f9d8; border-radius:12px; padding:24px; position:relative; overflow:hidden; min-height: 250px;">/g,
  '<div class="panel" style="padding:24px; border-radius:12px; position:relative; overflow:hidden; min-height: 250px;">'
);

// And the Check Specific Date Card
html = html.replace(
  /<div style="background:#fff; border:1px solid #eaeaea; border-radius:12px; padding:24px; display:flex; flex-direction:column;">/,
  '<div class="panel" style="border-radius:12px; padding:24px; display:flex; flex-direction:column;">'
);

fs.writeFileSync('portal.html', html);

// Now update app.js to populate leaveManagerPastList
let appJs = fs.readFileSync('app.js', 'utf8');

const populatePastLeaves = `
    const pastLeaves = allLeaves.filter(l => {
      return (l.startDate || "") < todayStr && (l.endDate || l.startDate || "") < todayStr;
    }).sort((a,b) => (b.startDate || "").localeCompare(a.startDate || "")); // Sort descending
    
    const pastContainer = document.getElementById("leaveManagerPastList");
    if (pastContainer) {
      if (pastLeaves.length === 0) {
        pastContainer.innerHTML = '<div class="empty-state">No past leaves found.</div>';
      } else {
        pastContainer.innerHTML = pastLeaves.map(l => \`
          <div class="stack-item" style="border-left: 3px solid #888;">
            <div style="font-weight:bold;">\${escapeHtml(getEmpName(l))} (\${escapeHtml(l.employeeId)})</div>
            <div style="font-size:0.8rem; color:var(--muted);">\${l.startDate || "Unknown"} \${l.leaveType==='multi' ? 'to '+(l.endDate || "") : ''} (\${l.leaveType})</div>
            <div style="font-size:0.85rem; margin-top:4px; font-style:italic;">"\${escapeHtml(l.remarks)}"</div>
          </div>
        \`).join('');
      }
    }
`;

appJs = appJs.replace(
  /const futureContainer = document\.getElementById\("leaveManagerFutureList"\);[\s\S]*?\}\s*\}/,
  '$&\n' + populatePastLeaves
);

fs.writeFileSync('app.js', appJs);
console.log("Added Past history card for Admin/Level 1 and updated CSS for cards.");
