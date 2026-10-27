const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf8');

const oldFuncMatch = code.match(/function renderAdminUsers\(\)\{[\s\S]*?renderUserManagement\(\)\;\}\)\);\n  list.querySelectorAll\("\[data-save-user\]"\)\.forEach\(btn=>btn\.addEventListener\("click",async\(\)=>\{[\s\S]*?email:get\("email"\),managerId\}\);\n/);

if(oldFuncMatch) {
  let oldFunc = oldFuncMatch[0];
  const newFunc = `function renderAdminUsers(){
  const list=document.getElementById("adminUserList");if(!list)return;
  const adminUser=activeUser();
  const allUsers=users().sort((a,b)=>a.name.localeCompare(b.name));
  
  const byDept = {};
  for(const u of allUsers) {
    const d = u.department || "General";
    if(!byDept[d]) byDept[d] = [];
    byDept[d].push(u);
  }
  const sortedDepts = Object.keys(byDept).sort();
  const allEntities = entities();

  let html = \`<div class="bulk-delete-toolbar"><label class="bulk-select-all-label"><input type="checkbox" id="selectAllUsers"> Select All</label><button type="button" class="compact-button action-reject" id="bulkDeleteButton" disabled>Delete Selected</button></div><div class="admin-user-table-wrap"><table class="credential-table"><thead><tr><th style="width:36px"></th><th>Name</th><th>Employee ID</th><th>Role</th><th>Department</th><th>Entity</th><th>Email</th><th>Reports To</th><th>Action</th></tr></thead>\`;
  
  for(const dept of sortedDepts) {
    html += \`<tbody><tr class="department-header"><td colspan="9" style="background:var(--panel-border); font-weight:bold; padding:8px;">${escapeHtml(dept)} Department</td></tr>\`;
    const deptUsers = byDept[dept];
    html += deptUsers.map((u,idx)=>{
      const editing=editingAdminUserId===u.employeeId;
      
      let entitySelect = \`<select class="admin-inline-input" data-edit-field="entity"><option value="">-- None --</option>\`;
      entitySelect += allEntities.map(e=>\`<option value="${escapeHtml(e.name)}" ${u.entity===e.name?"selected":""}>${escapeHtml(e.name)}</option>\`).join("");
      entitySelect += \`</select>\`;
      
      let tagsInput = "";
      if(u.level !== "admin") {
         tagsInput = \`<div style="margin-top: 4px;"><input class="admin-inline-input" style="width: 100%; margin-bottom:2px;" data-edit-field="allowedDepartments" value="${escapeHtml(u.allowedDepartments||"")}" placeholder="Allowed Depts (comma separated)">
         <input class="admin-inline-input" style="width: 100%;" data-edit-field="allowedEntities" value="${escapeHtml(u.allowedEntities||"")}" placeholder="Allowed Entities (comma separated)"></div>\`;
      }
      
      if(editing)return\`<tr class="admin-user-edit-row ${idx%2===0?"":"cred-row-alt"}" data-editing-user="${escapeHtml(u.employeeId)}"><td></td><td><input class="admin-inline-input" data-edit-field="name" value="${escapeHtml(u.name)}"></td><td><input class="admin-inline-input" data-edit-field="employeeId" value="${escapeHtml(u.employeeId)}"></td><td><select class="admin-inline-input" data-edit-field="level">${["admin","1","2","3"].map(level=>\`<option value="${level}" ${u.level===level?"selected":""}>${escapeHtml(ROLE_LABELS[level]||level)}</option>\`).join("")}</select>${tagsInput}</td><td><input class="admin-inline-input" data-edit-field="department" value="${escapeHtml(u.department)}"></td><td>${entitySelect}</td><td><input class="admin-inline-input" data-edit-field="email" type="email" value="${escapeHtml(u.email||"")}" placeholder="name@company.com"></td><td><input class="admin-inline-input" data-edit-field="managerId" list="userSearchList" value="${escapeHtml(u.managerId||"")}" placeholder="Manager ID"></td><td><div class="action-row"><button type="button" class="compact-button action-approve" data-save-user="${escapeHtml(u.employeeId)}">Save</button><button type="button" class="compact-button" data-cancel-user-edit>Cancel</button></div></td></tr>\`;
      return\`<tr class="${idx%2===0?"":"cred-row-alt"}"><td>${u.employeeId!==adminUser?.employeeId?\`<input type="checkbox" class="user-select-cb" data-id="${escapeHtml(u.employeeId)}">\`:\`<span title="Cannot delete own account">-</span>\`}</td><td><button type="button" class="profile-link" data-open-profile="${escapeHtml(u.employeeId)}">${escapeHtml(u.name)}</button></td><td>${escapeHtml(u.employeeId)}</td><td>${escapeHtml(ROLE_LABELS[u.level]||u.level)}<br><small style="color:var(--text-muted);font-size:10px;">${u.allowedDepartments?("Depts: "+escapeHtml(u.allowedDepartments)):""} ${u.allowedEntities?("Entities: "+escapeHtml(u.allowedEntities)):""}</small></td><td>${escapeHtml(u.department)}</td><td>${escapeHtml(u.entity||"-")}</td><td>${escapeHtml(u.email||"-")}</td><td>${escapeHtml(u.managerName||"-")}</td><td><div class="action-row"><button type="button" class="compact-button" data-edit-user="${escapeHtml(u.employeeId)}">Edit</button>${u.employeeId!==adminUser?.employeeId?\`<button type="button" class="compact-button action-reject" data-delete-user="${escapeHtml(u.employeeId)}">Delete</button>\`:\`<span class="helper-text">You</span>\`}</div></td></tr>\`;
    }).join("");
    html += \`</tbody>\`;
  }
  html += \`</table></div>\`;
  list.innerHTML = html;
  
  const selectAll=list.querySelector("#selectAllUsers");const bulkBtn=list.querySelector("#bulkDeleteButton");
  const updateBulkBtn=()=>{const checked=list.querySelectorAll(".user-select-cb:checked").length;if(bulkBtn)bulkBtn.disabled=checked===0;};
  selectAll?.addEventListener("change",()=>{list.querySelectorAll(".user-select-cb").forEach(cb=>cb.checked=selectAll.checked);updateBulkBtn();});
  list.querySelectorAll(".user-select-cb").forEach(cb=>cb.addEventListener("change",updateBulkBtn));
  bulkBtn?.addEventListener("click",async()=>{
    const ids=[...list.querySelectorAll(".user-select-cb:checked")].map(cb=>cb.getAttribute("data-id"));if(!ids.length)return;
    const names=ids.map(id=>findUser(id)?.name||id).join(", ");const confirmed=window.confirm(\`Delete ${ids.length} employee(s)?\n\n${names}\`);if(!confirmed)return;
    const reason=window.prompt("Enter reason for bulk deletion:");if(!reason||!reason.trim()){window.alert("Reason is required.");return;}
    let removed=0;
    for(const id of ids){if(findUser(id)&&await cloudDeleteUser(id,adminUser.employeeId,reason.trim()))removed++;}
    if(removed){showToast("Bulk Delete",\`${removed} employee(s) removed successfully.\`);await refreshAllCloudData();renderPortal();}
  });
  list.querySelectorAll("[data-open-profile]").forEach(btn=>btn.addEventListener("click",()=>openProfile(btn.getAttribute("data-open-profile"))));
  list.querySelectorAll("[data-edit-user]").forEach(btn=>btn.addEventListener("click",()=>{editingAdminUserId=btn.getAttribute("data-edit-user")||"";renderUserManagement();}));
  list.querySelectorAll("[data-cancel-user-edit]").forEach(btn=>btn.addEventListener("click",()=>{editingAdminUserId="";renderUserManagement();}));
  list.querySelectorAll("[data-save-user]").forEach(btn=>btn.addEventListener("click",async()=>{
    const originalId=btn.getAttribute("data-save-user")||"";const row=list.querySelector("[data-editing-user]");if(!row)return;
    const get=field=>String(row.querySelector(\`[data-edit-field="${field}"]\`)?.value||"").trim();
    const level=get("level");const employeeId=normalizeEmployeeId(get("employeeId"));const managerId=normalizeEmployeeId(get("managerId"));
    if(!employeeId||!get("name")||!get("department")){window.alert("Name, Employee ID, and Department are required.");return;}
    if((level==="2"||level==="3")&&!managerId){window.alert("Select a valid reporting manager.");return;}
    const manager=managerId?findUser(managerId):null;
    if(level==="2"&&manager?.level!=="1"){window.alert("Level 2 must report to a Level 1 manager.");return;}
    if(level==="3"&&manager?.level!=="1"&&manager?.level!=="2"){window.alert("Level 3 must report to a Level 1 or Level 2 manager.");return;}
    const result=await cloudUpdateUserProfile(originalId,{employeeId,name:get("name"),level,department:get("department"),email:get("email"),managerId,entity:get("entity"),allowedDepartments:get("allowedDepartments"),allowedEntities:get("allowedEntities")});
`;

  code = code.replace(oldFunc, newFunc);
  fs.writeFileSync('app.js', code);
  console.log("REPLACED SUCCESS!");
} else {
  console.log("NO MATCH");
}
