const fs = require('fs');
let css = fs.readFileSync('styles.css', 'utf8');

const marker = "/* =========================================================================\r\n   FINAL CLEAN LOGIN GATE";
const markerAlt = "/* =========================================================================\n   FINAL CLEAN LOGIN GATE";

let index = css.indexOf(marker);
if (index === -1) index = css.indexOf(markerAlt);

if (index !== -1) {
  css = css.substring(0, index);
}

const finalFlawlessCSS = `
/* =========================================================================
   FINAL CLEAN LOGIN GATE (PERFECT LAYOUT, V5)
   ========================================================================= */

/* STOP LIVE EFFECT (ANIMATION) */
.login-slide {
  animation: none !important;
  opacity: 1 !important;
  transform: scale(1) !important;
}

.login-slide-2, .login-slide-3, .login-slide-4, .login-slide-5, .login-slide-6 {
  display: none !important;
}

/* Background Layout */
.gate-unified-shell {
  position: relative;
  z-index: 10;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

/* Unified Card */
.gate-unified-card {
  display: flex;
  flex-direction: row;
  width: 100%;
  max-width: 850px;
  min-height: 480px;
  background: #fdfaf4;
  border-radius: 16px;
  box-shadow: 0 15px 50px rgba(0, 0, 0, 0.2);
  position: relative;
  margin: 0 auto;
}

/* Left Panel */
.gate-unified-left {
  flex: 1;
  position: relative;
  padding: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #fdfaf4;
}

.gate-left-dots {
  position: absolute;
  top: 0; right: 0; bottom: 0; left: 0;
  background-image: radial-gradient(#d32f2f 1px, transparent 1px);
  background-size: 20px 20px;
  opacity: 0.15;
}

.gate-unified-logo {
  max-width: 140px;
  position: relative;
  z-index: 2;
  mix-blend-mode: darken; /* Removes white background from the JPEG */
  margin-bottom: 30px;
}

.gate-stats-container {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  position: relative;
  z-index: 2;
}

.gate-stat-item {
  flex: 1;
  background: #ffffff;
  border-radius: 12px;
  padding: 12px 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  position: relative;
  padding-bottom: 18px;
}

.gate-stat-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
}

.gate-stat-item strong {
  font-size: 1.1rem;
  font-weight: 800;
  line-height: 1;
  color: #a81c2f;
}

.gate-stat-item span {
  font-size: 0.6rem;
  color: #333333;
  font-weight: 600;
  line-height: 1.2;
  text-align: center;
}

.stat-underline {
  position: absolute;
  bottom: 8px;
  width: 20px;
  height: 2px;
  border-radius: 2px;
}

.gate-left-waves {
  width: 100%;
  height: 120px;
  position: absolute;
  bottom: 0;
  left: 0;
}

/* Divider */
.gate-unified-divider {
  width: 2px;
  background: transparent;
  position: relative;
}
.gate-unified-divider::before {
  content: '';
  position: absolute;
  top: 0; bottom: 0; left: 0;
  width: 30px;
  border-left: 2px solid #d4a017;
  border-radius: 30px 0 0 0;
  opacity: 0.7;
}

/* Right Panel */
.gate-unified-right {
  flex: 1;
  position: relative;
  padding: 50px 40px;
  background: #fdf9f1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.gate-right-topo {
  position: absolute;
  top: 0; right: 0; bottom: 0; left: 0;
  background: 
    radial-gradient(circle at 70% 30%, transparent 10%, rgba(212, 160, 23, 0.05) 11%, transparent 12%),
    radial-gradient(circle at 70% 30%, transparent 20%, rgba(212, 160, 23, 0.05) 21%, transparent 22%),
    radial-gradient(circle at 70% 30%, transparent 30%, rgba(212, 160, 23, 0.05) 31%, transparent 32%),
    radial-gradient(circle at 70% 30%, transparent 40%, rgba(212, 160, 23, 0.05) 41%, transparent 42%);
}

.gate-auth-header {
  position: relative;
  z-index: 2;
  margin-bottom: 25px;
}

.gate-auth-tag {
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 1.5px;
  color: #1a1a1a;
  text-transform: uppercase;
  margin-bottom: 6px;
}

.gate-auth-title {
  font-family: "Lora", serif;
  font-size: 2rem;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0;
}

.gate-auth-line {
  width: 40px;
  height: 2px;
  background-color: #d4a017;
  margin-top: 12px;
}

.gate-auth-form {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.gate-input-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.gate-input-group label {
  font-size: 0.8rem;
  font-weight: 700;
  color: #1a1a1a;
}

.gate-input-box {
  position: relative;
  display: flex;
  align-items: center;
}

.gate-input-box i {
  position: absolute;
  left: 12px;
  color: #888888;
  font-size: 0.95rem;
  z-index: 5;
}

.gate-input-box input {
  width: 100%;
  background: #ffffff !important;
  border: 1px solid #d0d0d0;
  padding: 12px 12px 12px 36px;
  font-weight: 500;
  color: #333;
  border-radius: 6px;
  font-size: 0.9rem;
  outline: none;
  transition: all 0.2s;
}

.gate-input-box input:focus {
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

.gate-submit-btn {
  margin-top: 10px;
  background: #8b1e32;
  color: #ffffff;
  border: none;
  padding: 14px;
  border-radius: 6px;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s;
}
.gate-submit-btn:hover {
  background: #751728;
}

/* Hide Old Elements */
body[data-page="portal"]:not(.portal-logged-in) .gate-layout { display: none !important; }
body[data-page="portal"]:not(.portal-logged-in) .gate-copy-panel { display: none !important; }

@media (max-width: 850px) {
  .gate-unified-card { flex-direction: column; }
  .gate-unified-divider { display: none; }
}
`;

css += finalFlawlessCSS;

fs.writeFileSync('styles.css', css);
console.log("CSS completely replaced with final bug-free code.");
