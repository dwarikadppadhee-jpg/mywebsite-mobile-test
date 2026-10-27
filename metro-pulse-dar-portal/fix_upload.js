const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf8');

const oldLogic = `      showToast("Syncing...", \`Updating \${updatedCount} users in cloud.\`);
      
      const { created, updated, warnings } = await cloudBulkImportUsers(toUpsert);
      if (warnings && warnings.length) {
         console.warn("Upload warnings:", warnings);
      }
      
      showToast("Success", \`Successfully updated \${updatedCount} user(s).\`);
      event.target.value = '';
      await refreshAllCloudData();
      renderPortal();`;

const newLogic = `      showToast("Syncing...", \`Updating \${updatedCount} users in cloud. This may take a few seconds...\`);
      
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
      renderPortal();`;

code = code.replace(oldLogic, newLogic);
fs.writeFileSync('app.js', code);
