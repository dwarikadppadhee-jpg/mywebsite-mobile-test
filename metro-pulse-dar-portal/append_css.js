const fs = require('fs');
let css = fs.readFileSync('styles.css', 'utf8');

const newCSS = `

/* =========================================================================
   REDESIGNED LOGIN GATE (MATCHING MOCKUP)
   ========================================================================= */

.new-gate-shell {
  position: relative;
  z-index: 10;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.new-gate-container {
  display: flex;
  flex-direction: row;
  gap: 20px;
  width: 100%;
  max-width: 900px; /* Adjust based on the aspect ratio */
  margin: 0 auto;
}

.new-gate-panel {
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  padding: 40px 30px;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

/* --- Left Panel (Brand & Stats) --- */
.gate-brand-panel {
  align-items: center;
  text-align: center;
}

.gate-logo-container {
  margin-bottom: 40px;
}

.new-gate-logo {
  max-width: 180px;
  height: auto;
}

.gate-stats-row {
  display: flex;
  justify-content: space-between;
  gap: 15px;
  width: 100%;
}

.gate-stat-card {
  flex: 1;
  background: #ffffff;
  border-radius: 12px;
  padding: 20px 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  border: 1px solid #f0f0f0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.gate-stat-icon-wrap {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  margin-bottom: 5px;
}

.gate-stat-number {
  font-size: 1.4rem;
  font-weight: 800;
  line-height: 1;
}

.gate-stat-label {
  font-size: 0.75rem;
  color: #333333;
  font-weight: 600;
  line-height: 1.3;
}

/* --- Right Panel (Auth Form) --- */
.gate-auth-panel {
  justify-content: flex-start;
  padding: 50px 40px;
}

.gate-auth-header {
  margin-bottom: 30px;
}

.gate-auth-tag {
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 1.5px;
  color: #1a1a1a;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.gate-auth-title {
  font-family: "Lora", serif;
  font-size: 2.2rem;
  font-weight: 700;
  color: #8c1528; /* Maroon */
  margin: 0;
}

.new-gate-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.new-form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.new-form-group label {
  font-size: 0.85rem;
  font-weight: 700;
  color: #1a1a1a;
}

.new-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.new-input-icon {
  position: absolute;
  left: 14px;
  color: #888888;
  font-size: 1.1rem;
}

.new-input-wrapper input {
  width: 100%;
  padding: 12px 14px 12px 40px;
  border: 1px solid #dcdcdc;
  border-radius: 8px;
  font-size: 0.95rem;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  background: #ffffff;
}

.new-input-wrapper input:focus {
  border-color: #8c1528;
  box-shadow: 0 0 0 3px rgba(140, 21, 40, 0.1);
}

.new-submit-btn {
  margin-top: 10px;
  background: #8c1528; /* Maroon */
  color: #ffffff;
  border: none;
  padding: 14px;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s;
}

.new-submit-btn:hover {
  background: #731121;
}

/* Mobile Responsiveness */
@media (max-width: 768px) {
  .new-gate-container {
    flex-direction: column;
  }
  .gate-stats-row {
    flex-direction: row;
    flex-wrap: wrap;
  }
  .gate-stat-card {
    min-width: calc(33.333% - 15px);
  }
}
@media (max-width: 480px) {
  .gate-stat-card {
    min-width: 100%;
  }
}
`;

css += newCSS;

// Let's also hide the old container style logic
const oldStyleHide = `
body[data-page="portal"]:not(.portal-logged-in) .gate-layout {
  display: none !important;
}
`;
css += oldStyleHide;

fs.writeFileSync('styles.css', css);
console.log("CSS appended.");
