const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf8');

const oldBlock = `  const hierarchy=document.getElementById("organizationHierarchy");
  if(hierarchy){
    const l2=users().filter(u=>u.level==="2");
    if(!l2.length){hierarchy.className="stack-list empty-state";hierarchy.textContent="No Level 2 reporting structure available yet.";}
    else{hierarchy.className="hierarchy-grid";hierarchy.innerHTML=l2.map(mgr=>{const team=users().filter(u=>u.managerId===mgr.employeeId&&u.level==="3");return\`<article class="hierarchy-card"><header><strong>\${escapeHtml(mgr.name)}</strong><span>\${escapeHtml(mgr.employeeId)} | \${escapeHtml(mgr.department)}</span></header>\${team.length?\`<ul>\${team.map(m=>\`<li><strong>\${escapeHtml(m.name)}</strong> <span>(\${escapeHtml(m.employeeId)})</span></li>\`).join("")}</ul>\`:"<p>No Level 3 employees mapped.</p>"}</article>\`;}).join("");}
  }`;

code = code.replace(oldBlock, "  renderReportingStructure();");

fs.writeFileSync('app.js', code);
