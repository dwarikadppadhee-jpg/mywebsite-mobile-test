const fs = require('fs');
let html = fs.readFileSync('portal.html', 'utf8');

const oldGateRegex = /<main id="portalGate" class="gate-shell new-gate-shell">[\s\S]*?<\/main>/;

const newGateHtml = `<main id="portalGate" class="gate-shell new-gate-shell">
      <div class="new-gate-container">
        
        <!-- LEFT PANEL -->
        <div class="new-gate-panel gate-brand-panel">
          <!-- Decorative Background Elements -->
          <div class="brand-bg-dots"></div>
          
          <!-- Top Left Building Silhouette -->
          <svg class="brand-bg-building" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M10,100 L10,30 L90,30 L90,100 Z" fill="#f0eae1" opacity="0.8"></path>
            <rect x="20" y="40" width="15" height="15" rx="4" fill="#e4ddd3"></rect>
            <rect x="45" y="40" width="15" height="15" rx="4" fill="#e4ddd3"></rect>
            <rect x="70" y="40" width="15" height="15" rx="4" fill="#e4ddd3"></rect>
            <rect x="20" y="65" width="15" height="15" rx="4" fill="#e4ddd3"></rect>
            <rect x="45" y="65" width="15" height="15" rx="4" fill="#e4ddd3"></rect>
            <rect x="70" y="65" width="15" height="15" rx="4" fill="#e4ddd3"></rect>
            <path d="M40,100 L40,85 A10,10 0 0,1 60,85 L60,100 Z" fill="#e4ddd3"></path>
          </svg>

          <!-- Bottom Waves -->
          <svg class="brand-bg-wave" viewBox="0 0 200 100" preserveAspectRatio="none">
            <path d="M0,100 L0,80 C40,100 80,60 120,70 C160,80 180,95 200,90 L200,100 Z" fill="#8b573a"></path>
            <path d="M0,100 L0,90 C40,110 70,75 110,85 C150,95 170,100 200,95 L200,100 Z" fill="#b07b55"></path>
            <path d="M0,100 L0,70 C60,95 100,50 140,65 C170,75 190,85 200,80 L200,100 Z" fill="#d9ad7c" opacity="0.7"></path>
          </svg>

          <div class="gate-logo-container" style="position: relative; z-index: 2;">
            <div class="gate-logo-box">
              <img src="metro-group-logo.jpeg" alt="Metro Group" class="new-gate-logo">
            </div>
          </div>
          
          <div class="gate-stats-row" style="position: relative; z-index: 2;">
            <div class="gate-stat-card">
              <div class="gate-stat-icon-wrap" style="color: #c92a2a; background-color: #fff0f0;">
                <i class="fa-solid fa-award"></i>
              </div>
              <strong class="gate-stat-number" style="color: #a81c2f;">33+</strong>
              <span class="gate-stat-label">Years<br>Experience</span>
              <div class="stat-line stat-line-red"></div>
            </div>
            
            <div class="gate-stat-card">
              <div class="gate-stat-icon-wrap" style="color: #d4a017; background-color: #fdf6e3;">
                <i class="fa-regular fa-folder-open"></i>
              </div>
              <strong class="gate-stat-number" style="color: #a81c2f;">80+</strong>
              <span class="gate-stat-label">Projects<br>Delivered</span>
              <div class="stat-line stat-line-yellow"></div>
            </div>
            
            <div class="gate-stat-card">
              <div class="gate-stat-icon-wrap" style="color: #2f9e44; background-color: #ebfbee;">
                <i class="fa-solid fa-users"></i>
              </div>
              <strong class="gate-stat-number" style="color: #a81c2f;">10K+</strong>
              <span class="gate-stat-label">Happy<br>Family</span>
              <div class="stat-line stat-line-green"></div>
            </div>
          </div>
        </div>

        <!-- RIGHT PANEL -->
        <div class="new-gate-panel gate-auth-panel">
          <!-- Decorative Background Elements -->
          <div class="auth-bg-topo"></div>
          
          <!-- Bottom Right Grid -->
          <div class="auth-bg-grid"></div>

          <div class="gate-auth-header" style="position: relative; z-index: 2;">
            <p class="gate-auth-tag">UNIFIED EMPLOYEE PORTAL</p>
            <h2 class="gate-auth-title">Welcome <span style="color: #8c1528;">back!</span></h2>
            <div class="gate-auth-separator"></div>
          </div>
          
          <form id="portalLoginForm" class="new-gate-form" style="position: relative; z-index: 2;">
            <div class="new-form-group">
              <label for="portalEmployeeId">Employee ID</label>
              <div class="new-input-wrapper">
                <input id="portalEmployeeId" type="text" placeholder="" required>
              </div>
            </div>
            
            <div class="new-form-group">
              <label for="portalPassword">Password</label>
              <div class="new-input-wrapper">
                <input id="portalPassword" type="password" placeholder="" required>
              </div>
            </div>
            
            <button class="new-submit-btn" type="submit">Sign In</button>
          </form>
        </div>
        
      </div>
    </main>`;

html = html.replace(oldGateRegex, newGateHtml);
fs.writeFileSync('portal.html', html);
console.log("HTML replaced with new structure.");
