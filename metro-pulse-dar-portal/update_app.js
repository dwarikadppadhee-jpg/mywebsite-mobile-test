const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf8');

// replace headers
code = code.replace(
  '<thead><tr><th style="width:36px"></th><th>Name</th><th>Employee ID</th><th>Role</th><th>Email</th><th>Reports To</th><th>Entity & Tags</th><th>Action</th></tr></thead>',
  '<thead><tr><th style="width:36px"></th><th>Name</th><th>Employee ID</th><th>Role</th><th>Work Location</th><th>Email</th><th>Official Phone</th><th>Personal Phone</th><th>Reports To</th><th>Entity & Tags</th><th>Level</th><th>Action</th></tr></thead>'
);

// replace map body
code = code.replace(/html \+= deptUsers\.map\(\(u,idx\)=>\{[\s\S]*?\}\)\.join\(""\);/, function(match) {
  return `html += deptUsers.map((u,idx)=>{
      const editing=editingAdminUserId===u.employeeId;
      if(editing){
        const entityOpts = \`<option value="">-- No Entity --</option>\` + allEntities.map(e => \`<option value="\${escapeHtml(e.name)}" \${u.entity===e.name?"selected":""}>\${escapeHtml(e.name)}</option>\`).join("");
        
        // Departments Multiselect
        const allDepts = Array.from(new Set(users().map(x=>x.department).filter(Boolean)));
        let deptsHtml = \`<select class="admin-inline-input" multiple size="3" data-edit-field="taggedDepartments">
          <option value="All Departments" \${(u.taggedDepartments||"").includes("All Departments")?"selected":""}>All Departments</option>
          \${allDepts.map(d => \`<option value="\${escapeHtml(d)}" \${(u.taggedDepartments||"").includes(d)?"selected":""}>\${escapeHtml(d)}</option>\`).join("")}
        </select>\`;

        // Entities Multiselect
        let entsHtml = \`<select class="admin-inline-input" multiple size="3" data-edit-field="taggedEntities">
          <option value="All Entities" \${(u.taggedEntities||"").includes("All Entities")?"selected":""}>All Entities</option>
          \${allEntities.map(e => \`<option value="\${escapeHtml(e.name)}" \${(u.taggedEntities||"").includes(e.name)?"selected":""}>\${escapeHtml(e.name)}</option>\`).join("")}
        </select>\`;

        let tagsHtml = "";
        let managerHtml = \`<input class="admin-inline-input" data-edit-field="managerId" list="userSearchList" value="\${escapeHtml(u.managerId||"")}" placeholder="Manager ID">\`;
        if (u.level === "1") {
          managerHtml = \`<input type="hidden" data-edit-field="managerId" value="">-\`;
          tagsHtml = \`<br><span>Tagged Depts:</span><br>\${deptsHtml}<br><span>Tagged Entities:</span><br>\${entsHtml}\`;
        }
        
        return \`<tr class="admin-user-edit-row \${idx%2===0?"":"cred-row-alt"}" data-editing-user="\${escapeHtml(u.employeeId)}">
          <td></td>
          <td><input class="admin-inline-input" data-edit-field="name" value="\${escapeHtml(u.name)}"></td>
          <td><input class="admin-inline-input" data-edit-field="employeeId" value="\${escapeHtml(u.employeeId)}"></td>
          <td><input class="admin-inline-input" data-edit-field="role" value="\${escapeHtml(u.role||"")}" placeholder="Software Engineer"></td>
          <td><input class="admin-inline-input" data-edit-field="workLocation" value="\${escapeHtml(u.location||"")}" placeholder="HQ"></td>
          <td><input class="admin-inline-input" data-edit-field="email" type="email" value="\${escapeHtml(u.email||"")}" placeholder="name@company.com"><br><input class="admin-inline-input" data-edit-field="department" value="\${escapeHtml(u.department)}" placeholder="Department"></td>
          <td><input class="admin-inline-input" data-edit-field="officialPhone" value="\${escapeHtml(u.officialPhone||"")}" placeholder="Official Phone"></td>
          <td><input class="admin-inline-input" data-edit-field="personalPhone" value="\${escapeHtml(u.personalPhone||"")}" placeholder="Personal Phone"></td>
          <td>\${managerHtml}</td>
          <td><select class="admin-inline-input" data-edit-field="entity">\${entityOpts}</select>\${tagsHtml}</td>
          <td><select class="admin-inline-input" data-edit-field="level">\${["admin","1","2","3"].map(level=>\`<option value="\${level}" \${u.level===level?"selected":""}>\${escapeHtml(ROLE_LABELS[level]||level)}</option>\`).join("")}</select></td>
          <td><div class="action-row"><button type="button" class="compact-button action-approve" data-save-user="\${escapeHtml(u.employeeId)}">Save</button><button type="button" class="compact-button" data-cancel-user-edit>Cancel</button></div></td>
        </tr>\`;
      }
      
      let tagDisplay = escapeHtml(u.entity||"-");
      if (u.level === "1") {
         const dTags = u.taggedDepartments ? \`Depts: \${u.taggedDepartments}\` : "";
         const eTags = u.taggedEntities ? \`Ents: \${u.taggedEntities}\` : "";
         if(dTags||eTags) {
            tagDisplay += \`<br><span style="font-size:0.8rem;color:var(--text-muted)">\${escapeHtml(dTags)}<br>\${escapeHtml(eTags)}</span>\`;
         }
      }
      
      return \`<tr class="\${idx%2===0?"":"cred-row-alt"}">
        <td>\${u.employeeId!==adminUser?.employeeId?\`<input type="checkbox" class="user-select-cb" data-id="\${escapeHtml(u.employeeId)}">\`:\`<span title="Cannot delete own account">-</span>\`}</td>
        <td><button type="button" class="profile-link" data-open-profile="\${escapeHtml(u.employeeId)}">\${escapeHtml(u.name)}</button></td>
        <td>\${escapeHtml(u.employeeId)}</td>
        <td>\${escapeHtml(u.role||"-")}</td>
        <td>\${escapeHtml(u.location||"-")}</td>
        <td>\${escapeHtml(u.email||"-")}<br><span style="font-size:0.8rem;color:var(--text-muted)">\${escapeHtml(u.department||"")}</span></td>
        <td>\${escapeHtml(u.officialPhone||"-")}</td>
        <td>\${escapeHtml(u.personalPhone||"-")}</td>
        <td>\${u.level === "1" ? "-" : escapeHtml(u.managerName||"-")}</td>
        <td>\${tagDisplay}</td>
        <td>\${escapeHtml(ROLE_LABELS[u.level]||u.level)}</td>
        <td><div class="action-row"><button type="button" class="compact-button" data-edit-user="\${escapeHtml(u.employeeId)}">Edit</button>\${u.employeeId!==adminUser?.employeeId?\`<button type="button" class="compact-button action-reject" data-delete-user="\${escapeHtml(u.employeeId)}">Delete</button>\`:\`<span class="helper-text">You</span>\`}</div></td>
      </tr>\`;
    }).join("");`;
});

// Update the save logic in renderAdminUsers
code = code.replace(/const get=field=>String\(row\.querySelector\(`\[data-edit-field="\$\{field\}"\]`\)\?\.value\|\|""\)\.trim\(\);/,
`const get = field => {
      const el = row.querySelector(\`[data-edit-field="\${field}"]\`);
      if (!el) return "";
      if (el.tagName === 'SELECT' && el.multiple) {
        return Array.from(el.selectedOptions).map(o => o.value).join(", ");
      }
      return String(el.value || "").trim();
    };`
);

code = code.replace(/const result=await cloudUpdateUserProfile\(originalId,\{employeeId,name:get\("name"\),level,department:get\("department"\),email:get\("email"\),managerId,entity:get\("entity"\),taggedDepartments:get\("taggedDepartments"\),taggedEntities:get\("taggedEntities"\)\}\);/,
  `const result=await cloudUpdateUserProfile(originalId,{employeeId,name:get("name"),level,department:get("department"),email:get("email"),managerId,entity:get("entity"),taggedDepartments:get("taggedDepartments"),taggedEntities:get("taggedEntities"),role:get("role"),location:get("workLocation"),officialPhone:get("officialPhone"),personalPhone:get("personalPhone")});`
);

// We must also define adminUploadExcelUsers globally
const adminUploadCode = `
window.adminUploadExcelUsers = async function(event) {
  const file = event.target.files[0];
  if (!file) return;
  const viewer = activeUser();
  if (!viewer || !canManageUsers(viewer)) return;

  showToast("Reading Excel...", "Parsing the uploaded file.");
  
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(firstSheet);
      
      let updatedCount = 0;
      let toUpsert = [];
      const currentUsers = users();
      
      for (const row of rows) {
        // Find existing user by Employee ID (various casing in sheet)
        const rowEmpId = row["Employee ID"] || row["employee_id"] || row["EmployeeId"];
        if (!rowEmpId) continue;
        
        const existingUser = currentUsers.find(u => u.employeeId.toUpperCase() === String(rowEmpId).toUpperCase());
        if (!existingUser) continue; // "should not create one more new data" -> skip if not found
        
        // Merge new data if provided in the Excel sheet
        const mergedUser = { ...existingUser };
        
        if (row["Role"]) mergedUser.role = row["Role"];
        if (row["Work Location"]) mergedUser.location = row["Work Location"];
        if (row["Official Phone"]) mergedUser.officialPhone = String(row["Official Phone"]);
        if (row["Personal Phone"]) mergedUser.personalPhone = String(row["Personal Phone"]);
        if (row["Email"]) mergedUser.email = row["Email"];
        if (row["Reports To"]) mergedUser.managerId = row["Reports To"];
        if (row["Entity"]) mergedUser.entity = row["Entity"];
        if (row["Level"]) mergedUser.level = String(row["Level"]).toLowerCase() === 'admin' ? 'admin' : String(row["Level"]).replace(/\\D/g, '') || "3";
        if (row["Name"]) mergedUser.name = row["Name"];
        
        toUpsert.push(mergedUser);
        updatedCount++;
      }
      
      if (toUpsert.length === 0) {
        showToast("No Changes", "No valid existing employees were found in the sheet.");
        event.target.value = '';
        return;
      }
      
      showToast("Syncing...", \`Updating \${updatedCount} users in cloud.\`);
      
      const { created, updated, warnings } = await cloudBulkImportUsers(toUpsert);
      if (warnings && warnings.length) {
         console.warn("Upload warnings:", warnings);
      }
      
      showToast("Success", \`Successfully updated \${updatedCount} user(s).\`);
      event.target.value = '';
      await refreshAllCloudData();
      renderPortal();
      
    } catch (err) {
      console.error(err);
      alert("Error parsing Excel: " + err.message);
      event.target.value = '';
    }
  };
  reader.readAsArrayBuffer(file);
};
`;

code += "\n" + adminUploadCode;

fs.writeFileSync('app.js', code);
