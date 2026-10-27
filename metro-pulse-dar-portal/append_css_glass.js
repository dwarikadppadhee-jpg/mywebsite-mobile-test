const fs = require('fs');
let css = fs.readFileSync('styles.css', 'utf8');

const glassCSS = `
/* =========================================================================
   3D GLASSMORPHISM EFFECT ADDITION
   ========================================================================= */

/* The Unified Card Container - Glassmorphism */
.gate-unified-card {
  background: rgba(255, 255, 255, 0.15) !important;
  backdrop-filter: blur(25px) saturate(1.5) !important;
  -webkit-backdrop-filter: blur(25px) saturate(1.5) !important;
  border: 1px solid rgba(255, 255, 255, 0.4) !important;
  border-top: 1px solid rgba(255, 255, 255, 0.7) !important;
  border-left: 1px solid rgba(255, 255, 255, 0.7) !important;
  box-shadow: 
    0 15px 35px rgba(0, 0, 0, 0.3),
    inset 0 0 20px rgba(255, 255, 255, 0.5) !important;
  transform: perspective(1000px) rotateX(2deg) rotateY(-2deg) scale(0.98);
  transition: transform 0.4s ease, box-shadow 0.4s ease;
}

.gate-unified-card:hover {
  transform: perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1);
  box-shadow: 
    0 25px 50px rgba(0, 0, 0, 0.4),
    inset 0 0 30px rgba(255, 255, 255, 0.6) !important;
}

/* Make internal panels transparent so glass shows */
.gate-unified-left {
  background: rgba(255, 255, 255, 0.1) !important;
}
.gate-unified-right {
  background: rgba(255, 255, 255, 0.4) !important;
  border-left: 1px solid rgba(255, 255, 255, 0.3);
}

/* Stat Cards - 3D Glass */
.gate-stat-card {
  background: rgba(255, 255, 255, 0.45) !important;
  backdrop-filter: blur(15px) !important;
  border: 1px solid rgba(255, 255, 255, 0.6) !important;
  border-top: 1px solid rgba(255, 255, 255, 0.9) !important;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15), inset 0 2px 5px rgba(255,255,255,0.8) !important;
  transform: translateY(0);
  transition: all 0.3s ease;
}
.gate-stat-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 15px 25px rgba(0, 0, 0, 0.2), inset 0 2px 5px rgba(255,255,255,0.9) !important;
}

/* Sign In Button - 3D Effect */
.new-submit-btn {
  background: linear-gradient(145deg, #9e1831, #751728) !important;
  box-shadow: 0 6px 0 #4a0b15, 0 10px 20px rgba(0,0,0,0.4) !important;
  transform: translateY(0);
  transition: all 0.1s ease !important;
  position: relative;
  text-shadow: 0 2px 4px rgba(0,0,0,0.3);
}
.new-submit-btn:active {
  box-shadow: 0 0 0 #4a0b15, 0 2px 5px rgba(0,0,0,0.4) !important;
  transform: translateY(6px);
}

/* Enhance text contrast on glass */
.gate-auth-tag {
  color: #000000 !important;
  text-shadow: 0 1px 2px rgba(255,255,255,0.8);
}
.gate-auth-title {
  color: #000000 !important;
  text-shadow: 0 1px 2px rgba(255,255,255,0.8);
}

/* Inputs - Glassy 3D */
.new-input-wrapper input {
  background: rgba(255, 255, 255, 0.7) !important;
  border: 1px solid rgba(255, 255, 255, 0.8) !important;
  box-shadow: inset 0 2px 5px rgba(0,0,0,0.05), 0 2px 10px rgba(255,255,255,0.5) !important;
  backdrop-filter: blur(10px);
}
.new-input-wrapper input:focus {
  background: rgba(255, 255, 255, 0.95) !important;
  box-shadow: inset 0 2px 5px rgba(0,0,0,0.05), 0 0 15px rgba(140, 21, 40, 0.3) !important;
}

/* Glowing Gold Divider */
.gate-unified-divider::before {
  box-shadow: 0 0 15px rgba(212, 160, 23, 0.8);
}
`;

css += glassCSS;
fs.writeFileSync('styles.css', css);
console.log("3D Glassmorphism CSS appended.");
