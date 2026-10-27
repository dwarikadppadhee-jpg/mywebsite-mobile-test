const fs = require('fs');
let html = fs.readFileSync('portal.html', 'utf8');

// 1. Replace the complianceTable div with Entity and Department tables
const tableRegex = /<div id="complianceTable" class="table-wrap"><\/div>/;
const newTablesHtml = `
          <div class="panel-header" style="margin-top: 30px; display: flex; justify-content: space-between; align-items: center;">
            <h3 style="margin: 0; font-size: 1.1rem; color: var(--maroon);">Entity Wise Submission</h3>
            <div class="period-tabs" id="entityPeriodTabs">
              <button type="button" class="tab-btn active" data-period="daily">Daily</button>
              <button type="button" class="tab-btn" data-period="weekly">Weekly</button>
              <button type="button" class="tab-btn" data-period="monthly">Monthly</button>
              <div style="display:inline-block; margin-left: 10px;">
                 <select id="entityExportType" style="padding:4px 8px; font-size:0.8rem; border-radius:4px;"><option value="excel">Excel</option><option value="pdf">PDF</option></select>
                 <button id="btnEntityExport" class="button button-secondary" style="padding:4px 8px; font-size:0.8rem;"><i class="fa-solid fa-download"></i></button>
              </div>
            </div>
          </div>
          <div class="table-wrap">
            <table class="global-task-table">
              <thead>
                <tr>
                  <th style="font-size:0.75rem; color:#888;">ENTITY</th>
                  <th style="font-size:0.75rem; color:#888;">TOTAL EMPLOYEES</th>
                  <th style="font-size:0.75rem; color:#888;">SUBMITTED</th>
                  <th style="font-size:0.75rem; color:#888;">NOT SUBMITTED</th>
                  <th style="font-size:0.75rem; color:#888;">ACTION</th>
                </tr>
              </thead>
              <tbody id="entitySubmissionTable"></tbody>
            </table>
          </div>

          <div class="panel-header" style="margin-top: 30px; display: flex; justify-content: space-between; align-items: center;">
            <h3 style="margin: 0; font-size: 1.1rem; color: var(--maroon);">Department Wise Submission</h3>
            <div class="period-tabs" id="deptPeriodTabs">
              <button type="button" class="tab-btn active" data-period="daily">Daily</button>
              <button type="button" class="tab-btn" data-period="weekly">Weekly</button>
              <button type="button" class="tab-btn" data-period="monthly">Monthly</button>
            </div>
          </div>
          <div id="departmentSubmissionAccordions" style="margin-top: 15px;"></div>
`;

html = html.replace(tableRegex, newTablesHtml);

// 2. Insert complianceDrawerOverlay before </main>
const drawerHtml = `
      <!-- Sliding Drawer for Entity/Department details -->
      <div class="drawer-overlay hidden" id="complianceDrawerOverlay">
        <div class="drawer-panel" style="width: 40%; max-width: 600px; min-width: 400px;">
          <div class="drawer-header" style="display:flex; justify-content:space-between; align-items:center; padding: 20px; border-bottom: 1px solid #eee;">
            <h2 id="drawerTitle" style="margin:0; font-size:1.4rem; color:var(--maroon);">Details</h2>
            <button id="btnDrawerClose" style="background:none; border:none; font-size:1.5rem; cursor:pointer;">&times;</button>
          </div>
          
          <div class="drawer-content" style="padding: 20px; overflow-y: auto; height: calc(100vh - 75px);">
            <div style="display:flex; justify-content:space-between; margin-bottom: 20px;">
                <div class="period-tabs" id="drawerTabs">
                  <button type="button" class="tab-btn active" data-filter="all">All</button>
                  <button type="button" class="tab-btn" data-filter="submitted">Submitted</button>
                  <button type="button" class="tab-btn" data-filter="pending">Pending</button>
                </div>
                <button id="btnDrawerExportExcel" class="button button-secondary"><i class="fa-regular fa-file-excel"></i> Export</button>
            </div>
            
            <div id="drawerListContainer" style="display:flex; flex-direction:column; gap:10px;">
              <!-- Employee rows go here -->
            </div>
          </div>
        </div>
      </div>
`;

// Only insert if not already there
if (!html.includes('id="complianceDrawerOverlay"')) {
    html = html.replace('</main><!-- end #portalDashboard -->', drawerHtml + '\n    </main><!-- end #portalDashboard -->');
}

fs.writeFileSync('portal.html', html);
console.log("Restored HTML structure in portal.html");
