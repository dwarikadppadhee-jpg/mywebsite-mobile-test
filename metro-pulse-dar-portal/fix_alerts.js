const fs = require('fs');
let content = fs.readFileSync('app.js', 'utf8');

const targetBlock = `function headerAlertsForUser(user){
  if(!user)return[];
  const notifItems=notifications().filter(n=>n.targetId===user.employeeId).map(n=>({
    id:n.id,targetId:n.targetId,kind:n.kind||"notification",
    title:n.title||"DAR Alert",message:n.message,createdAt:n.createdAt,
    actorName:n.actorName||"",reportId:n.reportId||""
  }));
  const annItems=announcementsForUser(user).map(a=>({
    id:a.id,targetId:user.employeeId,kind:"announcement",
    title:a.title||"Metro Daily",message:a.content,createdAt:a.createdAt,
    actorName:a.authorName||"Admin",reportId:""
  }));
  return[...notifItems,...annItems].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
}
function headerAlertSeenKey(employeeId){ return STORAGE_KEYS.headerAlertSeenPrefix+employeeId; }
function readHeaderAlertSeenAt(employeeId){
  if(!employeeId)return null;
  const val=localStorage.getItem(headerAlertSeenKey(employeeId));
  try{return val?JSON.parse(val):null;}catch(e){return null;}
}
function markHeaderAlertsSeen(employeeId,seenAt=nowIso()){ localStorage.setItem(headerAlertSeenKey(employeeId),JSON.stringify(seenAt)); }
function unreadHeaderAlertCount(user){
  const seenAt=readHeaderAlertSeenAt(user?.employeeId);
  const seenTime=seenAt?new Date(seenAt).getTime():0;
  return headerAlertsForUser(user).filter(i=>new Date(i.createdAt).getTime()>seenTime).length;
}`;

const replaceBlock = `function headerAlertsForUser(user){
  if(!user)return[];
  const seenAt=readHeaderAlertSeenAt(user.employeeId);
  const seenTime=seenAt?new Date(seenAt).getTime():0;
  const notifItems=notifications().filter(n=>n.targetId===user.employeeId).map(n=>({
    id:n.id,targetId:n.targetId,kind:n.kind||"notification",
    title:n.title||"DAR Alert",message:n.message,createdAt:n.createdAt,
    actorName:n.actorName||"",reportId:n.reportId||""
  }));
  const annItems=announcementsForUser(user).map(a=>({
    id:a.id,targetId:user.employeeId,kind:"announcement",
    title:a.title||"Metro Daily",message:a.content,createdAt:a.createdAt,
    actorName:a.authorName||"Admin",reportId:""
  }));
  return [...notifItems,...annItems]
    .filter(i=>new Date(i.createdAt).getTime()>seenTime)
    .sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
}
function headerAlertSeenKey(employeeId){ return STORAGE_KEYS.headerAlertSeenPrefix+employeeId; }
function readHeaderAlertSeenAt(employeeId){
  if(!employeeId)return null;
  const val=localStorage.getItem(headerAlertSeenKey(employeeId));
  try{return val?JSON.parse(val):null;}catch(e){return null;}
}
function markHeaderAlertsSeen(employeeId,seenAt=nowIso()){ localStorage.setItem(headerAlertSeenKey(employeeId),JSON.stringify(seenAt)); }
function unreadHeaderAlertCount(user){
  return headerAlertsForUser(user).length;
}`;

const startIdx = content.indexOf('function headerAlertsForUser(user){');
const endIdx = content.indexOf('// ─── Session management ───────────────────────────────────────');

if (startIdx !== -1 && endIdx !== -1) {
  content = content.slice(0, startIdx) + replaceBlock + '\n\n' + content.slice(endIdx);
  fs.writeFileSync('app.js', content, 'utf8');
  console.log('SUCCESS: headerAlertsForUser replaced.');
} else {
  console.log('ERROR: Target block not found in app.js.');
}
