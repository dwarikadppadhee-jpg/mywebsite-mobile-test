const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf8');

const regex = /function renderAdminUsers\(\)\{[\s\S]*?function renderUserManagement\(\)/;

const newRenderAdminUsers = `function renderAdminUsers(){
  const list=document.getElementById("adminUserList");if(!list)return;
  const adminUser=activeUser();const activeUsers=users().sort((a,b)=>a.name.localeCompare(b.name));
  
  const depts = {};
  for (const u of activeUsers) {
    const d = u.department || "Unassigned";
    if (!depts[d]) depts[d] = [];
    depts[d].push(u);
  }
  
  const allEntities = typeof entities === 'function' ? entities() : [];
  
  let html = \`
    <div class="bulk-delete-toolbar"><label class="bulk-select-all-label"><input type="checkbox" id="selectAllUsers"> Select All</label><button type="button" class="compact-button action-reject" id="bulkDeleteButton" disabled>Delete Selected</button></div>
  \`;
  
  for (const [deptName, deptUsers] of Object.entries(depts).sort((a,b)=>a[0].localeCompare(b[0]))) {
    html += \`
    <div class="panel-inline" style="margin-bottom: 24px;">
      <h3 style="margin-bottom: 12px; border-bottom: 1px solid var(--line); padding-bottom: 4px;">Department: \${escapeHtml(deptName)}</h3>
      <div class="admin-user-table-wrap"><table class="credential-table">
        <thead><tr>
           <th style="width:36px"></th>
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
           <th>Level</th>
           <th>Action</th>
        </tr></thead>
        <tbody>
    \`;
    
    html += deptUsers.map((u,idx)=>{
      const editing=editingAdminUserId===u.employeeId;
      if(editing){
        const entityOpts = \`<option value="">-- No Entity --</option>\` + allEntities.map(e => \`<option value="\${escapeHtml(e.name)}" \${u.entity===e.name?"selected":""}>\${escapeHtml(e.name)}</option>\`).join("");
        
        let tagsHtml = "";
        let managerHtml = \`<input class="admin-inline-input" data-edit-field="managerId" list="userSearchList" value="\${escapeHtml(u.managerId||"")}" placeholder="Manager ID">\`;
        if (u.level === "1") {
          managerHtml = \`<input type="hidden" data-edit-field="managerId" value="">-\`;
          tagsHtml = \`<br><input class="admin-inline-input" data-edit-field="taggedDepartments" value="\${escapeHtml(u.taggedDepartments||"")}" placeholder="Tagged Depts (comma sep)"><br><input class="admin-inline-input" data-edit-field="taggedEntities" value="\${escapeHtml(u.taggedEntities||"")}" placeholder="Tagged Entities (comma sep)">\`;
        }
        
        return \`<tr class="admin-user-edit-row \${idx%2===0?"":"cred-row-alt"}" data-editing-user="\${escapeHtml(u.employeeId)}">
          <td></td>
          <td><input class="admin-inline-input" data-edit-field="employeeId" value="\${escapeHtml(u.employeeId)}"></td>
          <td><input class="admin-inline-input" data-edit-field="name" value="\${escapeHtml(u.name)}"></td>
          <td><select class="admin-inline-input" data-edit-field="entity">\${entityOpts}</select>\${tagsHtml}</td>
          <td><input class="admin-inline-input" data-edit-field="department" value="\${escapeHtml(u.department)}" placeholder="Department"></td>
          <td><input class="admin-inline-input" data-edit-field="role" value="\${escapeHtml(u.role||"")}" placeholder="Role"></td>
          <td><input class="admin-inline-input" data-edit-field="workLocation" value="\${escapeHtml(u.location||"")}" placeholder="Work Location"></td>
          <td><input class="admin-inline-input" data-edit-field="email" type="email" value="\${escapeHtml(u.email||"")}" placeholder="Work E-Mail"></td>
          <td><input class="admin-inline-input" data-edit-field="officialPhone" value="\${escapeHtml(u.officialPhone||"")}" placeholder="Official Mobile"></td>
          <td><input class="admin-inline-input" data-edit-field="personalPhone" value="\${escapeHtml(u.personalPhone||"")}" placeholder="Personal Num"></td>
          <td>\${managerHtml}</td>
          <td><select class="admin-inline-input" data-edit-field="level">\${["admin","1","2","3"].map(level=>\`<option value="\${level}" \${u.level===level?"selected":""}>\${escapeHtml(ROLE_LABELS[level]||level)}</option>\`).join("")}</select></td>
          <td><div class="action-row"><button type="button" class="compact-button action-approve" data-save-user="\${escapeHtml(u.employeeId)}">Save</button><button type="button" class="compact-button" data-cancel-user-edit>Cancel</button></div></td>
        </tr>\`;
      }
      
      let tagDisplay = escapeHtml(u.entity||"-");
      if (u.level === "1") {
         const dTags = u.taggedDepartments ? \`Depts: \${u.taggedDepartments}\` : "";
         const eTags = u.taggedEntities ? \`Ents: \${u.taggedEntities}\` : "";
         if(dTags||eTags) {
             tagDisplay += \`<br><span style="font-size:0.7rem;color:var(--muted)">\${dTags} \${eTags}</span>\`;
         }
      }

      return \`<tr class="\${idx%2===0?"":"cred-row-alt"}">
        <td>\${u.employeeId!==adminUser?.employeeId?\`<input type="checkbox" class="user-select-cb" data-id="\${escapeHtml(u.employeeId)}">\`:\`<span title="Cannot delete own account">-</span>\`}</td>
        <td>\${escapeHtml(u.employeeId)}</td>
        <td><button type="button" class="profile-link" data-open-profile="\${escapeHtml(u.employeeId)}">\${escapeHtml(u.name)}</button></td>
        <td>\${tagDisplay}</td>
        <td>\${escapeHtml(u.department||"-")}</td>
        <td>\${escapeHtml(u.role||"-")}</td>
        <td>\${escapeHtml(u.location||"-")}</td>
        <td>\${escapeHtml(u.email||"-")}</td>
        <td>\${escapeHtml(u.officialPhone||"-")}</td>
        <td>\${escapeHtml(u.personalPhone||"-")}</td>
        <td>\${u.level === "1" ? "-" : escapeHtml(u.managerName||u.managerId||"-")}</td>
        <td>\${escapeHtml(ROLE_LABELS[u.level]||u.level)}</td>
        <td><div class="action-row"><button type="button" class="compact-button" data-edit-user="\${escapeHtml(u.employeeId)}">Edit</button>\${u.employeeId!==adminUser?.employeeId?\`<button type="button" class="compact-button action-reject" data-delete-user="\${escapeHtml(u.employeeId)}">Delete</button>\`:\`<span class="helper-text">You</span>\`}</div></td>
      </tr>\`;
    }).join("");
    
    html += \`</tbody></table></div></div>\`;
  }
  
  list.innerHTML = html;
  
  const selectAll=document.getElementById("selectAllUsers");const bulkBtn=document.getElementById("bulkDeleteButton");const cbs=Array.from(list.querySelectorAll(".user-select-cb"));
  const updateBulk=()=>{const any=cbs.some(c=>c.checked);bulkBtn.disabled=!any;};
  if(selectAll)selectAll.addEventListener("change",(e)=>{cbs.forEach(c=>c.checked=e.target.checked);updateBulk();});
  cbs.forEach(c=>c.addEventListener("change",updateBulk));
  if(bulkBtn)bulkBtn.addEventListener("click",async()=>{
    const toDelete=cbs.filter(c=>c.checked).map(c=>c.getAttribute("data-id"));if(!toDelete.length)return;
    if(!window.confirm(\`Permanently delete \${toDelete.length} users?\`))return;
    for(const id of toDelete){await cloudUpdateUserProfile(id,{deleted:true});}
    showToast("Bulk Delete",\`\${toDelete.length} users moved to deleted.\`);await refreshAllCloudData();renderPortal();
  });
  
  list.querySelectorAll("[data-edit-user]").forEach(btn=>btn.addEventListener("click",()=>{editingAdminUserId=btn.getAttribute("data-edit-user")||"";renderUserManagement();}));
  list.querySelectorAll("[data-cancel-user-edit]").forEach(btn=>btn.addEventListener("click",()=>{editingAdminUserId="";renderUserManagement();}));
  list.querySelectorAll("[data-save-user]").forEach(btn=>btn.addEventListener("click",async()=>{
    const originalId=btn.getAttribute("data-save-user")||"";const row=list.querySelector("[data-editing-user]");if(!row)return;
    const get=field=>String(row.querySelector(\`[data-edit-field="\${field}"]\`)?.value||"").trim();
    const level=get("level");const employeeId=normalizeEmployeeId(get("employeeId"));const managerId=normalizeEmployeeId(get("managerId"));
    if(!employeeId||!get("name")||!get("department")){window.alert("Name, Employee ID, and Department are required.");return;}
    if((level==="2"||level==="3")&&!managerId){window.alert("Select a valid reporting manager.");return;}
    const manager=managerId?findUser(managerId):null;
    if(level==="2"&&manager?.level!=="1"){window.alert("Level 2 must report to a Level 1 manager.");return;}
    if(level==="3"&&manager?.level!=="1"&&manager?.level!=="2"){window.alert("Level 3 must report to a Level 1 or Level 2 manager.");return;}
    const result=await cloudUpdateUserProfile(originalId,{employeeId,name:get("name"),level,department:get("department"),email:get("email"),managerId,entity:get("entity"),taggedDepartments:get("taggedDepartments"),taggedEntities:get("taggedEntities"),role:get("role"),location:get("workLocation"),officialPhone:get("officialPhone"),personalPhone:get("personalPhone")});
    if(!result.ok){window.alert(\`Could not update user: \${result.error?.message||"Unknown error"}\`);return;}
    editingAdminUserId="";showToast("User Updated",\`\${employeeId} was updated.\`);await refreshAllCloudData();renderPortal();
  }));
  list.querySelectorAll("[data-delete-user]").forEach(btn => btn.addEventListener("click", async () => {
    const id = btn.getAttribute("data-delete-user");
    if (!id || !window.confirm(\`Delete \${id}?\`)) return;
    const res = await cloudUpdateUserProfile(id, { deleted: true });
    if (!res.ok) { alert("Delete failed"); return; }
    showToast("Deleted", \`User \${id} deleted.\`); await refreshAllCloudData(); renderPortal();
  }));
}
function renderUserManagement()`;

code = code.replace(regex, newRenderAdminUsers);

fs.writeFileSync('app.js', code);
