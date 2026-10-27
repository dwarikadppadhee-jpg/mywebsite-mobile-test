const fs = require('fs');
let css = fs.readFileSync('styles.css', 'utf8');

const updatedCSS = `

/* =========================================================================
   ENHANCED LOGIN GATE TEXTURES & EFFECTS (V3 MOCKUP)
   ========================================================================= */

/* Overriding previous panel backgrounds */
.gate-brand-panel {
  background: #fdfaf4; /* Off-white / cream */
}

.gate-auth-panel {
  background: #fdf9f1;
}

/* 1. Left Panel Enhancements */
.brand-bg-dots {
  position: absolute;
  top: 0; right: 0; bottom: 0; left: 0;
  /* Red dotted grid pattern */
  background-image: radial-gradient(#d32f2f 1px, transparent 1px);
  background-size: 20px 20px;
  opacity: 0.15;
  z-index: 0;
}

.brand-bg-building {
  position: absolute;
  top: -10px;
  left: -20px;
  width: 200px;
  height: 200px;
  z-index: 1;
  opacity: 0.8;
}

.brand-bg-wave {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 250px;
  height: 120px;
  z-index: 1;
}

.gate-logo-box {
  background: #ffffff;
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
  display: inline-block;
  margin-top: 10px;
}

/* Hide previous geometric rays since they are replaced by dots */
.brand-bg-rays { display: none; }
.brand-bg-sketch { display: none; }

/* 2. Right Panel Enhancements */
.auth-bg-topo {
  position: absolute;
  top: 0; right: 0; bottom: 0; left: 0;
  /* Concentric circles */
  background: 
    radial-gradient(circle at 60% 30%, transparent 10%, rgba(220, 210, 190, 0.2) 11%, transparent 12%),
    radial-gradient(circle at 60% 30%, transparent 20%, rgba(220, 210, 190, 0.2) 21%, transparent 22%),
    radial-gradient(circle at 60% 30%, transparent 30%, rgba(220, 210, 190, 0.2) 31%, transparent 32%),
    radial-gradient(circle at 60% 30%, transparent 40%, rgba(220, 210, 190, 0.2) 41%, transparent 42%),
    radial-gradient(circle at 60% 30%, transparent 50%, rgba(220, 210, 190, 0.2) 51%, transparent 52%),
    radial-gradient(circle at 60% 30%, transparent 60%, rgba(220, 210, 190, 0.2) 61%, transparent 62%);
  z-index: 0;
}

.auth-bg-grid {
  position: absolute;
  bottom: -10px;
  right: -10px;
  width: 250px;
  height: 150px;
  /* A grid pattern for the bottom right */
  background-image: 
    linear-gradient(rgba(200, 190, 170, 0.15) 2px, transparent 2px),
    linear-gradient(90deg, rgba(200, 190, 170, 0.15) 2px, transparent 2px);
  background-size: 30px 30px;
  z-index: 0;
  transform: rotate(15deg);
}

.auth-bg-sketch { display: none; } /* Hide old sketch */

/* Update form inputs (light blue, no icons) */
.new-input-wrapper input {
  background: #edf3ff !important;
  border: 1px solid #d4e0fa !important;
  padding: 12px 16px !important; /* Normal padding, no left icon room */
  font-weight: 500;
  color: #333;
}
.new-input-wrapper input:focus {
  border-color: #8c1528 !important;
  box-shadow: 0 0 0 3px rgba(140, 21, 40, 0.1) !important;
}

.new-submit-btn {
  background: #8b1e32 !important; /* Match maroon exactly */
  border-radius: 6px !important;
  padding: 15px !important;
}

.new-submit-btn:hover {
  background: #751728 !important;
}

.gate-stat-card {
  background: #ffffff !important; /* solid white */
  border: none !important;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.04) !important;
}

.gate-auth-separator {
  width: 40px !important;
  background-color: #cda83b !important;
}
`;

css += updatedCSS;
fs.writeFileSync('styles.css', css);
console.log("CSS appended.");
