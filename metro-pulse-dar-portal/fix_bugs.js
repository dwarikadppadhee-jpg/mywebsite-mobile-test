const fs = require('fs');
let appJs = fs.readFileSync('app.js', 'utf8');

// Fix 1: Populate complianceDateFilter and complianceMonthFilter
appJs = appJs.replace(
  /const dateSelect = document.getElementById\("complianceDateFilter"\);\r?\n\s*if \(dateSelect && dateSelect.value !== reportDate\) \{/,
  `const dateSelect = document.getElementById("complianceDateFilter");
  if (dateSelect) {
    if (dateSelect.options.length === 0) {
      const user = activeUser();
      let optionsHtml = '';
      if (user && isAdmin(user)) {
         for(let i=0; i<30; i++) {
           const d = dateKeyDaysAgo(i);
           optionsHtml += '<option value="' + d + '">' + (i===0?"Today":d) + '</option>';
         }
      } else {
         optionsHtml = complianceDateOptions().map(opt => '<option value="' + opt.value + '">' + opt.label + '</option>').join('');
      }
      dateSelect.innerHTML = optionsHtml;
    }
    if (dateSelect.value !== reportDate) dateSelect.value = reportDate;
  }
  
  const monthInput = document.getElementById("complianceMonthFilter");
  if (monthInput && !monthInput.value) {
    monthInput.value = selectedComplianceMonth();
  }
  
  if (false) {`
);

fs.writeFileSync('app.js', appJs);
console.log("Bug fixes applied to app.js");
