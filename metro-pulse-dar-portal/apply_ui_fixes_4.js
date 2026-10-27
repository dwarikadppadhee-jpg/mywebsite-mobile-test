const fs = require('fs');
let appJs = fs.readFileSync('d:/All websites/DAR/metro-pulse-dar-portal/app.js', 'utf8');

const targetStr = `function openReportFromNotification(reportId){
  const user=activeUser();const report=findReportById(reportId);if(!user||!report)return;
  if(report.employeeId===user.employeeId){
    selectedHistoryReportId=report.id;showSection("historySection");renderPortal();return;
  }
  if(canUseCompliance(user)){selectedComplianceEmployeeId=report.employeeId;showSection("complianceSection");renderPortal();}
}
function openNotificationItem(item){
  const user=activeUser();if(!user||!item)return;
  if(item.kind==="announcement"){showSection("newsSection");renderPortal();document.getElementById("newsSection")?.scrollIntoView({behavior:"smooth",block:"start"});return;}
  if(item.kind==="reminder"&&!item.reportId){showSection("darSection");renderPortal();document.getElementById("darSection")?.scrollIntoView({behavior:"smooth",block:"start"});return;}
  if(item.reportId)openReportFromNotification(item.reportId);
}`;

const newStr = `function openReportFromNotification(reportId){
  const user=activeUser();const report=findReportById(reportId);if(!user||!report)return;
  if(report.employeeId===user.employeeId){
    selectedHistoryReportId=report.id;showSection("historySection");renderPortal();
    document.getElementById("historySection")?.scrollIntoView({behavior:"smooth",block:"start"});
    return;
  }
  if(isLevel2(user) || isLevel3(user)){
    selectedTeamReportId=report.id;showSection("teamReportsSection");renderPortal();
    document.getElementById("teamReportsSection")?.scrollIntoView({behavior:"smooth",block:"start"});
    return;
  }
  if(canUseCompliance(user)){selectedComplianceEmployeeId=report.employeeId;showSection("complianceSection");renderPortal();}
}
function openNotificationItem(item){
  const user=activeUser();if(!user||!item)return;
  if(item.kind==="announcement"){showSection("newsSection");renderPortal();document.getElementById("newsSection")?.scrollIntoView({behavior:"smooth",block:"start"});return;}
  if(item.kind==="reminder"&&!item.reportId){showSection("darSection");renderPortal();document.getElementById("darSection")?.scrollIntoView({behavior:"smooth",block:"start"});return;}
  if(item.kind==="notification" && item.message && item.message.includes("assigned you a")){
    showSection("tasksSection");renderPortal();document.getElementById("tasksSection")?.scrollIntoView({behavior:"smooth",block:"start"});return;
  }
  if(item.reportId)openReportFromNotification(item.reportId);
}`;

appJs = appJs.replace(targetStr, newStr);
fs.writeFileSync('d:/All websites/DAR/metro-pulse-dar-portal/app.js', appJs);
console.log('Routing fixed.');
