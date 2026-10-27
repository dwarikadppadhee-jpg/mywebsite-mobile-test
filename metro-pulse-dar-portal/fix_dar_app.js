const fs = require('fs');
let appJs = fs.readFileSync('app.js', 'utf8');

const complianceLogic = `
// =========================================================================
// OVERRIDDEN DAR REVIEW (COMPLIANCE) LOGIC
// =========================================================================

function renderCompliance(user) {
  if(!canUseCompliance(user)) return;
  
  const allUsers = complianceUsers(user);
  const dateSelect = document.getElementById("complianceDateFilter");
  const customDateInput = document.getElementById("complianceCustomDateFilter");
  
  let reportDate = "";
  if (dateSelect) {
      if (dateSelect.value === "custom") {
          reportDate = customDateInput && customDateInput.value ? customDateInput.value : today();
      } else {
          reportDate = dateSelect.value || today();
      }
  } else {
      reportDate = today();
  }

  const holiday = holidayForDate(reportDate);
  const submittedMap = new Map(reports().filter(r=>r.date===reportDate).map(r=>[r.employeeId,r]));
  
  const submittedCount = allUsers.filter(u=>submittedMap.has(u.employeeId)).length;
  const pendingCount = holiday ? 0 : allUsers.length - submittedCount;

  const setMetric = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = String(v); };
  setMetric("metricTotalEmployees", allUsers.length);
  setMetric("metricTotalPercent", "100% of total");
  setMetric("metricSubmittedEmployees", submittedCount);
  setMetric("metricSubmittedPercent", \`\${allUsers.length ? Math.round((submittedCount/allUsers.length)*100) : 0}%\`);
  setMetric("metricPendingEmployees", pendingCount);
  setMetric("metricPendingPercent", \`\${allUsers.length ? Math.round((pendingCount/allUsers.length)*100) : 0}%\`);

  // Dropdowns Population
  if (dateSelect && dateSelect.options.length === 0) {
      let optionsHtml = '';
      if (isAdmin(user)) {
         for(let i=0; i<30; i++) {
           const d = dateKeyDaysAgo(i);
           optionsHtml += '<option value="' + d + '">' + (i===0?"Today":d) + '</option>';
         }
      } else {
         optionsHtml = complianceDateOptions().map(opt => '<option value="' + opt.value + '">' + opt.label + '</option>').join('');
      }
      optionsHtml += '<option value="custom">Choose from Calendar...</option>';
      dateSelect.innerHTML = optionsHtml;
      
      dateSelect.addEventListener("change", (e) => {
         if (e.target.value === "custom") {
            if (customDateInput) customDateInput.classList.remove("hidden");
         } else {
            if (customDateInput) customDateInput.classList.add("hidden");
         }
         renderCompliance(user);
      });
      if (customDateInput) {
          customDateInput.addEventListener("change", () => renderCompliance(user));
      }
  }
  
  const monthInput = document.getElementById("complianceMonthFilter");
  if (monthInput && !monthInput.value) {
    monthInput.value = selectedComplianceMonth();
  }

  const entSelect = document.getElementById("complianceEntityFilter");
  if (entSelect && entSelect.options.length <= 1) {
    const uniqueEnts = [...new Set(allUsers.map(u=>u.entity).filter(Boolean))].sort();
    entSelect.innerHTML = '<option value="">All Entities</option>' + uniqueEnts.map(e=>\`<option value="\${escapeHtml(e)}">\${escapeHtml(e)}</option>\`).join('');
  }
  const deptSelect = document.getElementById("complianceDeptFilter");
  if (deptSelect && deptSelect.options.length <= 1) {
    const uniqueDepts = [...new Set(allUsers.map(u=>u.department).filter(Boolean))].sort();
    deptSelect.innerHTML = '<option value="">All Departments</option>' + uniqueDepts.map(d=>\`<option value="\${escapeHtml(d)}">\${escapeHtml(d)}</option>\`).join('');
  }
  
  // Filtering
  const searchQuery = (document.getElementById("complianceSearchInput")?.value || "").toLowerCase();
  const entValue = entSelect ? entSelect.value : "";
  const deptValue = deptSelect ? deptSelect.value : "";
  
  let list = allUsers;
  
  if (entValue) list = list.filter(u => u.entity === entValue);
  if (deptValue) list = list.filter(u => u.department === deptValue);
  if (searchQuery) {
     list = list.filter(u => u.name.toLowerCase().includes(searchQuery) || u.employeeId.toLowerCase().includes(searchQuery));
  }
  
  if (complianceFilter === "submitted") list = list.filter(u => submittedMap.has(u.employeeId));
  if (complianceFilter === "pending") list = list.filter(u => !submittedMap.has(u.employeeId));

  // Render Table
  const tableContainer = document.getElementById("complianceTable");
  if (!tableContainer) return;
  
  if (list.length === 0) {
      tableContainer.innerHTML = '<div class="empty-state">No records found.</div>';
      return;
  }
  
  let rowsHtml = '';
  list.forEach(u => {
     const rep = submittedMap.get(u.employeeId);
     const status = rep ? 'Submitted' : (holiday ? 'Holiday' : 'Pending');
     const statusBadge = rep ? '<span class="status-badge status-submitted" style="background:#2f9e44;color:white;padding:4px 8px;border-radius:4px;font-size:0.8rem;">Submitted</span>' : '<span class="status-badge status-pending" style="background:#f03e3e;color:white;padding:4px 8px;border-radius:4px;font-size:0.8rem;">Pending</span>';
     
     rowsHtml += \`
       <tr class="compliance-table-row" style="border-bottom:1px solid #eee;">
         <td style="padding:12px;"><strong>\${escapeHtml(u.name)}</strong><br><small style="color:#666">\${escapeHtml(u.employeeId)}</small></td>
         <td style="padding:12px;">\${escapeHtml(u.entity || '-')}</td>
         <td style="padding:12px;">\${escapeHtml(u.department || '-')}</td>
         <td style="padding:12px;">\${statusBadge}</td>
         <td style="padding:12px; text-align:right;">
            \${rep ? \`<button class="action-arrow toggle-compliance-row" data-emp-id="\${u.employeeId}" style="background:none;border:none;cursor:pointer;color:var(--maroon);font-size:1.2rem;"><i class="fa-solid fa-chevron-down"></i></button>\` : ''}
         </td>
       </tr>
     \`;
     
     if (rep) {
        let pointsHtml = rep.points.map(p => \`<li style="margin-bottom:6px;">\${p.hours}h \${p.minutes}m - <strong>\${escapeHtml(p.input)}</strong></li>\`).join('');
        if (!pointsHtml) pointsHtml = '<li>No specific points logged.</li>';
        
        rowsHtml += \`
          <tr class="compliance-expanded-row hidden" id="complianceExpanded-\${u.employeeId}">
            <td colspan="5" style="padding:0; border:none;">
               <div class="compliance-expanded-card" style="background:#fdfdfd; padding:15px; border-radius:0 0 8px 8px; margin-bottom:15px; border-left:4px solid var(--maroon); box-shadow:inset 0 2px 4px rgba(0,0,0,0.02);">
                  <h4 style="margin-top:0; color:var(--maroon); font-family:Barlow, sans-serif;">Submitted Points:</h4>
                  <ul style="margin-bottom:0; padding-left:20px; font-size:0.9rem; line-height:1.5;">
                     \${pointsHtml}
                  </ul>
               </div>
            </td>
          </tr>
        \`;
     }
  });

  tableContainer.innerHTML = \`
     <table class="global-task-table" style="width:100%; border-collapse:collapse; background:white; border-radius:8px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
       <thead style="background:#f8f9fa; border-bottom:2px solid #eaeaea;">
         <tr>
           <th style="padding:12px; text-align:left;">Employee</th>
           <th style="padding:12px; text-align:left;">Entity</th>
           <th style="padding:12px; text-align:left;">Department</th>
           <th style="padding:12px; text-align:left;">Status</th>
           <th style="padding:12px; text-align:right; width:50px;">Details</th>
         </tr>
       </thead>
       <tbody>\${rowsHtml}</tbody>
     </table>
  \`;
}

// Delegated listener for row toggling
document.addEventListener("click", (e) => {
   const toggleBtn = e.target.closest(".toggle-compliance-row");
   if (toggleBtn) {
       const empId = toggleBtn.getAttribute("data-emp-id");
       const expandedRow = document.getElementById(\`complianceExpanded-\${empId}\`);
       if (expandedRow) {
           expandedRow.classList.toggle("hidden");
           const icon = toggleBtn.querySelector("i");
           if (icon) {
               icon.classList.toggle("fa-chevron-down");
               icon.classList.toggle("fa-chevron-up");
           }
       }
   }
});
`;

appJs += "\n" + complianceLogic;

fs.writeFileSync('app.js', appJs);
console.log("Appended full DAR compliance logic to app.js");
