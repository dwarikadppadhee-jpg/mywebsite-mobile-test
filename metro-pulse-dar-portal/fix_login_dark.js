const fs = require('fs');

let css = fs.readFileSync('styles.css', 'utf8');

css += `
/* =========================================================
   DARK THEME FIXES (Login Page)
========================================================= */

body.theme-dark .gate-unified-shell {
  background: var(--bg) !important;
}

body.theme-dark .gate-unified-card {
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
}

body.theme-dark .gate-unified-right {
  background: var(--panel) !important;
}

body.theme-dark .gate-stat-item {
  background: rgba(255, 255, 255, 0.05) !important;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

body.theme-dark .gate-stat-item strong {
  color: var(--gold) !important;
}

body.theme-dark .gate-stat-item span {
  color: var(--muted) !important;
}

body.theme-dark .gate-auth-title,
body.theme-dark .gate-input-group label,
body.theme-dark .gate-auth-tag {
  color: var(--text) !important;
}

body.theme-dark .gate-unified-divider::before {
  border-left-color: rgba(255, 255, 255, 0.15) !important;
}
`;

fs.writeFileSync('styles.css', css);
console.log("Added Dark Theme support for Login Page");
