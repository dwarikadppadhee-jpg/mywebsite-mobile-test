const fs = require('fs');
let css = fs.readFileSync('styles.css', 'utf8');

const fixCSS2 = `
/* =========================================================================
   FIXES V2: SCALING DOWN EVERYTHING
   ========================================================================= */

.gate-unified-card {
  max-width: 850px !important;
  min-height: 450px !important;
  border-radius: 16px !important;
}

.new-gate-logo {
  max-width: 130px !important;
  margin-bottom: 10px !important;
}

.gate-unified-left {
  padding: 30px !important;
  padding-top: 40px !important;
}

.gate-unified-right {
  padding: 30px 40px !important;
}

/* Adjust stats so they aren't huge */
.gate-stat-number {
  font-size: 1.1rem !important;
}
.gate-stat-label {
  font-size: 0.6rem !important;
}
.gate-stat-icon-wrap {
  width: 34px !important;
  height: 34px !important;
  font-size: 0.9rem !important;
}
.gate-stat-card {
  padding: 10px 5px !important;
}

.brand-bg-wave {
  height: 100px !important;
}
`;

css += fixCSS2;
fs.writeFileSync('styles.css', css);
console.log("CSS fixes 2 appended.");
