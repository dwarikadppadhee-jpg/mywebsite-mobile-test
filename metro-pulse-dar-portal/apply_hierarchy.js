const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf8');

const reportingState = `
let repDeptFilter = "All";
let repEntityFilter = "All";
let repSearchTerm = "";

function renderReportingStructure() {
  const hierarchy = document.getElementById("organizationHierarchy");
  if (!hierarchy) return;

  const viewer = activeUser();
  if (!viewer) return;

  let targetUsers = users().filter(u => u.level === "2" || u.level === "3");

  if (repDeptFilter !== "All") {
      targetUsers = targetUsers.filter(u => (u.department || "") === repDeptFilter);
  }
  if (repEntityFilter !== "All") {
      targetUsers = targetUsers.filter(u => (u.entity || "") === repEntityFilter);
  }
  if (repSearchTerm) {
      const q = repSearchTerm.toLowerCase();
      targetUsers = targetUsers.filter(u => u.name.toLowerCase().includes(q) || u.employeeId.toLowerCase().includes(q));
  }

  const allDepts = Array.from(new Set(users().map(u => u.department).filter(Boolean)));
  const allEntities = typeof entities === "function" ? entities().map(e => e.name) : [];
  
  const filterHtml = \`
    <div class="cred-filter-bar" style="justify-content: flex-start; gap: 1rem; align-items: center; flex-wrap: wrap;">
       <input type="text" id="repSearchInput" class="admin-inline-input" placeholder="Search by name or ID" value="\${escapeHtml(repSearchTerm)}" style="min-width: 200px;">
       <select id="repDeptSelect" class="admin-inline-input">
          <option value="All">All Departments</option>
          \${allDepts.map(d => \`<option value="\${escapeHtml(d)}" \${repDeptFilter===d?"selected":""}>\${escapeHtml(d)}</option>\`).join("")}
       </select>
       <select id="repEntitySelect" class="admin-inline-input">
          <option value="All">All Entities</option>
          \${allEntities.map(e => \`<option value="\${escapeHtml(e)}" \${repEntityFilter===e?"selected":""}>\${escapeHtml(e)}</option>\`).join("")}
       </select>
       <div style="flex:1;"></div>
       <button type="button" class="button button-primary" id="btnExportRep">
          <i class="fa-solid fa-file-excel"></i> Export HRMIS (Excel)
       </button>
    </div>
  \`;

  const tableHtml = \`
    <div class="admin-user-table-wrap table-wrap" style="margin-top: 1rem;">
      <table class="credential-table">
        <thead>
          <tr>
            <th style="width:36px">#</th>
            <th>Employee ID</th>
            <th>Name</th>
            <th>Entity Name</th>
            <th>Department</th>
            <th>Role</th>
            <th>Work Location</th>
            <th>Work E-Mail</th>
            <th>Official Mobile</th>
            <th>Personal Num</th>
            <th>Operational Manager Name</th>
          </tr>
        </thead>
        <tbody>
          \${targetUsers.length ? targetUsers.map((u, idx) => \`
            <tr class="\${idx % 2 === 0 ? "" : "cred-row-alt"}">
               <td class="cred-num">\${idx + 1}</td>
               <td>\${escapeHtml(u.employeeId)}</td>
               <td><button type="button" class="profile-link" data-open-profile="\${escapeHtml(u.employeeId)}">\${escapeHtml(u.name)}</button></td>
               <td>\${escapeHtml(u.entity || "-")}</td>
               <td>\${escapeHtml(u.department || "-")}</td>
               <td>\${escapeHtml(u.role || "-")}</td>
               <td>\${escapeHtml(u.location || "-")}</td>
               <td>\${escapeHtml(u.email || "-")}</td>
               <td>\${escapeHtml(u.officialPhone || "-")}</td>
               <td>\${escapeHtml(u.personalPhone || "-")}</td>
               <td>\${escapeHtml(u.managerName || u.managerId || "-")}</td>
            </tr>
          \`).join("") : \`<tr><td colspan="11" class="empty-state" style="padding:16px;">No users found.</td></tr>\`}
        </tbody>
      </table>
    </div>
  \`;

  hierarchy.className = "";
  hierarchy.innerHTML = filterHtml + tableHtml;

  document.getElementById("repSearchInput").addEventListener("input", (e) => {
      repSearchTerm = e.target.value;
      renderReportingStructure();
  });
  document.getElementById("repDeptSelect").addEventListener("change", (e) => {
      repDeptFilter = e.target.value;
      renderReportingStructure();
  });
  document.getElementById("repEntitySelect").addEventListener("change", (e) => {
      repEntityFilter = e.target.value;
      renderReportingStructure();
  });
  
  document.getElementById("btnExportRep").addEventListener("click", () => {
       if (typeof XLSX === "undefined") {
           alert("SheetJS library not loaded.");
           return;
       }
       const exportData = targetUsers.map(u => ({
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
       XLSX.writeFile(wb, "Reporting_Structure_HRMIS.xlsx");
  });
}
`;

if (!code.includes("renderReportingStructure")) {
    code = code.replace("function renderOverview(user){", reportingState + "\nfunction renderOverview(user){");
}

const oldHierarchyBlock = /const hierarchy=document\.getElementById\("organizationHierarchy"\);[\s\S]*?hierarchy\.innerHTML=l2\.map\(mgr=>\{[\s\S]*?\}\.join\(""\);\}\r?\n\s*\}/m;

code = code.replace(oldHierarchyBlock, "renderReportingStructure();");

fs.writeFileSync('app.js', code);
