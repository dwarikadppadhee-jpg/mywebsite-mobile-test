const fs = require('fs');

// 1. Fix app.js
let appJs = fs.readFileSync('app.js', 'utf8');
appJs = appJs.replace(/"DAR Review \\u2753"/g, '"DAR Review"');
// Fix clearComplianceFiltersButton logic in app.js
appJs = appJs.replace(
  'document.getElementById("clearComplianceFiltersButton")?.addEventListener("click",()=>{complianceFilter="all";const si=document.getElementById("complianceSearchInput");if(si)si.value="";renderPortal();});',
  'document.getElementById("clearComplianceFiltersButton")?.addEventListener("click",()=>{complianceFilter="all";const si=document.getElementById("complianceSearchInput");if(si)si.value="";const df=document.getElementById("complianceDateFilter");if(df)df.value=today();const mf=document.getElementById("complianceMonthFilter");if(mf)mf.value=selectedComplianceMonth();renderPortal();});'
);
fs.writeFileSync('app.js', appJs, 'utf8');

// 2. Fix portal.html
let portalHtml = fs.readFileSync('portal.html', 'utf8');
portalHtml = portalHtml.replace('fa-clipboard-check', 'fa-check-circle');
portalHtml = portalHtml.replace(
  '<button class="button button-secondary compliance-clear-button" id="clearComplianceFiltersButton" type="button">',
  '<button class="compact-button compliance-clear-button" id="clearComplianceFiltersButton" type="button" style="margin-top:auto; height: 38px;">'
);
fs.writeFileSync('portal.html', portalHtml, 'utf8');

// 3. Fix styles.css
let stylesCss = fs.readFileSync('styles.css', 'utf8');
const newCss = `
.success-filter.active-filter .metric-icon-success {
  color: var(--good);
}
.metric-icon-success {
  color: var(--good) !important;
}
body[data-page='portal'] .portal-notification-toggle .notification-badge, .portal-notification-toggle .notification-badge {
  top: -10px !important;
  right: -10px !important;
}
`;
stylesCss += newCss;
fs.writeFileSync('styles.css', stylesCss, 'utf8');

console.log('SUCCESS: Final UI fixes applied!');
