const fs = require('fs');
let appJs = fs.readFileSync('app.js', 'utf8');

// I will append a global fix for the date selector to update complianceDateFilter correctly.
const fixScript = `
// =========================================================================
// CUSTOM DATE FILTER FIX
// =========================================================================
document.addEventListener("DOMContentLoaded", () => {
   const dateSelect = document.getElementById("complianceDateFilter");
   const customDateInput = document.getElementById("complianceCustomDateFilter");

   if (dateSelect) {
       dateSelect.addEventListener("change", (e) => {
           if (e.target.value === "custom") {
               if (customDateInput) customDateInput.classList.remove("hidden");
           } else {
               if (customDateInput) customDateInput.classList.add("hidden");
               complianceDateFilter = e.target.value;
               renderCompliance(activeUser());
           }
       });
   }
   if (customDateInput) {
       customDateInput.addEventListener("change", (e) => {
           complianceDateFilter = e.target.value || today();
           renderCompliance(activeUser());
       });
   }
});
`;

appJs += "\n" + fixScript;
fs.writeFileSync('app.js', appJs);
console.log("Appended custom date filter fix to app.js");
