const fs = require('fs');
let html = fs.readFileSync('portal.html', 'utf8');

const oldGateRegex = /<main id="portalGate" class="gate-shell">[\s\S]*?<\/main>/;

const newGateHtml = `<main id="portalGate" class="gate-shell new-gate-shell">
      <div class="gate-unified-card">
        
        <!-- Center Divider Curve -->
        <div class="gate-unified-divider"></div>

        <!-- LEFT SECTION -->
        <div class="gate-unified-left">
          <!-- Textures -->
          <div class="brand-bg-dots"></div>
          
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

          <!-- Sweeping Waves -->
          <svg class="brand-bg-wave" viewBox="0 0 500 200" preserveAspectRatio="none">
             <path d="M0,200 L0,50 C100,220 300,100 500,150 L500,200 Z" fill="#6a0f1d"></path>
             <path d="M0,200 L0,90 C120,250 350,110 500,170 L500,200 Z" fill="#8c1528"></path>
             <path d="M0,200 L0,150 C150,280 400,140 500,190 L500,200 Z" fill="#d4a017" opacity="0.6"></path>
          </svg>

          <div class="gate-logo-container" style="position: relative; z-index: 2;">
            <img src="metro-group-logo.jpeg" alt="Metro Group" class="new-gate-logo">
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

        <!-- RIGHT SECTION -->
        <div class="gate-unified-right">
          <!-- Textures -->
          <div class="auth-bg-topo"></div>
          
          <svg class="auth-bg-sketch-bottom" viewBox="0 0 100 100" preserveAspectRatio="none">
             <path d="M10,100 L10,60 L90,60 L90,100 Z" fill="#dcd1c4" opacity="0.4"></path>
             <path d="M50,100 L50,80 A15,15 0 0,0 20,80 L20,100 Z" fill="#dcd1c4" opacity="0.4"></path>
             <path d="M90,100 L90,80 A15,15 0 0,0 60,80 L60,100 Z" fill="#dcd1c4" opacity="0.4"></path>
          </svg>

          <div class="gate-auth-header" style="position: relative; z-index: 2;">
            <p class="gate-auth-tag">UNIFIED EMPLOYEE PORTAL</p>
            <h2 class="gate-auth-title">Welcome <span style="color: #8c1528;">back!</span></h2>
            <div class="gate-auth-separator"></div>
          </div>
          
          <form id="portalLoginForm" class="new-gate-form" style="position: relative; z-index: 2;">
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

html = html.replace(oldGateRegex, newGateHtml);
fs.writeFileSync('portal.html', html);
console.log("HTML replaced with unified layout.");
