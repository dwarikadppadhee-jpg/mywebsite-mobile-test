const fs = require('fs');

// 1. Fix portal.html inline styles
let html = fs.readFileSync('portal.html', 'utf8');

// Fix Leave header
html = html.replace(
  /<h2 style="font-size:1.8rem; font-weight:800; color:#111; margin:0 0 5px 0;">Leave<\/h2>/,
  '<h2 style="font-size:1.8rem; font-weight:800; margin:0 0 5px 0; color:var(--text);">Leave</h2>'
);
html = html.replace(
  /<p style="color:#666; font-size:0.95rem; margin:0;">Manage and track leave requests efficiently\.<\/p>/,
  '<p style="color:var(--muted); font-size:0.95rem; margin:0;">Manage and track leave requests efficiently.</p>'
);

// Fix My Leave History background
html = html.replace(
  /<div style="background:#fff; padding:24px; border-radius:12px; border:1px solid #eaeaea;">/,
  '<div class="panel" style="padding:24px; border-radius:12px;">'
);

fs.writeFileSync('portal.html', html);

// 2. Fix styles.css for Login Page Dark Theme
let css = fs.readFileSync('styles.css', 'utf8');

// Replace the previous dark theme background for shell with transparent
css = css.replace(
  /body\.theme-dark \.gate-unified-shell \{\s*background: var\(--bg\) !important;\s*\}/,
  'body.theme-dark .gate-unified-shell { background: transparent !important; }'
);

// Add full dark theme to the login card
css += `
/* Full Dark Theme for Login Card */
body.theme-dark .gate-unified-card {
  background: var(--panel-strong) !important;
  box-shadow: 0 15px 50px rgba(0, 0, 0, 0.5);
  border: 1px solid var(--line);
}

body.theme-dark .gate-unified-logo {
  background: #ffffff;
  padding: 8px;
  border-radius: 8px;
  mix-blend-mode: normal !important;
}

body.theme-dark .gate-stat-item {
  background: var(--panel) !important;
  border: 1px solid var(--line);
}
`;

fs.writeFileSync('styles.css', css);
console.log("Fixed Login background, Leave header text color, and My Leave History white background in Dark Mode.");
