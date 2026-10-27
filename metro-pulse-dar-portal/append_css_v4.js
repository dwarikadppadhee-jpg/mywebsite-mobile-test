const fs = require('fs');
let css = fs.readFileSync('styles.css', 'utf8');

const updatedCSS = `

/* =========================================================================
   ENHANCED LOGIN GATE (V4 UNIFIED MOCKUP)
   ========================================================================= */

/* The Unified Card Container */
.gate-unified-card {
  display: flex;
  flex-direction: row;
  width: 100%;
  max-width: 1000px;
  background: #fdfaf4;
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 15px 50px rgba(0, 0, 0, 0.2);
  position: relative;
  margin: 0 auto;
}

/* The Curved Gold Divider */
.gate-unified-divider {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 2px;
  background-color: transparent;
  z-index: 10;
}
.gate-unified-divider::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 40px;
  border-left: 2px solid #d4a017;
  border-radius: 40px 0 0 0;
  opacity: 0.6;
}

.gate-unified-left {
  flex: 1;
  position: relative;
  padding: 60px 40px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  overflow: hidden;
}

.gate-unified-right {
  flex: 1;
  position: relative;
  padding: 70px 50px;
  background: #fdf9f1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

/* Remove the white box around the logo from v3 */
.gate-logo-container {
  background: transparent !important;
  box-shadow: none !important;
  padding: 0 !important;
  margin-bottom: 50px;
}
.new-gate-logo {
  max-width: 240px;
}

/* Restore Input Styling */
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
  z-index: 5;
  display: block; /* Ensure it is visible */
}
.new-input-wrapper input {
  width: 100%;
  background: #ffffff !important;
  border: 1px solid #e0e0e0 !important;
  padding: 14px 14px 14px 40px !important; /* Make room for icon */
  font-weight: 500;
  color: #333;
  border-radius: 8px;
  transition: all 0.2s;
}
.new-input-wrapper input:focus {
  border-color: #8c1528 !important;
  box-shadow: 0 0 0 3px rgba(140, 21, 40, 0.1) !important;
}

/* Mobile adjustments */
@media (max-width: 850px) {
  .gate-unified-card {
    flex-direction: column;
  }
  .gate-unified-divider { display: none; }
}
`;

css += updatedCSS;
fs.writeFileSync('styles.css', css);
console.log("CSS appended for v4 unified layout.");
