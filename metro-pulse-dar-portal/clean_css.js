const fs = require('fs');
let css = fs.readFileSync('styles.css', 'utf8');

const marker = "/* =========================================================================\r\n   REDESIGNED LOGIN GATE";
const markerAlt = "/* =========================================================================\n   REDESIGNED LOGIN GATE";

let index = css.indexOf(marker);
if (index === -1) index = css.indexOf(markerAlt);

if (index !== -1) {
  css = css.substring(0, index);
}

const finalCleanCSS = `
/* =========================================================================
   FINAL CLEAN LOGIN GATE (SOLID, NO GLASSMORPHISM, NO ANIMATION)
   ========================================================================= */

/* STOP LIVE EFFECT (ANIMATION) */
.login-slide {
  animation: none !important;
  opacity: 1 !important;
  transform: scale(1) !important;
}

/* Hide extra slides so they don't fade in/out if animation somehow runs */
.login-slide-2, .login-slide-3, .login-slide-4, .login-slide-5, .login-slide-6 {
  display: none !important;
}

.new-gate-shell {
  position: relative;
  z-index: 10;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

/* Unified Solid Card */
.gate-unified-card {
  display: flex;
  flex-direction: row;
  width: 100%;
  max-width: 850px;
  min-height: 450px;
  background: #fdfaf4; /* Solid color */
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 15px 50px rgba(0, 0, 0, 0.2);
  position: relative;
  margin: 0 auto;
}

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
  padding: 30px;
  padding-top: 40px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  overflow: hidden;
  background: #fdfaf4; /* solid */
}

.gate-unified-right {
  flex: 1;
  position: relative;
  padding: 30px 40px;
  background: #fdf9f1; /* solid */
  display: flex;
  flex-direction: column;
  justify-content: center;
}

/* Left Panel Graphics (Solid / Non-Glass) */
.brand-bg-dots {
  position: absolute;
  top: 0; right: 0; bottom: 0; left: 0;
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
  width: 100%;
  height: 100px;
  bottom: 0;
  left: 0;
  right: 0;
  position: absolute;
  z-index: 1;
}

.gate-logo-container {
  background: transparent;
  box-shadow: none;
  padding: 0;
  margin-bottom: 20px;
  margin-top: 10px;
  position: relative;
  z-index: 2;
}

.new-gate-logo {
  max-width: 130px;
}

/* Stat Cards - Solid White */
.gate-stats-row {
  display: flex;
  justify-content: space-between;
  gap: 15px;
  width: 100%;
  position: relative;
  z-index: 2;
  margin-top: auto;
  margin-bottom: 10px;
}

.gate-stat-card {
  flex: 1;
  background: #ffffff; /* Solid White */
  border-radius: 12px;
  padding: 10px 5px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
  border: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  position: relative;
  padding-bottom: 20px;
}

.gate-stat-icon-wrap {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  margin-bottom: 2px;
}

.gate-stat-number {
  font-size: 1.1rem;
  font-weight: 800;
  line-height: 1;
}

.gate-stat-label {
  font-size: 0.6rem;
  color: #333333;
  font-weight: 600;
  line-height: 1.3;
  text-align: center;
}

.stat-line {
  position: absolute;
  bottom: 10px;
  width: 20px;
  height: 2px;
  border-radius: 2px;
}
.stat-line-red { background-color: #c92a2a; }
.stat-line-yellow { background-color: #d4a017; }
.stat-line-green { background-color: #2f9e44; }

/* Right Panel Elements */
.auth-bg-topo {
  position: absolute;
  top: 0; right: 0; bottom: 0; left: 0;
  background: 
    radial-gradient(circle at 60% 30%, transparent 10%, rgba(220, 210, 190, 0.2) 11%, transparent 12%),
    radial-gradient(circle at 60% 30%, transparent 20%, rgba(220, 210, 190, 0.2) 21%, transparent 22%),
    radial-gradient(circle at 60% 30%, transparent 30%, rgba(220, 210, 190, 0.2) 31%, transparent 32%),
    radial-gradient(circle at 60% 30%, transparent 40%, rgba(220, 210, 190, 0.2) 41%, transparent 42%),
    radial-gradient(circle at 60% 30%, transparent 50%, rgba(220, 210, 190, 0.2) 51%, transparent 52%),
    radial-gradient(circle at 60% 30%, transparent 60%, rgba(220, 210, 190, 0.2) 61%, transparent 62%);
  z-index: 0;
}

.gate-auth-header {
  margin-bottom: 25px;
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
  color: #1a1a1a;
  margin: 0;
}

.gate-auth-separator {
  width: 40px;
  height: 2px;
  background-color: #cda83b;
  margin-top: 15px;
  border-radius: 2px;
}

.new-gate-form {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.new-form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.new-form-group label {
  font-size: 0.8rem;
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
  font-size: 1rem;
  z-index: 5;
}

.new-input-wrapper input {
  width: 100%;
  background: #ffffff; /* Solid White */
  border: 1px solid #e0e0e0;
  padding: 12px 12px 12px 36px;
  font-weight: 500;
  color: #333;
  border-radius: 6px;
  font-size: 0.9rem;
  outline: none;
}
.new-input-wrapper input:focus {
  border-color: #8c1528;
  box-shadow: 0 0 0 3px rgba(140, 21, 40, 0.1);
}

/* Chrome autofill background fix - force white */
input:-webkit-autofill,
input:-webkit-autofill:hover, 
input:-webkit-autofill:focus, 
input:-webkit-autofill:active{
    -webkit-box-shadow: 0 0 0 30px white inset !important;
}

.new-submit-btn {
  margin-top: 5px;
  background: #8b1e32;
  color: #ffffff;
  border: none;
  padding: 12px;
  border-radius: 6px;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
}

.new-submit-btn:hover {
  background: #751728;
}

/* Hide Old Elements */
body[data-page="portal"]:not(.portal-logged-in) .gate-layout {
  display: none !important;
}
body[data-page="portal"]:not(.portal-logged-in) .gate-copy-panel {
  display: none !important;
}

@media (max-width: 850px) {
  .gate-unified-card {
    flex-direction: column;
  }
  .gate-unified-divider { display: none; }
}
`;

css += finalCleanCSS;

fs.writeFileSync('styles.css', css);
console.log("CSS completely cleaned and replaced with final solid layout.");
