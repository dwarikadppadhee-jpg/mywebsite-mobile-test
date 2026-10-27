const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf8');

// 1. Remove the old hierarchy block from renderOverview
const oldHierarchyBlock = /const hierarchy=document\.getElementById\("organizationHierarchy"\);\s*if\(hierarchy\)\{[\s\S]*?\}\)/m;
// Let's be safer and match exactly what's there
const exactOldHierarchy = `  const hierarchy=document.getElementById("organizationHierarchy");
  if(hierarchy){
    const l2=users().filter(u=>u.level==="2");
    if(!l2.length){hierarchy.className="stack-list empty-state";hierarchy.textContent="No Level 2 reporting structure available yet.";}
    else{hierarchy.className="hierarchy-grid";hierarchy.innerHTML=l2.map(mgr=>{const team=users().filter(u=>u.managerId===mgr.employeeId&&u.level==="3");return\`<article class="hierarchy-card"><header><strong>\${escapeHtml(mgr.name)}</strong><span>\${escapeHtml(mgr.employeeId)} | \${escapeHtml(mgr.department)}</span></header>\${team.length?\`<ul>\${team.map(m=>\`<li><strong>\${escapeHtml(m.name)}</strong> <span>(\${escapeHtml(m.employeeId)})</span></li>\`).join("")}</ul>\`:"<p>No Level 3 employees mapped.</p>"}</article>\`;}).join("");}
  }`;

code = code.replace(exactOldHierarchy, '  renderReportingStructure();');

// 2. Update the export logic in renderReportingStructure to use an HTML table for styling
const oldExportBlock = `       const exportData = targetUsers.map(u => ({
           "Employee ID": u.employeeId,
           "Name": u.name,
           "Entity Name": u.entity || "",
           "Department": u.department || "",
           "Role": u.role || "",
           "Work Location": u.location || "",
           "Work E-Mail": u.email || "",
           "Official Mobile": u.officialPhone || "",
           "Personal Num": u.personalPhone || "",
           "Operational Manager Name": u.managerName || u.managerId || ""
       }));
       const ws = XLSX.utils.json_to_sheet(exportData);
       const wb = XLSX.utils.book_new();
       XLSX.utils.book_append_sheet(wb, ws, "Employees");
       XLSX.writeFile(wb, "Reporting_Structure_HRMIS.xlsx");`;

const newExportBlock = `       const exportData = targetUsers.map(u => ({
           "Employee ID": u.employeeId,
           "Name": u.name,
           "Entity Name": u.entity || "",
           "Department": u.department || "",
           "Role": u.role || "",
           "Work Location": u.location || "",
           "Work E-Mail": u.email || "",
           "Official Mobile": u.officialPhone || "",
           "Personal Num": u.personalPhone || "",
           "Operational Manager Name": u.managerName || u.managerId || ""
       }));
       
       let html = "<html xmlns:x=\\"urn:schemas-microsoft-com:office:excel\\"><head><meta charset=\\"UTF-8\\"></head><body>";
       html += "<table border=\\"1\\"><thead><tr>";
       
       // Header styling (different color, e.g. a dark blue/grey)
       const headerStyle = "background-color: #2c3e50; color: #ffffff; font-weight: bold; text-align: left;";
       const cellStyle = "background-color: #ffffff; color: #000000; text-align: left;";
       
       Object.keys(exportData[0]).forEach(key => {
           html += \`<th style="\${headerStyle}">\${escapeHtml(key)}</th>\`;
       });
       html += "</tr></thead><tbody>";
       
       exportData.forEach(row => {
           html += "<tr>";
           Object.values(row).forEach(val => {
               html += \`<td style="\${cellStyle}">\${escapeHtml(String(val))}</td>\`;
           });
           html += "</tr>";
       });
       html += "</tbody></table></body></html>";
       
       const blob = new Blob([html], { type: "application/vnd.ms-excel" });
       const url = URL.createObjectURL(blob);
       const a = document.createElement("a");
       a.href = url;
       a.download = "Reporting_Structure_HRMIS.xls";
       document.body.appendChild(a);
       a.click();
       document.body.removeChild(a);
       URL.revokeObjectURL(url);`;

code = code.replace(oldExportBlock, newExportBlock);

fs.writeFileSync('app.js', code);
