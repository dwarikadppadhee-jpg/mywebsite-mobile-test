const fs = require('fs');

let appJs = fs.readFileSync('d:/All websites/DAR/metro-pulse-dar-portal/app.js', 'utf8');

// Global Task Form fixes
appJs = appJs.replace(
  /const nextFeedback=document\.getElementById\("globalTaskFeedback"\);\s*if\(nextFeedback\)nextFeedback\.textContent=result\.message;\s*return;/g,
  'showToast("Tasks Assigned", result.message); return;'
);

appJs = appJs.replace(
  /const nextFeedback=document\.getElementById\("globalTaskFeedback"\);\s*if\(nextFeedback\)nextFeedback\.textContent=message;/g,
  'showToast("Task Assigned", message);'
);

// Manager Task Form fixes
appJs = appJs.replace(
  /const nextFeedback=document\.getElementById\("managerTaskFeedback"\);\s*if\(nextFeedback\)nextFeedback\.textContent=result\.message;\s*return;/g,
  'showToast("Tasks Assigned", result.message); return;'
);

appJs = appJs.replace(
  /const nextFeedback=document\.getElementById\("managerTaskFeedback"\);\s*if\(nextFeedback\)nextFeedback\.textContent=message;/g,
  'showToast("Task Assigned", message);'
);

// Fallback in case of subtle formatting differences
if (appJs.includes('nextFeedback.textContent=message;')) {
  console.log("Still found textContent=message; applying fallback regex.");
  appJs = appJs.replace(
    /const nextFeedback=document\.getElementById\("([a-zA-Z]+)Feedback"\);if\(nextFeedback\)nextFeedback\.textContent=([^;]+);/g,
    'showToast("Task Assigned", $2);'
  );
}

fs.writeFileSync('d:/All websites/DAR/metro-pulse-dar-portal/app.js', appJs);

let css = fs.readFileSync('d:/All websites/DAR/metro-pulse-dar-portal/styles.css', 'utf8');

// Ghost cursor H1 fix
css += `
/* H1 Ghost Cursor Fix */
#ghostPrimaryCursor { display: none !important; }
#headerGreetingPrimaryCursor { display: none !important; }

/* Maroon Toggle Bar Fix */
.theme-switch-wrapper,
body[data-page="portal"].portal-logged-in .theme-switch-wrapper,
body.theme-dark[data-page="portal"].portal-logged-in .theme-switch-wrapper,
body.theme-dark .theme-switch-wrapper {
  background: #c0002a !important;
  border-color: #c0002a !important;
}

.theme-switch-btn,
body[data-page="portal"].portal-logged-in .theme-switch-btn,
body.theme-dark[data-page="portal"].portal-logged-in .theme-switch-btn,
body.theme-dark .theme-switch-btn {
  color: rgba(255, 255, 255, 0.7) !important;
}

.theme-switch-btn.is-active,
body[data-page="portal"].portal-logged-in .theme-switch-btn.is-active,
body.theme-dark[data-page="portal"].portal-logged-in .theme-switch-btn.is-active,
body.theme-dark .theme-switch-btn.is-active {
  background: #ffffff !important;
  color: #c0002a !important;
}
`;

fs.writeFileSync('d:/All websites/DAR/metro-pulse-dar-portal/styles.css', css);

console.log("Fixes applied.");
