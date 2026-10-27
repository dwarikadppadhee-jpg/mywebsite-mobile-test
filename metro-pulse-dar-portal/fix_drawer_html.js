const fs = require('fs');
let html = fs.readFileSync('portal.html', 'utf8');

// Replace the bad drawer HTML with the correct one
const newDrawer = `
      <!-- Right Drawer for Compliance Details -->
      <div class="right-drawer-overlay" id="complianceDrawerOverlay">
        <div class="right-drawer" style="width: 45%; max-width: 600px; min-width: 400px;">
          <div class="drawer-header">
            <h3 id="drawerTitle">Submission Report</h3>
            <button class="drawer-close-btn" id="btnDrawerClose"><i class="fa-solid fa-xmark"></i></button>
          </div>
          
          <div class="drawer-stats" style="display:flex; justify-content:space-between; padding: 15px 24px; background:#f9f9f9; border-bottom:1px solid #eee;">
            <div>Total: <strong id="drawerTotal">0</strong></div>
            <div style="color:var(--success);">Submitted: <strong id="drawerSubmitted">0</strong></div>
            <div style="color:var(--danger);">Pending: <strong id="drawerPending">0</strong></div>
          </div>

          <div class="drawer-body" style="flex:1; overflow-y:auto; padding: 20px 24px;">
            <div class="drawer-controls" style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px;">
              <div class="period-tabs" id="drawerTabs">
                <button type="button" class="tab-btn active" data-filter="all">All</button>
                <button type="button" class="tab-btn" data-filter="submitted">Submitted</button>
                <button type="button" class="tab-btn" data-filter="pending">Pending</button>
              </div>
              <div style="display:flex; gap:10px;">
                <input type="text" id="drawerSearchInput" placeholder="Search..." class="search-input" style="padding:4px 8px; font-size:0.8rem;">
                <button id="btnDrawerExportExcel" class="button button-secondary" style="padding:4px 8px; font-size:0.8rem;"><i class="fa-regular fa-file-excel"></i></button>
              </div>
            </div>
            
            <div id="drawerBody" class="drawer-list" style="display:flex; flex-direction:column; gap:12px;">
              <!-- Employees injected here -->
            </div>
          </div>
        </div>
      </div>
`;

// Regex to replace the previous drawer HTML I injected
html = html.replace(/<div class="drawer-overlay hidden" id="complianceDrawerOverlay">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/, newDrawer);

fs.writeFileSync('portal.html', html);
console.log("Fixed compliance drawer HTML structure");
