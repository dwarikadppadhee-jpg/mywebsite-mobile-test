const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf8');

const uploadCode = `
window.adminUploadExcelUsers = async function(event) {
  const file = event.target.files[0];
  if (!file) return;
  const viewer = activeUser();
  if (!viewer || !canManageUsers(viewer)) return;

  showToast("Reading Excel...", "Parsing the uploaded file.");
  
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(firstSheet);
      
      let updatedCount = 0;
      let toUpsert = [];
      const currentUsers = users();
      
      for (const row of rows) {
        const rowEmpId = row["Employee ID"] || row["employee_id"] || row["EmployeeId"];
        if (!rowEmpId) continue;
        
        const existingUser = currentUsers.find(u => u.employeeId.toUpperCase() === String(rowEmpId).toUpperCase());
        if (!existingUser) continue;
        
        const mergedUser = { ...existingUser };
        
        if (row["Role"]) mergedUser.role = row["Role"];
        if (row["Work Location"]) mergedUser.location = row["Work Location"];
        if (row["Official Mobile"]) mergedUser.officialPhone = String(row["Official Mobile"]);
        if (row["Personal Num"]) mergedUser.personalPhone = String(row["Personal Num"]);
        if (row["Work E-Mail"]) mergedUser.email = row["Work E-Mail"];
        if (row["Operational Manager Name"]) mergedUser.managerId = row["Operational Manager Name"];
        if (row["Entity Name"]) mergedUser.entity = row["Entity Name"];
        if (row["Department"]) mergedUser.department = row["Department"];
        if (row["Level"]) mergedUser.level = String(row["Level"]).toLowerCase() === 'admin' ? 'admin' : String(row["Level"]).replace(/\\D/g, '') || "3";
        if (row["Name"]) mergedUser.name = row["Name"];
        
        toUpsert.push(mergedUser);
        updatedCount++;
      }
      
      if (toUpsert.length === 0) {
        showToast("No Changes", "No valid existing employees were found in the sheet.");
        event.target.value = '';
        return;
      }
      
      showToast("Syncing...", \`Updating \${updatedCount} users in cloud. This may take a few seconds...\`);
      
      let successCount = 0;
      for (const u of toUpsert) {
         try {
           await cloudSaveUser(u);
           successCount++;
         } catch(e) {
           console.error("Failed saving user", u.employeeId, e);
         }
      }
      
      showToast("Success", \`Successfully updated \${successCount} user(s).\`);
      event.target.value = '';
      await refreshAllCloudData();
      renderPortal();
      
    } catch (err) {
      console.error(err);
      alert("Error parsing Excel: " + err.message);
      event.target.value = '';
    }
  };
  reader.readAsArrayBuffer(file);
};
`;

if (!code.includes("window.adminUploadExcelUsers")) {
    fs.appendFileSync('app.js', uploadCode);
}
