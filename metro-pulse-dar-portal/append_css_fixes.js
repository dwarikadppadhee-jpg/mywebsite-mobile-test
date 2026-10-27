const fs = require('fs');
let css = fs.readFileSync('styles.css', 'utf8');

const fixCSS = `
/* =========================================================================
   FIXES FOR V4 UNIFIED MOCKUP (SIZING & SVGS)
   ========================================================================= */

.gate-unified-card {
  max-width: 1100px !important;
  min-height: 550px;
}

.new-gate-logo {
  max-width: 180px !important;
  margin-bottom: 20px;
}

.brand-bg-wave {
  width: 100% !important;
  height: 120px !important;
  bottom: 0 !important;
  left: 0 !important;
  right: 0 !important;
  position: absolute !important;
}

.auth-bg-sketch-bottom {
  display: none !important;
}

.gate-unified-left {
  padding: 40px !important;
  justify-content: flex-start !important;
  padding-top: 60px !important;
}

.gate-unified-right {
  padding: 40px 60px !important;
}

.gate-logo-container {
  margin-bottom: 30px !important;
  margin-top: 20px !important;
}

/* Chrome autofill background fix */
input:-webkit-autofill,
input:-webkit-autofill:hover, 
input:-webkit-autofill:focus, 
input:-webkit-autofill:active{
    -webkit-box-shadow: 0 0 0 30px white inset !important;
}

/* Ensure stat cards sit above the wave */
.gate-stats-row {
  margin-top: auto !important;
  margin-bottom: 20px !important;
  width: 100%;
}
.gate-stat-card {
  padding: 15px 5px !important;
}
.gate-stat-number {
  font-size: 1.2rem !important;
}
.gate-stat-label {
  font-size: 0.65rem !important;
}
.gate-stat-icon-wrap {
  width: 38px !important;
  height: 38px !important;
  font-size: 1rem !important;
}
`;

css += fixCSS;
fs.writeFileSync('styles.css', css);
console.log("CSS fixes appended.");
