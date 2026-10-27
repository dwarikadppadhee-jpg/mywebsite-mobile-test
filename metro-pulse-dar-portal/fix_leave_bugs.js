const fs = require('fs');

// 1. Fix app.js
let appJs = fs.readFileSync('app.js', 'utf8');

// Fix futureLeaves sorting and filtering
appJs = appJs.replace(
  /const futureLeaves = allLeaves\.filter\(l => \{\s*return l\.startDate > todayStr;\s*\}\)\.sort\(\(a,b\) => a\.startDate\.localeCompare\(b\.startDate\)\);/,
  `const futureLeaves = allLeaves.filter(l => {
      return (l.startDate || "") > todayStr;
    }).sort((a,b) => (a.startDate || "").localeCompare(b.startDate || ""));`
);

// Fix onLeaveToday filtering
appJs = appJs.replace(
  /const onLeaveToday = allLeaves\.filter\(l => \{\s*if \(l\.leaveType === "single" \|\| l\.leaveType === "half"\) return l\.startDate === todayStr;\s*return todayStr >= l\.startDate && todayStr <= l\.endDate;\s*\}\);/g,
  `const onLeaveToday = allLeaves.filter(l => {
      if (l.leaveType === "single" || l.leaveType === "half") return (l.startDate || "") === todayStr;
      return todayStr >= (l.startDate || "") && todayStr <= (l.endDate || "");
    });`
);

// Fix onLeaveThatDay filtering (the manager date check listener)
appJs = appJs.replace(
  /const onLeaveThatDay = allLeaves\.filter\(l => \{\s*if \(l\.leaveType === "single" \|\| l\.leaveType === "half"\) return l\.startDate === targetStr;\s*return targetStr >= l\.startDate && targetStr <= l\.endDate;\s*\}\);/g,
  `const onLeaveThatDay = allLeaves.filter(l => {
        if (l.leaveType === "single" || l.leaveType === "half") return (l.startDate || "") === targetStr;
        return targetStr >= (l.startDate || "") && targetStr <= (l.endDate || "");
      });`
);

// Fix Invalid Date in history
appJs = appJs.replace(
  /\$\{new Date\(l\.timestamp\)\.toLocaleDateString\(\)\}/g,
  '${new Date(l.timestamp || l.submittedAt || Date.now()).toLocaleDateString()}'
);

// Fix undefined start date in history text
appJs = appJs.replace(
  /Date\(s\): \$\{l\.startDate\} \$\{l\.leaveType==='multi' \? ' to ' \+ l\.endDate : ''\}/,
  `Date(s): \${l.startDate || "Unknown"} \${l.leaveType==='multi' ? ' to ' + (l.endDate || "") : ''}`
);

fs.writeFileSync('app.js', appJs);

// 2. Fix styles.css for calendar icon and dark mode
let css = fs.readFileSync('styles.css', 'utf8');

css += `
/* Fix date picker calendar icon in dark mode */
body.theme-dark input[type="date"]::-webkit-calendar-picker-indicator {
    filter: invert(1);
    opacity: 0.6;
}
body.theme-dark input[type="date"]::-webkit-calendar-picker-indicator:hover {
    opacity: 1;
}
`;

fs.writeFileSync('styles.css', css);
console.log("Applied JS fixes for Admin Leave Error and Invalid Date, and added Dark Mode Calendar Icon CSS.");
