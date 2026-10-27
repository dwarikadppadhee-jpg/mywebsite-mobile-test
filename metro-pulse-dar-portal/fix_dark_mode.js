const fs = require('fs');

// 1. Fix portal.html inline styles for Leave Section
let html = fs.readFileSync('portal.html', 'utf8');

// Remove hardcoded backgrounds from leaveSection
html = html.replace(
  /id="leaveSection" style="background:#ffffff; border:none; box-shadow:none;"/,
  'id="leaveSection"'
);

// Remove hardcoded backgrounds from leaveForm
html = html.replace(
  /id="leaveForm" class="form-grid" style="background:#fff; padding:24px; border-radius:12px; border:1px solid #eaeaea; margin-bottom:24px;"/,
  'id="leaveForm" class="form-grid panel"'
);

fs.writeFileSync('portal.html', html);

// 2. Append fixes to styles.css
let css = fs.readFileSync('styles.css', 'utf8');

css += `
/* =========================================================
   DARK THEME FIXES (Leave & Login)
========================================================= */

/* Fix Login Inputs in Dark Mode */
body.theme-dark .gate-input-box input {
  background: rgba(24, 24, 28, 0.98) !important;
  color: #ffffff !important;
  border-color: rgba(255, 255, 255, 0.2);
}
body.theme-dark .gate-input-box input::placeholder {
  color: rgba(255, 255, 255, 0.42) !important;
}

/* Ensure Leave Form adapts to dark mode correctly */
body.theme-dark #leaveForm {
  background: var(--panel-strong) !important;
  border-color: var(--line) !important;
}
body.theme-dark #leaveSection {
  background: transparent !important;
}
`;

fs.writeFileSync('styles.css', css);
console.log("Fixed dark mode issues for login and leave section.");
