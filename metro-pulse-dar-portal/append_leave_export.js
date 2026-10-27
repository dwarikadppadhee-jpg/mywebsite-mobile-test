const fs = require('fs');
let appJs = fs.readFileSync('app.js', 'utf8');

const exportLogic = `
// =========================================================================
// LEAVE MONTHLY EXPORT
// =========================================================================
function exportMonthlyLeave(user, monthStr) {
  if (!monthStr) {
    alert("Please select a month to export.");
    return;
  }
  
  const allUsers = users();
  const allLeaves = leaves();
  
  // Calculate totals per employee
  const employeeLeaveData = allUsers.map(u => {
    let totalLeave = 0;
    const details = [];
    
    allLeaves.filter(l => l.employeeId === u.employeeId).forEach(l => {
       if (l.leaveType === "half") {
         if (l.startDate.startsWith(monthStr)) {
           totalLeave += 0.5;
           details.push(l.startDate + " (Half)");
         }
       } else if (l.leaveType === "single" || !l.leaveType) {
         if (l.startDate.startsWith(monthStr)) {
           totalLeave += 1.0;
           details.push(l.startDate + " (Full)");
         }
       } else if (l.leaveType === "multi") {
         const days = datesBetween(l.startDate, l.endDate).filter(d => d.startsWith(monthStr));
         totalLeave += days.length;
         if(days.length > 0) details.push(days[0] + " to " + days[days.length-1] + " ("+days.length+" days)");
       }
    });
    
    return {
      employeeId: u.employeeId,
      name: u.name,
      department: u.department || "",
      level: u.level || "",
      total: totalLeave,
      details: details.join(" | ")
    };
  });
  
  // Filter only employees that had at least > 0 leaves? Or show all?
  // Showing all is usually better for a general report.
  const sortedData = employeeLeaveData.sort((a,b) => b.total - a.total);
  
  const rows = [];
  rows.push(["Employee Name", "Employee ID", "Department", "Role Level", "Total Leave Days", "Leave Details"]);
  
  sortedData.forEach(d => {
    rows.push([d.name, d.employeeId, d.department, d.level, d.total.toString(), d.details]);
  });
  
  const filename = "Leave_Report_" + monthStr + ".xls";
  const title = "Monthly Leave Report (" + monthStr + ")";
  
  // Build HTML table for Excel
  const tableRows = rows.map((row, index) => {
    return "<tr>" + row.map(cell => {
      const tag = index === 0 ? "th" : "td";
      return "<" + tag + ">" + escapeHtml(cell || "") + "</" + tag + ">";
    }).join("") + "</tr>";
  }).join("");
  
  const excelOptions = \`<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Leave Report</x:Name><x:WorksheetOptions><x:AutoFilter x:Range="R1C1:R\${rows.length}C6"/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->\`;
  const html = \`<!doctype html><html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8">\${excelOptions}<style>body{font-family:Arial,sans-serif}td,th{vertical-align:top;white-space:pre-line;border:1px solid #999;padding:6px}th{background:#f2f2f2;font-weight:700}</style></head><body><table border="1" data-auto-filter="true">\${tableRows}</table></body></html>\`;
  
  triggerBlobDownload(filename, new Blob([html], {type:"application/vnd.ms-excel;charset=utf-8;"}));
}

document.addEventListener("DOMContentLoaded", () => {
  const btnExport = document.getElementById("btnLeaveExport");
  const monthInput = document.getElementById("leaveExportMonth");
  
  if (btnExport && monthInput) {
    btnExport.addEventListener("click", () => {
      const user = activeUser();
      if (user) {
        exportMonthlyLeave(user, monthInput.value);
      }
    });
  }
});
`;

appJs += "\n" + exportLogic;
fs.writeFileSync('app.js', appJs);
console.log("Appended export logic to app.js");
