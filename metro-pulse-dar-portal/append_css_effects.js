const fs = require('fs');
let css = fs.readFileSync('styles.css', 'utf8');

const updatedCSS = `

/* =========================================================================
   ENHANCED LOGIN GATE TEXTURES & EFFECTS
   ========================================================================= */

/* Replace standard panel background with enhanced gradients and overflow */
.gate-brand-panel, .gate-auth-panel {
  position: relative;
  overflow: hidden; /* Hide overflow of background elements */
  border: 1px solid rgba(255, 255, 255, 0.4);
}

.gate-brand-panel {
  background: linear-gradient(135deg, #ffffff 0%, #f4f0e6 100%);
}

.gate-auth-panel {
  background: linear-gradient(135deg, #fbf8f1 0%, #f3eee3 100%);
}

/* Update Welcome text */
.gate-auth-title {
  color: #1a1a1a; /* "Welcome" in dark text */
}

.gate-auth-separator {
  width: 50px;
  height: 2px;
  background-color: #d4a017; /* Gold line */
  margin-top: 15px;
  border-radius: 2px;
}

/* Stat card tweaks */
.gate-stat-card {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(5px);
  position: relative;
  padding-bottom: 25px; /* extra space for the line */
}

.stat-line {
  position: absolute;
  bottom: 15px;
  width: 24px;
  height: 2px;
  border-radius: 2px;
}
.stat-line-red { background-color: #c92a2a; }
.stat-line-yellow { background-color: #d4a017; }
.stat-line-green { background-color: #2f9e44; }

/* Textures for Left Panel */
.brand-bg-rays {
  position: absolute;
  top: 0; right: 0; bottom: 0; left: 0;
  background: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 40px,
    rgba(255, 255, 255, 0.4) 40px,
    rgba(255, 255, 255, 0.4) 80px
  );
  opacity: 0.3;
  z-index: 0;
}

.brand-bg-dots {
  position: absolute;
  top: 0; right: 0; bottom: 0; left: 0;
  background-image: radial-gradient(rgba(140, 21, 40, 0.15) 1.5px, transparent 1.5px);
  background-size: 24px 24px;
  opacity: 0.6;
  z-index: 0;
}

.brand-bg-sketch {
  position: absolute;
  top: -20px;
  left: -20px;
  font-size: 240px;
  color: #000;
  opacity: 0.03;
  z-index: 1;
  transform: rotate(-10deg);
}

.brand-bg-wave {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 250px;
  height: auto;
  z-index: 1;
}

/* Textures for Right Panel */
.auth-bg-topo {
  position: absolute;
  top: 0; right: 0; bottom: 0; left: 0;
  /* Simulating a subtle fingerprint or topo map via radial gradients */
  background: 
    radial-gradient(circle at 80% 20%, transparent 20%, rgba(212, 160, 23, 0.03) 21%, transparent 22%),
    radial-gradient(circle at 80% 20%, transparent 40%, rgba(212, 160, 23, 0.03) 41%, transparent 42%),
    radial-gradient(circle at 80% 20%, transparent 60%, rgba(212, 160, 23, 0.03) 61%, transparent 62%),
    radial-gradient(circle at 80% 20%, transparent 80%, rgba(212, 160, 23, 0.03) 81%, transparent 82%);
  z-index: 0;
}

.auth-bg-sketch {
  position: absolute;
  bottom: -40px;
  right: -40px;
  font-size: 300px;
  color: #000;
  opacity: 0.03;
  z-index: 1;
}

/* Update inputs for cream background */
.new-input-wrapper input {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(5px);
  border: 1px solid rgba(0, 0, 0, 0.08);
}
.new-input-wrapper input:focus {
  background: #ffffff;
}
`;

css += updatedCSS;
fs.writeFileSync('styles.css', css);
console.log("CSS appended.");
