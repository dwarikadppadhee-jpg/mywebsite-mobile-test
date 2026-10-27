const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf8');

const targetStr = `function renderTeamReports(user,targetId="teamReportsList"){
  const list=document.getElementById(targetId);if(!list||!isLevel2(user))return;
  const subIds=new Set(directSubordinates(user).map(u=>u.employeeId));
  const items=reports().filter(r=>subIds.has(r.employeeId)||r.managerId===user.employeeId).sort((a,b)=>new Date(b.submittedAt)-new Date(a.submittedAt));
  if(!items.length){list.className="stack-list empty-state";list.textContent="No submitted DARs from direct subordinates yet.";return;}`;

const newStr = `function renderTeamReports(user,targetId="teamReportsList"){
  const list=document.getElementById(targetId);if(!list||!(isLevel2(user)||isLevel1(user)||isAdmin(user)))return;
  let items = reports();
  if (isLevel2(user)) {
    const subIds=new Set(directSubordinates(user).map(u=>u.employeeId));
    items = items.filter(r=>subIds.has(r.employeeId)||r.managerId===user.employeeId);
  } else {
    items = items.filter(r => {
      const owner = findUser(r.employeeId);
      return owner && userHasAccessToEmployee(user, owner) && user.employeeId !== owner.employeeId;
    });
  }
  items = items.sort((a,b)=>new Date(b.submittedAt)-new Date(a.submittedAt));
  if(!items.length){list.className="stack-list empty-state";list.textContent="No submitted DARs from team members yet.";return;}`;

if(code.indexOf(targetStr) !== -1) {
  code = code.replace(targetStr, newStr);
  fs.writeFileSync('app.js', code);
  console.log("REPLACED SUCCESS!");
} else {
  console.log("NO MATCH");
}
