const fs = require('fs');
let html = fs.readFileSync('portal.html', 'utf8');

const oldGateRegex = /<main id="portalGate"[\s\S]*?<\/main>/;

const newGateHtml = `<main id="portalGate" class="gate-shell gate-unified-shell">
  <div class="gate-unified-card">
    
    <!-- LEFT PANEL -->
    <div class="gate-unified-left">
      <div class="gate-left-dots"></div>
      
      <img src="metro-group-logo.jpeg" alt="Metro Group" class="gate-unified-logo">
      
      <div class="gate-stats-container">
        <div class="gate-stat-item">
          <div class="gate-stat-icon" style="color: #c92a2a; background: #fff0f0;">
            <i class="fa-solid fa-award"></i>
          </div>
          <strong>33+</strong>
          <span>Years<br>Experience</span>
          <div class="stat-underline" style="background: #c92a2a;"></div>
        </div>
        
        <div class="gate-stat-item">
          <div class="gate-stat-icon" style="color: #d4a017; background: #fdf6e3;">
            <i class="fa-regular fa-folder-open"></i>
          </div>
          <strong>80+</strong>
          <span>Projects<br>Delivered</span>
          <div class="stat-underline" style="background: #d4a017;"></div>
        </div>
        
        <div class="gate-stat-item">
          <div class="gate-stat-icon" style="color: #2f9e44; background: #ebfbee;">
            <i class="fa-solid fa-users"></i>
          </div>
          <strong>10K+</strong>
          <span>Happy<br>Family</span>
          <div class="stat-underline" style="background: #2f9e44;"></div>
        </div>
      </div>
      
      <svg class="gate-left-waves" viewBox="0 0 500 150" preserveAspectRatio="none">
         <path d="M0,150 L0,50 C150,150 350,80 500,120 L500,150 Z" fill="#8c1528"></path>
         <path d="M0,150 L0,90 C180,180 380,110 500,140 L500,150 Z" fill="#d4a017" opacity="0.6"></path>
      </svg>
    </div>

    <!-- GOLD DIVIDER -->
    <div class="gate-unified-divider"></div>

    <!-- RIGHT PANEL -->
    <div class="gate-unified-right">
      <div class="gate-right-topo"></div>
      
      <div class="gate-auth-header">
        <p class="gate-auth-tag">UNIFIED EMPLOYEE PORTAL</p>
        <h2 class="gate-auth-title">Welcome <span style="color: #8c1528;">back!</span></h2>
        <div class="gate-auth-line"></div>
      </div>
      
      <form id="portalLoginForm" class="gate-auth-form">
        <div class="gate-input-group">
          <label for="portalEmployeeId">Employee ID</label>
          <div class="gate-input-box">
            <i class="fa-regular fa-user"></i>
            <input id="portalEmployeeId" type="text" placeholder="Enter your Employee ID" required>
          </div>
        </div>
        
        <div class="gate-input-group">
          <label for="portalPassword">Password</label>
          <div class="gate-input-box">
            <i class="fa-solid fa-lock"></i>
            <input id="portalPassword" type="password" placeholder="Enter your Password" required>
          </div>
        </div>
        
        <button class="gate-submit-btn" type="submit">Sign In</button>
      </form>
    </div>
    
  </div>
</main>`;

html = html.replace(oldGateRegex, newGateHtml);
fs.writeFileSync('portal.html', html);
console.log("HTML replaced with clean, bug-free unified layout.");
