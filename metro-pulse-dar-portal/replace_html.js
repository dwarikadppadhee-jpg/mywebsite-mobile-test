const fs = require('fs');
let html = fs.readFileSync('portal.html', 'utf8');

const newGateHtml = `<main id="portalGate" class="gate-shell new-gate-shell">
      <div class="new-gate-container">
        
        <!-- LEFT PANEL -->
        <div class="new-gate-panel gate-brand-panel">
          <div class="gate-logo-container">
            <img src="metro-group-logo.jpeg" alt="Metro Group" class="new-gate-logo">
          </div>
          
          <div class="gate-stats-row">
            <div class="gate-stat-card">
              <div class="gate-stat-icon-wrap" style="color: #c92a2a; background-color: #fff0f0;">
                <i class="fa-solid fa-award"></i>
              </div>
              <strong class="gate-stat-number" style="color: #a81c2f;">33+</strong>
              <span class="gate-stat-label">Years<br>Experience</span>
            </div>
            
            <div class="gate-stat-card">
              <div class="gate-stat-icon-wrap" style="color: #d4a017; background-color: #fdf6e3;">
                <i class="fa-regular fa-folder-open"></i>
              </div>
              <strong class="gate-stat-number" style="color: #a81c2f;">80+</strong>
              <span class="gate-stat-label">Projects<br>Delivered</span>
            </div>
            
            <div class="gate-stat-card">
              <div class="gate-stat-icon-wrap" style="color: #2f9e44; background-color: #ebfbee;">
                <i class="fa-solid fa-users"></i>
              </div>
              <strong class="gate-stat-number" style="color: #a81c2f;">10K+</strong>
              <span class="gate-stat-label">Happy<br>Family</span>
            </div>
          </div>
        </div>

        <!-- RIGHT PANEL -->
        <div class="new-gate-panel gate-auth-panel">
          <div class="gate-auth-header">
            <p class="gate-auth-tag">UNIFIED EMPLOYEE PORTAL</p>
            <h2 class="gate-auth-title">Welcome!</h2>
          </div>
          
          <form id="portalLoginForm" class="new-gate-form">
            <div class="new-form-group">
              <label for="portalEmployeeId">Employee ID</label>
              <div class="new-input-wrapper">
                <i class="fa-regular fa-user new-input-icon"></i>
                <input id="portalEmployeeId" type="text" placeholder="Enter your Employee ID" required>
              </div>
            </div>
            
            <div class="new-form-group">
              <label for="portalPassword">Password</label>
              <div class="new-input-wrapper">
                <i class="fa-solid fa-lock new-input-icon"></i>
                <input id="portalPassword" type="password" placeholder="Enter your Password" required>
              </div>
            </div>
            
            <button class="new-submit-btn" type="submit">Sign In</button>
          </form>
        </div>
        
      </div>
    </main>`;

const oldGateRegex = /<main id="portalGate" class="gate-shell">[\s\S]*?<\/main>/;
html = html.replace(oldGateRegex, newGateHtml);

fs.writeFileSync('portal.html', html);
console.log("HTML replaced.");
