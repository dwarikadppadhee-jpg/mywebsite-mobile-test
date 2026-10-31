// ============================================================
// Metro Group DAR Portal — app.js
// Fully connected to Supabase cloud.
// All reads/writes go to Supabase; localStorage is used only
// as a fast UI cache and is kept in sync automatically.
// ============================================================

const supabaseUrl = 'https://rxqjyuwinqfupmnyhvub.supabase.co';
const supabaseKey = 'sb_publishable_FOnSEY-Ph87zkWm_eEM8RQ_mFWalcuV';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4cWp5dXdpbnFmdXBtbnlodnViIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjE1OTExNCwiZXhwIjoyMDkxNzM1MTE0fQ.RnW5qEaZKJoLJsbxA64J11aaB3tcDB1Qu35XHUo-4io'; 

const db = supabase.createClient(supabaseUrl, supabaseKey);
// Create the God-Mode Admin Client
const adminDb = supabase.createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false, storageKey: 'admin-db-token' }
});

// ─── Local-storage cache keys (UI cache only) ────────────────
const STORAGE_KEYS = {
  users: "active_metro_users",
  tasks: "active_metro_tasks",
  reports: "active_metro_reports",
  drafts: "active_metro_drafts",
  leaves: "active_metro_leaves",
  notifications: "active_metro_notifications",
  announcements: "active_metro_announcements",
  issues: "active_metro_issues",
  reminderLogs: "active_metro_reminder_logs",
  deletedUsers: "active_metro_deleted_users",
  holidays: "active_metro_custom_holidays",
  entities: "active_metro_entities",
  session: "active_metro_session",
  theme: "active_metro_theme"
};

const HOLIDAYS_2026 = [
  { srNo: 1, name: "Makar Sankranti", date: "2026-01-14", day: "Wednesday" },
  { srNo: 2, name: "Republic Day", date: "2026-01-26", day: "Monday" },
  { srNo: 3, name: "Holi", date: "2026-03-04", day: "Wednesday" },
  { srNo: 4, name: "Eid-ul-Fitr", date: "2026-03-21", day: "Saturday" },
  { srNo: 5, name: "Eid-ul-Zuha", date: "2026-05-28", day: "Thursday" },
  { srNo: 6, name: "Ratha Yatra", date: "2026-07-16", day: "Thursday" },
  { srNo: 7, name: "Independence Day", date: "2026-08-15", day: "Saturday" },
  { srNo: 8, name: "Janmasthami", date: "2026-09-04", day: "Friday" },
  { srNo: 9, name: "Ganesh Puja", date: "2026-09-14", day: "Monday" },
  { srNo: 10, name: "Gandhi Jayanti", date: "2026-10-02", day: "Friday" },
  { srNo: 11, name: "Maha Navami", date: "2026-10-19", day: "Monday" },
  { srNo: 12, name: "Vijaya Dashami", date: "2026-10-20", day: "Tuesday" },
  { srNo: 13, name: "Christmas Day", date: "2026-12-25", day: "Friday" }
];
function defaultHolidayMap() { return new Map(HOLIDAYS_2026.map(holiday=>[holiday.date,holiday])); }

const FESTIVAL_EVENTS = [
  { date: "01-01", title: "New Year",          message: "A fresh year and a fresh start for the Metro Group team." },
  { date: "04-14", title: "Baisakhi",          message: "Happy Baisakhi from Metro Group. Wishing everyone growth, energy, and balance." },
  { date: "08-15", title: "Independence Day",  message: "Happy Independence Day. Celebrate the spirit of progress and teamwork." },
  { date: "10-02", title: "Gandhi Jayanti",    message: "A day to remember simplicity, discipline, and thoughtful leadership." },
  { date: "10-31", title: "Diwali",            message: "Happy Diwali. Wishing the Metro Group family light, success, and good fortune." },
  { date: "12-25", title: "Christmas",         message: "Season's greetings to the entire Metro Group team." }
];

const ROLE_LABELS = { admin: "Admin", "1": "Level 1", "2": "Level 2", "3": "Level 3" };
const DRAFT_AUTO_SUBMIT_HOUR = 23;
const DRAFT_AUTO_SUBMIT_MINUTE = 0;
const DRAFT_AUTO_SUBMIT_LAST_RUN_KEY = "active_metro_auto_submit_last_run";
const REVIEW_DEADLINE_HOUR = 23;
const REVIEW_DEADLINE_MINUTE = 0;

const syncBus = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("active-metro-sync") : null;
let lastViewportMobileState = null;

// ─── Global state ────────────────────────────────────────────
let activePortalUserId    = "";
let activeSectionId       = "";
let complianceFilter      = "all";
let complianceDateFilter  = "";
let complianceMonthFilter = "";
let selectedComplianceEmployeeId  = "";
let selectedHistoryReportId       = "";
let selectedHistoryPointId        = "";
let selectedHistoryEmployeeId     = "";
let selectedHistoryReviewEditId   = "";
let selectedProfileEmployeeId     = "";
let selectedTeamReportId          = "";
let selectedTeamReportPointId     = "";
let historyViewMode               = "my";
let historyReportTypeFilter       = "all";
let profileSearchQuery            = "";
let historyEmployeeSearchQuery    = "";
let historyPage                   = 1;
let historySearchTimer            = null;
let historySortKey                = "date";
let historySortDirection          = "desc";
let latestSidebarDraftPointId     = "";
let editingDraftPointId           = "";
let darViewMode                   = "self";
let credentialLevelFilter         = "all";
let editingAdminUserId            = "";
const selectedReminderEmployeeIds = new Set();
let emailReminderTabFilter        = "pending";
const adminExpandedPanels         = new Set();
let ghostTypingToken              = 0;
let ghostTypingSignature          = "";
let ghostTypingTimers             = [];
let loginGreetingToken            = 0;
let loginGreetingSignature        = "";
let loginGreetingTimers           = [];
let submissionHeatmapExpanded     = false;
let personalProgressExpanded      = false;
let _currentUserCache             = null;
let realtimeChannel              = null;
const draftCloudSaveTimers        = {};
const draftAutoSaveInFlight       = {};
let draftAutoSubmitTimer          = null;

// ─── Date helpers ─────────────────────────────────────────────
function today() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
}
function nowIso() { return new Date().toISOString(); }
function dateKey(date = new Date()) {
  const v = new Date(date);
  return `${v.getFullYear()}-${String(v.getMonth()+1).padStart(2,"0")}-${String(v.getDate()).padStart(2,"0")}`;
}
function yesterdayKey() { const v = new Date(); v.setDate(v.getDate()-1); return dateKey(v); }
function dateKeyDaysAgo(days) { const v = new Date(); v.setDate(v.getDate()-Number(days||0)); return dateKey(v); }
function isSundayDateKey(key) {
  const date = new Date(`${key}T00:00:00`);
  return !Number.isNaN(date.getTime()) && date.getDay() === 0;
}
function holidayDayName(dateValue) {
  const date = new Date(`${dateValue}T00:00:00`);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("en-US",{weekday:"long"});
}
function normalizeHoliday(holiday,index=0) {
  const date=String(holiday?.date||"").trim();
  const name=String(holiday?.name||holiday?.holiday||"").trim();
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!name)return null;
  return {
    srNo: holiday?.srNo||holiday?.sr_no||index+1,
    name,
    date,
    day: holiday?.day||holidayDayName(date)
  };
}
function customHolidays() {
  return readStore(STORAGE_KEYS.holidays,[]).map(normalizeHoliday).filter(Boolean);
}
function holidays() {
  const map=defaultHolidayMap();
  customHolidays().forEach(holiday=>map.set(holiday.date,holiday));
  return [...map.values()].sort((a,b)=>a.date.localeCompare(b.date));
}
function holidayByDate() {
  return new Map(holidays().map(holiday=>[holiday.date,holiday]));
}
function saveCustomHoliday(date,name) {
  const holiday=normalizeHoliday({date,name});
  if(!holiday)return false;
  const next=customHolidays().filter(item=>item.date!==holiday.date);
  next.push(holiday);
  writeStore(STORAGE_KEYS.holidays,next.sort((a,b)=>a.date.localeCompare(b.date)));
  return true;
}
function removeCustomHoliday(date) {
  writeStore(STORAGE_KEYS.holidays,customHolidays().filter(item=>item.date!==date));
}
async function cloudSaveHoliday(date,name) {
  const ok=saveCustomHoliday(date,name);
  if(!ok)return false;
  const holiday=normalizeHoliday({date,name});
  try {
    const {error}=await adminDb.from('metro_holidays').upsert([{
      holiday_date: holiday.date,
      holiday_name: holiday.name,
      day_name: holiday.day,
      updated_at: nowIso()
    }],{onConflict:'holiday_date'});
    if(error)console.warn("cloudSaveHoliday fallback:",error.message);
  } catch(e) {
    console.warn("cloudSaveHoliday exception:",e.message);
  }
  return true;
}
async function cloudDeleteHoliday(date) {
  removeCustomHoliday(date);
  try {
    const {error}=await adminDb.from('metro_holidays').delete().eq('holiday_date',date);
    if(error)console.warn("cloudDeleteHoliday fallback:",error.message);
  } catch(e) {
    console.warn("cloudDeleteHoliday exception:",e.message);
  }
}
function parseHolidayCsv(text) {
  const lines=String(text||"").split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
  if(!lines.length)return [];
  const first=splitCsvLine(lines[0]).map(cell=>cell.toLowerCase().replace(/\s+/g,"_"));
  const hasHeader=first.includes("date")||first.includes("holiday")||first.includes("name");
  const headers=hasHeader?first:["date","name"];
  return lines.slice(hasHeader?1:0).map((line,index)=>{
    const cells=splitCsvLine(line);
    const row={};
    headers.forEach((header,i)=>{row[header]=cells[i]||"";});
    return normalizeHoliday({date:row.date||cells[0],name:row.name||row.holiday||cells[1]},index);
  }).filter(Boolean);
}
function holidayForDate(value) {
  const key=typeof value==="string"?value:dateKey(value);
  return holidayByDate().get(key)||null;
}
function formatHolidayName(holiday) {
  if (!holiday) return "";
  if (holiday.name && holiday.name.startsWith("[SYSTEM]")) {
    return "System Issue - " + holiday.name.replace("[SYSTEM]", "").trim();
  }
  return "H - Holiday (" + holiday.name + ")";
}
function isHolidayDate(value) { return Boolean(holidayForDate(value)); }
function isCompanyHoliday(value){ return isHolidayDate(value); }
function complianceDateOptions() {
  const user = activeUser();
  const hasCompliance = user && (isAdmin(user) || isLevel1(user) || canUseCompliance(user));
  const daysLimit = hasCompliance ? 30 : 4;
  const opts = [];
  for(let i=0; i<daysLimit; i++) {
    opts.push({ value: dateKeyDaysAgo(i), label: i===0?"Today":`${i} day${i===1?"":"s"} ago` });
  }
  return opts;
}
function selectedComplianceDate() {
  const user = activeUser();
  const hasCompliance = user && (isAdmin(user) || isLevel1(user) || canUseCompliance(user));
  if (hasCompliance) {
     if (!/^\d{4}-\d{2}-\d{2}$/.test(complianceDateFilter)) complianceDateFilter = today();
     return complianceDateFilter;
  }
  const allowed = complianceDateOptions().map(option=>option.value);
  if(!allowed.includes(complianceDateFilter))complianceDateFilter=today();
  return complianceDateFilter;
}
function selectedComplianceMonth() {
  if(!/^\d{4}-\d{2}$/.test(complianceMonthFilter||""))complianceMonthFilter=selectedComplianceDate().slice(0,7);
  return complianceMonthFilter;
}
function weekStartDate(value = new Date()) {
  const date = new Date(value);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(monday.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}
function weekRangeForDate(value=new Date()){
  const start=weekStartDate(value);
  const end=new Date(start);
  end.setDate(end.getDate()+6);
  return {start:dateKey(start),end:dateKey(end)};
}
function selectedComplianceWeekRange() {
  const weekSelect = document.getElementById("complianceWeekFilter");
  if (weekSelect && weekSelect.value) {
    const parts = weekSelect.value.split(":");
    if (parts.length === 2 && parts[0] && parts[1]) {
      return { start: parts[0], end: parts[1] };
    }
  }
  return weekRangeForDate(new Date(`${selectedComplianceDate()}T00:00:00`));
}
function populateComplianceWeekFilter() {
  const weekSelect = document.getElementById("complianceWeekFilter");
  if (!weekSelect || weekSelect.options.length > 0) return;
  
  const currentMon = weekStartDate(new Date());
  let html = '';
  for (let i = 0; i < 12; i++) {
    const mon = new Date(currentMon);
    mon.setDate(mon.getDate() - (i * 7));
    const sun = new Date(mon);
    sun.setDate(sun.getDate() + 6);
    
    const monKey = dateKey(mon);
    const sunKey = dateKey(sun);
    const label = i === 0 ? `Current Week (${monKey} to ${sunKey})` : `${monKey} to ${sunKey} (Mon - Sun)`;
    html += `<option value="${monKey}:${sunKey}">${label}</option>`;
  }
  weekSelect.innerHTML = html;
}

// ─── Utility helpers ──────────────────────────────────────────
function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}
function profileInitials(name, employeeId) {
  const parts = String(name||employeeId||"M").trim().split(/\s+/).filter(Boolean);
  return parts.slice(0,2).map(p=>p[0]?.toUpperCase()||"").join("") || "M";
}
function createProfileAvatar(user) {
  const initials = profileInitials(user?.name, user?.employeeId);
  const id   = escapeHtml(user?.employeeId||"METRO");
  const name = escapeHtml(user?.name||"Metro Group");
  const svg  = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="480" viewBox="0 0 480 480">
    <defs><linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#b51f3b"/><stop offset="100%" stop-color="#111111"/>
    </linearGradient></defs>
    <rect width="480" height="480" rx="84" fill="url(#bg)"/>
    <circle cx="240" cy="188" r="92" fill="rgba(255,255,255,0.18)"/>
    <text x="50%" y="60%" text-anchor="middle" font-family="Montserrat,Arial,sans-serif" font-size="140" font-weight="800" fill="#ffffff">${initials}</text>
    <text x="50%" y="84%" text-anchor="middle" font-family="Source Sans 3,Arial,sans-serif" font-size="30" letter-spacing="6" fill="rgba(255,255,255,0.8)">${name}</text>
    <text x="50%" y="92%" text-anchor="middle" font-family="Source Sans 3,Arial,sans-serif" font-size="24" fill="rgba(255,255,255,0.7)">${id}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
function profileDefaults(user) {
  return {
    phone: user.phone||"", email: user.email||"", location: user.location||"",
    dob: user.dob||user.dateOfBirth||user.date_of_birth||"",
    bio: user.bio||"", profileImgUrl: ""
  };
}
function fileToDataUrl(file) {
  return new Promise((resolve,reject)=>{
    const r=new FileReader();
    r.onload=()=>resolve(String(r.result||""));
    r.onerror=()=>reject(r.error||new Error("Unable to read file"));
    r.readAsDataURL(file);
  });
}
function uniqueDates(values) { return [...new Set(values.filter(Boolean))].sort(); }
function normalizeEmployeeId(value) {
  let str = String(value||"").trim().toUpperCase();
  const match = str.match(/\[([^\]]+)\]/);
  if (match) return match[1].trim();
  return str;
}
function truncateText(value,maxLength=90) {
  const text=String(value||"").trim();
  if(!text)return"";
  if(text.length<=maxLength)return text;
  return `${text.slice(0,maxLength-1).trimEnd()}…`;
}
function pad2(value){ return String(value).padStart(2,"0"); }
function ordinalSuffix(day){
  const mod100=day%100;
  if(mod100>=11&&mod100<=13)return "th";
  switch(day%10){
    case 1:return "st";
    case 2:return "nd";
    case 3:return "rd";
    default:return "th";
  }
}
function formatHeatmapDate(value){
  const date=value?new Date(value):null;
  if(!date||Number.isNaN(date.getTime()))return"";
  return `${date.getDate()}${ordinalSuffix(date.getDate())} ${date.toLocaleString("en-US",{month:"long"})}`;
}
function formatDateParts(value){
  const date=value?new Date(value):null;
  if(!date||Number.isNaN(date.getTime()))return null;
  return `${pad2(date.getDate())}/${pad2(date.getMonth()+1)}/${date.getFullYear()}`;
}
function formatDateTimeParts(value){
  const date=value?new Date(value):null;
  if(!date||Number.isNaN(date.getTime()))return null;
  return `${formatDateParts(date)} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}
function formatDateTime(value) { return formatDateTimeParts(value)||"--"; }
function formatTimeOnly(value) { return value?new Date(value).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}):"--"; }
function formatDate(value) { return formatDateParts(value)||"--"; }
function isBirthdayToday(dob){
  const parts=String(dob||"").trim();
  if(!parts)return false;
  const date=new Date(parts);
  if(Number.isNaN(date.getTime()))return false;
  const todayDate=new Date();
  return date.getDate()===todayDate.getDate()&&date.getMonth()===todayDate.getMonth();
}
function reportDisplayTitle(report){
  const title=String(report?.title||"").trim();
  if(!title||title==="Daily activity report")return"";
  return title;
}
function relativeTimeFromNow(value) {
  if(!value)return"Just now";
  const diff=Math.max(0,Math.floor((Date.now()-new Date(value).getTime())/1000));
  if(diff<10)return"Just now";
  if(diff<60)return`${diff}s ago`;
  if(diff<3600)return`${Math.floor(diff/60)} min ago`;
  if(diff<86400)return`${Math.floor(diff/3600)}h ago`;
  return`${Math.floor(diff/86400)}d ago`;
}

const MOBILE_BREAKPOINT = 768;
let mobileLoginTab = "signin";

function isMobileViewport() {
  return window.matchMedia && window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches;
}

function mobileGreetingLabel() {
  const minutes=new Date().getHours()*60+new Date().getMinutes();
  if(minutes>=361&&minutes<=720)return "Good morning";
  if(minutes>=721&&minutes<=960)return "Good afternoon";
  if(minutes>=961&&minutes<=1140)return "Good evening";
  if(minutes>=1141||minutes<=0)return "Good night";
  if(minutes>=1&&minutes<=180)return "Hello";
  return "Early bird";
}

function sectionLabelForId(sectionId) {
  const labels = {
    newsSection: "Metro Daily",
    profileSection: "My Account",
    orgOverviewSection: "Overview",
    complianceSection: "DAR Review",
    workAnalyticsSection: "Work Analysis",
    emailReminderSection: "Email Reminders",
    userManagementSection: "User Management",
    globalTaskSection: "Global Task",
    teamReportsSection: "My Team",
    subordinateSection: "Task Assign",
    tasksSection: "My Tasks",
    historySection: "History",
    darSection: "DAR",
    issueSection: "Report Issue",
    adminIssuesSection: "Admin Issues"
  };
  return labels[sectionId] || "DAR";
}

function setMobileDrawerState(open) {
  document.body.classList.toggle("mobile-drawer-open", !!open);
  document.getElementById("mobileDrawerOverlay")?.classList.toggle("hidden", !open);
  const toggle = document.getElementById("mobileMenuToggle");
  if (toggle) toggle.setAttribute("aria-expanded", String(!!open));
}

function syncMobileChrome(user) {
  document.body.classList.toggle("mobile-view", isMobileViewport());
  const label = document.getElementById("mobilePageLabel");
  if (label) label.textContent = sectionLabelForId(activeSectionId || defaultSectionForUser(user));
  const badge = document.getElementById("mobileEmployeeBadge");
  if (badge && user) badge.textContent = `${user.employeeId},${user.department}`;
}

function setMobileLoginTab(tab) {
  mobileLoginTab = tab === "about" ? "about" : "signin";
  const aboutOpen = mobileLoginTab === "about";
  document.body.classList.toggle("mobile-login-about-open", aboutOpen);
  document.getElementById("mobileLoginSigninTab")?.classList.toggle("is-active", !aboutOpen);
  document.getElementById("mobileLoginAboutTab")?.classList.toggle("is-active", aboutOpen);
  document.getElementById("mobileLoginSigninPanel")?.classList.toggle("hidden", aboutOpen);
  document.getElementById("mobileLoginAboutPanel")?.classList.toggle("hidden", !aboutOpen);
  const aboutPanel = document.getElementById("mobileLoginAboutPanel");
  if (aboutPanel) aboutPanel.setAttribute("aria-hidden", String(!aboutOpen));
}

function updateViewportMode() {
  const mobile = isMobileViewport();
  if (lastViewportMobileState === mobile) return;
  lastViewportMobileState = mobile;
  document.body.classList.toggle("mobile-view", mobile);
  if (!mobile) setMobileDrawerState(false);
  if (!document.body.classList.contains("portal-logged-in")) setMobileLoginTab(mobile ? mobileLoginTab : "signin");
  const user = activeUser();
  if (user) renderPortal();
}

// ─── Local cache read/write ───────────────────────────────────
function readStore(key,fallback) {
  try { const raw=localStorage.getItem(key); return raw?JSON.parse(raw):fallback; } catch { return fallback; }
}
function writeStore(key, value) {
  try {
    let toStore = value;
    if (key === STORAGE_KEYS.reports && Array.isArray(value)) {
      toStore = value.map(r => ({
        ...r,
        points: (r.points || []).map(p => {
          const newP = { ...p };
          delete newP.attachmentData;
          return newP;
        })
      }));
    }
    try {
      localStorage.setItem(key, JSON.stringify(toStore));
    } catch (e) {
      if (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014) {
        console.warn("Storage quota exceeded for", key);
        if (key === STORAGE_KEYS.reports && Array.isArray(toStore)) {
          let fallback = [...toStore];
          while (fallback.length > 5) {
            fallback = fallback.slice(0, Math.floor(fallback.length / 2));
            try {
              localStorage.setItem(key, JSON.stringify(fallback));
              console.log("Saved fallback reports length", fallback.length);
              break;
            } catch (e2) {}
          }
        }
      } else {
        throw e;
      }
    }
    if (syncBus) syncBus.postMessage({ key, ts: Date.now() });
  } catch (e) {
    console.error("writeStore global error", e);
  }
}

// ─── Normalize helpers ────────────────────────────────────────
function normalizeUsers(list) {
  return (list||[]).map(u=>({
    ...u,
    level: String(u.level||"3"),
    managerId: u.managerId||u.manager_id||"",
    managerName: u.managerName||u.manager_name||"",
    department: u.department||"General",
    authUserId: u.authUserId||u.auth_user_id||"",
    entity: u.entity||"",
    taggedDepartments: u.taggedDepartments||u.tagged_departments||"",
    taggedEntities: u.taggedEntities||u.tagged_entities||"",
    ...profileDefaults(u)
  }));
}

// Map Supabase metro_profiles row → app user shape
function supabaseProfileToUser(row) {
  if(!row)return null;
  const employeeId = row.employee_id||row.employeeId||"";
  
  let bio = row.bio || "";
  let role = "";
  let officialPhone = "";
  let personalPhone = "";
  let isActive = true;
  let customTemplates = [];
  let extraTaggedDirectorId = "";

  if (bio.includes("|||EXTRA_DATA:")) {
    const parts = bio.split("|||EXTRA_DATA:");
    bio = parts[0];
    try {
      const extra = JSON.parse(parts[1]);
      role = extra.role || "";
      officialPhone = extra.officialPhone || "";
      personalPhone = extra.personalPhone || "";
      if (extra.isActive === false) isActive = false;
      if (Array.isArray(extra.customTemplates)) customTemplates = extra.customTemplates;
      if (extra.taggedDirectorId) extraTaggedDirectorId = extra.taggedDirectorId;
    } catch(e) {}
  }

  return {
    employeeId,
    name:         row.full_name||row.name||"",
    level:        String(row.role_level||row.level||"3"),
    department:   row.department||"General",
    managerId:    row.manager_employee_id||row.managerId||"",
    managerName:  row.manager_name||row.managerName||"",
    taggedDirectorId: extraTaggedDirectorId || row.tagged_director_id || row.taggedDirectorId || "",
    password:     row.password_plaintext||row.password||"",
    entity:       row.entity||"",
    taggedDepartments: row.tagged_departments||row.taggedDepartments||"",
    taggedEntities:    row.tagged_entities||row.taggedEntities||"",
    phone:        row.phone||"",
    email:        row.email||"",
    location:     row.location||"",
    bio,
    role,
    officialPhone,
    personalPhone,
    isActive,
    customTemplates,
    profileImgUrl: "",
    lastDarDate:  row.last_dar_date||row.lastDarDate||"",
    createdBy:    row.created_by_employee_id||row.createdBy||"",
    authUserId:   row.auth_user_id||row.authUserId||"",
    isSeed:       row.is_seed||row.isSeed||false,
    dob:          row.date_of_birth||row.dob||""
  };
}

// Map app user shape → Supabase metro_profiles insert/update row
function userToSupabaseProfile(user) {
  const extra = {
    role: user.role || "",
    officialPhone: user.officialPhone || "",
    personalPhone: user.personalPhone || "",
    isActive: user.isActive !== false,
    customTemplates: Array.isArray(user.customTemplates) ? user.customTemplates : [],
    taggedDirectorId: user.taggedDirectorId || ""
  };
  const extraStr = "|||EXTRA_DATA:" + JSON.stringify(extra);
  const fullBio = (user.bio || "") + extraStr;

  const row = {
    employee_id:         user.employeeId,
    auth_user_id:        user.authUserId||null,
    full_name:           user.name,
    password_plaintext:  user.password,
    role_level:          user.level,
    department:          user.department||"General",
    manager_employee_id: user.managerId||null,
    manager_name:        user.managerName||null,
    phone:               user.phone||"",
    email:               user.email||"",
    location:            user.location||"",
    bio:                 fullBio,
    profile_img_url:     "",
    last_dar_date:       user.lastDarDate||null,
    created_by_employee_id: user.createdBy||null,
    is_seed:             user.isSeed||false,
    entity:              user.entity||"",
    tagged_departments:  user.taggedDepartments||"",
    tagged_entities:     user.taggedEntities||"",
    date_of_birth:       user.dob||null
  };
  return row;
}

function supabaseRowToLeave(row) {
  return {
    id: row.id,
    employeeId: row.employee_id,
    leaveType: row.leave_type,
    startDate: row.start_date,
    endDate: row.end_date,
    // Support records saved by earlier versions (`which_half`) as well as the
    // current cloud column.  The UI always reads `halfType`.
    halfType: row.half_type || row.which_half || "",
    whichHalf: row.half_type || row.which_half || "",
    remarks: row.remarks,
    submittedAt: row.submitted_at,
    timestamp: row.submitted_at ? new Date(row.submitted_at).getTime() : 0
  };
}

function leaveToSupabaseRow(leave) {
  return {
    id: leave.id,
    employee_id: leave.employeeId,
    leave_type: leave.leaveType,
    start_date: leave.startDate,
    end_date: leave.endDate,
    half_type: leave.halfType || leave.whichHalf || null,
    remarks: leave.remarks,
    submitted_at: leave.submittedAt
  };
}

function isMissingDateOfBirthColumnError(error) {
  return /date_of_birth.*metro_profiles.*schema cache/i.test(String(error?.message||""));
}

function withoutDateOfBirthColumn(row) {
  const { date_of_birth, ...safeRow } = row;
  return safeRow;
}

function isMissingDraftOptionalColumnError(error) {
  return /(location|mobile_report_date|mobile_report_type|mobile_location).*metro_drafts.*schema cache/i.test(String(error?.message||"")) ||
    /Could not find the .* column .*metro_drafts/i.test(String(error?.message||""));
}

function isMissingAutoSubmitFunctionError(error) {
  const message=String(error?.message||"");
  return /metro_auto_submit_due_drafts/i.test(message) &&
    (/function .* does not exist/i.test(message)||/Could not find the function/i.test(message)||/schema cache/i.test(message));
}

function withoutDraftOptionalColumns(row) {
  const { location, mobile_report_date, mobile_report_type, mobile_location, ...safeRow } = row;
  return safeRow;
}

function draftToSupabaseRow(user,draft) {
  const employeeId=normalizeEmployeeId(user?.employeeId||draft?.employeeId);
  const reportDate=draft?.date||draft?.mobileDate||today();
  return {
    id:              `DRAFT-${employeeId}-${reportDate}`,
    employee_id:     employeeId,
    report_date:     reportDate,
    report_type:     draft?.type||draft?.mobileType||"internal",
    location:        draft?.location||"",
    mobile_report_date: draft?.mobileDate||draft?.date||reportDate,
    mobile_report_type: draft?.mobileType||draft?.type||"internal",
    mobile_location: draft?.mobileLocation||draft?.location||"",
    current_point:   draft?.currentPoint||"",
    point_hours:     draft?.pointHours||"",
    point_minutes:   draft?.pointMinutes||"",
    attachment_name: draft?.attachmentName||"",
    attachment_data: draft?.attachmentData||"",
    attachment_size: draft?.attachmentSize||"",
    points:          Array.isArray(draft?.points)?draft.points:[]
  };
}

function supabaseDraftToDraft(row,user) {
  if(!row)return null;
  const date=row.report_date||today();
  const points=Array.isArray(row.points)?row.points:(typeof row.points==="string"?JSON.parse(row.points||"[]"):[]);
  return {
    ...defaultDraft(user||{employeeId:row.employee_id}),
    employeeId:row.employee_id,
    date,
    type:row.report_type||"internal",
    location:row.location||row.mobile_location||"",
    mobileDate:row.mobile_report_date||date,
    mobileType:row.mobile_report_type||row.report_type||"internal",
    mobileLocation:row.mobile_location||row.location||"",
    currentPoint:row.current_point||"",
    pointHours:row.point_hours||"",
    pointMinutes:row.point_minutes||"",
    attachmentName:row.attachment_name||"",
    attachmentData:row.attachment_data||"",
    attachmentSize:row.attachment_size||"",
    points
  };
}

function normalizeReport(report) {
  return {
    id:             report.id||`RPT-${report.employeeId||report.employee_id}-${report.date||report.report_date}`,
    employeeId:     report.employeeId||report.employee_id||"",
    employeeName:   report.employeeName||report.employee_name||report.employeeId||"",
    managerId:      report.managerId||report.manager_id||"",
    managerName:    report.managerName||report.manager_name||"",
    date:           report.date||report.report_date||today(),
    type:           report.type||report.report_type||"internal",
    title:          report.title||"DAR",
    projectName:    report.projectName||report.project_name||"",
    approvalStatus: report.approvalStatus||report.approval_status||"pending",
    reviewedBy:     report.reviewedBy||report.reviewed_by||"",
    reviewedAt:     report.reviewedAt||report.reviewed_at||"",
    reviewComment:  report.reviewComment||report.review_comment||"",
    submittedAt:    report.submittedAt||report.submitted_at||nowIso(),
    points: (Array.isArray(report.points) ? report.points : (typeof report.points === 'string' ? JSON.parse(report.points || '[]') : [])).map((point,index)=>({
      id:             point.id||`PT-${report.employeeId||report.employee_id}-${report.date||report.report_date}-${index+1}`,
      text:           point.text||`${index+1}. ${point.rawText||""}`,
      rawText:        point.rawText||String(point.text||"").replace(/^\d+\.\s*/,""),
      totalTime:      point.totalTime||"",
      attachmentName: point.attachmentName||"",
      attachmentData: point.attachmentData||"",
      attachmentSize: point.attachmentSize||"",
      createdAt:      point.createdAt||report.submittedAt||nowIso()
    }))
  };
}

function normalizeReminderLog(log) {
  return {
    id: log.id||`RMD-${Date.now()}`,
    sentBy: log.sentBy||log.sent_by||"",
    sentByName: log.sentByName||log.sent_by_name||"",
    employeeId: log.employeeId||log.employee_id||"",
    employeeName: log.employeeName||log.employee_name||"",
    employeeEmail: log.employeeEmail||log.employee_email||"",
    reminderDate: log.reminderDate||log.reminder_date||today(),
    subject: log.subject||"",
    mode: log.mode||"single",
    sentAt: log.sentAt||log.sent_at||log.created_at||nowIso()
  };
}

// ─── Cloud data access ────────────────────────────────────────
// All primary data reads go to Supabase, with localStorage as fallback/cache.

async function cloudUsers() {
  try {
    const client = adminDb || db;
    const {data,error} = await client.from('metro_profiles').select('*');
    if(error)throw error;
    const mapped = (data||[]).map(supabaseProfileToUser);
    writeStore(STORAGE_KEYS.users, mapped);
    return normalizeUsers(mapped);
  } catch(e) {
    console.warn("cloudUsers fallback:",e.message);
    return normalizeUsers(readStore(STORAGE_KEYS.users,[]));
  }
}

let currentHistoryPage = 0;
let historyDayOffset = 0;

async function fetchReportPoints(reportId) {
  try {
    const { data, error } = await adminDb.from('metro_reports').select('points').eq('id', reportId).single();
    if (error) throw error;
    const pts = Array.isArray(data.points) ? data.points : (typeof data.points === "string" ? JSON.parse(data.points || "[]") : []);
    const current = reports();
    const idx = current.findIndex(r => r.id === reportId);
    if (idx !== -1) {
      current[idx].points = pts;
      writeStore(STORAGE_KEYS.reports, current);
    }
    return pts;
  } catch (e) {
    console.warn("fetchReportPoints error:", e.message);
    return [];
  }
}

async function loadMoreReports() {
  currentHistoryPage++;
  const start = currentHistoryPage * 20;
  const end = start + 19;
  try {
    const btn = document.getElementById("historyLoadMoreBtn");
    if(btn) btn.textContent = "Loading...";
    const {data,error} = await adminDb.from('metro_reports').select('id, employee_id, employee_name, manager_id, manager_name, report_date, report_type, project_name, approval_status, reviewed_by, reviewed_at, review_comment, submitted_at, points').order('submitted_at',{ascending:false}).range(start, end);
    if(error) throw error;
    const mapped = (data||[]).map(r=>normalizeReport({
      ...r,
      employeeId: r.employee_id, employeeName: r.employee_name,
      managerId: r.manager_id, managerName: r.manager_name,
      date: r.report_date, type: r.report_type,
      projectName: r.project_name, approvalStatus: r.approval_status,
      reviewedBy: r.reviewed_by, reviewedAt: r.reviewed_at,
      reviewComment: r.review_comment, submittedAt: r.submitted_at,
      points: r.points || []
    }));
    const current = reports();
    const existingIds = new Set(current.map(r=>r.id));
    mapped.forEach(r => { if(!existingIds.has(r.id)) current.push(r); });
    writeStore(STORAGE_KEYS.reports, current);
    renderPortal();
  } catch (e) {
    console.warn("loadMoreReports fallback:", e.message);
  }
}

async function fetchReportsForDates(datesArray) {
  try {
    if (!datesArray || datesArray.length === 0) return;
    const {data, error} = await adminDb.from('metro_reports')
      .select('id, employee_id, employee_name, manager_id, manager_name, report_date, report_type, project_name, approval_status, reviewed_by, reviewed_at, review_comment, submitted_at, points')
      .in('report_date', datesArray);
    if(error) throw error;
    if (data && data.length > 0) {
      const current = reports();
      const newItems = data.map(r => normalizeReport({
        ...r,
        employeeId: r.employee_id, employeeName: r.employee_name,
        managerId: r.manager_id, managerName: r.manager_name,
        date: r.report_date, type: r.report_type,
        projectName: r.project_name, approvalStatus: r.approval_status,
        reviewedBy: r.reviewed_by, reviewedAt: r.reviewed_at,
        submittedAt: r.submitted_at
      }));
      const merged = [...current.filter(r => !newItems.find(n => n.id === r.id)), ...newItems];
      writeStore(STORAGE_KEYS.reports, merged);
    }
  } catch(e) {
    console.warn("fetchReportsForDates error:", e.message);
  }
}

async function cloudReports() {
  try {
    currentHistoryPage = 0;
    const user = activeUser();
    const activeUserLevel = String(user?.level||"").toLowerCase();
    const hasCompliance = user && (isAdmin(user) || isLevel1(user) || canUseCompliance(user));
    const limitCount = 15000; // Always fetch complete reports for exact global leaderboard & submissions count
    const {data: globalData, error: globalError} = await adminDb.from('metro_reports').select('id, employee_id, employee_name, manager_id, manager_name, report_date, report_type, project_name, approval_status, reviewed_by, reviewed_at, review_comment, submitted_at, points').order('submitted_at',{ascending:false}).limit(limitCount);
    if(globalError)throw globalError;

    let myData = [];
    if (activePortalUserId) {
        const {data: myReports, error: myError} = await adminDb.from('metro_reports').select('id, employee_id, employee_name, manager_id, manager_name, report_date, report_type, project_name, approval_status, reviewed_by, reviewed_at, review_comment, submitted_at, points').eq('employee_id', activePortalUserId).order('submitted_at',{ascending:false});
        if (!myError && myReports) myData = myData.concat(myReports);
        
        if (activeUserLevel === "1" || activeUserLevel === "2") {
             const {data: teamReports, error: teamError} = await adminDb.from('metro_reports').select('id, employee_id, employee_name, manager_id, manager_name, report_date, report_type, project_name, approval_status, reviewed_by, reviewed_at, review_comment, submitted_at, points').eq('manager_id', activePortalUserId).order('submitted_at',{ascending:false});
             if (!teamError && teamReports) myData = myData.concat(teamReports);
        }
        
        // Point 4: Today's all submissions should be visible in history tab for all employees
        const todayStr = today();
        const {data: todayReports, error: todayError} = await adminDb.from('metro_reports').select('id, employee_id, employee_name, manager_id, manager_name, report_date, report_type, project_name, approval_status, reviewed_by, reviewed_at, review_comment, submitted_at, points').eq('report_date', todayStr).order('submitted_at',{ascending:false});
        if (!todayError && todayReports) myData = myData.concat(todayReports);
    }

    const allData = [...globalData, ...myData];
    const uniqueMap = new Map();
    allData.forEach(r => uniqueMap.set(r.id, r));
    const mergedData = Array.from(uniqueMap.values());
    mergedData.sort((a,b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()).reverse();

    const mapped = mergedData.map(r=>normalizeReport({
      ...r,
      employeeId: r.employee_id, employeeName: r.employee_name,
      managerId: r.manager_id, managerName: r.manager_name,
      date: r.report_date, type: r.report_type,
      projectName: r.project_name, approvalStatus: r.approval_status,
      reviewedBy: r.reviewed_by, reviewedAt: r.reviewed_at,
      reviewComment: r.review_comment, submittedAt: r.submitted_at,
      points: r.points || []
    }));
    writeStore(STORAGE_KEYS.reports, mapped);
    return mapped;
  } catch(e) {
    console.warn("cloudReports fallback:",e.message);
    return readStore(STORAGE_KEYS.reports,[]).map(normalizeReport);
  }
}

async function cloudDrafts() {
  if(!activePortalUserId)return drafts();
  try {
    const {data,error} = await adminDb.from('metro_drafts').select('*').order('updated_at',{ascending:false});
    if(error)throw error;
    if(!(data||[]).length)return drafts();
    const next={...drafts()};
    const seenKeys = new Set();
    (data||[]).forEach(row=>{
      try {
        const key=getDraftKey(row.employee_id);
        if(seenKeys.has(key)) return;
        seenKeys.add(key);
        const draft=supabaseDraftToDraft(row,{employeeId:row.employee_id});
        if(draft)next[key]=draft;
      } catch(parseErr) {
        console.warn("cloudDrafts row skipped:",parseErr.message);
      }
    });
    writeStore(STORAGE_KEYS.drafts,next);
    return next;
  } catch(e) {
    console.warn("cloudDrafts fallback:",e.message);
    return drafts();
  }
}

async function cloudCreateEntity(name) {
  try {
    const id = "ENT-" + Date.now();
    await db.from("metro_entities").insert([{id, name}]);
  } catch(e) { console.error("cloudCreateEntity failed:", e.message); }
}


let editingEntityId = "";


async function cloudDeleteEntity(id) {
  try {
    // Fetch entity name first to clear users
    const {data: entData} = await db.from("metro_entities").select("name").eq("id", id).single();
    if (entData && entData.name) {
       // Clear entity from users who had this entity
       await adminDb.from("metro_users").update({ entity: null }).eq("entity", entData.name);
    }
    // Delete entity
    const {error} = await adminDb.from("metro_entities").delete().eq("id", id);
    if(error) console.error("cloudDeleteEntity error:", error.message);
  } catch(e) { console.error("cloudDeleteEntity failed:", e.message); }
}

async function cloudUpdateEntity(id, newName) {
  try {
    const {error} = await adminDb.from("metro_entities").update({ name: newName }).eq("id", id);
    if(error) console.error("cloudUpdateEntity error:", error.message);
  } catch(e) { console.error("cloudUpdateEntity failed:", e.message); }
}

async function cloudEntities() {
  try {
    const {data, error} = await db.from('metro_entities').select('*').order('created_at', {ascending: true});
    if (error) throw error;
    writeStore(STORAGE_KEYS.entities, data || []);
  } catch(e) {
    console.warn("cloudEntities error:", e.message);
  }
}

async function cloudLeaves() {
  try {
    const {data, error} = await db.from('metro_leaves').select('*').order('submitted_at', {ascending: false});
    if (error) throw error;
    const mapped = (data || []).map(supabaseRowToLeave);
    writeStore(STORAGE_KEYS.leaves, mapped);
  } catch(e) {
    console.warn("cloudLeaves error:", e.message);
  }
}

async function cloudTasks() {
  try {
    const {data,error} = await db.from('metro_tasks').select('*').order('created_at',{ascending:false});
    if(error)throw error;
    const mapped = (data||[]).map(t=>({
      id:           t.id,
      targetId:     t.target_employee_id,
      title:        t.title,
      notes:        t.notes||"",
      type:         t.task_type||"internal",
      dueDate:      t.due_date||"",
      assignedBy:   t.assigned_by_employee_id,
      createdAt:    t.created_at||nowIso(),
      updatedAt:    t.updated_at||t.created_at||nowIso(),
      completedAt:  t.completed_at||"",
      completed:    t.completed||false
    }));
    writeStore(STORAGE_KEYS.tasks, mapped);
    return mapped;
  } catch(e) {
    console.warn("cloudTasks fallback:",e.message);
    return readStore(STORAGE_KEYS.tasks,[]);
  }
}

async function cloudNotifications() {
  try {
    const {data,error} = await db.from('metro_notifications').select('*').order('created_at',{ascending:false});
    if(error)throw error;
    const mapped = (data||[]).map(n=>({
      id:        n.id,
      targetId:  n.target_id,
      message:   n.message,
      createdAt: n.created_at,
      kind:      n.kind||"notice",
      title:     n.title||"Alert",
      reportId:  n.report_id||"",
      actorName: n.actor_name||""
    }));
    writeStore(STORAGE_KEYS.notifications, mapped);
    return mapped;
  } catch(e) {
    console.warn("cloudNotifications fallback:",e.message);
    return readStore(STORAGE_KEYS.notifications,[]);
  }
}

async function cloudAnnouncements() {
  try {
    const {data,error} = await db.from('metro_announcements').select('*').order('created_at',{ascending:false});
    if(error)throw error;
    const mapped = (data||[]).map(a=>({
      id:            a.id,
      title:         a.title||"Metro Daily Broadcast",
      message:       a.message,
      createdAt:     a.created_at,
      createdBy:     a.created_by||"",
      createdByName: a.created_by_name||"Metro Group",
      kind:          "announcement",
      audience:      a.audience||"all"
    }));
    writeStore(STORAGE_KEYS.announcements, mapped);
    return mapped;
  } catch(e) {
    console.warn("cloudAnnouncements fallback:",e.message);
    return readStore(STORAGE_KEYS.announcements,[]);
  }
}

async function cloudIssues() {
  try {
    const {data,error} = await db.from('metro_issues').select('*').order('created_at',{ascending:false});
    if(error)throw error;
    const mapped = (data||[]).map(i=>({
      id:          i.id,
      title:       i.title,
      description: i.description,
      raisedBy:    i.raised_by,
      createdAt:   i.created_at
    }));
    writeStore(STORAGE_KEYS.issues, mapped);
    return mapped;
  } catch(e) {
    console.warn("cloudIssues fallback:",e.message);
    return readStore(STORAGE_KEYS.issues,[]);
  }
}

async function cloudDeletedUsers() {
  try {
    const {data,error} = await db.from('metro_deleted_users').select('*').order('deleted_at',{ascending:false});
    if(error)throw error;
    const mapped = (data||[]).map(d=>({
      employeeId:  d.employee_id,
      name:        d.full_name,
      level:       d.role_level,
      department:  d.department,
      managerName: d.manager_name||"",
      deletedAt:   d.deleted_at,
      deletedBy:   d.deleted_by,
      reason:      d.reason||""
    }));
    writeStore(STORAGE_KEYS.deletedUsers, mapped);
    return mapped;
  } catch(e) {
    console.warn("cloudDeletedUsers fallback:",e.message);
    return readStore(STORAGE_KEYS.deletedUsers,[]);
  }
}

async function cloudReminderLogs() {
  try {
    const {data,error} = await adminDb.from('metro_email_reminder_logs').select('*').order('sent_at',{ascending:false});
    if(error)throw error;
    const mapped=(data||[]).map(normalizeReminderLog);
    writeStore(STORAGE_KEYS.reminderLogs,mapped);
    return mapped;
  } catch(e) {
    console.warn("cloudReminderLogs fallback:",e.message);
    return readStore(STORAGE_KEYS.reminderLogs,[]).map(normalizeReminderLog);
  }
}

async function cloudHolidays() {
  try {
    const {data,error}=await db.from('metro_holidays').select('*').order('holiday_date',{ascending:true});
    if(error)throw error;
    const mapped=(data||[]).map((row,index)=>normalizeHoliday({date:row.holiday_date,name:row.holiday_name,day:row.day_name,srNo:index+1})).filter(Boolean);
    writeStore(STORAGE_KEYS.holidays,mapped);
    return mapped;
  } catch(e) {
    console.warn("cloudHolidays fallback:",e.message);
    return customHolidays();
  }
}

// Sync-safe local reads (used inside synchronous render functions)
function users()         { return normalizeUsers(readStore(STORAGE_KEYS.users,[])); }
function tasks()         { return readStore(STORAGE_KEYS.tasks,[]).map(t=>({completed:false,...t,createdAt:t.createdAt||nowIso()})); }
function reports()       { return readStore(STORAGE_KEYS.reports,[]).map(normalizeReport); }
function drafts()        { return readStore(STORAGE_KEYS.drafts,{}); }
function leaves()        { return readStore(STORAGE_KEYS.leaves,[]); }
function notifications() { return readStore(STORAGE_KEYS.notifications,[]); }
function announcements() { return readStore(STORAGE_KEYS.announcements,[]); }
function issues()        { return readStore(STORAGE_KEYS.issues,[]); }
function reminderLogs()  { return readStore(STORAGE_KEYS.reminderLogs,[]).map(normalizeReminderLog); }
function deletedUsers()  { return readStore(STORAGE_KEYS.deletedUsers,[]); }
function entities()      { return readStore(STORAGE_KEYS.entities,[]); }

// ─── Submission activity helpers ─────────────────────────────
function reportDatesForEmployee(employeeId) {
  return uniqueDates(reports().filter(r=>r.employeeId===employeeId).map(r=>r.date));
}
function reportSubmissionCount(employeeId, startDate, endDate) {
  return reports().filter(r=>{
    if(r.employeeId!==employeeId)return false;
    if(startDate&&r.date<startDate)return false;
    if(endDate&&r.date>endDate)return false;
    return true;
  }).length;
}
// =========================================================================
// MONTHLY SUBMISSION ACTIVITY HUB
// =========================================================================

let submissionHubSelectedMonth = new Date().getMonth(); // 0-11

function reportHeatmapPointCounts(employeeId) {
  const counts = new Map();
  reports().filter(r => r.employeeId === employeeId).forEach(r => {
    const points = Array.isArray(r.points) ? r.points.length : (r.points ? 1 : 0);
    counts.set(r.date, (counts.get(r.date) || 0) + points);
  });
  return counts;
}

function reportHeatmapTone(count) {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count === 3) return 3;
  return 4;
}

function renderSubmissionHeatmap(user) {
  const widget = document.getElementById("submissionHeatmap");
  if (!widget || !user) return;

  const allReports = reports().filter(r => r.employeeId === user.employeeId);
  const pointCounts = reportHeatmapPointCounts(user.employeeId);
  const totalReportsCount = allReports.length;
  let totalPointsYear = 0;
  pointCounts.forEach(pts => { totalPointsYear += pts; });

  // If collapsed: Render topbar trigger button
  if (!submissionHeatmapExpanded) {
    widget.innerHTML = `
      <div class="submission-heatmap-dropdown">
        <button type="button" class="submission-heatmap-toggle submission-heatmap-toggle-collapsed" id="submissionHeatmapToggle" aria-expanded="false" title="View Monthly Submissions Activity">
          <span class="submission-heatmap-icon" aria-hidden="true"><i class="fa-solid fa-chart-column" style="color: #e03131;"></i></span>
          <span class="submission-heatmap-copy">
            <strong>${escapeHtml(String(totalReportsCount))}</strong>
            <span>Submissions</span>
          </span>
          <span class="submission-heatmap-toggle-copy">Open <i class="fa-solid fa-chevron-down" style="font-size:0.6rem;"></i></span>
        </button>
      </div>
    `;
    return;
  }

  // EXPANDED PANEL
  const currYear = new Date().getFullYear();
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const fullMonthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const selMonth = submissionHubSelectedMonth;
  const firstDayObj = new Date(currYear, selMonth, 1);
  const daysInMonth = new Date(currYear, selMonth + 1, 0).getDate();
  const startDayOfWeek = (firstDayObj.getDay() + 6) % 7; // Monday = 0, Sunday = 6

  let monthPoints = 0;
  let monthActiveDays = 0;
  const dayTiles = [];

  // Empty slot padding before day 1
  for (let p = 0; p < startDayOfWeek; p++) {
    dayTiles.push('<div class="sub-cal-tile is-empty"></div>');
  }

  // Days in current selected month
  for (let d = 1; d <= daysInMonth; d++) {
    const dObj = new Date(currYear, selMonth, d);
    const k = dateKey(dObj);
    const pts = pointCounts.get(k) || 0;
    const hol = holidayForDate(k);
    const leave = typeof leaveForDateAndUser === "function" ? leaveForDateAndUser(k, user.employeeId) : null;
    const level = reportHeatmapTone(pts);

    if (pts > 0) {
      monthPoints += pts;
      monthActiveDays++;
    }

    let tileClass = "sub-cal-tile";
    let tileBadge = "";
    let tooltip = `${d} ${monthNames[selMonth]}: ${pts > 0 ? pts + ' points submitted' : 'No submission'}`;

    if (leave) {
      tileClass += " is-leave";
      tileBadge = '<span class="sub-cal-badge">L</span>';
      tooltip = `${d} ${monthNames[selMonth]} (Leave): ${escapeHtml(leave.remarks || 'On Leave')}`;
    } else if (hol) {
      tileClass += " is-holiday";
      tileBadge = '<span class="sub-cal-badge">H</span>';
      tooltip = `${d} ${monthNames[selMonth]} (Holiday): ${escapeHtml(hol.name)}`;
    } else {
      tileClass += ` level-${level}`;
      if (pts > 0) tileBadge = `<span class="sub-cal-badge">${pts}p</span>`;
    }

    dayTiles.push(`
      <div class="${tileClass}" title="${escapeHtml(tooltip)}">
        <span>${d}</span>
        ${tileBadge}
      </div>
    `);
  }

  // 12-Month Year Strip Overview
  const miniMonthBlocks = [];
  for (let m = 0; m < 12; m++) {
    const dInM = new Date(currYear, m + 1, 0).getDate();
    const mCols = Math.ceil(dInM / 7);
    const mSlots = mCols * 7;
    const mCells = [];
    for (let s = 0; s < mSlots; s++) {
      if (s >= dInM) {
        mCells.push('<span class="submission-heatmap-cell submission-heatmap-empty"></span>');
        continue;
      }
      const curD = new Date(currYear, m, s + 1);
      const k = dateKey(curD);
      const pts = pointCounts.get(k) || 0;
      const hol = holidayForDate(k);
      const leave = typeof leaveForDateAndUser === 'function' ? leaveForDateAndUser(k, user.employeeId) : null;
      const lvl = reportHeatmapTone(pts);
      const cellClass = leave ? "submission-heatmap-leave" : hol ? "submission-heatmap-holiday" : (pts > 0 ? `submission-heatmap-level-${lvl}` : "submission-heatmap-empty");
      mCells.push(`<span class="submission-heatmap-cell ${cellClass}" title="${s+1} ${monthNames[m]}: ${pts} pts"></span>`);
    }
    miniMonthBlocks.push(`
      <div class="submission-heatmap-month-block" data-select-month="${m}" style="cursor: pointer;" title="Click to view ${fullMonthNames[m]} details">
        <div class="submission-heatmap-month-header">
          <span style="${m === selMonth ? 'color: var(--maroon, #8B0A1A); font-weight: 800;' : ''}">${monthNames[m]}</span>
        </div>
        <div class="submission-heatmap-month-grid">${mCells.join("")}</div>
      </div>
    `);
  }

  // Render Full Dropdown Modal
  widget.innerHTML = `
    <div class="submission-heatmap-dropdown">
      <button type="button" class="submission-heatmap-toggle" id="submissionHeatmapToggle" aria-expanded="true">
        <span class="submission-heatmap-icon" aria-hidden="true"><i class="fa-solid fa-chart-column" style="color: #e03131;"></i></span>
        <span class="submission-heatmap-copy">
          <strong>${escapeHtml(String(totalReportsCount))}</strong>
          <span>Submissions</span>
        </span>
        <span class="submission-heatmap-toggle-copy">Hide <i class="fa-solid fa-chevron-up" style="font-size:0.6rem;"></i></span>
      </button>

      <div class="submission-heatmap-panel" aria-label="Monthly Submissions Activity">
        <!-- Header -->
        <div class="sub-hub-header">
          <div style="display:flex; align-items:center; gap:10px;">
            <span style="width:32px; height:32px; border-radius:8px; background:rgba(139, 10, 26, 0.1); color:var(--maroon, #8B0A1A); display:inline-flex; align-items:center; justify-content:center; font-size:0.95rem;">
              <i class="fa-solid fa-chart-column"></i>
            </span>
            <div>
              <strong style="font-size:0.95rem; font-weight:800; color:var(--text, #1e293b); display:block; line-height:1.2;">Monthly Submissions Activity</strong>
              <span style="font-size:0.72rem; color:var(--muted); font-weight:600;">Month-wise activity & attendance matrix</span>
            </div>
          </div>
          <button type="button" class="sub-hub-close-btn" id="closeSubHubBtn" title="Close">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <!-- 3 Clean KPI Cards -->
        <div class="sub-hub-kpi-grid" style="grid-template-columns: repeat(3, 1fr);">
          <div class="sub-hub-kpi-card">
            <span>Total Logged Submissions</span>
            <strong>${totalReportsCount} <small style="font-size:0.75rem; color:var(--muted);">Days</small></strong>
          </div>
          <div class="sub-hub-kpi-card">
            <span>Total DAR Points</span>
            <strong style="color: #10b981;">${totalPointsYear} <small style="font-size:0.75rem;">Pts</small></strong>
          </div>
          <div class="sub-hub-kpi-card">
            <span>${monthNames[selMonth]} Activity</span>
            <strong style="color: var(--maroon, #8B0A1A);">${monthActiveDays} <small style="font-size:0.75rem;">/ ${daysInMonth} Days (${monthPoints} Pts)</small></strong>
          </div>
        </div>

        <!-- Month Selector Strip -->
        <div class="sub-hub-month-strip">
          ${monthNames.map((name, idx) => `
            <button type="button" class="sub-hub-month-pill ${idx === selMonth ? 'active' : ''}" data-select-month="${idx}">
              ${name}
            </button>
          `).join("")}
        </div>

        <!-- LeetCode Monthly Calendar Matrix -->
        <div class="sub-cal-container">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 10px;">
            <h5 style="margin:0; font-weight:800; font-size:0.92rem; color:var(--text, #1e293b);">${fullMonthNames[selMonth]} ${currYear} Activity Matrix</h5>
            <span style="font-size:0.75rem; font-weight:600; color:var(--muted);">${monthActiveDays} Submissions • ${monthPoints} Points</span>
          </div>
          <div class="sub-cal-header-row">
            <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
          </div>
          <div class="sub-cal-days-grid">
            ${dayTiles.join("")}
          </div>
          <div class="sub-hub-legend">
            <span>Less</span>
            <span class="sub-legend-cell level-0" style="background: rgba(0,0,0,0.04); border: 1px solid var(--line);"></span>
            <span class="sub-legend-cell level-1" style="background: #dcfce7;"></span>
            <span class="sub-legend-cell level-2" style="background: #86efac;"></span>
            <span class="sub-legend-cell level-3" style="background: #22c55e;"></span>
            <span class="sub-legend-cell level-4" style="background: #15803d;"></span>
            <span>More</span>
            <span style="margin-left: 8px; display:inline-flex; align-items:center; gap:3px;"><span class="sub-legend-cell is-leave" style="background: rgba(59, 130, 246, 0.3);"></span> Leave</span>
            <span style="display:inline-flex; align-items:center; gap:3px;"><span class="sub-legend-cell is-holiday" style="background: rgba(245, 158, 11, 0.3);"></span> Holiday</span>
          </div>
        </div>

        <!-- Year Overview Strip -->
        <div style="margin-top: 4px;">
          <div style="font-size: 0.74rem; font-weight: 700; color: var(--muted); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.05em;">
            ${currYear} 12-Month Matrix
          </div>
          <div class="submission-heatmap-month-strip" style="padding-bottom: 6px;">
            ${miniMonthBlocks.join("")}
          </div>
        </div>
      </div>
    </div>
  `;
}

function submissionTimestamp(report){
  if(!report)return 0;
  const raw=report.submittedAt||report.submitted_at||report.date||"";
  const ts=new Date(raw).getTime();
  return Number.isFinite(ts)?ts:0;
}
function personalSubmissionProgressStats(user){
  const startThisWeek=weekStartDate();
  const startLastWeek=new Date(startThisWeek);
  startLastWeek.setDate(startLastWeek.getDate()-7);
  const endThisWeek=new Date(startThisWeek);
  endThisWeek.setDate(endThisWeek.getDate()+7);
  const startThisWeekMs=startThisWeek.getTime();
  const startLastWeekMs=startLastWeek.getTime();
  const endThisWeekMs=endThisWeek.getTime();
  const mine=reports().filter(r=>r.employeeId===user.employeeId);
  const thisWeek=mine.filter(t=>{
    const ts=submissionTimestamp(t);
    return ts>=startThisWeekMs&&ts<endThisWeekMs;
  }).length;
  const lastWeek=mine.filter(t=>{
    const ts=submissionTimestamp(t);
    return ts>=startLastWeekMs&&ts<startThisWeekMs;
  }).length;
  return{
    thisWeek,
    lastWeek,
    delta:thisWeek-lastWeek,
    total:mine.length
  };
}
function renderPersonalProgressWidget(user){
  const widget=document.getElementById("personalProgressWidget");
  if(!widget||!user)return;
  if(!(isLevel2(user)||isLevel3(user))){
    personalProgressExpanded=false;
    widget.innerHTML="";
    widget.style.display="none";
    return;
  }
  widget.style.display="";
  const stats=personalSubmissionProgressStats(user);
  const peak=Math.max(stats.thisWeek,stats.lastWeek,1);
  const thisWeekWidth=Math.max(12,Math.round((stats.thisWeek/peak)*100));
  const lastWeekWidth=Math.max(12,Math.round((stats.lastWeek/peak)*100));
  const deltaClass=stats.delta>0?"personal-progress-positive":stats.delta<0?"personal-progress-negative":"personal-progress-neutral";
  const deltaLabel=stats.delta>0?`+${stats.delta} from last week`:stats.delta<0?`${Math.abs(stats.delta)} fewer than last week`:"Same as last week";
  const buttonLabel=`Personal progress: ${stats.thisWeek} submissions this week and ${stats.lastWeek} submissions last week`;
  widget.innerHTML=personalProgressExpanded?`
    <div class="personal-progress-dropdown">
      <button type="button" class="personal-progress-toggle active-mode" id="personalProgressToggle" aria-expanded="true" aria-label="${escapeHtml(buttonLabel)}">
        <span class="personal-progress-icon" aria-hidden="true"><i class="fa-solid fa-chart-line"></i></span>
        <span class="personal-progress-badge ${stats.thisWeek>0?"":"hidden"}">${escapeHtml(String(stats.thisWeek))}</span>
      </button>
      <div class="personal-progress-panel" id="personalProgressPopover" aria-label="Personal progress summary">
        <div class="personal-progress-head">
          <strong>Personal Progress</strong>
          <span class="${escapeHtml(deltaClass)}">${escapeHtml(deltaLabel)}</span>
        </div>
        <div class="personal-progress-summary">
          <article class="personal-progress-summary-card">
            <span>This week</span>
            <strong>${escapeHtml(String(stats.thisWeek))} submissions</strong>
          </article>
          <article class="personal-progress-summary-card">
            <span>Last week</span>
            <strong>${escapeHtml(String(stats.lastWeek))} submissions</strong>
          </article>
        </div>
        <div class="personal-progress-bars">
          <div class="personal-progress-bar-row">
            <div class="personal-progress-bar-copy">
              <span>This week</span>
              <strong>${escapeHtml(String(stats.thisWeek))} submissions</strong>
            </div>
            <div class="personal-progress-track" aria-hidden="true"><span style="width:${thisWeekWidth}%"></span></div>
          </div>
          <div class="personal-progress-bar-row">
            <div class="personal-progress-bar-copy">
              <span>Last week</span>
              <strong>${escapeHtml(String(stats.lastWeek))} submissions</strong>
            </div>
            <div class="personal-progress-track personal-progress-track-secondary" aria-hidden="true"><span style="width:${lastWeekWidth}%"></span></div>
          </div>
        </div>
        <p class="helper-text">Counts DAR submissions for the current week and the previous week from the report table.</p>
      </div>
    </div>
  `:`
    <div class="personal-progress-dropdown">
      <button type="button" class="personal-progress-toggle" id="personalProgressToggle" aria-expanded="false" aria-label="${escapeHtml(buttonLabel)}">
        <span class="personal-progress-icon" aria-hidden="true"><i class="fa-solid fa-chart-line"></i></span>
        <span class="personal-progress-badge ${stats.thisWeek>0?"":"hidden"}">${escapeHtml(String(stats.thisWeek))}</span>
      </button>
    </div>
  `;
}
function togglePersonalProgressPopover(){
  const user=activeUser();
  if(!user||!(isLevel2(user)||isLevel3(user)))return;
  personalProgressExpanded=!personalProgressExpanded;
  submissionHeatmapExpanded=false;
  document.getElementById("announcementPopover")?.classList.add("hidden");
  document.getElementById("profileMenu")?.classList.add("hidden");
  renderSubmissionHeatmap(user);
  renderPersonalProgressWidget(user);
}
function closeTopbarWidgetsOnOutsideClick(target){
  const user=activeUser();
  if(!user)return;
  const progressPopover=document.getElementById("personalProgressPopover");
  const progressToggle=document.getElementById("personalProgressToggle");
  const heatmapPopover=document.querySelector(".submission-heatmap-panel");
  const heatmapToggle=document.getElementById("submissionHeatmapToggle");
  const announcementPopover=document.getElementById("announcementPopover");
  const announcementToggle=document.getElementById("announcementsToggle");
  const profileMenu=document.getElementById("profileMenu");
  const isProgressHit=!!progressPopover&&!!progressToggle&&(progressPopover.contains(target)||progressToggle.contains(target));
  const isHeatmapHit=!!heatmapPopover&&!!heatmapToggle&&(heatmapPopover.contains(target)||heatmapToggle.contains(target));
  const isAnnouncementHit=!!announcementPopover&&!!announcementToggle&&(announcementPopover.contains(target)||announcementToggle.contains(target));
  const isProfileHit=!!profileMenu&&profileMenu.contains(target);
  if(!isProgressHit&&personalProgressExpanded){
    personalProgressExpanded=false;
    renderPersonalProgressWidget(user);
  }
  if(!isHeatmapHit&&submissionHeatmapExpanded){
    submissionHeatmapExpanded=false;
    renderSubmissionHeatmap(user);
  }
  if(!isAnnouncementHit&&!announcementPopover?.classList.contains("hidden")){
    announcementPopover.classList.add("hidden");
    renderAnnouncementBell(user);
  }
  if(!isProfileHit&&!profileMenu?.classList.contains("hidden")){
    profileMenu.classList.add("hidden");
  }
}

// ─── User lookup ──────────────────────────────────────────────
async function findUserAsync(employeeId) {
  if(!employeeId)return null;
  const id=normalizeEmployeeId(employeeId);
  try {
    const { data, error } = await db
            .from('metro_profiles')
            .select('*')
            .eq('employee_id', id)
            .maybeSingle();
    if(!error&&data){
      const u=supabaseProfileToUser(data);
      if(!u.profileImgUrl)u.profileImgUrl=createProfileAvatar(u);
      return u;
    }
  } catch(err){ console.warn("Supabase lookup failed:",err.message); }
  try {
    const { data, error } = await adminDb
            .from('metro_profiles')
            .select('*')
            .eq('employee_id', id)
            .maybeSingle();
    if(!error&&data){
      const u=supabaseProfileToUser(data);
      if(!u.profileImgUrl)u.profileImgUrl=createProfileAvatar(u);
      return u;
    }
  } catch(err){ console.warn("Admin profile lookup failed:",err.message); }
  return users().find(u=>u.employeeId===id)||null;
}
function findUser(employeeId) {
  if(!employeeId)return null;
  const id=normalizeEmployeeId(employeeId);
  if(id===activePortalUserId&&_currentUserCache)return _currentUserCache;
  return users().find(u=>u.employeeId===id)||null;
}
function activeUser() { return _currentUserCache; }

// ─── Role helpers ─────────────────────────────────────────────
function isAdmin(u)  { return String(u?.level||"").toLowerCase()==="admin"; }
function isLevel1(u) { return String(u?.level||"")==="1"; }
function isLevel2(u) { return String(u?.level||"")==="2"; }
function isLevel3(u) { return String(u?.level||"")==="3"; }
// Leave visibility accepts the canonical cloud roles and legacy labels used by
// existing profiles. METRO-000 is the fixed Master Admin account.
function canManageLeaves(u) {
  const level = String(u?.level || "").trim().toLowerCase();
  const employeeId = normalizeEmployeeId(u?.employeeId || "");
  return isAdmin(u) || isLevel1(u) || employeeId === "METRO-000" ||
    ["master admin", "master_admin", "masteradmin", "level 1", "level1", "l1"].includes(level);
}
function canUseCompliance(u)   {
  if (isAdmin(u) || isLevel1(u)) return true;
  if (isLevel2(u)) {
    const hasTags = (u.taggedDepartments && u.taggedDepartments.trim()) || (u.taggedEntities && u.taggedEntities.trim());
    return !!hasTags;
  }
  return false;
}
function canUseAnalytics(u)    { return isAdmin(u)||isLevel1(u); }
function canUseOrg(u)          { return isAdmin(u)||isLevel1(u); }
function canManageUsers(u)     { return isAdmin(u); }
function canUseGlobalTasks(u)  { return isAdmin(u)||isLevel1(u); }
function canUseEmailReminders(u){ return isLevel1(u) || isAdmin(u); }
function canPublishDailyUpdates(u){ return isAdmin(u)||isLevel1(u); }
function directSubordinates(user){ return users().filter(u=>u.managerId===user.employeeId); }
function assignableTaskTargets(viewer){
  const all=users().filter(u=>u.level!=="admin");
  if(isAdmin(viewer))return all;
  if(isLevel1(viewer))return all.filter(u=>u.level==="2"||u.level==="3");
  const subs=directSubordinates(viewer);
  if(subs.length)return subs;
  if(isLevel2(viewer))return [];
  return [];
}
function complianceUsers(viewer) {
  const all=users().filter(u=>u.level!=="admin" && u.isActive !== false && String(u.level) !== "1");
  let list = [];
  if(isAdmin(viewer)) list = all;
  else if(isLevel1(viewer) || (isLevel2(viewer) && canUseCompliance(viewer))) {
     list = all.filter(u=>{
       if(u.level==="1") return false;
       if(isLevel2(viewer) && u.employeeId === viewer.employeeId) return false;
       const vTaggedDepts = (viewer.taggedDepartments || "").split(",").map(s=>s.trim()).filter(Boolean);
       const vTaggedEntities = (viewer.taggedEntities || "").split(",").map(s=>s.trim()).filter(Boolean);
       if (vTaggedDepts.length > 0 || vTaggedEntities.length > 0) {
          return vTaggedDepts.includes(u.department) || (u.entity && vTaggedEntities.includes(u.entity));
       }
       return false; // Sees nothing if untagged
     });
  }
  else if(isLevel2(viewer) || directSubordinates(viewer).length > 0) list = all.filter(u=>u.managerId===viewer.employeeId);
  else list = all.filter(u=>u.employeeId===viewer.employeeId);

  const entSelect = document.getElementById("complianceEntityFilter");
  if (entSelect && entSelect.value) {
    list = list.filter(u => u.entity === entSelect.value);
  }
  const deptSelect = document.getElementById("complianceDeptFilter");
  if (deptSelect && deptSelect.value) {
    list = list.filter(u => u.department === deptSelect.value);
  }
  const searchInput = document.getElementById("complianceSearchInput");
  if (searchInput && searchInput.value) {
    const q = searchInput.value.toLowerCase();
    list = list.filter(u => (u.name && u.name.toLowerCase().includes(q)) || (u.employeeId && u.employeeId.toLowerCase().includes(q)));
  }

  return list;
}
function canReviewReport(viewer,report) {
  if(!viewer||!report)return false;
  if(isAdmin(viewer))return false;
  if(!reportReviewWindowOpen(report))return false;
  const owner=findUser(report.employeeId);
  if(!owner)return false;
  const lvl=String(owner.level||"");
  if(isLevel1(viewer) || (isLevel2(viewer) && canUseCompliance(viewer))) {
    if (lvl==="2"||lvl==="3") {
       const vTaggedDepts = (viewer.taggedDepartments || "").split(",").map(s=>s.trim()).filter(Boolean);
       const vTaggedEntities = (viewer.taggedEntities || "").split(",").map(s=>s.trim()).filter(Boolean);
       if (vTaggedDepts.length > 0 || vTaggedEntities.length > 0) {
          const inDept = vTaggedDepts.includes(owner.department);
          const inEntity = owner.entity && vTaggedEntities.includes(owner.entity);
          return inDept || inEntity;
       }
       return true;
    }
    return false;
  }
  if(report.managerId===viewer.employeeId || owner.managerId===viewer.employeeId) {
    return lvl==="2" || lvl==="3";
  }
  return false;
}
function reportReviewDeadline(report){
  const reportDate=report?.date||report?.report_date;
  if(!reportDate)return null;
  const deadline=new Date(`${reportDate}T00:00:00`);
  if(Number.isNaN(deadline.getTime()))return null;
  deadline.setDate(deadline.getDate()+1);
  deadline.setHours(REVIEW_DEADLINE_HOUR,REVIEW_DEADLINE_MINUTE,0,0);
  return deadline;
}
function reportReviewWindowOpen(report){
  const deadline=reportReviewDeadline(report);
  return deadline?new Date()<=deadline:false;
}
function managerDisplayName(user) {
  if(!user)return"--";
  if(isLevel1(user))return"NA";
  return user.managerName||"--";
}

// ─── Cloud write helpers ──────────────────────────────────────

async function cloudUpsertReport(report) {
  const normalized=normalizeReport(report);
  try {
    const row={
      id:              normalized.id,
      employee_id:     normalized.employeeId,
      employee_name:   normalized.employeeName,
      manager_id:      normalized.managerId||null,
      manager_name:    normalized.managerName||"",
      report_date:     normalized.date,
      report_type:     normalized.type||"internal",
      title:           normalized.title||"DAR",
      project_name:    normalized.projectName||"",
      approval_status: normalized.approvalStatus||"pending",
      reviewed_by:     normalized.reviewedBy||null,
      reviewed_at:     normalized.reviewedAt||null,
      review_comment:  normalized.reviewComment||"",
      submitted_at:    normalized.submittedAt||nowIso(),
      points:          normalized.points
    };
    let {error} = await db.from('metro_reports').upsert([row], {onConflict:'id'});
    if(error)throw error;

    const localReports=readStore(STORAGE_KEYS.reports,[]);
    const idx=localReports.findIndex(r=>r.employeeId===normalized.employeeId&&r.date===normalized.date);
    if(idx>=0)localReports[idx]=normalized; else localReports.push(normalized);
    writeStore(STORAGE_KEYS.reports,localReports);
    return {ok:true,report:normalized};
  } catch(e){
    console.error("cloudUpsertReport exception:",e.message);
    return {ok:false,error:e};
  }
}

async function cloudAppendPointsToReport(user, date, type, location, newPoints) {
  const reportId = `RPT-${user.employeeId}-${date}`;
  let existingReport = null;
  try {
    const {data, error} = await db.from('metro_reports').select('id, employee_id, employee_name, manager_id, manager_name, report_date, report_type, project_name, approval_status, reviewed_by, reviewed_at, review_comment, submitted_at, points').eq('id', reportId).maybeSingle();
    if (!error && data) {
       existingReport = normalizeReport({
        ...data,
        employeeId: data.employee_id, employeeName: data.employee_name,
        managerId: data.manager_id, managerName: data.manager_name,
        date: data.report_date, type: data.report_type,
        projectName: data.project_name, approvalStatus: data.approval_status,
        reviewedBy: data.reviewed_by, reviewedAt: data.reviewed_at,
        submittedAt: data.submitted_at
      });
    }
  } catch(e) {
    console.warn("cloudAppendPointsToReport fetch error:", e);
  }
  
  if (!existingReport) {
    existingReport = reports().find(r => r.id === reportId);
  }

  const appendResult = existingReport ? mergeDraftPointsIntoReport(existingReport, newPoints) : null;
  const report = appendResult?.report || {
    id: reportId,
    employeeId: user.employeeId, employeeName: user.name,
    managerId: user.managerId || "", managerName: user.managerName || "",
    date: date, type: type || "internal",
    title: type === "project" ? "Project-Specific DAR" : "DAR",
    projectName: location || "",
    approvalStatus: "pending",
    reviewedBy: "", reviewedAt: "", reviewComment: "",
    submittedAt: nowIso(), points: newPoints
  };

  return { result: await cloudUpsertReport(report), appendResult };
}

async function cloudSaveDraft(user,draft) {
  if(!user||!draft)return {ok:false,error:new Error("Missing draft")};
  try {
    const row=draftToSupabaseRow(user,draft);
    const {error}=await adminDb.from('metro_drafts').upsert([row],{onConflict:'employee_id,report_date'});
    if(error){
      if(isMissingDraftOptionalColumnError(error)){
        const retry=await adminDb.from('metro_drafts').upsert([withoutDraftOptionalColumns(row)],{onConflict:'employee_id,report_date'});
        if(retry.error)throw retry.error;
      } else {
        throw error;
      }
    }
    return {ok:true};
  } catch(e) {
    console.error("cloudSaveDraft exception:",e.message);
    return {ok:false,error:e};
  }
}

async function cloudClearDraft(user,dateValue=today()) {
  if(!user)return {ok:false,error:new Error("Missing user")};
  try {
    const {error}=await adminDb
      .from('metro_drafts')
      .delete()
      .eq('employee_id',user.employeeId)
      .eq('report_date',dateValue);
    if(error)throw error;
    return {ok:true};
  } catch(e) {
    console.error("cloudClearDraft exception:",e.message);
    return {ok:false,error:e};
  }
}

async function cloudAddNotification(targetId, message, options={}) {
  const item={
    id:        `NTF-${Date.now()}-${Math.random()}`,
    targetId,
    message,
    createdAt: nowIso(),
    kind:      options.kind||"notice",
    title:     options.title||"Alert",
    reportId:  options.reportId||"",
    actorName: options.actorName||""
  };
  // Update local cache
  const next=notifications();
  next.unshift(item);
  writeStore(STORAGE_KEYS.notifications,next);

  try {
    const {error}=await db.from('metro_notifications').insert([{
      target_id:  targetId,
      actor_name: options.actorName||"",
      report_id:  options.reportId||null,
      kind:       options.kind||"notice",
      title:      options.title||"Alert",
      message,
      action_type: ""
    }]);
    if(error)console.error("cloudAddNotification error:",error.message);
  } catch(e){ console.error("cloudAddNotification exception:",e.message); }
}

async function cloudAddAnnouncement(message, creator) {
  const item={
    id:            `ANN-${Date.now()}`,
    title:         "Metro Daily Broadcast",
    message,
    createdAt:     nowIso(),
    createdBy:     creator?.employeeId||"",
    createdByName: creator?.name||"Metro Group",
    kind:          "announcement",
    audience:      creator?(isLevel1(creator)?"level23":"all"):"all"
  };
  const next=announcements();
  next.unshift(item);
  writeStore(STORAGE_KEYS.announcements,next);

  try {
    const {error}=await db.from('metro_announcements').insert([{
      created_by:      creator?.employeeId||null,
      created_by_name: creator?.name||"Metro Group",
      title:           "Metro Daily Broadcast",
      message,
      audience:        item.audience
    }]);
    if(error)console.error("cloudAddAnnouncement error:",error.message);
  } catch(e){ console.error("cloudAddAnnouncement exception:",e.message); }
}

async function cloudAssignTask(task) {
  const next=tasks();
  next.unshift(task);
  writeStore(STORAGE_KEYS.tasks,next);
  try {
    const {error}=await db.from('metro_tasks').insert([{
      id:                    task.id,
      target_employee_id:    task.targetId,
      assigned_by_employee_id: task.assignedBy,
      title:                 task.title,
      notes:                 task.notes||"",
      task_type:             task.type||"internal",
      due_date:              task.dueDate||null,
      completed:             false
    }]);
    if(error)console.error("cloudAssignTask error:",error.message);
  } catch(e){ console.error("cloudAssignTask exception:",e.message); }
}

async function cloudUpdateTaskCompletion(taskId, completed, viewer) {
  const localTasks = readStore(STORAGE_KEYS.tasks, []);
  const idx = localTasks.findIndex(t => t.id === taskId);
  if (idx < 0) return false;
  const nextTask = {
    ...localTasks[idx],
    completed: Boolean(completed),
    completedAt: completed ? (localTasks[idx].completedAt || nowIso()) : "",
    updatedAt: nowIso()
  };
  localTasks[idx] = nextTask;
  writeStore(STORAGE_KEYS.tasks, localTasks);

  try {
    const { error } = await db.from('metro_tasks').update({
      completed: nextTask.completed,
      completed_at: nextTask.completedAt || null
    }).eq('id', taskId);
    if (error) console.error("cloudUpdateTaskCompletion error:", error.message);
  } catch (e) {
    console.error("cloudUpdateTaskCompletion exception:", e.message);
  }
  return true;
}

async function ensureSupabaseAuthUser(authClient, email, password) {
    try {
        // 1. Ask the Admin API to create the user (Bypasses ALL rate limits)
        const { data, error } = await adminDb.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true // Instantly verify them
        });

        if (data?.user?.id) return data.user.id;
        
        // 2. If they already exist, fetch their existing Auth ID
        if (error && (error.message.includes("already registered") || error.message.includes("already exists"))) {
            try {
                const { data: profile } = await adminDb.from('metro_profiles').select('auth_user_id').eq('email', email).maybeSingle();
                if (profile && profile.auth_user_id) {
                    const { error: updateError } = await adminDb.auth.admin.updateUserById(profile.auth_user_id, {
                        password,
                        email_confirm: true
                    });
                    if (updateError) console.warn("Admin Auth password sync warning:", updateError.message);
                    return profile.auth_user_id;
                }
            } catch(e) {}
            
            let page = 1;
            let existingUser = null;
            while (true) {
                const { data: listData } = await adminDb.auth.admin.listUsers({ page, perPage: 1000 });
                if (!listData || !listData.users || listData.users.length === 0) break;
                existingUser = listData.users.find(u => u.email === email);
                if (existingUser) break;
                page++;
            }
            if (existingUser) {
                const { error: updateError } = await adminDb.auth.admin.updateUserById(existingUser.id, {
                    email,
                    password,
                    email_confirm: true
                });
                if (updateError) console.warn("Admin Auth password sync warning:", updateError.message);
                return existingUser.id;
            }
        }
        
        if (error) throw error;

    } catch (error) {
        console.warn("Admin Auth provisioning warning:", error.message);
    }
    return "";
}

async function cloudSaveUser(user) {
  try {
    const row=userToSupabaseProfile(user);
    const {error}=await db.from('metro_profiles').upsert([row],{onConflict:'employee_id'});
    if(error){
      if(isMissingDateOfBirthColumnError(error)){
          const retry=await db.from('metro_profiles').upsert([withoutDateOfBirthColumn(row)],{onConflict:'employee_id'});
          if(retry.error)throw retry.error;
      } else {
        const adminRetry=await adminDb.from('metro_profiles').upsert([row],{onConflict:'employee_id'});
        if(adminRetry.error){
          if(isMissingDateOfBirthColumnError(adminRetry.error)){
            const retry=await adminDb.from('metro_profiles').upsert([withoutDateOfBirthColumn(row)],{onConflict:'employee_id'});
            if(retry.error)throw retry.error;
          } else {
            throw adminRetry.error;
          }
        }
      }
    }

    const localUsers=readStore(STORAGE_KEYS.users,[]);
    const idx=localUsers.findIndex(u=>u.employeeId===user.employeeId);
    if(idx>=0)localUsers[idx]=user; else localUsers.push(user);
    writeStore(STORAGE_KEYS.users,localUsers);
    return {ok:true,user};
  } catch(e){
    console.error("cloudSaveUser exception:",e.message);
    return {ok:false,error:e};
  }
}

async function cloudAddReminderLogs(entries) {
  const normalized=(entries||[]).map(normalizeReminderLog);
  if(!normalized.length)return {ok:true};
  const existing=reminderLogs();
  writeStore(STORAGE_KEYS.reminderLogs,[...normalized,...existing]);
  try {
    const rows=normalized.map(item=>({
      id: item.id,
      sent_by: item.sentBy,
      sent_by_name: item.sentByName,
      employee_id: item.employeeId,
      employee_name: item.employeeName,
      employee_email: item.employeeEmail,
      reminder_date: item.reminderDate,
      subject: item.subject,
      mode: item.mode,
      sent_at: item.sentAt
    }));
    const {error}=await db.from('metro_email_reminder_logs').insert(rows);
    if(error)throw error;
    return {ok:true};
  } catch(e) {
    console.warn("cloudAddReminderLogs fallback:",e.message);
    return {ok:false,error:e};
  }
}
function reminderEligibleEmployees(viewer) {
  if(!canUseEmailReminders(viewer))return [];
  const all = users().filter(u => u.isActive !== false && u.level !== "admin" && String(u.level) !== "1" && (String(u.level) === "2" || String(u.level) === "3"));
  if (isAdmin(viewer)) return all;
  if (isLevel1(viewer)) {
    const vTaggedDepts = (viewer.taggedDepartments || "").split(",").map(s => s.trim()).filter(Boolean);
    const vTaggedEntities = (viewer.taggedEntities || "").split(",").map(s => s.trim()).filter(Boolean);
    if (vTaggedDepts.length > 0 || vTaggedEntities.length > 0) {
      return all.filter(u => vTaggedDepts.includes(u.department) || (u.entity && vTaggedEntities.includes(u.entity)));
    }
    return all;
  }
  if (isLevel2(viewer)) {
    return all.filter(u => u.managerId === viewer.employeeId);
  }
  return all;
}

async function cloudUpdateUserProfile(originalEmployeeId, updatedUser) {
  const oldId=normalizeEmployeeId(originalEmployeeId);
  const newId=normalizeEmployeeId(updatedUser.employeeId);
  if(!oldId||!newId)return {ok:false,error:new Error("Missing employee ID")};
  const current=findUser(oldId);
  if(!current)return {ok:false,error:new Error("User not found")};
  const nextUser={...current,...updatedUser,employeeId:newId};
  const manager=findUser(nextUser.managerId);
  nextUser.managerName=(nextUser.level==="2"||nextUser.level==="3")?(manager?.name||nextUser.managerName||""):"";
  nextUser.managerId=(nextUser.level==="2"||nextUser.level==="3")?nextUser.managerId:"";
  if(oldId===newId)return cloudSaveUser(nextUser);

  if(findUser(newId))return {ok:false,error:new Error("New Employee ID already exists")};
  try {
    const newRow=userToSupabaseProfile({...nextUser,authUserId:""});
    const {error:insertError}=await adminDb.from('metro_profiles').insert([newRow]);
    if(insertError)throw insertError;

    await adminDb.from('metro_profiles').update({manager_employee_id:newId}).eq('manager_employee_id',oldId);
    await adminDb.from('metro_tasks').update({target_employee_id:newId}).eq('target_employee_id',oldId);
    await adminDb.from('metro_tasks').update({assigned_by_employee_id:newId}).eq('assigned_by_employee_id',oldId);
    await adminDb.from('metro_reports').update({employee_id:newId,employee_name:nextUser.name}).eq('employee_id',oldId);
    await adminDb.from('metro_reports').update({manager_id:newId,manager_name:nextUser.name}).eq('manager_id',oldId);
    await adminDb.from('metro_reports').update({reviewed_by:newId}).eq('reviewed_by',oldId);
    await adminDb.from('metro_drafts').update({employee_id:newId}).eq('employee_id',oldId);
    await adminDb.from('metro_notifications').update({target_id:newId}).eq('target_id',oldId);
    await adminDb.from('metro_notifications').update({actor_id:newId,actor_name:nextUser.name}).eq('actor_id',oldId);
    await adminDb.from('metro_announcements').update({created_by:newId,created_by_name:nextUser.name}).eq('created_by',oldId);
    await adminDb.from('metro_issues').update({raised_by:newId}).eq('raised_by',oldId);
    await adminDb.from('metro_issues').update({reviewed_by:newId}).eq('reviewed_by',oldId);
    await adminDb.from('metro_deleted_users').update({deleted_by:newId}).eq('deleted_by',oldId);
    const {error:deleteError}=await adminDb.from('metro_profiles').delete().eq('employee_id',oldId);
    if(deleteError)throw deleteError;
    if(nextUser.authUserId){
      await adminDb.from('metro_profiles').update({auth_user_id:nextUser.authUserId}).eq('employee_id',newId);
    }
    if(nextUser.authUserId){
      try{await adminDb.auth.admin.updateUserById(nextUser.authUserId,{email:`${newId.toLowerCase()}@metrogroup.local`,password:nextUser.password,email_confirm:true});}
      catch(authErr){console.warn("Auth ID retag warning:",authErr.message);}
    }

    const localUsers=users().map(user=>user.employeeId===oldId?nextUser:{
      ...user,
      managerId:user.managerId===oldId?newId:user.managerId,
      managerName:user.managerId===oldId?nextUser.name:user.managerName
    });
    writeStore(STORAGE_KEYS.users,localUsers);
    writeStore(STORAGE_KEYS.tasks,tasks().map(task=>({...task,targetId:task.targetId===oldId?newId:task.targetId,assignedBy:task.assignedBy===oldId?newId:task.assignedBy})));
    writeStore(STORAGE_KEYS.reports,reports().map(report=>({...report,employeeId:report.employeeId===oldId?newId:report.employeeId,employeeName:report.employeeId===oldId?nextUser.name:report.employeeName,managerId:report.managerId===oldId?newId:report.managerId,managerName:report.managerId===oldId?nextUser.name:report.managerName,reviewedBy:report.reviewedBy===oldId?newId:report.reviewedBy})));
    const localDrafts=drafts();
    Object.keys(localDrafts).forEach(key=>{
      if(key.startsWith(`${oldId}__`)){
        const nextKey=key.replace(`${oldId}__`,`${newId}__`);
        localDrafts[nextKey]={...localDrafts[key],employeeId:newId};
        delete localDrafts[key];
      }
    });
    writeStore(STORAGE_KEYS.drafts,localDrafts);
    writeStore(STORAGE_KEYS.notifications,notifications().map(n=>({...n,targetId:n.targetId===oldId?newId:n.targetId,actorName:n.actorName===current.name?nextUser.name:n.actorName})));
    if(activePortalUserId===oldId)activePortalUserId=newId;
    if(selectedProfileEmployeeId===oldId)selectedProfileEmployeeId=newId;
    if(selectedComplianceEmployeeId===oldId)selectedComplianceEmployeeId=newId;
    return {ok:true,user:nextUser};
  } catch(e) {
    console.error("cloudUpdateUserProfile exception:",e.message);
    return {ok:false,error:e};
  }
}

async function cloudUpdateReportApproval(reportId,status,comment,viewer) {
  const localReports=readStore(STORAGE_KEYS.reports,[]);
  const idx=localReports.findIndex(r=>r.id===reportId);
  if(idx<0)return;
  if(!canReviewReport(viewer,localReports[idx]))return;
  const nextReport={...localReports[idx]};
  if(status)nextReport.approvalStatus=status;
  if(comment&&comment.trim())nextReport.reviewComment=comment.trim();
  nextReport.reviewedBy=viewer.employeeId;
  nextReport.reviewedAt=nowIso();
  localReports[idx]=nextReport;
  writeStore(STORAGE_KEYS.reports,localReports);

  try {
    const update={};
    if(status)update.approval_status=status;
    if(comment&&comment.trim())update.review_comment=comment.trim();
    update.reviewed_by=viewer.employeeId;
    update.reviewed_at=nextReport.reviewedAt;
    const {error}=await db.from('metro_reports').update(update).eq('id',reportId);
    if(error)console.error("cloudUpdateReportApproval error:",error.message);
  } catch(e){ console.error("cloudUpdateReportApproval exception:",e.message); }
}

async function cloudDeleteUser(employeeId,deletedBy,reason) {
    const target=findUser(employeeId);
    if(!target)return false;
    try {
        const auditInsert=await db.from('metro_deleted_users').insert([{
            employee_id:  target.employeeId,
            full_name:    target.name,
            password_plaintext: target.password||"",
            role_level:   target.level,
            department:   target.department||"General",
            manager_employee_id: target.managerId||null,
            manager_name: target.managerName||null,
            deleted_by:   deletedBy,
            reason:       reason
        }]);
        if(auditInsert.error)console.warn("cloudDeleteUser audit insert warning:",auditInsert.error.message);

        // ==========================================
        // THE FIX: Instantly delete the login credentials from the Auth Vault
        // ==========================================
        if (target.authUserId) {
            try {
                await adminDb.auth.admin.deleteUser(target.authUserId);
            } catch (authErr) {
                console.warn("Auth Vault deletion warning:", authErr.message);
            }
        }

        // Proceed to clean up the database tables
        await db.from('metro_tasks').delete().eq('target_employee_id',employeeId);
        await db.from('metro_tasks').delete().eq('assigned_by_employee_id',employeeId);
        await db.from('metro_reports').delete().eq('employee_id',employeeId);
        await db.from('metro_reports').delete().eq('manager_id',employeeId);
        await db.from('metro_reports').delete().eq('reviewed_by',employeeId);
        await db.from('metro_notifications').delete().eq('target_id',employeeId);
        await db.from('metro_issues').delete().eq('raised_by',employeeId);
        const deleteResult=await db.from('metro_profiles').delete().eq('employee_id',employeeId);
        
        if(deleteResult.error)throw deleteResult.error;
        
        const deletedEntry={
            employeeId: target.employeeId, name: target.name, level: target.level,
            department: target.department, managerName: target.managerName||"",
            deletedAt: nowIso(), deletedBy, reason
        };
        writeStore(STORAGE_KEYS.deletedUsers,[deletedEntry,...deletedUsers()]);
        writeStore(STORAGE_KEYS.users, users().filter(u=>u.employeeId!==employeeId));
        writeStore(STORAGE_KEYS.tasks, tasks().filter(t=>t.targetId!==employeeId&&t.assignedBy!==employeeId));
        writeStore(STORAGE_KEYS.reports, reports().filter(r=>r.employeeId!==employeeId&&r.managerId!==employeeId));
        const nd=drafts(); Object.keys(nd).forEach(k=>{if(k.startsWith(`${employeeId}__`))delete nd[k];}); writeStore(STORAGE_KEYS.drafts,nd);
        writeStore(STORAGE_KEYS.notifications, notifications().filter(n=>n.targetId!==employeeId));
        writeStore(STORAGE_KEYS.issues, issues().filter(i=>i.raisedBy!==employeeId));
    } catch(e){ console.error("cloudDeleteUser exception:",e.message); return false; }
    
    if(selectedComplianceEmployeeId===employeeId)selectedComplianceEmployeeId="";
    if(activePortalUserId===employeeId)logoutPortal();
    selectedHistoryReportId="";
    return true;
}

// ─── Bulk CSV import — directly to Supabase ──────────────────
async function cloudBulkImportUsers(lines, createdBy) {
  const currentUsers=users();
  const toUpsert=[];
  const authWarnings=[];
  const tempAuth = supabase.createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, storageKey: 'temp-auth-token-1' } });
  let created=0;
  let updated=0;

  for(const line of lines){
    const [nameRaw,employeeIdRaw,levelRaw,departmentRaw,managerRaw,passwordRaw,emailRaw]=
      line.split(",").map(v=>String(v||"").trim());
    const employeeId=employeeIdRaw.toUpperCase();
    if(!nameRaw||!employeeId||!levelRaw||!departmentRaw||!passwordRaw)continue;
    if(toUpsert.some(u=>u.employeeId===employeeId))continue;

    let managerId=""; let managerName="";
    if(levelRaw==="2"||levelRaw==="3"){
      managerId=(managerRaw||"").toUpperCase();
      const mgr=currentUsers.find(u=>u.employeeId===managerId)||toUpsert.find(u=>u.employeeId===managerId);
      if(!mgr)continue;
      if(levelRaw==="2"&&mgr.level!=="1")continue;
      if(levelRaw==="3"&&mgr.level!=="1"&&mgr.level!=="2")continue;
      managerName=mgr.name;
    }

    const email = emailRaw || `${employeeId.toLowerCase()}@metrogroup.local`;
    const existing = currentUsers.find(u=>u.employeeId===employeeId);

    if(existing){
       const updatedUser = {
         ...existing,
         name: nameRaw,
         password: passwordRaw || existing.password,
         level: levelRaw,
         department: departmentRaw,
         managerId: ["1","admin"].includes(levelRaw)?"":(managerId||null),
         managerName: ["1","admin"].includes(levelRaw)?"":(managerName||""),
         email: email
       };
       toUpsert.push(updatedUser);
       updated++;
       
       if (existing.authUserId && (existing.password !== passwordRaw || existing.email !== email)) {
          try {
              await adminDb.auth.admin.updateUserById(existing.authUserId, {
                  email: email,
                  password: passwordRaw,
                  email_confirm: true
              });
          } catch(e) {
              authWarnings.push(`${employeeId}: ${e.message}`);
          }
       }
    } else {
      try {
        await new Promise(resolve => setTimeout(resolve, 600));
        const authUserId = await ensureSupabaseAuthUser(tempAuth, email, passwordRaw);
        if (!authUserId) authWarnings.push(`${employeeId}: unable to create or find auth account`);
        else {
          toUpsert.push({
            employeeId, name:nameRaw, password:passwordRaw, level:levelRaw,
            department:departmentRaw, managerId:["1","admin"].includes(levelRaw)?"":(managerId||null),
            managerName:["1","admin"].includes(levelRaw)?"":(managerName||""),
            phone:"",email:email,location:"",bio:"",profileImgUrl:"",
            lastDarDate:"",
            createdBy:createdBy||"",isSeed:false,authUserId
          });
          created++;
        }
      } catch (authErr) {
        authWarnings.push(`${employeeId}: ${authErr.message}`);
      }
    }
  }

  if(toUpsert.length){
    try {
      const rows=toUpsert.map(userToSupabaseProfile);
      const {error}=await db.from('metro_profiles').upsert(rows,{onConflict:'employee_id'});
      if(error){
        if(isMissingDateOfBirthColumnError(error)){
          const retry=await db.from('metro_profiles').upsert(rows.map(withoutDateOfBirthColumn),{onConflict:'employee_id'});
          if(retry.error)throw retry.error;
        } else {
          throw error;
        }
      }
      
      const newUsersList = [...currentUsers];
      toUpsert.forEach(u => {
        const idx = newUsersList.findIndex(cu => cu.employeeId === u.employeeId);
        if (idx >= 0) newUsersList[idx] = u;
        else newUsersList.push(u);
      });
      writeStore(STORAGE_KEYS.users, newUsersList);
    } catch(e){ console.error("cloudBulkImportUsers exception:",e.message); return {created,updated,warnings:[e.message]}; }
  }

  return {created,updated,warnings:authWarnings};
}

// ─── Draft helpers (localStorage — fast UX) ──────────────────
function getDraftKey(employeeId){ return `${employeeId}__dar_draft`; }
function defaultDraft(user){
  return{employeeId:user.employeeId,date:today(),type:"internal",
    currentPoint:"",pointHours:"",pointMinutes:"",location:"",
    mobileDate:today(),mobileType:"internal",mobileLocation:"",
    attachmentName:"",attachmentData:"",attachmentSize:"",points:[]};
}
function reportToDraft(report,user){
  return{...defaultDraft(user),date:report.date,type:report.type,
    points:(report.points||[]).map(p=>({...p}))};
}
function draftHasContent(draft){
  return !!(String(draft?.currentPoint||"").trim() || String(draft?.pointHours||"").trim() ||
    String(draft?.pointMinutes||"").trim() || String(draft?.mobileLocation||draft?.location||"").trim() ||
    (draft?.points||[]).length || draft?.attachmentName);
}
function getDraft(user,options={}){
  const stored=drafts()[getDraftKey(user.employeeId)];
  if(stored){
    if(stored.date&&stored.date!==today()&&!options.allowStale){clearDraft(user);}
    else return{...defaultDraft(user),...stored,points:stored.points||[]};
  }
  return defaultDraft(user);
}
function saveDraft(user,draft){
  const normalized={...defaultDraft(user),...draft,employeeId:user.employeeId,points:draft.points||[]};
  const next=drafts(); next[getDraftKey(user.employeeId)]=normalized; writeStore(STORAGE_KEYS.drafts,next);
  const key=getDraftKey(user.employeeId);
  window.clearTimeout(draftCloudSaveTimers[key]);
  draftCloudSaveTimers[key]=window.setTimeout(async()=>{
    const result=await cloudSaveDraft(user,normalized);
    if(!result.ok){
      const feedback=document.getElementById("darFeedback")||document.getElementById("mobileDarFeedback");
      if(feedback)feedback.textContent="Draft saved on this device. Cloud draft sync is pending.";
    }
  },450);
}
function clearDraft(user){
  const key=getDraftKey(user.employeeId);
  const oldDraft=drafts()[key];
  window.clearTimeout(draftCloudSaveTimers[key]);
  const next=drafts(); delete next[key]; writeStore(STORAGE_KEYS.drafts,next);
  const p = cloudClearDraft(user,oldDraft?.date||today());
  if(activePortalUserId===user.employeeId)editingDraftPointId=""; return p; }

// ─── Announcements / Notifications helpers ───────────────────
function addNotification(targetId,message,options={}){ cloudAddNotification(targetId,message,options); }
function addAnnouncement(message,creator){ cloudAddAnnouncement(message,creator); }
function assignTask(task){ cloudAssignTask(task); }

function upsertReport(report){ cloudUpsertReport(report); }
function notificationTargetsForSubmission(user) {
  const ids=new Set();
  if(user?.managerId)ids.add(user.managerId);
  if(isLevel2(user)){
    users().filter(u=>u.level==="1").forEach(u=>ids.add(u.employeeId));
  }
  if(isLevel3(user)){
    const level2=findUser(user.managerId);
    if(level2?.managerId)ids.add(level2.managerId);
    if(!level2?.managerId)users().filter(u=>u.level==="1").forEach(u=>ids.add(u.employeeId));
  }
  ids.delete(user?.employeeId);
  return [...ids];
}
function notifySubmissionReviewers(user,message,options={}) {
  notificationTargetsForSubmission(user).forEach(targetId=>addNotification(targetId,message,options));
}

// ─── Notification UI helpers ──────────────────────────────────
function announcementVisibleToUser(item,user){
  if(!item)return false;
  if(!item.audience||item.audience==="all")return true;
  if(item.audience==="level23")return isLevel2(user)||isLevel3(user);
  return true;
}
function announcementsForUser(user){ return announcements().filter(i=>announcementVisibleToUser(i,user)); }
function headerAlertSeenKey(employeeId){ return `${String(employeeId||"").toUpperCase()}__metro_header_seen`; }
function readHeaderAlertSeenAt(employeeId){
  try{ const raw=localStorage.getItem(headerAlertSeenKey(employeeId)); return raw?JSON.parse(raw):""; } catch{ return""; }
}
function markHeaderAlertsSeen(employeeId,seenAt=nowIso()){ localStorage.setItem(headerAlertSeenKey(employeeId),JSON.stringify(seenAt)); }
function headerAlertsForUser(user){
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
  return [...notifItems,...annItems]
    .sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
}
function unreadHeaderAlertCount(user){
  const seenAt=readHeaderAlertSeenAt(user.employeeId);
  const seenTime=seenAt?new Date(seenAt).getTime():0;
  return headerAlertsForUser(user).filter(i=>new Date(i.createdAt).getTime()>seenTime).length;
}

// ─── Session management ───────────────────────────────────────
function storageSession(){ return readStore(STORAGE_KEYS.session,{}); }
function setSession(employeeId){ writeStore(STORAGE_KEYS.session,{employeeId,loggedInAt:nowIso()}); }
function clearSession(){ localStorage.removeItem(STORAGE_KEYS.session); if(syncBus)syncBus.postMessage({key:STORAGE_KEYS.session,ts:Date.now()}); }

// ─── Theme ────────────────────────────────────────────────────
function applyTheme(theme){
  const t=theme||readStore(STORAGE_KEYS.theme,"light")||"light";
  document.body.classList.toggle("theme-dark",t==="dark");
  localStorage.setItem(STORAGE_KEYS.theme,JSON.stringify(t));
  const lb=document.getElementById("sidebarThemeLight");
  const db2=document.getElementById("sidebarThemeDark");
  if(lb&&db2){
    if(t==="dark"){
      db2.style.background="var(--panel-strong)";db2.style.color="var(--text)";db2.style.boxShadow="0 4px 10px rgba(0,0,0,0.1)";
      lb.style.background="transparent";lb.style.color="var(--muted)";lb.style.boxShadow="none";
    } else {
      lb.style.background="var(--panel-strong)";lb.style.color="var(--text)";lb.style.boxShadow="0 4px 10px rgba(0,0,0,0.1)";
      db2.style.background="transparent";db2.style.color="var(--muted)";db2.style.boxShadow="none";
    }
  }
  renderHeaderGreeting(activeUser());
  const user=activeUser(); if(user)renderGhostTyping(user);
}

// ─── Ghost typing ─────────────────────────────────────────────
function clearGhostTypingTimers(){ ghostTypingTimers.forEach(t=>clearTimeout(t)); ghostTypingTimers=[]; }
function clearLoginGreetingTimers(){ loginGreetingTimers.forEach(t=>clearTimeout(t)); loginGreetingTimers=[]; }
function stopGhostTyping(){
  ghostTypingToken++;ghostTypingSignature="";clearGhostTypingTimers();
  const canvas=document.getElementById("ghostCanvas");
  const pL=document.getElementById("ghostPrimaryLine");const sL=document.getElementById("ghostSecondaryLine");
  const pT=document.getElementById("ghostPrimaryText");const sT=document.getElementById("ghostSecondaryText");
  const pC=document.getElementById("ghostPrimaryCursor");const sC=document.getElementById("ghostSecondaryCursor");
  if(canvas)canvas.classList.add("hidden");
  [pL,sL].forEach(el=>el?.classList.remove("ghost-line-active","ghost-line-fading"));
  if(pT)pT.textContent="";if(sT)sT.textContent="";
  if(pC)pC.classList.remove("is-visible");if(sC)sC.classList.remove("is-visible");
}
function stopLoginGreetingTyping(){
  loginGreetingToken++;loginGreetingSignature="";clearLoginGreetingTimers();
  const primary=document.getElementById("headerGreetingPrimaryText");
  const secondary=document.getElementById("headerGreetingSecondaryText");
  const pc=document.getElementById("headerGreetingPrimaryCursor");
  const sc=document.getElementById("headerGreetingSecondaryCursor");
  if(primary)primary.textContent="";if(secondary)secondary.textContent="";
  if(pc)pc.classList.remove("is-visible");if(sc)sc.classList.remove("is-visible");
}
function ghostTypingCopy(user){
  const name=String(user?.name||"").toUpperCase()||"METRO USER";
  if(isBirthdayToday(user?.dob)){
    return{
      primaryPrefix:"HAPPY BIRTHDAY,",
      primaryName:name,
      primarySuffix:"!",
      secondary:[
        "WISHING YOU A DAY FILLED WITH JOY AND SUCCESS.",
        "METRO GROUP IS CELEBRATING YOUR SPECIAL DAY.",
        "KEEP SHINING AND KEEP GROWING."
      ]
    };
  }
  const minutes=new Date().getHours()*60+new Date().getMinutes();
  if(minutes>=361&&minutes<=720)return{primaryPrefix:"GOOD MORNING,",primaryName:name,primarySuffix:"",secondary:["LET'S MAKE TODAY PRODUCTIVE.","METRO GROUP SYSTEMS LIVE.","DAILY WORKFLOW IN MOTION."]};
  if(minutes>=721&&minutes<=960)return{primaryPrefix:"GOOD AFTERNOON,",primaryName:name,primarySuffix:"",secondary:["HOPE YOUR DAY IS GOING WELL.","ORGANISATION OVERVIEW IS READY.","TEAM PERFORMANCE IS STREAMING."]};
  if(minutes>=961&&minutes<=1140)return{primaryPrefix:"GOOD EVENING,",primaryName:name,primarySuffix:"",secondary:["WRAPPING UP FOR THE DAY?","CLOSING DAILY LOGS.","METRO GROUP NIGHT REVIEW."]};
  if(minutes>=1141||minutes<=0)return{primaryPrefix:"GOOD NIGHT,",primaryName:name,primarySuffix:"",secondary:["REST WELL OR KEEP UP THE GREAT WORK.","TOMORROW WILL BE READY.","DAILY ACTIVITY SUMMARY."]};
  if(minutes>=1&&minutes<=180)return{primaryPrefix:"HELLO,",primaryName:name,primarySuffix:"",secondary:["BURNING THE MIDNIGHT OIL, ARE WE?","METRO GROUP SYSTEMS LIVE.","REPORTS ARE FINALIZING."]};
  return{primaryPrefix:"EARLY BIRD,",primaryName:name,primarySuffix:"",secondary:["YOU'RE AHEAD OF THE GAME TODAY.","METRO GROUP EARLY OPERATIONS.","READY FOR A PRODUCTIVE START."]};
}
function headerGreetingCopy(){
  if(isBirthdayToday(activeUser()?.dob||activeUser()?.dateOfBirth||activeUser()?.date_of_birth)){
    const name=String(activeUser()?.name||"").trim()||"";
    return{primary:`Happy Birthday${name?`, ${name}`:""}!`,secondary:"Wishing you a wonderful day."};
  }
  const minutes=new Date().getHours()*60+new Date().getMinutes();
  if(minutes>=361&&minutes<=720)return{primary:"Good Morning!",secondary:"Let's make today productive."};
  if(minutes>=721&&minutes<=960)return{primary:"Good Afternoon!",secondary:"Hope your day is going well."};
  if(minutes>=961&&minutes<=1140)return{primary:"Good Evening!",secondary:"Wrapping up for the day?"};
  if(minutes>=1141||minutes<=0)return{primary:"Good Night!",secondary:"Rest well or keep up the great work."};
  if(minutes>=1&&minutes<=180)return{primary:"Hello!",secondary:"Burning the midnight oil, are we?"};
  return{primary:"Early Bird!",secondary:"You're ahead of the game today."};
}
function renderHeaderGreeting(user){
  const wrap=document.getElementById("loginHeaderCopy");
  const primary=document.getElementById("headerGreetingPrimaryText");
  const secondary=document.getElementById("headerGreetingSecondaryText");
  const pc=document.getElementById("headerGreetingPrimaryCursor");
  const sc=document.getElementById("headerGreetingSecondaryCursor");
  if(!wrap||!primary||!secondary||!pc||!sc)return;
  const copy=headerGreetingCopy(user);
  if(user){ stopLoginGreetingTyping();primary.textContent=copy.primary;secondary.textContent=copy.secondary;pc.classList.remove("is-visible");sc.classList.remove("is-visible");return; }
  const signature=`${copy.primary}|${copy.secondary}|${document.body.classList.contains("theme-dark")?"dark":"light"}`;
  if(signature===loginGreetingSignature)return;
  loginGreetingSignature=signature;loginGreetingToken++;
  const token=loginGreetingToken;
  loginGreetingTimers.forEach(t=>clearTimeout(t));loginGreetingTimers=[];
  primary.textContent="";secondary.textContent="";pc.classList.add("is-visible");sc.classList.remove("is-visible");
  const wait=ms=>new Promise(resolve=>{ const t=window.setTimeout(()=>{ loginGreetingTimers=loginGreetingTimers.filter(i=>i!==t); if(token===loginGreetingToken)resolve(); },ms); loginGreetingTimers.push(t); });
  const type=async(el,cursorEl,text)=>{ cursorEl.classList.add("is-visible"); const chars=Array.from(text); for(let i=0;i<=chars.length;i++){ if(token!==loginGreetingToken)return; el.textContent=chars.slice(0,i).join(""); if(i<chars.length)await wait(34); } };
  (async()=>{ await type(primary,pc,copy.primary); if(token!==loginGreetingToken)return; await wait(240); if(token!==loginGreetingToken)return; await type(secondary,sc,copy.secondary); if(token!==loginGreetingToken)return; pc.classList.remove("is-visible");sc.classList.remove("is-visible"); })();
}
function ghostWait(ms,token){ return new Promise(resolve=>{ const t=window.setTimeout(()=>{ ghostTypingTimers=ghostTypingTimers.filter(i=>i!==t); if(token===ghostTypingToken)resolve(); },ms); ghostTypingTimers.push(t); }); }
async function typeGhostLine(lineEl,textEl,cursorEl,text,token){
  if(!lineEl||!textEl||!cursorEl||token!==ghostTypingToken)return;
  lineEl.classList.remove("ghost-line-fading");lineEl.classList.add("ghost-line-active");
  textEl.textContent="";cursorEl.classList.add("is-visible");
  const chars=Array.from(text);
  for(let i=0;i<=chars.length;i++){ if(token!==ghostTypingToken)return; textEl.textContent=chars.slice(0,i).join(""); if(i<chars.length)await ghostWait(42,token); }
}
function renderGhostPrimaryMarkup(textEl, prefix, name, suffix=""){
  if(!textEl)return;
  const safePrefix=String(prefix||"").trim();
  const safeName=String(name||"").trim();
  const safeSuffix=String(suffix||"").trim();
  const suffixText=safeSuffix?` ${safeSuffix}`:"";
  textEl.innerHTML = `<span class="ghost-greeting-prefix">${safePrefix}</span><span class="ghost-greeting-name"> ${safeName}</span><span class="ghost-greeting-suffix">${suffixText}</span>`;
}
async function fadeGhostLine(lineEl,cursorEl,token){
  if(!lineEl||!cursorEl||token!==ghostTypingToken)return;
  lineEl.classList.add("ghost-line-fading");cursorEl.classList.remove("is-visible");
  await ghostWait(520,token);lineEl.classList.remove("ghost-line-active","ghost-line-fading");
}
function renderGhostTyping(user){
  const canvas=document.getElementById("ghostCanvas");
  const pL=document.getElementById("ghostPrimaryLine");const sL=document.getElementById("ghostSecondaryLine");
  const pT=document.getElementById("ghostPrimaryText");const sT=document.getElementById("ghostSecondaryText");
  const pC=document.getElementById("ghostPrimaryCursor");const sC=document.getElementById("ghostSecondaryCursor");
  if(!canvas||!pL||!sL||!pT||!sT||!pC||!sC)return;
  if(!user){stopGhostTyping();return;}
  const copy=ghostTypingCopy(user);
  const signature=`${user.employeeId}|${copy.primaryPrefix||""}|${copy.primaryName||""}|${copy.primarySuffix||""}|${copy.secondary.join("|")}|${document.body.classList.contains("theme-dark")?"dark":"light"}`;
  if(signature===ghostTypingSignature)return;
  ghostTypingSignature=signature;ghostTypingToken++;
  const token=ghostTypingToken;
  canvas.classList.remove("hidden");
  pL.classList.remove("ghost-line-active","ghost-line-fading");sL.classList.remove("ghost-line-active","ghost-line-fading");
  pT.textContent="";sT.textContent="";pC.classList.remove("is-visible");sC.classList.remove("is-visible");
  (async()=>{
    const primaryPrefix=copy.primaryPrefix||"";
    const primaryName=copy.primaryName||"";
    const primarySuffix=copy.primarySuffix||"";
    const typedPrimary=primarySuffix ? `${primaryPrefix} ${primaryName}${primarySuffix}` : `${primaryPrefix} ${primaryName}`;
    await typeGhostLine(pL,pT,pC,typedPrimary,token); if(token!==ghostTypingToken)return;
    renderGhostPrimaryMarkup(pT, primaryPrefix, primaryName, primarySuffix); if(token!==ghostTypingToken)return;
    await ghostWait(700,token); if(token!==ghostTypingToken)return;
    const phrases=copy.secondary.length?copy.secondary:["METRO GROUP SYSTEMS LIVE"];
    let idx=0;
    while(token===ghostTypingToken){
      const phrase=phrases[idx%phrases.length];
      await typeGhostLine(sL,sT,sC,phrase,token); if(token!==ghostTypingToken)return;
      await ghostWait(2200,token); if(token!==ghostTypingToken)return;
      await fadeGhostLine(sL,sC,token); if(token!==ghostTypingToken)return;
      idx++;sT.textContent="";sL.classList.remove("ghost-line-active","ghost-line-fading");
    }
  })();
}
function initThemeToggle(){
  document.getElementById("sidebarThemeLight")?.addEventListener("click",()=>applyTheme("light"));
  document.getElementById("sidebarThemeDark")?.addEventListener("click",()=>applyTheme("dark"));
}

// ─── Toast / UI feedback ──────────────────────────────────────
function showToast(title,text){
  const toast=document.createElement("div");toast.className="success-toast";
  toast.innerHTML=`<div class="success-toast-card"><div class="success-check"></div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(text)}</p></div>`;
  document.body.appendChild(toast);window.setTimeout(()=>toast.remove(),1800);
}
function animateActionSuccess(button){
  if(!button)return;
  button.classList.remove("action-click-success");void button.offsetWidth;button.classList.add("action-click-success");
  window.setTimeout(()=>button.classList.remove("action-click-success"),650);
}

// ─── Nav / section helpers ────────────────────────────────────
function navIconForItem(itemId){
  const icons={
    darSection:'<i class="fa-solid fa-layer-group"></i>',
    tasksSection:'<i class="fa-solid fa-list-check"></i>',
    historySection:'<i class="fa-regular fa-clock"></i>',
    subordinateSection:'<i class="fa-solid fa-users"></i>',
    teamReportsSection:'<i class="fa-solid fa-user-group"></i>',
    orgOverviewSection:'<i class="fa-solid fa-chart-line"></i>',
    complianceSection:'<i class="fa-solid fa-magnifying-glass"></i>',
    workAnalyticsSection:'<i class="fa-solid fa-chart-pie"></i>',
    globalTaskSection:'<i class="fa-solid fa-flag"></i>',
    emailReminderSection:'<i class="fa-regular fa-envelope"></i>',
    userManagementSection:'<i class="fa-solid fa-gear"></i>',
    leaveSection:'<i class="fa-solid fa-plane-departure"></i>'
  };
  return icons[itemId]||'<i class="fa-solid fa-circle"></i>';
}
function navConfig(user){
  if(isAdmin(user))return[{id:"orgOverviewSection",label:"Overview"},{id:"complianceSection",label:"DAR Review"},{id:"workAnalyticsSection",label:"Work Analysis"},{id:"leaveSection",label:"Leave"},{id:"userManagementSection",label:"User Management"},{id:"emailReminderSection",label:"Email Reminders"}];
  if(isLevel1(user))return[{id:"orgOverviewSection",label:"Overview"},{id:"complianceSection",label:"DAR Review"},{id:"workAnalyticsSection",label:"Work Analysis"},{id:"leaveSection",label:"Leave"},{id:"globalTaskSection",label:"Task Assign"},{id:"emailReminderSection",label:"Email Reminders"},{id:"historySection",label:"History"}];
  if(isLevel2(user)) {
    const items = [{id:"darSection",label:"DAR"},{id:"leaveSection",label:"Leave"},{id:"tasksSection",label:"My Tasks"},{id:"historySection",label:"History"}];
    if (canUseCompliance(user)) {
      items.splice(1, 0, {id:"complianceSection",label:"DAR Review"});
    }
    return items;
  }
  return[{id:"darSection",label:"DAR"},{id:"leaveSection",label:"Leave"},{id:"tasksSection",label:"My Tasks"},{id:"historySection",label:"History"}];
}
function defaultSectionForUser(user){
  if(isAdmin(user))return"userManagementSection";
  if(isLevel1(user))return"orgOverviewSection";
  return"darSection";
}
function setHeaderState(loggedIn){
  document.body.classList.toggle("portal-logged-in",loggedIn);
  const dashboard=document.getElementById("portalDashboard");
  const gate=document.getElementById("portalGate");
  const slideshow=document.querySelector(".login-slideshow");
  if(dashboard)dashboard.classList.toggle("hidden",!loggedIn);
  if(gate)gate.classList.toggle("hidden",loggedIn);
  if(slideshow)slideshow.style.display=loggedIn?"none":"";
  document.getElementById("announcementPopover")?.classList.add("hidden");
  document.getElementById("profileMenu")?.classList.add("hidden");
  renderHeaderGreeting(loggedIn?activeUser():null);
  if(!loggedIn&&isMobileViewport())setMobileLoginTab("signin");
}
function showSection(sectionId){
  const user=activeUser();
  if(sectionId==="workAnalyticsSection" && !canUseAnalytics(user)){
    sectionId=defaultSectionForUser(user);
  }
  document.querySelectorAll("#portalDashboard .content-stack > section.panel").forEach(s=>s.classList.toggle("hidden",s.id!==sectionId));
  activeSectionId=sectionId;
  if(user){
    renderSidebar(user);
    syncMobileChrome(user);
    const floatingBar = document.getElementById("darFloatingSubmitBar");
    if (floatingBar) {
      floatingBar.classList.toggle("hidden", sectionId !== "darSection" || darViewMode === "team");
    }
    if (sectionId === "workAnalyticsSection") {
      renderWorkAnalytics(user);
    }
  }
  if(isMobileViewport())setMobileDrawerState(false);
}

// ─── Format & Quick Points Helpers ────────────────────────────
function formatMinutesToPadHours(mins) {
  const m = Math.max(0, Number(mins) || 0);
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(hh).padStart(2, '0')}h ${String(mm).padStart(2, '0')}m`;
}

function formatTimeAmPm(dateInput) {
  const d = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(d.getTime())) return "";
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? String(hours).padStart(2, '0') : '12';
  return `${hours}:${minutes} ${ampm}`;
}

function formatFileSize(bytes) {
  if (!bytes) return "0 KB";
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function getAllQuickPoints(user) {
  return (user && Array.isArray(user.customTemplates)) ? user.customTemplates : [];
}

function renderQuickPointsDropdown(user, filterText = "") {
  const listEl = document.getElementById("quickPointsOptionsList");
  if (!listEl) return;
  const customList = getAllQuickPoints(user);
  const filtered = filterText ? customList.filter(p => p.toLowerCase().includes(filterText.toLowerCase())) : customList;
  
  if (!customList.length) {
    listEl.innerHTML = `<div style="padding:14px; color:var(--muted); font-size:0.85rem; text-align:center;">No quick points added yet.<br>Click <strong>+ Add Quick Point</strong> above to create one.</div>`;
    return;
  }

  if (!filtered.length) {
    listEl.innerHTML = `<div style="padding:12px; color:var(--muted); font-size:0.85rem; text-align:center;">No quick points match your search.</div>`;
    return;
  }

  listEl.innerHTML = filtered.map(item => {
    return `
      <div class="dar-quick-option" data-quick-text="${escapeHtml(item)}">
        <span style="flex:1;">${escapeHtml(item)}</span>
        <button type="button" class="dar-delete-template-btn" data-delete-custom-template="${escapeHtml(item)}" title="Delete quick point"><i class="fa-solid fa-trash-can"></i></button>
      </div>
    `;
  }).join("");

  listEl.querySelectorAll(".dar-quick-option").forEach(opt => {
    opt.addEventListener("click", (e) => {
      if (e.target.closest("[data-delete-custom-template]")) return;
      const text = opt.getAttribute("data-quick-text") || "";
      const input = document.getElementById("pointInput");
      if (input) {
        input.value = text;
        const count = document.getElementById("pointCharCount");
        if (count) count.textContent = `${text.length} / 600`;
        const wrap = document.getElementById("quickPointsSelectWrap");
        const menu = document.getElementById("quickPointsDropdownMenu");
        if (wrap) wrap.classList.remove("open");
        if (menu) menu.classList.add("hidden");
        const autoMenu = document.getElementById("darAutocompleteMenu");
        if (autoMenu) autoMenu.classList.add("hidden");
        if (user) saveCurrentDraftFromInputs(user);
        input.focus();
      }
    });
  });

  listEl.querySelectorAll("[data-delete-custom-template]").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const text = btn.getAttribute("data-delete-custom-template");
      if (!text) return;
      if (!window.confirm(`Delete the custom quick point "${text}"?`)) return;
      if (user) {
        user.customTemplates = (user.customTemplates || []).filter(t => t !== text);
        await cloudSaveUser(user);
        showToast("Quick Point Deleted", `Removed "${text}".`);
        renderQuickPointsDropdown(user, document.getElementById("quickPointsSearchInput")?.value || "");
      }
    });
  });
}

function updateDarAutocomplete(user) {
  const input = document.getElementById("pointInput");
  const menu = document.getElementById("darAutocompleteMenu");
  const count = document.getElementById("pointCharCount");
  if (!input || !menu) return;
  const val = input.value || "";
  if (count) count.textContent = `${val.length} / 600`;
  
  const q = val.trim();
  if (q.length < 1) {
    menu.classList.add("hidden");
    menu.innerHTML = "";
    return;
  }

  const all = getAllQuickPoints(user);
  const qLower = q.toLowerCase();
  const matches = all.filter(item => item.toLowerCase().includes(qLower));

  if (!matches.length) {
    menu.classList.add("hidden");
    menu.innerHTML = "";
    return;
  }

  menu.innerHTML = matches.slice(0, 5).map(item => {
    const idx = item.toLowerCase().indexOf(qLower);
    let html = escapeHtml(item);
    if (idx >= 0) {
      const before = escapeHtml(item.substring(0, idx));
      const match = escapeHtml(item.substring(idx, idx + q.length));
      const after = escapeHtml(item.substring(idx + q.length));
      html = `${before}<mark style="background: #ffe8cc; color: #d9480f; padding: 0 2px; border-radius: 2px;">${match}</mark>${after}`;
    }
    return `<div class="dar-autocomplete-item" data-autocomplete-text="${escapeHtml(item)}">${html}</div>`;
  }).join("");

  menu.classList.remove("hidden");

  menu.querySelectorAll(".dar-autocomplete-item").forEach(itemEl => {
    itemEl.addEventListener("mousedown", (e) => {
      e.preventDefault();
      const text = itemEl.getAttribute("data-autocomplete-text") || "";
      input.value = text;
      if (count) count.textContent = `${text.length} / 600`;
      menu.classList.add("hidden");
      menu.innerHTML = "";
      if (user) saveCurrentDraftFromInputs(user);
      input.focus();
    });
  });
}

function syncTimePillsFromInputs() {
  const h = Number(document.getElementById("pointHours")?.value || 0);
  const m = Number(document.getElementById("pointMinutes")?.value || 0);
  const totalMins = (h * 60) + m;
  const pills = document.querySelectorAll("#darTimePills .dar-pill");
  pills.forEach(pill => {
    const pMins = pill.getAttribute("data-mins");
    if (pMins === "custom") {
      pill.classList.toggle("active", ![15, 30, 45, 60, 120].includes(totalMins) || (h === 0 && m === 0));
    } else {
      pill.classList.toggle("active", Number(pMins) === totalMins && (h > 0 || m > 0));
    }
  });
}

function fillDatalists(viewer){
  const allList=document.getElementById("userSearchList");
  if(allList)allList.innerHTML=assignableTaskTargets(viewer).map(u=>`<option value="${escapeHtml(`${u.name} [${u.employeeId}]`)}"></option>`).join("");
  const subList=document.getElementById("subordinateSearchList");
  if(subList){const subs=viewer?assignableTaskTargets(viewer):[];subList.innerHTML=subs.map(u=>`<option value="${escapeHtml(`${u.name} [${u.employeeId}]`)}"></option>`).join("");}
  const reminderList=document.getElementById("emailReminderSearchList");
  if(reminderList)reminderList.innerHTML=reminderEligibleEmployees(viewer).map(u=>`<option value="${escapeHtml(`${u.name} [${u.employeeId}]`)}"></option>`).join("");
}

// ─── Sidebar render ───────────────────────────────────────────
function renderSidebar(user){
  const nav=document.getElementById("roleNav");
  const meta=document.getElementById("portalUserMeta");
  const nameEl=document.getElementById("portalUserName");
  if(!user||!nav||!meta||!nameEl)return;
  nameEl.textContent=user.name;nameEl.style.cursor="default";nameEl.title=user.name;
  meta.innerHTML=`<div>${escapeHtml(user.employeeId)}</div><div>${escapeHtml(ROLE_LABELS[user.level]||user.level)} | ${escapeHtml(user.department)}</div>`;
  const sBtn=document.getElementById("sidebarProfileButton");
  const sAvatar=document.querySelector("#sidebarProfileButton .sidebar-profile-avatar");
  const sLabel=document.getElementById("sidebarProfileLabel");
  if(sAvatar){
    sAvatar.style.backgroundImage="";
    sAvatar.textContent=profileInitials(user.name,user.employeeId);
  }
  if(sBtn)sBtn.title=`${user.name} profile`;
  if(sLabel)sLabel.textContent="View account";
  nav.innerHTML=navConfig(user).map(item=>`<button type="button" class="nav-item-with-icon ${item.id===activeSectionId?"active-section":""}" data-target="${item.id}" title="${escapeHtml(item.label)}" aria-label="${escapeHtml(item.label)}"><span aria-hidden="true" class="nav-item-icon">${navIconForItem(item.id)}</span><span>${escapeHtml(item.label)}</span></button>`).join("");
  nav.querySelectorAll("button[data-target]").forEach(btn=>btn.addEventListener("click",()=>{showSection(btn.dataset.target);renderPortal();if(isMobileViewport())setMobileDrawerState(false);}));
  const sp=document.getElementById("sidebarDarStreamPanel");
  const show=activeSectionId==="darSection";
  if(sp)sp.classList.toggle("hidden",!show);
  if(show)renderSidebarDarStream(user);
  syncMobileChrome(user);
}

// ─── Announcement bell ────────────────────────────────────────
function renderAnnouncementBell(user){
  const button=document.getElementById("announcementsToggle");
  const badge=document.getElementById("announcementsBadge");
  const popover=document.getElementById("announcementPopover");
  if(!button||!badge||!popover||!user)return;
  const items=headerAlertsForUser(user).slice(0,6);
  const unread=unreadHeaderAlertCount(user);
  badge.textContent=unread>99?"99+":String(unread);badge.classList.toggle("hidden",unread<=0);
  button.classList.toggle("has-notifications",unread>0);
  button.title=unread>0?`${unread} new notification${unread===1?"":"s"}`:"No new notifications";
  button.setAttribute("aria-label",button.title);
  popover.innerHTML=items.length?`
    <div class="announcement-popover-head"><strong>Notifications</strong><span>${unread>0?`${unread} new`:"Up to date"}</span></div>
    <div class="announcement-popover-list">${items.map(i=>`<button type="button" class="announcement-popover-item announcement-popover-item-${escapeHtml(i.kind)}" data-open-notification="${escapeHtml(i.id)}" data-report-id="${escapeHtml(i.reportId)}" data-kind="${escapeHtml(i.kind)}"><div class="announcement-popover-item-head"><strong>${escapeHtml(i.title||"Alert")}</strong><span class="announcement-popover-kind">${escapeHtml(i.kind==="announcement"?"Metro Daily":"DAR")}</span></div><p>${escapeHtml(i.message)}</p><span>${escapeHtml(formatDateTime(i.createdAt))}</span></button>`).join("")}</div>
    <div class="announcement-popover-actions"><button type="button" class="button button-secondary" id="openMetroDailyButton">Open Feed</button></div>
  `:`<div class="announcement-popover-head"><strong>Notifications</strong><span>Nothing new right now</span></div><p class="announcement-popover-empty">DAR reminders, feedback, and Metro Daily updates will appear here.</p>`;
  const isOpen=!popover.classList.contains("hidden");
  button.classList.toggle("active-mode",isOpen);
  popover.querySelector("#openMetroDailyButton")?.addEventListener("click",()=>{showSection("newsSection");popover.classList.add("hidden");renderPortal();document.getElementById("newsSection")?.scrollIntoView({behavior:"smooth",block:"start"});});
  popover.querySelectorAll("[data-open-notification]").forEach(btn=>{
    btn.addEventListener("click",()=>{ const item=items.find(i=>i.id===btn.getAttribute("data-open-notification")); if(!item)return; popover.classList.add("hidden"); openNotificationItem(item); });
  });
}
function toggleAnnouncementPopover(){
  const popover=document.getElementById("announcementPopover");const user=activeUser();
  if(!popover||!user)return;
  const willOpen=popover.classList.contains("hidden");
  popover.classList.toggle("hidden");document.getElementById("profileMenu")?.classList.add("hidden");
  if(willOpen){markHeaderAlertsSeen(user.employeeId);renderPortal();}
}
function toggleProfileMenu(){
  const menu=document.getElementById("profileMenu");const user=activeUser();
  if(!menu||!user)return;
  const isHidden=menu.classList.contains("hidden");
  document.getElementById("announcementPopover")?.classList.add("hidden");
  menu.classList.toggle("hidden");if(isHidden)renderPortal();
}

// ─── Sidebar DAR stream & Modern DAR Widgets ──────────────────
function renderSidebarDarStream(user){
  if(!user) return;
  const draft = getDraft(user);
  
  // Calculate total time worked today (draft points + submitted today report)
  const dDate = document.getElementById("darDate")?.value || today();
  const rpt = reports().find(r => r.employeeId === user.employeeId && r.date === dDate);
  const rMins = rpt ? reportTotalMinutes(rpt) : 0;
  let dMins = 0;
  let attCount = 0;
  (draft.points || []).forEach(p => {
    const pts = parseDurationParts(p.totalTime);
    dMins += (Number(pts.hours) || 0) * 60 + (Number(pts.minutes) || 0);
    if (p.attachmentName || p.attachmentData) attCount++;
  });
  const tMins = rMins + dMins;
  
  // 1. Update Today's Progress tile
  const progressDisplay = document.getElementById("todayWorkedTotalDisplay");
  if (progressDisplay) progressDisplay.textContent = formatMinutesToPadHours(tMins);
  
  const timeSpanLegacy = document.getElementById("darTotalTimeToday");
  if (timeSpanLegacy) timeSpanLegacy.textContent = tMins ? `${Math.floor(tMins / 60)}h ${tMins % 60}m` : '0m';

  // 2. Update Today's Statistics tile
  const ptsAddedEl = document.getElementById("statPointsAdded");
  if (ptsAddedEl) ptsAddedEl.textContent = String(draft.points.length);
  
  const statTotalEl = document.getElementById("statTotalTime");
  if (statTotalEl) statTotalEl.textContent = formatMinutesToPadHours(dMins);
  
  const statAttEl = document.getElementById("statAttachments");
  if (statAttEl) statAttEl.textContent = String(attCount);
  
  const statAvgEl = document.getElementById("statAvgTime");
  if (statAvgEl) {
    const avgMins = draft.points.length ? Math.round(dMins / draft.points.length) : 0;
    statAvgEl.textContent = avgMins >= 60 ? `${Math.floor(avgMins / 60)}h ${avgMins % 60}m` : `${avgMins}m`;
  }

  // 3. Update Submit Button Points Summary
  const submitSummary = document.getElementById("submitPointsSummary");
  if (submitSummary) {
    submitSummary.textContent = `${draft.points.length} Points • Total time ${formatMinutesToPadHours(dMins)}`;
  }
  const floatingBar = document.getElementById("darFloatingSubmitBar");
  const floatingSummary = document.getElementById("floatingPointsSummary");
  if (floatingBar) {
    const isDarActive = (typeof activeSectionId !== 'undefined' && activeSectionId === "darSection");
    floatingBar.classList.toggle("hidden", !isDarActive || (typeof darViewMode !== 'undefined' && darViewMode === "team"));
  }
  if (floatingSummary) {
    floatingSummary.textContent = `${draft.points.length} Points • Total time ${formatMinutesToPadHours(dMins)}`;
  }

  // 4. Update Live DAR Timeline List & Empty state
  const timelineEmpty = document.getElementById("darTimelineEmpty");
  const timelineList = document.getElementById("darTimelineList");
  if (timelineEmpty && timelineList) {
    if (!draft.points.length) {
      timelineEmpty.classList.remove("hidden");
      timelineList.classList.add("hidden");
      timelineList.innerHTML = "";
    } else {
      timelineEmpty.classList.add("hidden");
      timelineList.classList.remove("hidden");
      timelineList.innerHTML = draft.points.map((point, idx) => {
        const isNew = point.id === latestSidebarDraftPointId;
        const durParts = parseDurationParts(point.totalTime);
        const h = Number(durParts.hours) || 0;
        const m = Number(durParts.minutes) || 0;
        let durStr = "0m";
        if (h > 0 && m > 0) durStr = `${h}h ${m}m`;
        else if (h > 0) durStr = `${h}h`;
        else if (m > 0) durStr = `${m}m`;
        const timeStamp = formatTimeAmPm(point.createdAt || point.updatedAt);

        return `
          <div class="dar-timeline-entry ${isNew ? 'point-live-card-new' : ''}">
            <div class="dar-timeline-stamp-col">
              <span class="dar-timeline-time-text">${escapeHtml(timeStamp)}</span>
              <span class="dar-timeline-dot ${isNew ? 'is-new-red' : ''}"></span>
            </div>
            <div class="dar-timeline-item-card">
              <strong class="dar-timeline-title">${idx + 1}. ${escapeHtml(point.rawText || point.text.replace(/^\d+\.\s*/, ''))}</strong>
              <div class="dar-timeline-meta-row">
                <span class="dar-timeline-time-pill"><i class="fa-regular fa-clock"></i> ${escapeHtml(durStr)}</span>
                ${point.attachmentName ? `<span class="dar-timeline-att-badge"><i class="fa-solid fa-paperclip"></i> ${escapeHtml(point.attachmentName)}</span>` : ''}
              </div>
              <div class="dar-timeline-actions-row">
                <button type="button" class="dar-timeline-action-btn edit" data-edit-draft-point="${escapeHtml(point.id)}"><i class="fa-regular fa-pen-to-square"></i> Edit</button>
                <button type="button" class="dar-timeline-action-btn delete" data-delete-draft-point="${escapeHtml(point.id)}"><i class="fa-regular fa-trash-can"></i> Delete</button>
              </div>
            </div>
          </div>
        `;
      }).join("");

      // If a newly added point dot is red, transition it to green after 2 seconds
      const newDots = timelineList.querySelectorAll(".dar-timeline-dot.is-new-red");
      if (newDots.length > 0) {
        window.setTimeout(() => {
          newDots.forEach(d => d.classList.remove("is-new-red"));
          latestSidebarDraftPointId = "";
        }, 2000);
      }

      timelineList.querySelectorAll("[data-edit-draft-point]").forEach(btn => {
        btn.addEventListener("click", () => startDraftPointEdit(user, btn.getAttribute("data-edit-draft-point") || ""));
      });
      timelineList.querySelectorAll("[data-delete-draft-point]").forEach(btn => {
        btn.addEventListener("click", () => deleteDraftPoint(user, btn.getAttribute("data-delete-draft-point") || ""));
      });
    }
  }

  // Legacy container support
  const desktopContainer = document.getElementById("sidebarDarStream");
  const mobileContainer = document.getElementById("mobileDarStream");
  const containers = [desktopContainer, mobileContainer].filter(Boolean);
  if (containers.length) {
    if (!draft.points.length) {
      containers.forEach(container => {
        container.className = "stack-list empty-state";
        container.textContent = "Added DAR points will appear here instantly.";
      });
    } else {
      const html = draft.points.map(point => {
        const isNew = point.id === latestSidebarDraftPointId;
        return `<article class="assignment-card point-live-card ${isNew ? "point-live-card-new" : ""}"><header><strong>${escapeHtml(point.text)}</strong><span class="status-pill">${escapeHtml(relativeTimeFromNow(point.createdAt))}</span></header><p>${escapeHtml(formatPointMeta(point))}</p><div class="action-row"><button type="button" class="compact-button" data-edit-draft-point="${escapeHtml(point.id)}">Edit</button><button type="button" class="compact-button action-reject" data-delete-draft-point="${escapeHtml(point.id)}">Delete</button></div>${isNew ? '<p class="report-point-new">Just now added</p>' : ""}</article>`;
      }).join("");
      containers.forEach(container => {
        container.className = "stack-list sidebar-live-stream";
        container.innerHTML = html;
        container.querySelectorAll("[data-edit-draft-point]").forEach(btn => btn.addEventListener("click", () => startDraftPointEdit(user, btn.getAttribute("data-edit-draft-point") || "")));
        container.querySelectorAll("[data-delete-draft-point]").forEach(btn => btn.addEventListener("click", () => deleteDraftPoint(user, btn.getAttribute("data-delete-draft-point") || "")));
      });
    }
  }

  if (latestSidebarDraftPointId) {
    window.setTimeout(() => {
      latestSidebarDraftPointId = "";
      if (activePortalUserId === user.employeeId) renderSidebarDarStream(user);
    }, 1200);
  }
}

// ─── Email reminder section ───────────────────────────────────
function parseReminderTarget(value,viewer=activeUser()){
  const id=parseEmployeeSelection(value,viewer,"email-reminder");
  if(id)return id;
  const search=String(value||"").trim().toLowerCase();
  if(!search)return "";
  return reminderEligibleEmployees(viewer).find(u=>employeeMatchesSearch(u,search))?.employeeId||"";
}
function reminderTargetEmployees(viewer,reminderDate){
  const submitted=new Set(reports().filter(r=>r.date===reminderDate).map(r=>r.employeeId));
  return reminderEligibleEmployees(viewer).map(u => ({
     ...u,
     hasSubmitted: submitted.has(u.employeeId)
  })).sort((a,b)=>String(a.name||"").localeCompare(String(b.name||"")));
}
function selectedReminderEmployees(viewer){
  const reminderDate=String(document.getElementById("emailReminderDate")?.value||today());
  const allTargets = reminderTargetEmployees(viewer,reminderDate);
  const validIds=new Set(allTargets.map(u=>u.employeeId));
  [...selectedReminderEmployeeIds].forEach(id=>{if(!validIds.has(id))selectedReminderEmployeeIds.delete(id);});
  return allTargets.filter(u=>selectedReminderEmployeeIds.has(u.employeeId));
}
function professionalReminderBody(employee,viewer,reminderDate,note){
  const formattedDate = reminderDate ? formatDate(reminderDate) : formatDate(yesterdayKey());
  const extra = String(note || "").trim();
  const isYesterday = reminderDate === yesterdayKey();
  const dateContext = isYesterday ? `yesterday (${formattedDate})` : `the scheduled date (${formattedDate})`;
  return [
    "Dear Team Member,",
    "",
    `This is an official compliance notification from Metro Pulse DAR Portal that our records indicate you missed submitting your Daily Activity Report (DAR) for ${dateContext}.`,
    "",
    "Important Policy Notice:",
    "• In accordance with organizational compliance policy, once the daily submission window has closed, DAR reports for missed past dates are locked and cannot be filled retroactively.",
    "",
    "Leave & Absence Filing:",
    `• If your absence on ${formattedDate} was due to an approved leave, official tour, or external field duty, please submit your leave request through the 'Leave' page on the portal immediately so that your attendance and compliance records are updated accurately.`,
    "• Please ensure strict adherence to logging your daily activities on time every day going forward.",
    "",
    extra ? `Additional Note from Management:\n${extra}\n` : "",
    "Portal Link: https://pulse.metrogroup.local",
    "",
    "Best regards,",
    "Metro Group Operations & Management Team"
  ].filter(line=>line!==null&&line!==undefined).join("\n");
}
function reminderBulkBody(employees,viewer,reminderDate,note){
  return professionalReminderBody(employees[0], viewer, reminderDate, note);
}
async function sendYesterdayMissedDarReminder(viewer = activeUser()) {
  if (!viewer || !canUseEmailReminders(viewer)) {
    showToast("Access Restricted", "You do not have permission to send email reminders.");
    return;
  }

  const yDate = yesterdayKey();
  showToast("Scanning Yesterday's DARs...", `Checking submissions for ${formatDate(yDate)}`);

  if (typeof fetchReportsForDates === "function") {
    await fetchReportsForDates([yDate]);
  }

  const eligible = reminderEligibleEmployees(viewer); // Strictly excludes Level 1 & Admin
  const submittedSet = new Set(reports().filter(r => r.date === yDate).map(r => r.employeeId));
  
  const missedEmployees = eligible.filter(emp => {
    if (submittedSet.has(emp.employeeId)) return false;
    const leave = typeof leaveForDateAndUser === "function" ? leaveForDateAndUser(yDate, emp.employeeId) : null;
    if (leave && leave.leaveType !== "half") return false;
    return true;
  });

  if (missedEmployees.length === 0) {
    showToast("All Caught Up!", `Great news! All eligible employees submitted DAR for yesterday (${formatDate(yDate)}).`);
    return;
  }

  const withEmail = missedEmployees.filter(emp => String(emp.email || "").trim());
  const missingEmail = missedEmployees.filter(emp => !String(emp.email || "").trim());

  if (withEmail.length === 0) {
    window.alert(`Found ${missedEmployees.length} employee(s) who missed yesterday's DAR, but none have a registered office email.`);
    return;
  }

  const subject = `Action Required: Missed Daily Activity Report (DAR) for ${formatDate(yDate)} - Metro Group`;
  const mailtoUrl = buildOutlookMailtoUrl(withEmail, viewer, subject, yDate, "");

  const logs = reminderLogEntriesForSend(withEmail, viewer, "yesterday-missed-bcc", subject, yDate);
  cloudAddReminderLogs(logs).then(() => {
    if (activeSectionId === "emailReminderSection") renderEmailReminders(viewer);
  });

  const dateInput = document.getElementById("emailReminderDate");
  if (dateInput) dateInput.value = yDate;
  const subjInput = document.getElementById("emailReminderSubject");
  if (subjInput) subjInput.value = subject;
  selectedReminderEmployeeIds.clear();
  withEmail.forEach(emp => selectedReminderEmployeeIds.add(emp.employeeId));

  window.location.href = mailtoUrl;

  showToast("Email Client Opened", `Prepared reminder for ${withEmail.length} employee(s) who missed yesterday's DAR in BCC.`);
  if (activeSectionId === "emailReminderSection") renderEmailReminders(viewer);
}
function buildOutlookMailtoUrl(employees,viewer,subject,reminderDate,note){
  const emailList = employees.map(u=>String(u.email||"").trim()).filter(Boolean).join(";");
  const greeting = professionalReminderBody(null, viewer, reminderDate, note);
  return `mailto:?bcc=${encodeURIComponent(emailList)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(greeting)}`;
}
function buildOutlookWebComposeUrl(employees,viewer,subject,reminderDate,note){
  const bcc = employees.map(u=>String(u.email||"").trim()).filter(Boolean).join(";");
  const body = professionalReminderBody(null, viewer, reminderDate, note);
  
  // URLSearchParams uses '+'. encodeURIComponent strictly uses '%20'
  const queryString = `bcc=${encodeURIComponent(bcc)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  
  return `https://outlook.office.com/mail/deeplink/compose?${queryString}`;
}
function openOutlookCompose(employees,viewer,subject,reminderDate,note){
  const mailtoUrl=buildOutlookMailtoUrl(employees,viewer,subject,reminderDate,note);
  // We completely skip the Outlook Web Deep Link because Microsoft explicitly blocks the "BCC" parameter in Web Deep Links!
  // We instead use the standard 'mailto:' protocol which flawlessly supports BCC and routes to their default desktop email client.
  window.location.href=mailtoUrl;
  return true;
}
function reminderLogEntriesForSend(employees,viewer,mode,subject,reminderDate){
  const sentAt=nowIso();
  return employees.map((employee,index)=>normalizeReminderLog({
    id:`RMD-${Date.now()}-${index}`,
    sentBy:viewer.employeeId,
    sentByName:viewer.name,
    employeeId:employee.employeeId,
    employeeName:employee.name,
    employeeEmail:employee.email||"",
    reminderDate,
    subject,
    mode,
    sentAt
  }));
}
async function sendEmailReminder(event){
  event.preventDefault();
  const viewer=activeUser();if(!viewer||!canUseEmailReminders(viewer))return;
  const feedback=document.getElementById("emailReminderFeedback");
  const subject=String(document.getElementById("emailReminderSubject")?.value||"Gentle Reminder: Daily Activity Report submission").trim();
  const reminderDate=String(document.getElementById("emailReminderDate")?.value||today());
  const note=String(document.getElementById("emailReminderNote")?.value||"").trim();
  const employees=selectedReminderEmployees(viewer);
  if(!employees.length){if(feedback)feedback.textContent="Select at least one employee before opening Outlook.";return;}
  const missingEmail=employees.filter(u=>!String(u.email||"").trim());
  if(missingEmail.length){if(feedback)feedback.textContent=`Missing office email for: ${missingEmail.map(u=>u.employeeId).join(", ")}.`;return;}
  if(!subject){if(feedback)feedback.textContent="Add a subject before opening Outlook.";return;}
  const openedInNewTab=openOutlookCompose(employees,viewer,subject,reminderDate,note);
  const logs=reminderLogEntriesForSend(employees,viewer,employees.length===1?"selected-single":"selected-multiple",subject,reminderDate);
  cloudAddReminderLogs(logs).then(()=>{
    renderEmailReminders(viewer);
    renderOverview(viewer);
    const nextFeedback=document.getElementById("emailReminderFeedback");
    if(nextFeedback)nextFeedback.textContent=`Reminder logged for ${employees.length} selected employee(s).`;
  });
  showToast("Reminder Prepared",`${employees.length} reminder recipient(s) logged.`);
  renderEmailReminders(viewer);
  const nextFeedback=document.getElementById("emailReminderFeedback");
  if(nextFeedback)nextFeedback.textContent=openedInNewTab
    ? `Opened Outlook compose for ${employees.length} selected employee(s). Review it, then click Send in Outlook.`
    : `If Outlook did not open, allow pop-ups for this portal and click Open Outlook again.`;
}
function downloadReminderReport(user){
  if(!canUseEmailReminders(user))return;
  const rows=[
    ["Employee ID","Employee Name","Office Email","Reminder Date","Sent At","Sent By","Mode","Subject"],
    ...reminderLogs().filter(log=>log.sentBy===user.employeeId).map(log=>[
      log.employeeId,
      log.employeeName,
      log.employeeEmail,
      formatDate(log.reminderDate),
      formatDateTime(log.sentAt),
      log.sentByName||log.sentBy,
      log.mode,
      log.subject
    ])
  ];
  const csv=rows.map(row=>row.map(cell=>`"${String(cell??"").replace(/"/g,'""')}"`).join(",")).join("\n");
  triggerBlobDownload(`metro-email-reminder-report-${today()}.csv`,new Blob([csv],{type:"text/csv;charset=utf-8;"}));
}
function renderEmailReminders(user){
  if(!canUseEmailReminders(user))return;
  const dateInput=document.getElementById("emailReminderDate");
  if(dateInput&&!dateInput.value)dateInput.value=today();
  const reminderDate=String(dateInput?.value||today());
  
  const allTargets = reminderTargetEmployees(user,reminderDate);
  const filteredTargets = allTargets.filter(u => {
      if(emailReminderTabFilter === "pending") return !u.hasSubmitted;
      if(emailReminderTabFilter === "submitted") return u.hasSubmitted;
      return true;
  });

  const query=String(document.getElementById("emailReminderSearch")?.value||"").trim().toLowerCase();
  
  // Attach visible employees to a global or retrieve later for Select All
  // We'll store it on window for easy access by Select All
  window._currentEmailReminderVisible = filteredTargets.filter(employee=>{
    if(!query)return true;
    const hay=[employee.name,employee.employeeId,employee.department,employee.managerName,employee.email].join(" ").toLowerCase();
    return hay.includes(query);
  });
  
  const visible = window._currentEmailReminderVisible;

  const validIds=new Set(allTargets.map(u=>u.employeeId));
  [...selectedReminderEmployeeIds].forEach(id=>{if(!validIds.has(id))selectedReminderEmployeeIds.delete(id);});
  const selected=selectedReminderEmployees(user);
  const summary=document.getElementById("emailReminderSummary");
  if(summary){
    summary.innerHTML=`
      <span><strong>${escapeHtml(String(allTargets.filter(u=>!u.hasSubmitted).length))}</strong> pending DAR</span>
      <span><strong>${escapeHtml(String(selected.length))}</strong> selected</span>
    `;
  }
  
  // Update Tabs
  document.querySelectorAll('#emailReminderTabs button').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-filter') === emailReminderTabFilter);
  });

  const recipientPanel=document.getElementById("emailReminderRecipients");
  if(recipientPanel){
    if(!filteredTargets.length){
      recipientPanel.className="reminder-recipient-panel empty-state";
      recipientPanel.textContent= emailReminderTabFilter === "pending" ? "Everyone has submitted DAR for this date." : "No employees found for this filter.";
    }else if(!visible.length){
      recipientPanel.className="reminder-recipient-panel empty-state";
      recipientPanel.textContent="No employee matches this search.";
    }else{
      recipientPanel.className="reminder-recipient-panel";
      recipientPanel.innerHTML=visible.map(employee=>{
        const checked=selectedReminderEmployeeIds.has(employee.employeeId)?"checked":"";
        const initials=profileInitials(employee.name,employee.employeeId);
        const hasEmail=Boolean(String(employee.email||"").trim());
        const disabled=hasEmail?"":"disabled";
        const emailStatus=hasEmail ? (employee.hasSubmitted ? "Submitted" : "No DAR") : "Email missing";
        const badgeColor = employee.hasSubmitted ? "background:#d3f9d8; color:#2b8a3e;" : "background:#ffe3e3; color:#c92a2a;";
        
        return `
          <label class="reminder-recipient-card ${hasEmail?"":"reminder-recipient-card-disabled"}">
            <input type="checkbox" class="email-reminder-recipient" data-reminder-employee="${escapeHtml(employee.employeeId)}" ${checked} ${disabled}>
            <span class="reminder-recipient-avatar">${escapeHtml(initials)}</span>
            <span class="reminder-recipient-main">
              <span class="reminder-recipient-name">${escapeHtml(employee.name)}</span>
              <span class="reminder-recipient-sub">${escapeHtml(employee.department||"No department")}  ${escapeHtml(employee.managerName||"No manager")}</span>
            </span>
            <span class="reminder-recipient-status" style="${hasEmail ? badgeColor : ''}">${escapeHtml(emailStatus)}</span>
          </label>`;
      }).join("");
      recipientPanel.querySelectorAll(".email-reminder-recipient").forEach(checkbox=>{
        checkbox.addEventListener("change",event=>{
          const empId=event.target.getAttribute("data-reminder-employee");
          if(event.target.checked)selectedReminderEmployeeIds.add(empId);
          else selectedReminderEmployeeIds.delete(empId);
          renderEmailReminders(user);
        });
      });
    }
  }
  const feedback=document.getElementById("emailReminderFeedback");
  if(feedback){
    const missingCount=allTargets.filter(employee=>!String(employee.email||"").trim()).length;
    feedback.textContent=selected.length
      ? `${selected.length} selected employee(s) will be added to Outlook.`
      : missingCount
        ? `Select recipients. (${missingCount} missing office email)`
        : "Choose recipients to prepare the email.";
  }

  const logWrap=document.getElementById("emailReminderLog");
  if(!logWrap)return;
  const logs=reminderLogs().filter(log=>log.sentBy===user.employeeId).sort((a,b)=>new Date(b.sentAt)-new Date(a.sentAt)).slice(0,25);
  if(!logs.length){logWrap.className="table-wrap empty-state";logWrap.textContent="No reminders sent yet.";return;}
  logWrap.className="table-wrap";
  logWrap.innerHTML=`<table><thead><tr><th>Employee</th><th>Email</th><th>Reminder Date</th><th>Sent At</th><th>Mode</th></tr></thead><tbody>${logs.map(log=>`<tr><td><strong>${escapeHtml(log.employeeName)}</strong><br><span class="helper-text">${escapeHtml(log.employeeId)}</span></td><td>${escapeHtml(log.employeeEmail)}</td><td>${escapeHtml(formatDate(log.reminderDate))}</td><td>${escapeHtml(formatDateTime(log.sentAt))}</td><td><span class="status-pill">${escapeHtml(log.mode)}</span></td></tr>`).join("")}</tbody></table>`;
}

// ─── Overview section ─────────────────────────────────────────
function liveReportsForOverview(){ return reports().filter(r=>r.date===today()).sort((a,b)=>new Date(b.submittedAt)-new Date(a.submittedAt)); }

let repDeptFilter = "All";
let repEntityFilter = "All";
let repSearchTerm = "";

function renderReportingStructure() {
  const hierarchy = document.getElementById("organizationHierarchy");
  if (!hierarchy) return;

  const viewer = activeUser();
  if (!viewer) return;

  let targetUsers = users().filter(u => u.level === "2" || u.level === "3");

  if (repDeptFilter !== "All") {
      targetUsers = targetUsers.filter(u => (u.department || "") === repDeptFilter);
  }
  if (repEntityFilter !== "All") {
      targetUsers = targetUsers.filter(u => (u.entity || "") === repEntityFilter);
  }
  if (repSearchTerm) {
      const q = repSearchTerm.toLowerCase();
      targetUsers = targetUsers.filter(u => u.name.toLowerCase().includes(q) || u.employeeId.toLowerCase().includes(q));
  }

  const allDepts = Array.from(new Set(users().map(u => u.department).filter(Boolean)));
  const allEntities = typeof entities === "function" ? entities().map(e => e.name) : [];
  
  const filterHtml = `
    <div class="cred-filter-bar" style="justify-content: flex-start; gap: 1rem; align-items: center; flex-wrap: wrap;">
       <input type="text" id="repSearchInput" class="admin-inline-input" placeholder="Search by name or ID" value="${escapeHtml(repSearchTerm)}" style="min-width: 200px;">
       <select id="repDeptSelect" class="admin-inline-input">
          <option value="All">All Departments</option>
          ${allDepts.map(d => `<option value="${escapeHtml(d)}" ${repDeptFilter===d?"selected":""}>${escapeHtml(d)}</option>`).join("")}
       </select>
       <select id="repEntitySelect" class="admin-inline-input">
          <option value="All">All Entities</option>
          ${allEntities.map(e => `<option value="${escapeHtml(e)}" ${repEntityFilter===e?"selected":""}>${escapeHtml(e)}</option>`).join("")}
       </select>
       <div style="flex:1;"></div>
       <button type="button" class="button button-primary" id="btnExportRep">
          <i class="fa-solid fa-file-excel"></i> Export HRMIS (Excel)
       </button>
    </div>
  `;

  const tableHtml = `
    <div class="admin-user-table-wrap table-wrap" style="margin-top: 1rem;">
      <table class="credential-table">
        <thead>
          <tr>
            <th style="width:36px">#</th>
            <th>Employee ID</th>
            <th>Name</th>
            <th>Entity Name</th>
            <th>Department</th>
            <th>Role</th>
            <th>Work Location</th>
            <th>Work E-Mail</th>
            <th>Official Mobile</th>
            <th>Personal Num</th>
            <th>Operational Manager Name</th>
          </tr>
        </thead>
        <tbody>
          ${targetUsers.length ? targetUsers.map((u, idx) => `
            <tr class="${idx % 2 === 0 ? "" : "cred-row-alt"}">
               <td class="cred-num">${idx + 1}</td>
               <td>${escapeHtml(u.employeeId)}</td>
               <td><button type="button" class="profile-link" data-open-profile="${escapeHtml(u.employeeId)}">${escapeHtml(u.name)}</button></td>
               <td>${escapeHtml(u.entity || "-")}</td>
               <td>${escapeHtml(u.department || "-")}</td>
               <td>${escapeHtml(u.role || "-")}</td>
               <td>${escapeHtml(u.location || "-")}</td>
               <td>${escapeHtml(u.email || "-")}</td>
               <td>${escapeHtml(u.officialPhone || "-")}</td>
               <td>${escapeHtml(u.personalPhone || "-")}</td>
               <td>${escapeHtml(u.managerName || u.managerId || "-")}</td>
            </tr>
          `).join("") : `<tr><td colspan="11" class="empty-state" style="padding:16px;">No users found.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;

  hierarchy.className = "";
  hierarchy.innerHTML = filterHtml + tableHtml;

  document.getElementById("repSearchInput").addEventListener("input", (e) => {
      repSearchTerm = e.target.value;
      renderReportingStructure();
  });
  document.getElementById("repDeptSelect").addEventListener("change", (e) => {
      repDeptFilter = e.target.value;
      renderReportingStructure();
  });
  document.getElementById("repEntitySelect").addEventListener("change", (e) => {
      repEntityFilter = e.target.value;
      renderReportingStructure();
  });
  document.getElementById("btnExportRep")?.addEventListener("click", () => {
    const u = activeUser();
    if (u) exportHRMISExcel(u);
  });
}

function renderOverview(user){
  if(!canUseOrg(user))return;
  const setMetric=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=String(v);};
  const allUsers=users().filter(u=>u.level==="2"||u.level==="3");
  const todayReports=liveReportsForOverview();
  const relTasks=tasks().filter(t=>findUser(t.targetId));
  const completedTasks=relTasks.filter(t=>t.completed).length;
  const submittedTimes=todayReports.map(r=>new Date(r.submittedAt));
  setMetric("level2Count",users().filter(u=>u.level==="2").length);
  setMetric("level3Count",users().filter(u=>u.level==="3").length);
  setMetric("submittedCount",todayReports.length);
  setMetric("reminderSentCount",reminderLogs().filter(log=>log.sentBy===user.employeeId&&String(log.sentAt||"").slice(0,10)===today()).length);
  const avgEl=document.getElementById("avgSubmissionTime");
  if(avgEl){if(submittedTimes.length){const avg=Math.round(submittedTimes.reduce((s,d)=>s+d.getHours()*60+d.getMinutes(),0)/submittedTimes.length);avgEl.textContent=`${String(Math.floor(avg/60)).padStart(2,"0")}:${String(avg%60).padStart(2,"0")}`;}else avgEl.textContent="--";}
  const wcEl=document.getElementById("weeklyComplianceRate");
  if(wcEl){
    const weekDates=datesBetween(dateKeyDaysAgo(6),today()).filter(date=>!isHolidayDate(date));
    const weekly=reports().filter(r=>weekDates.includes(r.date));
    const possible=allUsers.length*Math.max(weekDates.length,1)||1;
    wcEl.textContent=`${Math.min(100,Math.round((weekly.length/possible)*100))}%`;
  }
  const tcEl=document.getElementById("taskCompletionRatio");if(tcEl)tcEl.textContent=`${relTasks.length-completedTasks} / ${completedTasks}`;
  const liveDarStream=document.getElementById("liveDarStream");
  if(liveDarStream){
    if(!todayReports.length){liveDarStream.className="stack-list empty-state pulse-card";liveDarStream.textContent="No submission yet. Today's live DAR stream will appear here automatically.";} 
    else{liveDarStream.className="live-stream-marquee";const cards=todayReports.concat(todayReports).map(r=>{const emp=findUser(r.employeeId);const title=reportDisplayTitle(r);return`<article class="assignment-card"><header><strong class="report-hero-name">${escapeHtml(r.employeeName)}</strong><span class="status-pill">${escapeHtml(relativeTimeFromNow(r.submittedAt))}</span></header>${title?`<p class="report-subtitle">${escapeHtml(title)}</p>`:""}<p>${escapeHtml(r.points[0]?.rawText||"Submitted DAR available to review.")}</p></article>`;}).join("");liveDarStream.innerHTML=`<div class="live-stream-track">${cards}</div>`;}
  }
  renderReportingStructure();
  const overviewTrends=document.getElementById("overviewTrends");
  if(overviewTrends){
    const visibleReports=reports().filter(r=>{const emp=findUser(r.employeeId);return emp&&(emp.level==="2"||emp.level==="3");});
    const startOfWeek=new Date(today());startOfWeek.setDate(startOfWeek.getDate()-startOfWeek.getDay());
    const startOfLastWeek=new Date(startOfWeek);startOfLastWeek.setDate(startOfLastWeek.getDate()-7);
    const startOfMonth=new Date(new Date().getFullYear(),new Date().getMonth(),1);
    const startOfLastMonth=new Date(startOfMonth);startOfLastMonth.setMonth(startOfLastMonth.getMonth()-1);
    const dayCount=visibleReports.filter(r=>r.date===today()).length;
    const ydayCount=visibleReports.filter(r=>r.date===yesterdayKey()).length;
    const weekCount=visibleReports.filter(r=>new Date(r.date).getTime()>=startOfWeek.getTime()).length;
    const lastWeekCount=visibleReports.filter(r=>{const v=new Date(r.date).getTime();return v>=startOfLastWeek.getTime()&&v<startOfWeek.getTime();}).length;
    const monthCount=visibleReports.filter(r=>new Date(r.date).getTime()>=startOfMonth.getTime()).length;
    const lastMonthCount=visibleReports.filter(r=>{const v=new Date(r.date).getTime();return v>=startOfLastMonth.getTime()&&v<startOfMonth.getTime();}).length;
    const visibleReminderLogs=reminderLogs().filter(log=>log.sentBy===user.employeeId);
    const reminderToday=visibleReminderLogs.filter(log=>String(log.sentAt||"").slice(0,10)===today()).length;
    const reminderYesterday=visibleReminderLogs.filter(log=>String(log.sentAt||"").slice(0,10)===yesterdayKey()).length;
    const trendCard=(title,current,previous,suffix="submissions")=>{
      const diff=current-previous;const state=diff>0?"trend-up":diff<0?"trend-down":"trend-flat";const arrow=diff>0?"↑":diff<0?"↓":"→";const progress=Math.max(10,Math.min(100,current*12));
      return`<article class="overview-analytics-card"><div class="overview-analytics-head"><div><p class="section-tag">${escapeHtml(title)}</p><strong>${escapeHtml(current)} ${escapeHtml(suffix)}</strong></div><span class="overview-delta ${state}">${arrow} ${escapeHtml(diff===0?"No change":`${Math.abs(diff)} vs previous`)}</span></div><div class="overview-ring" style="--progress:${progress}%"><span>${escapeHtml(current)}</span></div><p class="helper-text">Auto-updated from live DAR activity.</p></article>`;
    };
    overviewTrends.innerHTML=[trendCard("Daily Trend",dayCount,ydayCount),trendCard("Weekly Trend",weekCount,lastWeekCount,"reports"),trendCard("Monthly Trend",monthCount,lastMonthCount,"reports"),trendCard("Reminder Trend",reminderToday,reminderYesterday,"emails")].join("");

    const entityCounts = {};
    const deptCounts = {};
    todayReports.forEach(r => {
      const emp = findUser(r.employeeId);
      if (emp) {
        if (emp.entity) entityCounts[emp.entity] = (entityCounts[emp.entity] || 0) + 1;
        if (emp.department) deptCounts[emp.department] = (deptCounts[emp.department] || 0) + 1;
      }
    });

    const entityHtml = Object.keys(entityCounts).length ? Object.entries(entityCounts).map(([ent, count]) => `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--line);font-size:0.95rem;"><span>${escapeHtml(ent)}</span><strong>${count}</strong></div>`).join("") : "<p class='helper-text'>No entity submissions today.</p>";
    const deptHtml = Object.keys(deptCounts).length ? Object.entries(deptCounts).map(([dept, count]) => `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--line);font-size:0.95rem;"><span>${escapeHtml(dept)}</span><strong>${count}</strong></div>`).join("") : "<p class='helper-text'>No department submissions today.</p>";

    overviewTrends.innerHTML += `<div style="grid-column: 1 / -1; display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:24px; margin-top: 12px;">
      <div class="panel" style="padding:16px;">
        <h4 style="margin-bottom:12px; font-weight:600; color:var(--text);">Entity-wise Submissions (Today)</h4>
        ${entityHtml}
      </div>
      <div class="panel" style="padding:16px;">
        <h4 style="margin-bottom:12px; font-weight:600; color:var(--text);">Department-wise Submissions (Today)</h4>
        ${deptHtml}
      </div>
    </div>`;
  }
}

// ─── Profile section ──────────────────────────────────────────
function openProfile(employeeId){
  const user=activeUser();if(!user||!employeeId)return;
  const target=findUser(employeeId);if(!target)return;
  selectedProfileEmployeeId=target.employeeId;showSection("profileSection");renderPortal();
}
function renderProfileSection(viewer){
  const title=document.getElementById("profileSectionTitle");
  const note=document.getElementById("profileSectionNote");
  const searchPanel=document.getElementById("profileSearchPanel");
  const form=document.getElementById("profileForm");
  if(!title||!note||!searchPanel||!form||!viewer)return;
  const target=findUser(selectedProfileEmployeeId)||viewer;
  const profile=profileDefaults(target);
  const editable=target.employeeId===viewer.employeeId&&!isLevel1(viewer);
  const fieldState=editable?"":"readonly";
  const recentReports=reports().filter(r=>r.employeeId===target.employeeId).sort((a,b)=>new Date(b.submittedAt||b.date)-new Date(a.submittedAt||a.date)).slice(0,3);
  const submissionCount=reportSubmissionCount(target.employeeId);
  const latestReport=recentReports[0]||null;
  const canSearchProfiles=isAdmin(viewer)||isLevel1(viewer)||canUseCompliance(viewer);
  title.textContent=target.employeeId===viewer.employeeId?"My Account":`${target.name}'s Profile`;
  note.textContent=target.employeeId===viewer.employeeId?(editable?"You can update your contact details and About Myself section.":"Your account is view-only in this role."):"Read-only profile view.";
  if(canSearchProfiles){
    const searchQuery=String(profileSearchQuery||"").trim();
    const searchResults=matchingEmployees(viewer,searchQuery,"profile");
    searchPanel.classList.remove("hidden");
    searchPanel.innerHTML=`<form id="profileSearchForm" class="profile-search-form"><label>Search employee<input id="profileSearchInput" type="text" list="userSearchList" placeholder="Type a name or ID" value="${escapeHtml(searchQuery)}"></label><button class="button" type="submit">View Profile</button></form><p class="helper-text">Level 1 can browse employee profiles one by one using name search.</p><div class="profile-search-results" id="profileSearchResults"></div>`;
    const resultPanel=document.getElementById("profileSearchResults");
    if(resultPanel)resultPanel.innerHTML=searchResults.length?searchResults.map(emp=>`<button type="button" class="history-search-result ${emp.employeeId===target.employeeId?"history-search-result-active":""}" data-profile-search="${escapeHtml(emp.employeeId)}"><strong>${escapeHtml(emp.name)}</strong><span>${escapeHtml(emp.employeeId)} | ${escapeHtml(ROLE_LABELS[emp.level]||emp.level)} | ${escapeHtml(emp.department)}</span></button>`).join(""):'<div class="empty-state">No employees found.</div>';
  } else { searchPanel.classList.add("hidden");searchPanel.innerHTML=""; }
  const initials=profileInitials(target.name,target.employeeId);
  form.innerHTML=`<div class="profile-main-stack"><section class="profile-summary-card"><div class="profile-summary-head"><div><p class="section-tag">Profile</p><h3>${escapeHtml(target.name)}</h3><p class="helper-text">${escapeHtml(ROLE_LABELS[target.level]||target.level)} | ${escapeHtml(target.department)} | ${escapeHtml(target.employeeId)}</p></div><div class="profile-stats"><div class="profile-stat"><span>Submissions</span><strong>${submissionCount}</strong></div><div class="profile-stat"><span>Last DAR</span><strong>${latestReport?escapeHtml(formatDate(latestReport.date)):"--"}</strong></div><div class="profile-stat"><span>Account</span><strong>${editable?"Editable":"Read only"}</strong></div></div></div><div class="profile-info-grid"><div class="profile-info-item"><span>Name</span><strong>${escapeHtml(target.name)}</strong></div><div class="profile-info-item"><span>Role</span><strong>${escapeHtml(ROLE_LABELS[target.level]||target.level)}</strong></div><div class="profile-info-item"><span>Department</span><strong>${escapeHtml(target.department)}</strong></div><div class="profile-info-item"><span>Employee ID</span><strong>${escapeHtml(target.employeeId)}</strong></div><div class="profile-info-item"><span>Reports To</span><strong>${escapeHtml(managerDisplayName(target))}</strong></div><div class="profile-info-item"><span>DOB</span><strong>${escapeHtml(formatDate(profile.dob||target.dob||""))}</strong></div></div></section><section class="profile-about-card"><div class="profile-card-header"><div><p class="section-tag">About</p><h3>About Myself</h3></div></div>${editable?`<label class="profile-bio-editor" for="profileBio"><textarea id="profileBio" ${fieldState} placeholder="Write a short professional bio">${escapeHtml(profile.bio)}</textarea></label>`:`<div class="profile-bio-readonly">${escapeHtml(profile.bio||"No bio shared yet.")}</div>`}</section><section class="profile-activity-card"><div class="profile-card-header"><div><p class="section-tag">Recent Activity</p><h3>Latest DAR entries</h3></div></div><div class="activity-timeline ${recentReports.length?"":"empty-state"}">${recentReports.length?recentReports.map(r=>{const title=reportDisplayTitle(r);return`<article class="activity-item"><div class="activity-marker"><span aria-hidden="true">${r.approvalStatus==="approved"?"✓":r.approvalStatus==="declined"?"!":"•"}</span></div><div class="activity-body"><header><strong>${escapeHtml(title||historyReportSummary(r))}</strong><span class="status-pill">${escapeHtml(formatDate(r.date))}</span></header><p>${escapeHtml(r.points?.[0]?.rawText||"No description added.")}</p><div class="activity-meta"><span>${escapeHtml(ROLE_LABELS[target.level]||target.level)}</span><span>${escapeHtml(r.approvalStatus||"pending")}</span><span>${escapeHtml(String(r.points?.length||0))} points</span></div></div></article>`;}).join(""):'<div class="empty-state">No recent DAR activity found.</div>'}</div></section>${editable?`<section class="profile-edit-card full-span"><div class="profile-card-header"><div><p class="section-tag">Edit Profile</p><h3>Update Contact Details</h3></div></div><div class="profile-edit-grid"><label>Phone<input id="profilePhone" type="text" value="${escapeHtml(profile.phone||"")}" placeholder="Enter phone number" ${fieldState}></label><label>Email<input id="profileEmail" type="email" value="${escapeHtml(profile.email||"")}" placeholder="Enter email address" ${fieldState}></label><label>Location<input id="profileLocation" type="text" value="${escapeHtml(profile.location||"")}" placeholder="Enter location" ${fieldState}></label><label>DOB<input id="profileDob" type="date" value="${escapeHtml(profile.dob||target.dob||"")}" ${fieldState}></label></div><div class="profile-actions full-span"><button class="button ${editable?"":"hidden"}" type="submit">Save Profile</button><p class="helper-text">Only text profile data is saved.</p></div></section>`:""}</div>`;
}

async function saveProfileChanges(viewer){
  const target=findUser(selectedProfileEmployeeId)||viewer;
  if(!target||target.employeeId!==viewer.employeeId)return;
  if(isLevel1(viewer)&&!isAdmin(viewer))return;
  if(!(isAdmin(viewer)||isLevel2(viewer)||isLevel3(viewer)))return;
  const bio=String(document.getElementById("profileBio")?.value||"").trim();
  const phone=String(document.getElementById("profilePhone")?.value||"").trim();
  const email=String(document.getElementById("profileEmail")?.value||"").trim();
  const location=String(document.getElementById("profileLocation")?.value||"").trim();
  const dob=String(document.getElementById("profileDob")?.value||"").trim();
  const updatedUser={...target,bio,phone,email,location,dob,profileImgUrl:"",profile_img_url:""};
  if(_currentUserCache&&_currentUserCache.employeeId===target.employeeId)_currentUserCache=updatedUser;
  await cloudSaveUser(updatedUser);
  showToast("Profile Updated","Your profile details have been saved.");
  renderPortal();
}

// ─── Compliance ───────────────────────────────────────────────
function complianceReportForUser(employeeId){ return reports().find(r=>r.employeeId===employeeId&&r.date===today())||null; }
function reportTotalTime(report){
  const seconds=(report?.points||[]).reduce((sum,point)=>{
    const dur=String(point.totalTime||"").trim();if(!dur)return sum;
    const norm=normalizeDuration(dur);
    return sum+[...norm.matchAll(/(\d+)(h|m|s)/g)].reduce((t,[,v,u])=>{if(u==="h")return t+Number(v)*3600;if(u==="m")return t+Number(v)*60;return t+Number(v);},0);
  },0);
  return normalizeDuration(`${seconds}s`);
}
function reportIsEditable(report){ return false; }
function findReportById(reportId){ return reports().find(r=>r.id===reportId)||null; }
function hasReminderBeenSent(senderId,targetId){ return notifications().some(n=>n.kind==="reminder"&&n.targetId===targetId&&n.actorName===activeUser()?.name); }
function reportTotalMinutes(report){
  const norm=reportTotalTime(report);if(!norm)return 0;
  return[...String(norm).matchAll(/(\d+)(h|m|s)/g)].reduce((t,[,v,u])=>{if(u==="h")return t+Number(v)*60;if(u==="m")return t+Number(v);return t+Math.ceil(Number(v)/60);},0);
}
function efficiencyBandForMinutes(minutes){
  const score=Math.max(0,Math.min(100,Math.round((Number(minutes)||0)/480*100)));
  if(score>=80)return{label:"High Productivity",className:"efficiency-high",width:`${score}%`,value:score,hint:"80-100% target"};
  if(score>=50)return{label:"Average",className:"efficiency-mid",width:`${score}%`,value:score,hint:"50-79% target"};
  return{label:"Needs Attention",className:"efficiency-low",width:`${Math.max(12,score)}%`,value:score,hint:"Below 50% target"};
}
function reportStatusLabel(report){ if(!report)return"Pending";if(report.approvalStatus==="approved")return"Approved";if(report.approvalStatus==="declined")return"Declined";return"Pending"; }
function reportStatusIcon(report){ if(!report)return"⏳";if(report.approvalStatus==="approved")return"✅";if(report.approvalStatus==="declined")return"❌";return"⏳"; }
function reportStatusDisplay(report){ return`${reportStatusIcon(report)} ${reportStatusLabel(report)}`; }
function reportStatusClass(report){ if(!report)return"history-status status-pending";if(report.approvalStatus==="approved")return"history-status status-approved";if(report.approvalStatus==="declined")return"history-status status-declined";return"history-status status-pending"; }
function reportCardClass(report,baseClass="report-card"){ return baseClass; }
function formatPointMeta(point){ const bits=[];if(point.totalTime)bits.push(`Total time: ${point.totalTime}`);if(point.attachmentName)bits.push(point.attachmentName);return bits.join(" | ")||"No timing or attachment added."; }
function parseDurationParts(duration){
  const norm=normalizeDuration(duration);
  if(!norm)return{hours:"",minutes:""};
  const hoursMatch=norm.match(/(\d+)h/);
  const minutesMatch=norm.match(/(\d+)m/);
  return{hours:hoursMatch?hoursMatch[1]:"",minutes:minutesMatch?minutesMatch[1]:""};
}
function renumberDraftPoints(draft){
  draft.points=(draft.points||[]).map((point,index)=>({
    ...point,
    text:`${index+1}. ${String(point.rawText||point.text||"").trim()}`,
    rawText:String(point.rawText||point.text||"").trim()
  }));
}
function pointContentSignature(point){
  return String(point?.rawText||point?.text||"").replace(/^\d+\.\s*/,"").trim();
}
function mergeDraftPointsIntoReport(existingReport,draftPoints){
  const existing=normalizeReport(existingReport);
  const seenIds=new Set((existing.points||[]).map(point=>point.id).filter(Boolean));
  const seenContent=new Set((existing.points||[]).map(pointContentSignature));
  const newPoints=(draftPoints||[]).filter(point=>{
    const id=point?.id||"";
    const contentSignature=pointContentSignature(point);
    if((id&&seenIds.has(id))||seenContent.has(contentSignature))return false;
    if(id)seenIds.add(id);
    seenContent.add(contentSignature);
    return true;
  });
  const merged={...existing,approvalStatus:"pending",reviewedBy:"",reviewedAt:"",reviewComment:"",submittedAt:nowIso(),points:[...(existing.points||[]),...newPoints.map(p=>({...p,createdAt:p.createdAt||nowIso(),updatedAt:nowIso()}))]};
  renumberDraftPoints(merged);
  return {report:merged,addedCount:newPoints.length};
}
function draftAutoSubmitDue(draft){
  const draftDate=draft?.date||draft?.mobileDate||today();
  if(!draftDate)return false;
  if(draftDate<today())return true;
  const now=new Date();
  return draftDate===today()&&autoSubmitWindowReached(now);
}
function finalizeDraftCurrentPoint(draft){
  const rawText=String(draft?.currentPoint||"").trim();
  if(!rawText)return draft;
  const next={...draft,points:[...(draft.points||[])]};
  const totalTime=durationFromHourMinuteParts(next.pointHours,next.pointMinutes)||"0m";
  const pointNumber=next.points.length+1;
  const point={
    id:`PT-AUTO-${Date.now()}-${pointNumber}`,
    text:`${pointNumber}. ${rawText}`,
    rawText,
    totalTime,
    attachmentName:next.attachmentName||"",
    attachmentData:next.attachmentData||"",
    attachmentSize:next.attachmentSize||"",
    createdAt:nowIso(),
    updatedAt:nowIso()
  };
  const signature=pointContentSignature(point);
  if(!next.points.some(existing=>pointContentSignature(existing)===signature))next.points.push(point);
  renumberDraftPoints(next);
  next.currentPoint="";
  next.pointHours="";
  next.pointMinutes="";
  next.attachmentName="";
  next.attachmentData="";
  next.attachmentSize="";
  return next;
}
async function autoSaveDueDraftForUser(user){
  if(!user)return false;
  let draft=getDraft(user,{allowStale:true});
  draft=finalizeDraftCurrentPoint(draft);
  const key=getDraftKey(user.employeeId);
  if(draftAutoSaveInFlight[key]||!draftAutoSubmitDue(draft))return false;
  if(!draft?.points?.length){clearDraft(user);return false;}
  draftAutoSaveInFlight[key]=true;
  draft.date=draft.date||draft.mobileDate||today();
  if(isHolidayDate(draft.date)){
    draftAutoSaveInFlight[key]=false;
    return false;
  }
  renumberDraftPoints(draft);
  saveDraft(user,draft);
  const { result, appendResult } = await cloudAppendPointsToReport(user, draft.date, draft.type || "internal", draft.location || draft.mobileLocation || "", draft.points);
  if(appendResult&&appendResult.addedCount===0){
    draftAutoSaveInFlight[key]=false;
    clearDraft(user);
    return false;
  }
  draftAutoSaveInFlight[key]=false;
  if(!result.ok)return false;
  const feedback=document.getElementById("darFeedback")||document.getElementById("mobileDarFeedback");
  clearDraft(user);
  notifySubmissionReviewers(user,`${user.name} auto-submitted DAR at 11:00 PM for ${draft.date}.`,{kind:"submission",title:"DAR Auto-Submitted",reportId:result.report.id,actorName:user.name});
  if(feedback)feedback.textContent="Draft points were automatically submitted as DAR at 11:00 PM.";
  showToast("DAR Auto-Submitted",`Draft points for ${formatDate(draft.date)} were submitted as DAR.`);
  return true;
}
async function autoSubmitDueDrafts(){
  const knownUsers=users().filter(u=>u.level!=="admin");
  let submitted=0;
  for(const user of knownUsers){
    if(await autoSaveDueDraftForUser(user))submitted+=1;
  }
  return submitted;
}
function autoSubmitWindowReached(date=new Date()){
  return date.getHours()>DRAFT_AUTO_SUBMIT_HOUR ||
    (date.getHours()===DRAFT_AUTO_SUBMIT_HOUR && date.getMinutes()>=DRAFT_AUTO_SUBMIT_MINUTE);
}
function nextDraftAutoSubmitDelay(){
  const now=new Date();
  const target=new Date(now);
  target.setHours(DRAFT_AUTO_SUBMIT_HOUR,DRAFT_AUTO_SUBMIT_MINUTE,0,0);
  if(now>=target)target.setDate(target.getDate()+1);
  return Math.max(1000,target.getTime()-now.getTime());
}
async function runScheduledDraftAutoSubmit(reason="timer"){
  if(!activePortalUserId)return 0;
  let submitted=0;
  try {
    const {data,error}=await db.rpc("metro_auto_submit_due_drafts");
    if(error&&!isMissingAutoSubmitFunctionError(error))console.warn("metro_auto_submit_due_drafts RPC skipped:",error.message);
    else submitted=Number(Array.isArray(data)?data[0]?.submitted_count:data)||0;
  } catch(e) {
    console.warn("metro_auto_submit_due_drafts RPC exception:",e.message);
  }
  await refreshAllCloudData({skipRemoteAutoSubmit:true,skipLocalAutoSubmit:true});
  submitted+=await autoSubmitDueDrafts();
  if(submitted>0){
    localStorage.setItem(DRAFT_AUTO_SUBMIT_LAST_RUN_KEY,dateKey());
    showToast("DAR Auto-Submitted",`${submitted} draft DAR(s) submitted after 9 PM.`);
    renderPortal();
  } else if(reason==="timer") {
    localStorage.setItem(DRAFT_AUTO_SUBMIT_LAST_RUN_KEY,dateKey());
  }
  return submitted;
}
function scheduleDraftAutoSubmit(){
  if(draftAutoSubmitTimer)window.clearTimeout(draftAutoSubmitTimer);
  draftAutoSubmitTimer=window.setTimeout(async()=>{
    await runScheduledDraftAutoSubmit("timer");
    scheduleDraftAutoSubmit();
  },nextDraftAutoSubmitDelay());
}
function ensureTodayAutoSubmitCatchup(){
  if(!activePortalUserId||!autoSubmitWindowReached())return;
  if(localStorage.getItem(DRAFT_AUTO_SUBMIT_LAST_RUN_KEY)===dateKey())return;
  runScheduledDraftAutoSubmit("catchup");
}
function draftPointBeingEdited(user){
  const draft=getDraft(user);
  return editingDraftPointId?draft.points.find(p=>p.id===editingDraftPointId)||null:null;
}
function renderDraftPointEditor(user){
  const draft=getDraft(user);
  const point=draftPointBeingEdited(user);
  if(editingDraftPointId&&!point)editingDraftPointId="";
  const byId=id=>document.getElementById(id);
  const title=byId("darFormTitle");
  const indicator=byId("pointIndicator");
  const addButton=byId("addPointButton");
  const input=byId("pointInput");
  const hours=byId("pointHours");
  const minutes=byId("pointMinutes");
  const charCount=byId("pointCharCount");

  if(point){
    const parts=parseDurationParts(point.totalTime);
    if(input)input.value=point.rawText||"";
    if(hours)hours.value=parts.hours||"";
    if(minutes)minutes.value=parts.minutes||"";
    if(title)title.textContent=`Edit DAR Point ${draft.points.findIndex(p=>p.id===point.id)+1}`;
    if(indicator)indicator.textContent=`Edit Point ${draft.points.findIndex(p=>p.id===point.id)+1}`;
    if(addButton)addButton.textContent="Save Point";
  }else{
    if(input)input.value=draft.currentPoint||"";
    if(hours)hours.value=draft.pointHours||"";
    if(minutes)minutes.value=draft.pointMinutes||"";
    if(title)title.textContent="Add DAR Point";
    if(indicator)indicator.textContent=`Write Point ${draft.points.length+1}`;
    if(addButton)addButton.textContent="+ Add Point";
  }
  if(charCount)charCount.textContent=`${(input?.value||"").length} / 600`;
  
  syncTimePillsFromInputs();
  const att=byId("pointAttachment");
  if(att){
    att.value="";
    const dropzoneContent=byId("darDropzoneContent");
    const dropzoneFileInfo=byId("darDropzoneFileInfo");
    if(dropzoneContent)dropzoneContent.classList.remove("hidden");
    if(dropzoneFileInfo)dropzoneFileInfo.classList.add("hidden");
  }
  updateDarTypingState();
}
function startDraftPointEdit(user,pointId){
  const draft=getDraft(user);
  const point=draft.points.find(p=>p.id===pointId);
  if(!point)return;
  editingDraftPointId=pointId;
  draft.currentPoint=point.rawText||"";
  draft.pointHours=parseDurationParts(point.totalTime).hours;
  draft.pointMinutes=parseDurationParts(point.totalTime).minutes;
  saveDraft(user,draft);
  renderDraftPointEditor(user);
  renderSidebarDarStream(user);
}
function cancelDraftPointEdit(user){
  if(!editingDraftPointId)return;
  editingDraftPointId="";
  renderDraftPointEditor(user);
  renderSidebarDarStream(user);
}
function deleteDraftPoint(user,pointId){
  const draft=getDraft(user);
  const point=draft.points.find(p=>p.id===pointId);
  if(!point)return;
  if(!window.confirm("Delete this draft point?"))return;
  draft.points=draft.points.filter(p=>p.id!==pointId);
  renumberDraftPoints(draft);
  if(editingDraftPointId===pointId)editingDraftPointId="";
  saveDraft(user,draft);
  if(editingDraftPointId&&!draft.points.some(p=>p.id===editingDraftPointId))editingDraftPointId="";
  if(draft.points.length){
    if(editingDraftPointId)renderDraftPointEditor(user);
    else renderDraftPointEditor(user);
  }else{
    editingDraftPointId="";
    renderDraftPointEditor(user);
  }
  if(document.getElementById("darFeedback"))document.getElementById("darFeedback").textContent="Draft point updated and auto-saved.";
  renderSidebarDarStream(user);
}

function complianceExpandedContent(user,employee,report){
  if(!report){
    const holiday=holidayForDate(selectedComplianceDate());
    if(holiday){
      return`<div class="compliance-expanded-card"><div class="compliance-expanded-head"><strong>${escapeHtml(employee.name)} is marked holiday on ${escapeHtml(formatDate(holiday.date))}.</strong><span class="status-pill">${escapeHtml(formatHolidayName(holiday))}</span></div></div>`;
    }
    const sent=hasReminderBeenSent(user?.employeeId,employee.employeeId);
    let inTaggedScope = false;
    if (user && canUseCompliance(user)) {
      const vTaggedDepts = (user.taggedDepartments || "").split(",").map(s=>s.trim()).filter(Boolean);
      const vTaggedEntities = (user.taggedEntities || "").split(",").map(s=>s.trim()).filter(Boolean);
      inTaggedScope = vTaggedDepts.includes(employee.department) || (employee.entity && vTaggedEntities.includes(employee.entity));
    }
    const canSend=(isAdmin(user)||isLevel1(user)||(isLevel2(user)&&(employee.managerId===user.employeeId||inTaggedScope)))&&employee.level!=="1";
    const reminderBtn=canSend?(sent?`<span class="status-pill reminder-sent-pill">Reminder already sent</span>`:`<button type="button" class="compact-button reminder-button" data-remind="${escapeHtml(employee.employeeId)}">Send Reminder</button>`):"";
    return`<div class="compliance-expanded-card"><div class="compliance-expanded-head"><strong>${escapeHtml(employee.name)} has not submitted today's DAR.</strong>${reminderBtn}</div></div>`;
  }
  const attachmentLinks=report.points.filter(p=>p.attachmentName&&p.attachmentData).map((p,i)=>`<a class="compact-button attachment-inline" download="${escapeHtml(p.attachmentName)}" href="${escapeHtml(p.attachmentData)}">Attachment ${i+1}: ${escapeHtml(p.attachmentName)}</a>`).join(" ");
  const feedbackBlock=report.reviewComment?`<div class="feedback-history"><strong>Feedback</strong><p>${escapeHtml(report.reviewComment)}</p></div>`:"";
  const efficiency=efficiencyBandForMinutes(reportTotalMinutes(report));
  const reviewEditMode=selectedHistoryReviewEditId===report.id;
  const reviewActionsVisible=canReviewReport(user,report)&&(report.approvalStatus==="pending"||reviewEditMode);
  const actionBlock=reviewActionsVisible?`<div class="inline-feedback-row"><button type="button" class="compact-button action-approve" data-approve="${escapeHtml(report.id)}">Approve</button><button type="button" class="compact-button action-reject" data-decline="${escapeHtml(report.id)}">Reject</button><button type="button" class="compact-button action-feedback" data-feedback-toggle="${escapeHtml(report.id)}">Add Feedback</button></div><div class="feedback-input-wrap hidden" id="feedbackWrap-${escapeHtml(report.id)}"><input type="text" id="feedbackInput-${escapeHtml(report.id)}" placeholder="Write feedback for this submission"><button type="button" class="compact-button action-feedback" data-feedback-save="${escapeHtml(report.id)}">Save Feedback</button></div>`:(canReviewReport(user,report)&&report.approvalStatus!=="pending"&&!reviewEditMode?`<div class="action-row history-review-actions"><button type="button" class="compact-button" data-history-review-edit="${escapeHtml(report.id)}">Edit Action</button></div>`:"");
  const reportTitle=reportDisplayTitle(report);
  return`<div class="compliance-expanded-card"><div class="compliance-expanded-head"><div><strong class="report-hero-name">${escapeHtml(report.employeeName||report.employeeId)}</strong>${reportTitle?`<p class="report-subtitle">${escapeHtml(reportTitle)}</p>`:""}<p>${escapeHtml(report.type==="project"?"Project-Specific DAR":"Internal Open DAR")}${report.projectName?` | ${escapeHtml(report.projectName)}`:""}</p><p>Submitted at ${escapeHtml(formatDateTime(report.submittedAt))}</p></div><span class="${escapeHtml(reportStatusClass(report))}">${escapeHtml(reportStatusDisplay(report))}</span></div><div><strong>Total time worked</strong><p>${escapeHtml(reportTotalTime(report)||"--")}</p></div><div><strong>Work efficiency</strong><div class="efficiency-cell efficiency-cell-expanded"><div class="efficiency-track ${efficiency.className}" aria-hidden="true"><span style="width:${efficiency.width}"></span></div><div class="efficiency-meta"><strong>${escapeHtml(efficiency.label)}</strong><span>${escapeHtml(efficiency.hint)}</span></div></div></div><div><strong>DAR Points</strong>${(report.points||[]).map(p=>`<article class="assignment-card"><strong>${escapeHtml(p.text)}</strong><p>${escapeHtml(formatPointMeta(p))}</p>${isAdmin(user) ? `<button type="button" class="compact-button" style="margin-top:8px;" data-admin-edit-time="${escapeHtml(report.id)}|${escapeHtml(p.id)}">Admin: Edit Time</button>` : ""}</article>`).join("")}</div>${attachmentLinks?`<div><strong>Attachments</strong><div class="action-row">${attachmentLinks}</div></div>`:""}${feedbackBlock}${actionBlock}</div>`;
}

function triggerCsvDownload(filename,csv){
  const blob=new Blob([csv],{type:"text/csv;charset=utf-8;"});
  triggerBlobDownload(filename,blob);
}

function triggerBlobDownload(filename,blob){
  const url=URL.createObjectURL(blob);
  const link=document.createElement("a");
  link.href=url;
  link.download=filename;
  link.rel="noopener";
  link.style.display="none";
  document.body.appendChild(link);
  const canDownload="download" in HTMLAnchorElement.prototype;
  if(canDownload){
    link.click();
  } else if(window.navigator.msSaveOrOpenBlob){
    window.navigator.msSaveOrOpenBlob(blob,filename);
  } else {
    window.open(url,"_blank","noopener");
  }
  window.setTimeout(()=>{
    URL.revokeObjectURL(url);
    link.remove();
  },1500);
}

function complianceExportRows(user, customUsersList){
  const filteredUsers=(customUsersList || complianceUsers(user)).sort((a,b)=>(a.department||"").localeCompare(b.department||""));
  const exportDate=selectedComplianceDate();
  const holiday=holidayForDate(exportDate);
  const submittedMap=new Map(reports().filter(r=>r.date===exportDate).filter(r=>filteredUsers.some(u=>u.employeeId===r.employeeId)).map(r=>[r.employeeId,r]));
  const rows=[["Date","Employee Name","Employee ID","Level","Entity","Department","Work Location","Manager Name","Status","Submitted At","Total Time","DAR Points","Attachments"]];
  filteredUsers.forEach(emp=>{
    const report=submittedMap.get(emp.employeeId);
    if(complianceFilter==="submitted"&&!report)return;
    if(complianceFilter==="pending"&&(report||holiday))return;
    if(report){
      const pts=(report.points||[]).map((p)=>"• " + (p.rawText||String(p.text||"").replace(/^\d+\.\s*/,"")) + " (" + (p.totalTime||"--") + ")").join("\n\n");
      const atts=(report.points||[]).filter(p=>p.attachmentName).map(p=>p.attachmentName).join(", ");
      rows.push([report.date,report.employeeName||emp.name,report.employeeId,ROLE_LABELS[emp.level]||emp.level,emp.entity||"",emp.department||"",emp.location||"",managerDisplayName(emp),reportStatusDisplay(report),formatDateTime(report.submittedAt),reportTotalTime(report)||"--",pts,atts]);
    }else{
      const leave=typeof leaveForDateAndUser==='function'?leaveForDateAndUser(exportDate, emp.employeeId):null;
      if(leave){
        const leaveText = leave.leaveType === "half" ? `On Leave (Half: ${leave.halfType === 'first' ? '1st' : '2nd'}): ${leave.remarks}` : `On Leave: ${leave.remarks}`;
        rows.push([exportDate,emp.name,emp.employeeId,ROLE_LABELS[emp.level]||emp.level,emp.entity||"",emp.department||"",emp.location||"",managerDisplayName(emp),leaveText,"","","",""]);
      }else if(holiday){
        rows.push([exportDate,emp.name,emp.employeeId,ROLE_LABELS[emp.level]||emp.level,emp.entity||"",emp.department||"",emp.location||"",managerDisplayName(emp),formatHolidayName(holiday),"","","",""]);
      }else{
        rows.push([exportDate,emp.name,emp.employeeId,ROLE_LABELS[emp.level]||emp.level,emp.entity||"",emp.department||"",emp.location||"",managerDisplayName(emp),"No DAR Submitted","","","",""]);
      }
    }
  });
  return rows;
}

function complianceExportRowsForDates(user,dateValues,customUsersList){
  const filteredUsers=(customUsersList || complianceUsers(user)).sort((a,b)=>(a.department||"").localeCompare(b.department||""));
  const rows=[["Date","Employee Name","Employee ID","Level","Entity","Department","Work Location","Manager Name","Status","Submitted At","Total Time","DAR Points","Attachments"]];
  dateValues.forEach(exportDate=>{
    const holiday=holidayForDate(exportDate);
    const submittedMap=new Map(reports().filter(r=>r.date===exportDate).filter(r=>filteredUsers.some(u=>u.employeeId===r.employeeId)).map(r=>[r.employeeId,r]));
    filteredUsers.forEach(emp=>{
      const report=submittedMap.get(emp.employeeId);
      if(complianceFilter==="submitted"&&!report)return;
      if(complianceFilter==="pending"&&(report||holiday))return;
      if(report){
        const pts=(report.points||[]).map((p)=>"• " + (p.rawText||String(p.text||"").replace(/^\d+\.\s*/,"")) + " (" + (p.totalTime||"--") + ")").join("\n\n");
        const atts=(report.points||[]).filter(p=>p.attachmentName).map(p=>p.attachmentName).join(", ");
        rows.push([report.date,report.employeeName||emp.name,report.employeeId,ROLE_LABELS[emp.level]||emp.level,emp.entity||"",emp.department||"",emp.location||"",managerDisplayName(emp),reportStatusDisplay(report),formatDateTime(report.submittedAt),reportTotalTime(report)||"--",pts,atts]);
      }else{
        const leave=typeof leaveForDateAndUser==='function'?leaveForDateAndUser(exportDate, emp.employeeId):null;
        if(leave){
          const leaveText = leave.leaveType === "half" ? `On Leave (Half: ${leave.halfType === 'first' ? '1st' : '2nd'}): ${leave.remarks}` : `On Leave: ${leave.remarks}`;
          rows.push([exportDate,emp.name,emp.employeeId,ROLE_LABELS[emp.level]||emp.level,emp.entity||"",emp.department||"",emp.location||"",managerDisplayName(emp),leaveText,"","","",""]);
        }else if(holiday){
          rows.push([exportDate,emp.name,emp.employeeId,ROLE_LABELS[emp.level]||emp.level,emp.entity||"",emp.department||"",emp.location||"",managerDisplayName(emp),formatHolidayName(holiday),"","","",""]);
        }else{
          rows.push([exportDate,emp.name,emp.employeeId,ROLE_LABELS[emp.level]||emp.level,emp.entity||"",emp.department||"",emp.location||"",managerDisplayName(emp),"No DAR Submitted","","","",""]);
        }
      }
    });
  });
  return rows;
}

function datesBetween(startDate,endDate){
  const dates=[];
  const cursor=new Date(`${startDate}T00:00:00`);
  const end=new Date(`${endDate}T00:00:00`);
  while(cursor<=end){dates.push(dateKey(cursor));cursor.setDate(cursor.getDate()+1);}
  return dates;
}

function monthRangeForDate(date){
  const value = new Date(date);
  const start = new Date(value.getFullYear(), value.getMonth(), 1);
  const end = new Date(value.getFullYear(), value.getMonth() + 1, 0);
  return { start: dateKey(start), end: dateKey(end) };
}
function monthRangeForSelection(monthValue = selectedComplianceMonth()){
  const [year, month] = String(monthValue || selectedComplianceDate().slice(0, 7)).split("-").map(Number);
  if (!year || !month) return monthRangeForDate(new Date(`${selectedComplianceDate()}T00:00:00`));
  return monthRangeForDate(new Date(year, month - 1, 1));
}

function complianceExportFileStem(scope = "daily"){
  if (scope === "weekly") {
    const range = selectedComplianceWeekRange();
    return `metro-dar-week-${range.start}-to-${range.end}-${complianceFilter}`;
  }
  if (scope === "monthly") {
    const range = monthRangeForSelection();
    return `metro-dar-month-${range.start}-to-${range.end}-${complianceFilter}`;
  }
  return `metro-dar-${selectedComplianceDate()}-${complianceFilter}`;
}

function exportCellHtml(cell, tag){
  return `<${tag}>${escapeHtml(cell).replace(/\n/g, "<br>")}</${tag}>`;
}

function complianceExportSummaryRows(title, rangeLabel, user){
  return [
    ["Report", title],
    ["Date Range", rangeLabel],
    ["Employee Scope", isAdmin(user) ? "All active employees" : isLevel1(user) ? "Level 2 and Level 3 employees" : (isLevel2(user) && canUseCompliance(user) ? "Tagged departments/entities" : isLevel2(user) ? "Direct reportees" : "Self")],
    ["Compliance Filter", complianceFilter === "all" ? "All employees" : complianceFilter],
    ["Holiday Handling", "Company holiday rows are marked as H - Holiday. Sundays are no longer marked with H."],
    []
  ];
}

function exportRowsToExcel(filename, title, rangeLabel, rows, user){
  const summaryRows = complianceExportSummaryRows(title, rangeLabel, user);
  const summaryHtml = summaryRows.map(row => `<tr>${row.map((cell, index) => exportCellHtml(cell, index === 0 ? "th" : "td")).join("")}</tr>`).join("");
  const tableRows = rows.map((row, index) => `<tr>${row.map(cell => exportCellHtml(cell, index === 0 ? "th" : "td")).join("")}</tr>`).join("");
  const dataStartRow = summaryRows.length + 2;
  const dataEndRow = dataStartRow + Math.max(rows.length - 1, 0);
  const dataColCount = rows[0]?.length || 1;
  const excelOptions = `<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>DAR Export</x:Name><x:WorksheetOptions><x:AutoFilter x:Range="R${dataStartRow}C1:R${dataEndRow}C${dataColCount}"/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->`;
  const html = `<!doctype html><html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8">${excelOptions}<style>body{font-family:Arial,sans-serif}td,th{vertical-align:top;white-space:pre-line;border:1px solid #999;padding:6px}th{background:#f2f2f2;font-weight:700}.summary th{background:#8B0A1A;color:#fff}.summary td{background:#fff7e6}</style></head><body><table class="summary">${summaryHtml}</table><br><table border="1" data-auto-filter="true">${tableRows}</table></body></html>`;
  triggerBlobDownload(filename, new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" }));
}

function exportStatusMatrixExcel(user, scope = "weekly", customUsersList) {
  const range = scope === "weekly"
    ? selectedComplianceWeekRange()
    : monthRangeForSelection();
  
  const dates = datesBetween(range.start, range.end);
  const filteredUsers = (customUsersList || complianceUsers(user)).sort((a, b) => (a.department || "").localeCompare(b.department || ""));
  
  const allReports = reports();
  const reportsByDate = new Map();
  dates.forEach(d => {
    const map = new Map(allReports.filter(r => r.date === d).map(r => [r.employeeId, r]));
    reportsByDate.set(d, map);
  });
  
  const dailyStats = dates.map(d => {
    const isSun = isSundayDateKey(d);
    const holiday = holidayForDate(d);
    const subMap = reportsByDate.get(d) || new Map();
    const submittedCount = filteredUsers.filter(u => subMap.has(u.employeeId)).length;
    const isOff = isSun || Boolean(holiday);
    const totalWorking = isOff ? 0 : filteredUsers.length;
    const pendingCount = isOff ? 0 : Math.max(0, totalWorking - submittedCount);
    const percent = totalWorking > 0 ? Math.round((submittedCount / totalWorking) * 100) : (submittedCount > 0 ? 100 : 0);
    return { date: d, submitted: submittedCount, pending: pendingCount, percent, isOff, holiday, isSun };
  });

  const title = scope === "weekly" ? "Weekly Submission Report" : "Monthly Submission Report";
  const dateRangeLabel = `${formatDate(range.start)} to ${formatDate(range.end)}`;

  const totalCols = 7 + dates.length + 2;
  const dataStartRow = 5;
  const dataEndRow = dataStartRow + Math.max(filteredUsers.length, 1);

  let html = `<!doctype html><html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8">
  <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Submission Matrix</x:Name><x:WorksheetOptions><x:AutoFilter x:Range="R${dataStartRow}C1:R${dataEndRow}C${totalCols}"/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
  <style>
    body { font-family: Arial, sans-serif; font-size: 11px; }
    table { border-collapse: collapse; }
    th, td { border: 1px solid #b0c4de; padding: 6px 8px; text-align: left; }
    .title-cell { font-size: 16px; font-weight: bold; color: #1f4e78; text-align: center; border: none; padding: 10px; }
    .kpi-label { background: #d9e1f2; font-weight: bold; color: #1f4e78; }
    .kpi-val { background: #f2f2f2; font-weight: bold; text-align: center; }
    .tbl-header { background: #1f4e78; color: #ffffff; font-weight: bold; text-align: center; }
    .cell-yes { background: #c6efce; color: #006100; font-weight: bold; text-align: center; }
    .cell-no { background: #ffc7ce; color: #9c0006; font-weight: bold; text-align: center; }
    .cell-leave { background: #d1ecf1; color: #0c5460; font-weight: bold; text-align: center; }
    .cell-holiday { background: #fff3cd; color: #856404; font-weight: bold; text-align: center; }
    .cell-sunday { background: #fff3cd; color: #856404; font-weight: bold; text-align: center; }
    .num-cell { text-align: center; font-weight: bold; }
  </style></head><body>`;

  html += `<table>`;
  html += `<tr><td colspan="${totalCols}" class="title-cell">${escapeHtml(title)} (${escapeHtml(dateRangeLabel)})</td></tr>`;
  
  html += `<tr><td colspan="7" class="kpi-label">Submitted Count</td>`;
  dailyStats.forEach(s => { html += `<td class="kpi-val">${s.submitted}</td>`; });
  html += `<td colspan="2" class="kpi-val"></td></tr>`;

  html += `<tr><td colspan="7" class="kpi-label">Pending Count</td>`;
  dailyStats.forEach(s => { html += `<td class="kpi-val">${s.pending}</td>`; });
  html += `<td colspan="2" class="kpi-val"></td></tr>`;

  html += `<tr><td colspan="7" class="kpi-label">Compliance %</td>`;
  dailyStats.forEach(s => { html += `<td class="kpi-val">${s.percent}%</td>`; });
  html += `<td colspan="2" class="kpi-val"></td></tr>`;

  html += `<tr>
    <th class="tbl-header">SL</th>
    <th class="tbl-header">Employee ID</th>
    <th class="tbl-header">Employee Name</th>
    <th class="tbl-header">Level</th>
    <th class="tbl-header">Department</th>
    <th class="tbl-header">Entity</th>
    <th class="tbl-header">Work Location</th>`;
  
  dates.forEach(d => {
    const dt = new Date(`${d}T00:00:00`);
    const dayAbbr = dt.toLocaleDateString("en-US", { weekday: "short" });
    const formattedD = formatDate(d);
    html += `<th class="tbl-header">${formattedD}<br>(${dayAbbr})</th>`;
  });
  
  html += `<th class="tbl-header">Total Submitted</th>
    <th class="tbl-header">Compliance %</th>
  </tr>`;

  filteredUsers.forEach((emp, idx) => {
    let empSubmittedCount = 0;
    let empWorkingDays = 0;

    const rowCells = dates.map(d => {
      const isSun = isSundayDateKey(d);
      const holiday = holidayForDate(d);
      const subMap = reportsByDate.get(d) || new Map();
      const report = subMap.get(emp.employeeId);
      const leave = typeof leaveForDateAndUser === 'function' ? leaveForDateAndUser(d, emp.employeeId) : null;

      if (!isSun && !holiday) empWorkingDays++;

      if (report) {
        empSubmittedCount++;
        return '<td class="cell-yes">Yes</td>';
      }
      if (leave) return '<td class="cell-leave">Leave</td>';
      if (holiday) return '<td class="cell-holiday">Holiday</td>';
      if (isSun) return '<td class="cell-sunday">Sunday</td>';
      return '<td class="cell-no">No</td>';
    }).join("");

    const empPercent = empWorkingDays > 0 ? Math.round((empSubmittedCount / empWorkingDays) * 100) : 0;

    html += `<tr>
      <td class="num-cell">${idx + 1}</td>
      <td>${escapeHtml(emp.employeeId)}</td>
      <td>${escapeHtml(emp.name)}</td>
      <td>${escapeHtml(ROLE_LABELS[emp.level] || emp.level)}</td>
      <td>${escapeHtml(emp.department || "-")}</td>
      <td>${escapeHtml(emp.entity || "-")}</td>
      <td>${escapeHtml(emp.location || "-")}</td>
      ${rowCells}
      <td class="num-cell">${empSubmittedCount}</td>
      <td class="num-cell">${empPercent}%</td>
    </tr>`;
  });

  html += `</table></body></html>`;

  const filename = `${complianceExportFileStem(scope)}-matrix.xls`;
  triggerBlobDownload(filename, new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" }));
}

// =========================================================================
// ADVANCED DAR COMPLIANCE, EXPORT SUITE & ORG GRAPH
// =========================================================================


// =========================================================================
// ADVANCED DAR COMPLIANCE, EXPORT SUITE & ORG GRAPH
// =========================================================================

function exportExcel(user, customUsersList){
  const rows = complianceExportRows(user, customUsersList);
  exportRowsToExcel(`${complianceExportFileStem()}.xls`, `Metro Group Daily DAR Export`, formatDate(selectedComplianceDate()), rows, user);
}

function exportWeeklyDetailedExcel(user, customUsersList){
  const range = weekRangeForDate(new Date(`${selectedComplianceDate()}T00:00:00`));
  const rows = complianceExportRowsForDates(user, datesBetween(range.start, range.end), customUsersList);
  exportRowsToExcel(`${complianceExportFileStem("weekly")}-detailed.xls`, `Metro Group Weekly Detailed DAR Export`, `${formatDate(range.start)} to ${formatDate(range.end)}`, rows, user);
}

function exportMonthlyDetailedExcel(user, customUsersList){
  const range = monthRangeForSelection();
  const rows = complianceExportRowsForDates(user, datesBetween(range.start, range.end), customUsersList);
  exportRowsToExcel(`${complianceExportFileStem("monthly")}-detailed.xls`, `Metro Group Monthly Detailed DAR Export`, `${formatDate(range.start)} to ${formatDate(range.end)}`, rows, user);
}

function exportWeeklyExcel(user, customUsersList){
  exportStatusMatrixExcel(user, "weekly", customUsersList);
}

function exportMonthlyExcel(user, customUsersList){
  exportStatusMatrixExcel(user, "monthly", customUsersList);
}

function exportPdf(user, customUsersList){
  const rows = complianceExportRows(user, customUsersList);
  const title = `Metro Group DAR Submission Details - ${formatDate(selectedComplianceDate())}`;
  const tableRows = rows.map((row,index)=> `<tr>${row.map(cell=>exportCellHtml(cell,index===0?"th":"td")).join("")}</tr>`).join("");
  const printable = window.open("","_blank","width=1100,height=800");
  if(!printable){ window.alert("Allow pop-ups to export the PDF."); return; }
  printable.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>
    @page{size:A4 landscape;margin:14mm}
    body{font-family:Arial,sans-serif;color:#111;margin:0}
    h1{font-size:20px;margin:0 0 6px}
    p{margin:0 0 14px;color:#555;font-size:12px}
    table{width:100%;border-collapse:collapse;font-size:10px}
    th,td{border:1px solid #ccc;padding:6px;vertical-align:top;text-align:left}
    td{white-space:pre-line}
    th{background:#f2f2f2;font-weight:700}
    tr{break-inside:avoid}
  </style></head><body><h1>${escapeHtml(title)}</h1><p>Filter: ${escapeHtml(complianceFilter)} | Exported: ${escapeHtml(formatDateTime(nowIso()))}</p><table>${tableRows}</table><script>window.onload=function(){setTimeout(function(){window.print();},150);};</script></body></html>`);
  printable.document.close();
}

function exportWeeklyPdf(user, customUsersList){
  const range = weekRangeForDate(new Date(`${selectedComplianceDate()}T00:00:00`));
  const rows = complianceExportRowsForDates(user, datesBetween(range.start, range.end), customUsersList);
  const title = `Metro Group Weekly DAR Submission Details - ${formatDate(range.start)} to ${formatDate(range.end)}`;
  const tableRows = rows.map((row,index)=> `<tr>${row.map(cell=>exportCellHtml(cell,index===0?"th":"td")).join("")}</tr>`).join("");
  const printable = window.open("","_blank","width=1100,height=800");
  if(!printable){ window.alert("Allow pop-ups to export the PDF."); return; }
  printable.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>
    @page{size:A4 landscape;margin:14mm}
    body{font-family:Arial,sans-serif;color:#111;margin:0}
    h1{font-size:20px;margin:0 0 6px}
    p{margin:0 0 14px;color:#555;font-size:12px}
    table{width:100%;border-collapse:collapse;font-size:9px}
    th,td{border:1px solid #ccc;padding:6px;vertical-align:top;text-align:left}
    td{white-space:pre-line}
    th{background:#f2f2f2;font-weight:700}
    tr{break-inside:avoid}
  </style></head><body><h1>${escapeHtml(title)}</h1><p>Filter: ${escapeHtml(complianceFilter)} | Exported: ${escapeHtml(formatDateTime(nowIso()))}</p><table>${tableRows}</table><script>window.onload=function(){setTimeout(function(){window.print();},150);};</script></body></html>`);
  printable.document.close();
}

function exportMonthlyPdf(user, customUsersList){
  const range = monthRangeForSelection();
  const rows = complianceExportRowsForDates(user, datesBetween(range.start, range.end), customUsersList);
  const title = `Metro Group Monthly DAR Submission Details - ${formatDate(range.start)} to ${formatDate(range.end)}`;
  const tableRows = rows.map((row,index)=> `<tr>${row.map(cell=>exportCellHtml(cell,index===0?"th":"td")).join("")}</tr>`).join("");
  const printable = window.open("","_blank","width=1200,height=800");
  if(!printable){ window.alert("Allow pop-ups to export the PDF."); return; }
  printable.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>
    @page{size:A4 landscape;margin:14mm}
    body{font-family:Arial,sans-serif;color:#111;margin:0}
    h1{font-size:20px;margin:0 0 6px}
    p{margin:0 0 14px;color:#555;font-size:12px}
    table{width:100%;border-collapse:collapse;font-size:9px}
    th,td{border:1px solid #ccc;padding:6px;vertical-align:top;text-align:left}
    td{white-space:pre-line}
    th{background:#f2f2f2;font-weight:700}
    tr{break-inside:avoid}
  </style></head><body><h1>${escapeHtml(title)}</h1><p>Filter: ${escapeHtml(complianceFilter)} | Exported: ${escapeHtml(formatDateTime(nowIso()))}</p><table>${tableRows}</table><script>window.onload=function(){setTimeout(function(){window.print();},150);};</script></body></html>`);
  printable.document.close();
}

function exportHRMISExcel(user) {
  const allUsers = users().filter(u => u.level !== "admin");
  const scopedUsers = isAdmin(user) ? allUsers : (isLevel1(user) ? searchableEmployees(user, "history-level1") : directSubordinates(user));
  const sorted = [...scopedUsers].sort((a,b) => (a.department||"").localeCompare(b.department||"") || (a.name||"").localeCompare(b.name||""));
  
  const rows = [
    ["SL", "Employee ID", "Employee Name", "Role / Level", "Department", "Entity", "Work Location", "Reports To ID", "Reporting Manager Name", "Official Email"]
  ];
  
  sorted.forEach((u, idx) => {
    const mgr = u.managerId ? findUser(u.managerId) : null;
    rows.push([
      idx + 1,
      u.employeeId || "",
      u.name || "",
      ROLE_LABELS[u.level] || u.level || "",
      u.department || "",
      u.entity || "",
      u.location || "",
      u.managerId || "",
      mgr ? mgr.name : (u.managerName || ""),
      u.email || ""
    ]);
  });
  
  const tableRows = rows.map((row, index) => {
    const tag = index === 0 ? "th" : "td";
    return "<tr>" + row.map(cell => "<" + tag + ">" + escapeHtml(String(cell || "")) + "</" + tag + ">").join("") + "</tr>";
  }).join("");
  
  const dataEndRow = rows.length;
  const excelOptions = `<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>HRMIS Structure</x:Name><x:WorksheetOptions><x:AutoFilter x:Range="R1C1:R${dataEndRow}C10"/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->`;
  const html = `<!doctype html><html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8">${excelOptions}<style>body{font-family:Arial,sans-serif;font-size:11px}td,th{vertical-align:top;border:1px solid #b0c4de;padding:6px 8px}th{background:#1f4e78;color:#ffffff;font-weight:700}</style></head><body><table border="1" data-auto-filter="true">${tableRows}</table></body></html>`;
  
  triggerBlobDownload("Reporting_Structure_HRMIS.xls", new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" }));
}

let currentEntityPeriod = 'daily';
let currentDeptPeriod = 'daily';
let currentDrawerState = { groupType: '', groupName: '', period: 'daily', filter: 'all', search: '' };

function hasNotSubmittedConsecutive(employeeId, selectedDate, numDays) {
  const dates = [];
  const baseDate = new Date(`${selectedDate}T00:00:00`);
  for (let i = 0; i < numDays; i++) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - i);
    dates.push(dateKey(d));
  }
  const employeeReports = reports().filter(r => r.employeeId === employeeId);
  const submittedDates = new Set(employeeReports.map(r => r.date));
  for (const date of dates) {
    if (submittedDates.has(date)) {
      return false;
    }
  }
  return true;
}


// ─── Work Analytics & Smart Rule Engine ───────────────────────
let analyticsViewMode = "employee"; // "employee" | "dept"
let selectedAnalyticsEmployeeId = "";
let selectedAnalyticsDepartment = "";
let selectedAnalyticsPeriod = "monthly"; // "monthly" | "weekly" | "daily" | "alltime"
let selectedAnalyticsDate = "";
let analyticsReviewStyleSeed = 0;
let analyticsEventsInitialized = false;
let analyticsPointSearchQuery = "";
let analyticsSelectedDateFilter = "";
let analyticsSelectedProjectFilter = "";

const analyticsMemoryReportsMap = new Map();
const analyticsFetchedEmployees = new Set();
const analyticsFetchedRanges = new Set();
let analyticsCloudSyncInFlight = false;

function formatMinutesToHrMin(totalMins) {
  const m = Math.max(0, Math.round(Number(totalMins) || 0));
  const hrs = Math.floor(m / 60);
  const mins = m % 60;
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${String(mins).padStart(2, "0")}m`;
}

function parsePointMinutes(point) {
  if (!point) return 0;
  if (Number(point.durationMinutes) > 0) return Number(point.durationMinutes);
  if (Number(point.hours) > 0 || Number(point.minutes) > 0) {
    return (Number(point.hours) || 0) * 60 + (Number(point.minutes) || 0);
  }
  const rawDur = String(point.totalTime || "").trim();
  if (rawDur) {
    const norm = typeof normalizeDuration === "function" ? normalizeDuration(rawDur) : rawDur.toLowerCase();
    if (norm) {
      let mins = 0;
      const matches = [...String(norm).matchAll(/(\d+)\s*(h|hr|hrs|m|min|mins|s|sec|secs)/gi)];
      if (matches.length > 0) {
        matches.forEach(([, val, unit]) => {
          const v = Number(val) || 0;
          const u = unit.toLowerCase();
          if (u.startsWith("h")) mins += v * 60;
          else if (u.startsWith("m")) mins += v;
          else if (u.startsWith("s")) mins += Math.round(v / 60);
        });
        return mins;
      }
    }
  }
  // Fallback: check if text ends with (2h 30m) or [1h 15m]
  const textMatch = String(point.rawText || point.text || "").match(/\[(\d+h\s*\d*m?|\d+m)\]|\((\d+h\s*\d*m?|\d+m)\)/i);
  if (textMatch) {
    return parsePointMinutes({ totalTime: textMatch[1] || textMatch[2] });
  }
  return 0;
}

function classifyDarPoint(point, report, userDepartment = "") {
  const rawText = String(point?.rawText || point?.text || "").replace(/^\d+\.\s*/, "").trim();
  const explicitProj = String(point?.projectName || report?.projectName || "").trim();
  const dept = String(userDepartment || report?.department || report?.employeeDepartment || "").toLowerCase();

  let stream = "";
  let category = "";

  // 1. Detect Metro Group specific Projects / Sites / Clients from text or explicit projectName
  const projectPatterns = [
    { name: "MKC (Metro Kings Court)", regex: /\bmkc\b|kings?\s*court/i },
    { name: "Happy Homes Project", regex: /happy\s*home/i },
    { name: "Metro Oasis", regex: /\boasis\b/i },
    { name: "Saheed Nagar Project", regex: /saheed\s*nagar/i },
    { name: "Athagarh Resort & Portacabin", regex: /athagar|portacabin|resort/i },
    { name: "Kunheipada Project", regex: /kunheipada/i },
    { name: "Nayeema Ma'am Residence", regex: /nayeema/i },
    { name: "Bandhumilan & Corporate Events", regex: /bandhumilan|prameya|advertisement|news\s*paper/i }
  ];

  for (const item of projectPatterns) {
    if (item.regex.test(rawText) || item.regex.test(explicitProj)) {
      stream = item.name;
      break;
    }
  }

  if (!stream && explicitProj && explicitProj.toLowerCase() !== "internal" && explicitProj.toLowerCase() !== "general") {
    stream = explicitProj.charAt(0).toUpperCase() + explicitProj.slice(1);
  }

  // 2. Accurate Department-Aware Functional Categorization
  const text = rawText.toLowerCase();

  if (dept.includes("engineer") || dept.includes("civil") || dept.includes("construct")) {
    if (/slab|cast|masonry|shutter|bar\s*bend|brick|plaster|curing|excavat|pile|rcc|civil|concreting|beam|column|block\s*work|flooring/i.test(text)) {
      category = "Site Execution & Civil Works";
      if (!stream) stream = "Civil Execution & Structural Works";
    } else if (/inspection|quality|cube\s*test|slump|check|snag|defect|audit|progress\s*review|labour\s*check/i.test(text)) {
      category = "Quality Control & Site Inspections";
      if (!stream) stream = "Site Quality Inspections";
    } else if (/quantity|boq|qs|measurement|estimation|abstract|steel\s*take|consumption|cement\s*consum/i.test(text)) {
      category = "Quantity Survey & Cost Estimation";
      if (!stream) stream = "Quantity Survey & Estimation";
    } else if (/gang|labour|contractor|manpower|agency|mason|carpenter|barbinder|attendance/i.test(text)) {
      category = "Contractor & Labour Coordination";
      if (!stream) stream = "Contractor & Gang Management";
    } else if (/drawing|structural|architect|layout|elevation|cad|dwg|revision|gfc/i.test(text)) {
      category = "Technical Drawings & Engineering Planning";
      if (!stream) stream = "Drawings & Engineering Design";
    } else if (/po\b|indent|material|gate\s*pass|received|dispatch|stock|cement|sand|aggregate|tmt/i.test(text)) {
      category = "Material Indent & Site Logistics";
      if (!stream) stream = "Site Material Logistics";
    } else {
      category = "Site Operations & Execution";
      if (!stream) stream = "General Site Supervision";
    }
  } else if (dept.includes("sale") || dept.includes("marketing")) {
    if (/walk-in|site\s*visit|client\s*meet|customer\s*meet|investor|in-person|face\s*to\s*face|discussion\s*with/i.test(text)) {
      category = "Client Meetings & Site Walk-ins";
      if (!stream) stream = "Client Walk-ins & Site Presentations";
    } else if (/call|lead|telecall|followup|follow-up|prospect|dial|cold\s*call|whatsapp|crm/i.test(text)) {
      category = "Lead Calling & Client Follow-ups";
      if (!stream) stream = "Lead Follow-up Pipeline";
    } else if (/booking|token|allotment|discount|unit|flat|villa|cost\s*sheet|payment\s*schedule|quotation|price/i.test(text)) {
      category = "Bookings, Pricing & Inventory";
      if (!stream) stream = "Inventory & Booking Closures";
    } else if (/campaign|social\s*media|meta|ad\b|facebook|instagram|hoarding|brochure|creative|event|expo|paper/i.test(text)) {
      category = "Marketing Campaigns & Media";
      if (!stream) stream = "Campaigns & Brand Marketing";
    } else {
      category = "Sales Engagements & Client Relations";
      if (!stream) stream = "Sales Pipeline Management";
    }
  } else if (dept.includes("finance") || dept.includes("account")) {
    if (/bank|reconcil|statement|cheque|rtgs|neft|fund|transfer|balance|current\s*a\/c/i.test(text)) {
      category = "Bank Reconciliation & Treasury";
      if (!stream) stream = "Bank & Treasury Operations";
    } else if (/invoice|bill\s*clearance|voucher|journal|entry|tally|vendor\s*bill|passing|payable|ledger/i.test(text)) {
      category = "Invoicing & Bill Clearance";
      if (!stream) stream = "Vendor Invoices & Vouchers";
    } else if (/gst|tds|tax|audit|return|filing|compliance|challan/i.test(text)) {
      category = "Taxation, GST & Statutory Audit";
      if (!stream) stream = "GST & Statutory Filings";
    } else if (/collection|receipt|cleared|debtor|outstanding|aging|demand/i.test(text)) {
      category = "Collections & Receivable Accounting";
      if (!stream) stream = "Customer Collections & Receivables";
    } else {
      category = "Financial & Ledger Accounting";
      if (!stream) stream = "General Accounting & Ledgers";
    }
  } else if (dept.includes("legal") || dept.includes("liasion")) {
    if (/cmc|atp|bda|sro|tehsil|collector|government|govt|approval|noc|fire|pollution|rera/i.test(text)) {
      category = "Municipal & Statutory Approvals";
      if (!stream) stream = "Govt & Authority Liaisoning";
    } else if (/mutation|khata|patta|ror|registry|land|deed|stamp|khatauni|possession/i.test(text)) {
      category = "Land Mutation & Title Deeds";
      if (!stream) stream = "Land Records & Mutation";
    } else if (/agreement|sale\s*deed|ats|draft|clause|legal\s*notice|court|affidavit|vetting/i.test(text)) {
      category = "Agreement Drafting & Legal Vetting";
      if (!stream) stream = "Legal Agreements & Drafting";
    } else {
      category = "Legal Compliance & Documentation";
      if (!stream) stream = "Legal & Statutory Affairs";
    }
  } else if (dept.includes("studio") || dept.includes("red") || dept.includes("interior") || dept.includes("design")) {
    if (/3d|render|sketchup|lumion|vray|photoshop|model|visualization|elevation/i.test(text)) {
      category = "3D Visualization & Architectural Renders";
      if (!stream) stream = "3D Modeling & Visuals";
    } else if (/boq|estimate|interior\s*cost|specification|furniture|plywood|laminate|hardware/i.test(text)) {
      category = "Interior BOQ & Cost Estimation";
      if (!stream) stream = "Interior Costing & BOQ";
    } else if (/client\s*meet|presentation|moodboard|selection|feedback|concept/i.test(text)) {
      category = "Client Consultations & Presentations";
      if (!stream) stream = "Design Consultations";
    } else if (/site\s*visit|interior\s*execution|fitout|carpentry|modular|finish|snag/i.test(text)) {
      category = "Interior Execution & Quality Audit";
      if (!stream) stream = "Site Fitout Execution";
    } else {
      category = "Interior Design & Visualizations";
      if (!stream) stream = "Interior Design Concepts";
    }
  } else if (dept.includes("hr") || dept.includes("human") || dept.includes("admin")) {
    if (/interview|recruit|hire|candidate|resume|screening|shortlist|portal/i.test(text)) {
      category = "Talent Acquisition & Interviews";
      if (!stream) stream = "Recruitment & Talent Sourcing";
    } else if (/offer\s*letter|onboarding|joining|induction|documents|bgv/i.test(text)) {
      category = "Onboarding & Documentation";
      if (!stream) stream = "New Hire Onboarding";
    } else if (/attendance|biometric|salary|payroll|leave|pf|esic|slip/i.test(text)) {
      category = "Payroll & Attendance Management";
      if (!stream) stream = "Payroll & Biometric Tracking";
    } else if (/policy|training|employee\s*engagement|welfare|discipline|event/i.test(text)) {
      category = "Employee Relations & Culture";
      if (!stream) stream = "Employee Engagement & HR Policy";
    } else {
      category = "Human Resources & Administration";
      if (!stream) stream = "HR Operations & Admin";
    }
  } else if (dept.includes("purchase") || dept.includes("procure") || dept.includes("store")) {
    if (/po\b|purchase\s*order|work\s*order|wo\b|indent|requisition/i.test(text)) {
      category = "Purchase Orders & Indents";
      if (!stream) stream = "PO Generation & Approvals";
    } else if (/rate|comparison|negotiat|quotation|vendor\s*meet|supplier/i.test(text)) {
      category = "Vendor Negotiation & Rate Finalization";
      if (!stream) stream = "Vendor Comparison & Procurement";
    } else if (/dispatch|delivery|chalan|challan|received|stock|inventory|store|material\s*gate/i.test(text)) {
      category = "Material Inward & Store Inventory";
      if (!stream) stream = "Inventory & Goods Receipt";
    } else {
      category = "Procurement & Vendor Management";
      if (!stream) stream = "Material Procurement";
    }
  } else if (dept.includes("crm") || dept.includes("customer")) {
    if (/possession|handover|snag\s*list|key\s*handover|welcome/i.test(text)) {
      category = "Customer Handover & Possession";
      if (!stream) stream = "Handover & Unit Possessions";
    } else if (/demand\s*letter|milestone|call\s*for\s*payment|payment\s*reminder|installment/i.test(text)) {
      category = "Demand Letters & Milestone Billing";
      if (!stream) stream = "Milestone Invoicing & Demands";
    } else if (/query|complaint|grievance|ticket|escalation|resolution|feedback/i.test(text)) {
      category = "Customer Query Resolution";
      if (!stream) stream = "Customer Support & Grievances";
    } else {
      category = "Customer Relations & Support";
      if (!stream) stream = "Customer Relationship Operations";
    }
  } else {
    // Cross-functional / General Fallback
    if (/meeting|discussed|discussion|briefing|visit|review/i.test(text)) {
      category = "Client & Management Meetings";
      if (!stream) stream = "Operational Meetings & Reviews";
    } else if (/call|followed\s*up|follow-up|communicated|mail|whatsapp/i.test(text)) {
      category = "Stakeholder Follow-ups & Coordination";
      if (!stream) stream = "Stakeholder Communications";
    } else if (/excel|tracker|report|sheet|checklist|document|updated|mis/i.test(text)) {
      category = "MIS Reporting & Documentation";
      if (!stream) stream = "MIS Tracking & Documentation";
    } else if (/bill|payment|invoice|rate|budget|cost|account/i.test(text)) {
      category = "Billing & Financial Coordination";
      if (!stream) stream = "Billing & Expense Tracking";
    } else if (/site|civil|mep|work|inspection|labour/i.test(text)) {
      category = "Site & Field Operations";
      if (!stream) stream = "Field & Site Coordination";
    } else {
      category = "Core Departmental Operations";
      if (!stream) stream = "Daily Operational Deliverables";
    }
  }

  return { stream, category, cleanText: rawText };
}

function getAllMergedAnalyticsReports() {
  // Combine localStorage reports with all cloud-fetched reports in memory
  const local = reports();
  local.forEach(r => {
    if (r && r.id) analyticsMemoryReportsMap.set(r.id, r);
  });
  return Array.from(analyticsMemoryReportsMap.values());
}

function setAnalyticsCloudStatus(text, tone = "info") {
  const badge = document.getElementById("analyticsCloudStatusBadge");
  if (!badge) return;
  if (tone === "loading") {
    badge.style.background = "#fef3c7";
    badge.style.color = "#b45309";
    badge.style.borderColor = "#fde68a";
    badge.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${escapeHtml(text)}`;
  } else if (tone === "success") {
    badge.style.background = "#dcfce7";
    badge.style.color = "#15803d";
    badge.style.borderColor = "#bbf7d0";
    badge.innerHTML = `<i class="fa-solid fa-cloud-check"></i> ${escapeHtml(text)}`;
  } else {
    badge.style.background = "#eff6ff";
    badge.style.color = "#2563eb";
    badge.style.borderColor = "#bfdbfe";
    badge.innerHTML = `<i class="fa-solid fa-cloud-arrow-down"></i> ${escapeHtml(text)}`;
  }
}

async function fetchAnalyticsCloudData(targetUser, dateRange, force = false) {
  if (!targetUser || !targetUser.employeeId) return;
  const empId = String(targetUser.employeeId).trim();
  const deptName = String(targetUser.department || "").trim();
  const rangeKey = `${deptName}_${dateRange.startDate}_${dateRange.endDate}`;

  const needEmp = force || !analyticsFetchedEmployees.has(empId);
  const needRange = force || (!dateRange.isAllTime && !analyticsFetchedRanges.has(rangeKey));

  if (!needEmp && !needRange) return;
  if (analyticsCloudSyncInFlight && !force) return;

  analyticsCloudSyncInFlight = true;
  setAnalyticsCloudStatus(`Syncing ${targetUser.name}'s DAR history...`, "loading");

  function ingestCloudRows(rows) {
    if (!Array.isArray(rows)) return;
    rows.forEach(r => {
      const norm = normalizeReport({
        ...r,
        employeeId: r.employee_id,
        employeeName: r.employee_name,
        managerId: r.manager_id,
        managerName: r.manager_name,
        date: r.report_date,
        type: r.report_type,
        projectName: r.project_name,
        approvalStatus: r.approval_status,
        reviewedBy: r.reviewed_by,
        reviewedAt: r.reviewed_at,
        reviewComment: r.review_comment,
        submittedAt: r.submitted_at,
        points: (Array.isArray(r.points) ? r.points : []).map(pt => {
          const copy = { ...pt };
          delete copy.attachmentData;
          return copy;
        })
      });
      analyticsMemoryReportsMap.set(norm.id, norm);
    });
  }

  try {
    const client = adminDb || db;

    // 1. Immediately fetch selected employee's full report history (fast & lightweight)
    if (needEmp) {
      const empRes = await client.from("metro_reports")
        .select("id, employee_id, employee_name, manager_id, manager_name, report_date, report_type, project_name, approval_status, reviewed_by, reviewed_at, review_comment, submitted_at, points")
        .eq("employee_id", empId)
        .order("report_date", { ascending: false })
        .limit(1000);
      if (empRes && !empRes.error && Array.isArray(empRes.data)) {
        ingestCloudRows(empRes.data);
        analyticsFetchedEmployees.add(empId);
      }
    }

    // Check if the employee has 0 reports in current selected month, and if so, auto-adjust to their most recent valid report month
    const allEmpReps = getAllMergedAnalyticsReports().filter(r =>
      normalizeEmployeeId(r.employeeId) === normalizeEmployeeId(empId) &&
      r.date && r.date <= today()
    ).sort((a, b) => b.date.localeCompare(a.date));

    if (selectedAnalyticsPeriod === "monthly" && allEmpReps.length > 0) {
      const currentMonthPrefix = selectedAnalyticsDate || today().slice(0, 7);
      const hasInCurrentMonth = allEmpReps.some(r => String(r.date || "").startsWith(currentMonthPrefix));
      if (!hasInCurrentMonth) {
        const latestMonth = allEmpReps[0].date.slice(0, 7);
        selectedAnalyticsDate = latestMonth;
        const dateInput = document.getElementById("analyticsDateInput");
        if (dateInput && dateInput.type === "month") dateInput.value = latestMonth;
      }
    }

    // Re-render immediately once employee data is ready
    if (activeSectionId === "workAnalyticsSection") {
      renderWorkAnalytics(activeUser(), true);
    }

    // 2. Fetch department peer reports for the active period to power accurate Department Benchmark
    if (needRange && !dateRange.isAllTime) {
      const deptPeerIds = users()
        .filter(u => u.department === targetUser.department && !isAdmin(u) && !isLevel1(u))
        .map(u => String(u.employeeId).trim())
        .filter(Boolean);

      if (deptPeerIds.length > 0) {
        const deptRes = await client.from("metro_reports")
          .select("id, employee_id, employee_name, manager_id, manager_name, report_date, report_type, project_name, approval_status, reviewed_by, reviewed_at, review_comment, submitted_at, points")
          .in("employee_id", deptPeerIds)
          .gte("report_date", dateRange.startDate)
          .lte("report_date", dateRange.endDate)
          .limit(1000);
        if (deptRes && !deptRes.error && Array.isArray(deptRes.data)) {
          ingestCloudRows(deptRes.data);
          analyticsFetchedRanges.add(rangeKey);
        }
      }
    }

    const totalPts = allEmpReps.reduce((acc, r) => acc + (Array.isArray(r.points) ? r.points.length : 0), 0);
    setAnalyticsCloudStatus(`Synced: ${allEmpReps.length} Reports (${totalPts} Points)`, "success");
  } catch (err) {
    console.warn("fetchAnalyticsCloudData warning:", err);
    setAnalyticsCloudStatus("Using cached data", "info");
  } finally {
    analyticsCloudSyncInFlight = false;
    if (activeSectionId === "workAnalyticsSection") {
      renderWorkAnalytics(activeUser(), true);
    }
  }
}

async function fetchAnalyticsDeptCloudData(deptName, dateRange, force = false) {
  if (!deptName) return;
  const rangeKey = `DEPT_${deptName}_${dateRange.startDate}_${dateRange.endDate}`;
  if (!force && analyticsFetchedRanges.has(rangeKey)) return;

  const deptUsers = users().filter(u => u.department === deptName && !isAdmin(u) && !isLevel1(u));
  const ids = deptUsers.map(u => String(u.employeeId).trim()).filter(Boolean);
  if (ids.length === 0) return;

  setAnalyticsCloudStatus(`Syncing ${deptName} team data...`, "loading");
  try {
    const client = adminDb || db;
    let query = client.from("metro_reports")
      .select("id, employee_id, employee_name, manager_id, manager_name, report_date, report_type, project_name, approval_status, reviewed_by, reviewed_at, review_comment, submitted_at, points")
      .in("employee_id", ids);
    if (!dateRange.isAllTime) {
      query = query.gte("report_date", dateRange.startDate).lte("report_date", dateRange.endDate);
    }
    const res = await query.limit(2000);
    if (res && !res.error && Array.isArray(res.data)) {
      res.data.forEach(r => {
        const norm = normalizeReport({
          ...r,
          employeeId: r.employee_id,
          employeeName: r.employee_name,
          managerId: r.manager_id,
          managerName: r.manager_name,
          date: r.report_date,
          type: r.report_type,
          projectName: r.project_name,
          approvalStatus: r.approval_status,
          reviewedBy: r.reviewed_by,
          reviewedAt: r.reviewed_at,
          reviewComment: r.review_comment,
          submittedAt: r.submitted_at,
          points: (Array.isArray(r.points) ? r.points : []).map(pt => {
            const copy = { ...pt };
            delete copy.attachmentData;
            return copy;
          })
        });
        analyticsMemoryReportsMap.set(norm.id, norm);
      });
      analyticsFetchedRanges.add(rangeKey);
      setAnalyticsCloudStatus(`Synced ${deptName} (${res.data.length} DARs)`, "success");
    }
  } catch (e) {
    console.warn("fetchAnalyticsDeptCloudData error:", e);
    setAnalyticsCloudStatus("Using cached data", "info");
  } finally {
    if (activeSectionId === "workAnalyticsSection") {
      renderWorkAnalytics(activeUser(), true);
    }
  }
}

function initWorkAnalyticsEvents() {
  if (analyticsEventsInitialized) return;
  analyticsEventsInitialized = true;

  const viewEmpBtn = document.getElementById("analyticsViewEmployeeBtn");
  const viewDeptBtn = document.getElementById("analyticsViewDeptBtn");
  const empInput = document.getElementById("analyticsEmployeeInput");
  const empSelect = document.getElementById("analyticsEmployeeSelect");
  const deptSelect = document.getElementById("analyticsDeptFilter");
  const monthlyBtn = document.getElementById("analyticsPeriodMonthly");
  const weeklyBtn = document.getElementById("analyticsPeriodWeekly");
  const dailyBtn = document.getElementById("analyticsPeriodDaily");
  const allTimeBtn = document.getElementById("analyticsPeriodAllTime");
  const dateInput = document.getElementById("analyticsDateInput");
  const regenerateBtn = document.getElementById("analyticsRegenerateReviewBtn");
  const refreshCloudBtn = document.getElementById("analyticsRefreshCloudBtn");
  const exportBtn = document.getElementById("analyticsExportBtn");
  const copyBtn = document.getElementById("analyticsCopyReviewBtn");
  const pointSearchInput = document.getElementById("analyticsPointSearchInput");
  const clearPointFilterBtn = document.getElementById("analyticsClearPointFilterBtn");

  function setAnalyticsViewMode(mode) {
    analyticsViewMode = mode;
    viewEmpBtn?.classList.toggle("active", mode === "employee");
    viewDeptBtn?.classList.toggle("active", mode === "dept");
    
    const activeLabel = document.getElementById("analyticsActiveViewLabel");
    const empWrap = document.getElementById("analyticsEmployeeDashboardWrap");
    const deptWrap = document.getElementById("analyticsDeptDashboardWrap");
    const empSearchWrap = document.getElementById("analyticsEmployeeSearchWrap");
    const empSelectWrap = document.getElementById("analyticsEmployeeSelectWrap");

    if (mode === "employee") {
      if (activeLabel) activeLabel.textContent = "Viewing: Individual Appraisal Mode";
      if (empWrap) empWrap.style.display = "block";
      if (deptWrap) deptWrap.style.display = "none";
      if (empSearchWrap) empSearchWrap.style.display = "block";
      if (empSelectWrap) empSelectWrap.style.display = "block";
    } else {
      if (activeLabel) activeLabel.textContent = "Viewing: Department Operations Analysis";
      if (empWrap) empWrap.style.display = "none";
      if (deptWrap) deptWrap.style.display = "block";
      if (empSearchWrap) empSearchWrap.style.display = "none";
      if (empSelectWrap) empSelectWrap.style.display = "none";
    }
    renderWorkAnalytics(activeUser());
  }

  viewEmpBtn?.addEventListener("click", () => setAnalyticsViewMode("employee"));
  viewDeptBtn?.addEventListener("click", () => setAnalyticsViewMode("dept"));

  function selectEmployeeAndRender(empId) {
    if (!empId) return;
    selectedAnalyticsEmployeeId = empId;
    analyticsSelectedDateFilter = "";
    analyticsSelectedProjectFilter = "";
    renderWorkAnalytics(activeUser());
  }

  empInput?.addEventListener("focus", () => {
    empInput.select();
  });

  empInput?.addEventListener("input", (e) => {
    const val = (e.target.value || "").trim();
    if (!val) return;
    const eligible = getEligibleAnalyticsUsers();
    const lower = val.toLowerCase();
    const exact = eligible.find(u =>
      String(u.employeeId).toLowerCase() === lower ||
      `${u.name} (${u.employeeId})`.toLowerCase() === lower ||
      String(u.name || "").toLowerCase() === lower
    );
    const partial = exact || eligible.find(u =>
      String(u.employeeId).toLowerCase().includes(lower) ||
      String(u.name || "").toLowerCase().includes(lower)
    );
    if (partial && partial.employeeId !== selectedAnalyticsEmployeeId) {
      selectedAnalyticsEmployeeId = partial.employeeId;
      analyticsSelectedDateFilter = "";
      analyticsSelectedProjectFilter = "";
      renderWorkAnalytics(activeUser());
    }
  });

  empInput?.addEventListener("change", (e) => {
    const val = (e.target.value || "").trim();
    const eligible = getEligibleAnalyticsUsers();
    const lower = val.toLowerCase();
    const found = eligible.find(u =>
      String(u.employeeId).toLowerCase() === lower ||
      `${u.name} (${u.employeeId})`.toLowerCase() === lower ||
      String(u.name || "").toLowerCase().includes(lower) ||
      String(u.employeeId).toLowerCase().includes(lower)
    );
    if (found) {
      selectEmployeeAndRender(found.employeeId);
    }
  });

  empSelect?.addEventListener("change", (e) => {
    const empId = e.target.value;
    if (empId) {
      selectEmployeeAndRender(empId);
    }
  });

  deptSelect?.addEventListener("change", (e) => {
    selectedAnalyticsDepartment = e.target.value;
    const allEligible = getEligibleAnalyticsUsers().filter(u => !selectedAnalyticsDepartment || u.department === selectedAnalyticsDepartment);
    if (allEligible.length > 0 && (!selectedAnalyticsEmployeeId || !allEligible.some(u => u.employeeId === selectedAnalyticsEmployeeId))) {
      selectedAnalyticsEmployeeId = allEligible[0].employeeId;
    }
    analyticsSelectedDateFilter = "";
    analyticsSelectedProjectFilter = "";
    renderWorkAnalytics(activeUser());
  });

  function updatePeriodUI(period) {
    selectedAnalyticsPeriod = period;
    monthlyBtn?.classList.toggle("active", period === "monthly");
    weeklyBtn?.classList.toggle("active", period === "weekly");
    dailyBtn?.classList.toggle("active", period === "daily");
    allTimeBtn?.classList.toggle("active", period === "alltime");

    const dateWrap = document.getElementById("analyticsDatePickerWrap");
    const dateLabel = document.getElementById("analyticsDateLabel");
    const weekRangeDisp = document.getElementById("analyticsWeekRangeDisplay");

    if (period === "alltime") {
      if (dateWrap) dateWrap.style.opacity = "0.45";
      if (dateInput) dateInput.disabled = true;
      if (dateLabel) dateLabel.textContent = "5. All Career Dates";
      if (weekRangeDisp) weekRangeDisp.style.display = "none";
    } else if (period === "daily") {
      if (dateWrap) dateWrap.style.opacity = "1";
      if (dateInput) {
        dateInput.disabled = false;
        dateInput.type = "date";
        dateInput.value = selectedAnalyticsDate && selectedAnalyticsDate.length === 10 ? selectedAnalyticsDate : today();
        selectedAnalyticsDate = dateInput.value;
      }
      if (dateLabel) dateLabel.textContent = "5. Select Day";
      if (weekRangeDisp) weekRangeDisp.style.display = "none";
    } else if (period === "weekly") {
      if (dateWrap) dateWrap.style.opacity = "1";
      if (dateInput) {
        dateInput.disabled = false;
        dateInput.type = "date";
        dateInput.value = selectedAnalyticsDate && selectedAnalyticsDate.length === 10 ? selectedAnalyticsDate : today();
        selectedAnalyticsDate = dateInput.value;
      }
      if (dateLabel) dateLabel.textContent = "5. Select Week Date";
    } else { // monthly
      if (dateWrap) dateWrap.style.opacity = "1";
      if (dateInput) {
        dateInput.disabled = false;
        dateInput.type = "month";
        dateInput.value = selectedAnalyticsDate && selectedAnalyticsDate.length === 7 ? selectedAnalyticsDate : today().slice(0, 7);
        selectedAnalyticsDate = dateInput.value;
      }
      if (dateLabel) dateLabel.textContent = "5. Select Month";
      if (weekRangeDisp) weekRangeDisp.style.display = "none";
    }
    analyticsSelectedDateFilter = "";
    renderWorkAnalytics(activeUser());
  }

  monthlyBtn?.addEventListener("click", () => updatePeriodUI("monthly"));
  weeklyBtn?.addEventListener("click", () => updatePeriodUI("weekly"));
  dailyBtn?.addEventListener("click", () => updatePeriodUI("daily"));
  allTimeBtn?.addEventListener("click", () => updatePeriodUI("alltime"));

  dateInput?.addEventListener("change", (e) => {
    selectedAnalyticsDate = e.target.value;
    analyticsSelectedDateFilter = "";
    renderWorkAnalytics(activeUser());
  });

  regenerateBtn?.addEventListener("click", () => {
    analyticsReviewStyleSeed = (analyticsReviewStyleSeed + 1) % 5;
    renderWorkAnalytics(activeUser(), true);
    if (typeof showToast === "function") {
      showToast("Review Regenerated", "Executive appraisal synthesized with a fresh perspective.");
    }
  });

  refreshCloudBtn?.addEventListener("click", () => {
    const targetUser = users().find(u => normalizeEmployeeId(u.employeeId) === normalizeEmployeeId(selectedAnalyticsEmployeeId));
    const currentDept = selectedAnalyticsDepartment || (targetUser ? targetUser.department : "");
    const dateRange = getAnalyticsDateRange(selectedAnalyticsPeriod, selectedAnalyticsDate, targetUser);
    
    if (analyticsViewMode === "dept") {
      if (currentDept) fetchAnalyticsDeptCloudData(currentDept, dateRange, true);
    } else if (targetUser) {
      fetchAnalyticsCloudData(targetUser, dateRange, true);
    }
  });

  exportBtn?.addEventListener("click", () => {
    window.print();
  });

  copyBtn?.addEventListener("click", () => {
    const content = document.getElementById("analyticsSmartReviewContent");
    if (content) {
      const text = content.innerText || content.textContent;
      navigator.clipboard?.writeText(text).then(() => {
        if (typeof showToast === "function") showToast("Copied", "Executive appraisal copied to clipboard!");
      }).catch(() => {
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        if (typeof showToast === "function") showToast("Copied", "Executive appraisal copied to clipboard!");
      });
    }
  });

  pointSearchInput?.addEventListener("input", (e) => {
    analyticsPointSearchQuery = (e.target.value || "").trim();
    renderWorkAnalytics(activeUser(), true);
  });

  clearPointFilterBtn?.addEventListener("click", () => {
    analyticsPointSearchQuery = "";
    analyticsSelectedDateFilter = "";
    analyticsSelectedProjectFilter = "";
    if (pointSearchInput) pointSearchInput.value = "";
    renderWorkAnalytics(activeUser(), true);
  });
}

function getEligibleAnalyticsUsers() {
  return users()
    .filter(u => u && u.employeeId && !isAdmin(u) && !isLevel1(u))
    .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
}

function getAnalyticsDateRange(period, dateValue, targetUser) {
  const todayStr = today();
  if (period === "alltime") {
    const allReps = getAllMergedAnalyticsReports().filter(r =>
      targetUser && normalizeEmployeeId(r.employeeId) === normalizeEmployeeId(targetUser.employeeId) &&
      r.date && r.date <= todayStr
    );
    const dates = allReps.map(r => r.date).filter(Boolean).sort();
    const startStr = dates.length > 0 ? dates[0] : `${todayStr.slice(0, 4)}-01-01`;
    const endStr = dates.length > 0 ? dates[dates.length - 1] : todayStr;
    return {
      startDate: startStr,
      endDate: endStr,
      label: `All-Time Career History (${startStr} to ${endStr})`,
      isWeekly: false,
      isDaily: false,
      isAllTime: true
    };
  } else if (period === "daily") {
    const dStr = (dateValue && dateValue.length === 10) ? dateValue : todayStr;
    const dObj = new Date(`${dStr}T00:00:00`);
    const dayName = Number.isNaN(dObj.getTime()) ? dStr : dObj.toLocaleDateString("en-US", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
    return {
      startDate: dStr,
      endDate: dStr,
      label: `Daily Activity: ${dayName}`,
      isWeekly: false,
      isDaily: true,
      isAllTime: false
    };
  } else if (period === "weekly") {
    const refStr = dateValue && dateValue.length === 10 ? dateValue : todayStr;
    const ref = new Date(`${refStr}T00:00:00`);
    const day = ref.getDay();
    const diffToMon = ref.getDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(ref);
    mon.setDate(diffToMon);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    const startStr = dateKey(mon);
    const endStr = dateKey(sun);
    const monFmt = mon.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
    const sunFmt = sun.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
    const label = `Week Range: ${monFmt} – ${sunFmt}`;
    return {
      startDate: startStr,
      endDate: endStr,
      label,
      isWeekly: true,
      isDaily: false,
      isAllTime: false,
      weekStartLabel: monFmt,
      weekEndLabel: sunFmt
    };
  } else {
    const ym = (dateValue && dateValue.length === 7) ? dateValue : todayStr.slice(0, 7);
    const [year, month] = ym.split("-").map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    const startStr = `${ym}-01`;
    const endStr = `${ym}-${String(lastDay).padStart(2, "0")}`;
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const label = `${monthNames[(month || 1) - 1] || ym} ${year}`;
    return {
      startDate: startStr,
      endDate: endStr,
      label,
      isWeekly: false,
      isDaily: false,
      isAllTime: false,
      year,
      month,
      lastDay
    };
  }
}

function calculateAnalyticsMetrics(targetUser, dateRange) {
  const { startDate, endDate } = dateRange;
  const todayStr = today();
  const effectiveEndDate = endDate > todayStr ? todayStr : endDate;

  const allReps = getAllMergedAnalyticsReports();
  const allLvs = leaves();
  const allTsks = tasks();

  // All-Time Career Summary for this employee (excluding invalid future dates like 2058)
  const careerReports = allReps.filter(r => {
    if (normalizeEmployeeId(r.employeeId) !== normalizeEmployeeId(targetUser.employeeId)) return false;
    const rDate = r.date || r.report_date || "";
    return rDate && rDate <= todayStr;
  }).sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  let careerTotalMinutes = 0;
  let careerTotalPoints = 0;
  careerReports.forEach(r => {
    (r.points || []).forEach(p => {
      const m = parsePointMinutes(p);
      careerTotalMinutes += m;
      if (m > 0 || (p.rawText || p.text)) careerTotalPoints++;
    });
  });
  const careerFirstDate = careerReports.length > 0 ? careerReports[careerReports.length - 1].date : "--";
  const careerLastDate = careerReports.length > 0 ? careerReports[0].date : "--";

  // Period Reports for this employee
  const empReports = careerReports.filter(r => {
    const rDate = r.date || r.report_date || "";
    return rDate >= startDate && rDate <= endDate;
  });

  const dailyMap = {};
  let totalPointsCount = 0;
  let timedPointsCount = 0;
  let approvedReportsCount = 0;

  empReports.forEach(r => {
    const rDate = r.date || r.report_date || "";
    if (!rDate) return;
    if (r.approvalStatus === "approved") approvedReportsCount++;

    if (!dailyMap[rDate]) {
      dailyMap[rDate] = {
        date: rDate,
        totalMinutes: 0,
        points: [],
        approvalStatus: r.approvalStatus || "pending",
        submittedAt: r.submittedAt,
        projectName: r.projectName || "",
        reportType: r.type || "internal"
      };
    }

    const pts = Array.isArray(r.points) ? r.points : [];
    // Deduplicate identical 0m points if a non-zero point with same text exists on the same day
    const nonZeroTexts = new Set(
      pts.filter(p => parsePointMinutes(p) > 0)
         .map(p => String(p.rawText || p.text || "").replace(/^\d+\.\s*/, "").trim().toLowerCase())
    );

    pts.forEach(p => {
      const mins = parsePointMinutes(p);
      const cleanTxt = String(p.rawText || p.text || "").replace(/^\d+\.\s*/, "").trim();
      if (mins === 0 && nonZeroTexts.has(cleanTxt.toLowerCase())) {
        return; // Skip duplicate 0m artifact
      }
      const classification = classifyDarPoint(p, r, targetUser.department);
      dailyMap[rDate].totalMinutes += mins;
      dailyMap[rDate].points.push({
        ...p,
        minutes: mins,
        formattedTime: mins > 0 ? formatMinutesToHrMin(mins) : (p.totalTime || "0m"),
        cleanText: cleanTxt,
        stream: classification.stream,
        category: classification.category,
        date: rDate,
        submittedAt: r.submittedAt,
        approvalStatus: r.approvalStatus || "pending"
      });
      totalPointsCount++;
      if (mins > 0) timedPointsCount++;
    });
  });

  let totalMinutes = 0;
  Object.values(dailyMap).forEach(d => { totalMinutes += d.totalMinutes; });
  const totalHours = Math.round((totalMinutes / 60) * 10) / 10;
  const totalFormatted = formatMinutesToHrMin(totalMinutes);
  const submissionDays = Object.keys(dailyMap).length;

  let expectedWorkingDays = 0;
  let leaveDays = 0;
  let holidayDays = 0;

  const sDate = new Date(`${startDate}T00:00:00`);
  const eDate = new Date(`${effectiveEndDate < startDate ? endDate : effectiveEndDate}T00:00:00`);
  const fullEndDate = new Date(`${endDate}T00:00:00`);
  const cur = new Date(sDate);
  const dateList = [];

  // Guard against overly huge day loops in All-Time mode if span > 120 days
  const maxChartDays = 90;
  let loopStart = new Date(sDate);
  if (dateRange.isAllTime) {
    const diffDays = Math.round((eDate - sDate) / (1000 * 60 * 60 * 24));
    if (diffDays > maxChartDays) {
      loopStart = new Date(eDate);
      loopStart.setDate(loopStart.getDate() - maxChartDays);
    }
  }

  while (cur <= fullEndDate) {
    const dStr = dateKey(cur);
    const dayOfWeek = cur.getDay();
    const isSunday = dayOfWeek === 0;
    const isHoliday = typeof isHolidayDate === "function" ? isHolidayDate(dStr) : false;
    const isFuture = dStr > todayStr;

    const onLeave = allLvs.some(l => {
      if (normalizeEmployeeId(l.employeeId) !== normalizeEmployeeId(targetUser.employeeId)) return false;
      const ls = l.startDate || "";
      const le = l.endDate || ls;
      return dStr >= ls && dStr <= le;
    });

    if (!isFuture) {
      if (!isSunday && !isHoliday) {
        expectedWorkingDays++;
        if (onLeave) leaveDays++;
      } else if (!isSunday && isHoliday) {
        holidayDays++;
      }
    }

    if (!dateRange.isAllTime || cur >= loopStart) {
      const dayEntry = dailyMap[dStr];
      const dayMins = dayEntry ? dayEntry.totalMinutes : 0;
      const ptsCount = dayEntry ? dayEntry.points.length : 0;
      dateList.push({
        dateStr: dStr,
        dayOfWeek,
        isSunday,
        isHoliday,
        isFuture,
        onLeave,
        hasSubmission: !!dayEntry,
        minutes: dayMins,
        hours: Math.round((dayMins / 60) * 10) / 10,
        formattedTime: formatMinutesToHrMin(dayMins),
        pointsCount: ptsCount
      });
    }

    cur.setDate(cur.getDate() + 1);
  }

  const netWorkingDays = Math.max(1, expectedWorkingDays - leaveDays);
  const complianceRate = Math.min(100, Math.round((submissionDays / netWorkingDays) * 100));
  const avgDailyMinutes = submissionDays > 0 ? Math.round(totalMinutes / submissionDays) : 0;
  const avgDailyHours = submissionDays > 0 ? (totalHours / submissionDays).toFixed(1) : "0.0";
  const avgDailyFormatted = formatMinutesToHrMin(avgDailyMinutes);
  const avgPointsPerDay = submissionDays > 0 ? (totalPointsCount / submissionDays).toFixed(1) : "0.0";
  const avgMinutesPerPoint = timedPointsCount > 0 ? Math.round(totalMinutes / timedPointsCount) : 0;

  let ontimeCount = 0;
  empReports.forEach(r => {
    if (r.submittedAt) {
      const dt = new Date(r.submittedAt);
      const hour = dt.getHours();
      const min = dt.getMinutes();
      if (hour < 21 || (hour === 21 && min <= 30)) {
        ontimeCount++;
      }
    } else {
      ontimeCount++;
    }
  });
  const punctualityRate = empReports.length > 0 ? Math.round((ontimeCount / empReports.length) * 100) : 0;

  const empTasks = allTsks.filter(t => normalizeEmployeeId(t.targetId) === normalizeEmployeeId(targetUser.employeeId));
  const activeTasksCount = empTasks.filter(t => !t.completed).length;
  const completedTasksCount = empTasks.filter(t => t.completed).length;

  // Smart Project / Site / Work Stream Aggregation
  const projectMap = {};
  Object.values(dailyMap).forEach(dayObj => {
    dayObj.points.forEach(pt => {
      const key = pt.stream || "Core Departmental Operations";
      if (!projectMap[key]) {
        projectMap[key] = {
          name: key,
          category: pt.category || "Operations",
          minutes: 0,
          taskCount: 0,
          deliverables: []
        };
      }
      projectMap[key].minutes += pt.minutes;
      projectMap[key].taskCount++;
      if (pt.cleanText && projectMap[key].deliverables.length < 4) {
        const summaryItem = `${pt.cleanText} (${pt.formattedTime})`;
        if (!projectMap[key].deliverables.some(d => d.toLowerCase().startsWith(pt.cleanText.slice(0, 25).toLowerCase()))) {
          projectMap[key].deliverables.push(summaryItem);
        }
      }
    });
  });

  const projects = Object.values(projectMap).map(p => {
    const hours = Math.round((p.minutes / 60) * 10) / 10;
    const formattedTime = formatMinutesToHrMin(p.minutes);
    const pct = totalMinutes > 0 ? Math.round((p.minutes / totalMinutes) * 100) : Math.round((p.taskCount / Math.max(1, totalPointsCount)) * 100);
    return { ...p, hours, formattedTime, percentage: pct };
  }).sort((a, b) => (b.minutes - a.minutes) || (b.taskCount - a.taskCount));

  // Department Benchmark & Peer Ranking
  const deptUsers = users().filter(u => u.department === targetUser.department && !isAdmin(u) && !isLevel1(u));
  const peerMetrics = [];

  deptUsers.forEach(peer => {
    const peerReps = allReps.filter(r => {
      if (normalizeEmployeeId(r.employeeId) !== normalizeEmployeeId(peer.employeeId)) return false;
      const rDate = r.date || r.report_date || "";
      return rDate >= startDate && rDate <= endDate && rDate <= todayStr;
    });
    let pMins = 0;
    let pPts = 0;
    peerReps.forEach(r => {
      (r.points || []).forEach(pt => {
        const m = parsePointMinutes(pt);
        pMins += m;
        if (m > 0 || pt.rawText || pt.text) pPts++;
      });
    });
    peerMetrics.push({
      employeeId: peer.employeeId,
      name: peer.name,
      minutes: pMins,
      hours: Math.round((pMins / 60) * 10) / 10,
      points: pPts,
      days: peerReps.length
    });
  });

  peerMetrics.sort((a, b) => (b.minutes - a.minutes) || (b.points - a.points));
  const activePeers = peerMetrics.filter(p => p.minutes > 0 || p.days > 0);
  const peerPool = activePeers.length > 0 ? activePeers : peerMetrics;
  const deptTotalMinutes = peerPool.reduce((acc, p) => acc + p.minutes, 0);
  const deptTotalPoints = peerPool.reduce((acc, p) => acc + p.points, 0);
  const deptAvgMinutes = peerPool.length > 0 ? Math.round(deptTotalMinutes / peerPool.length) : totalMinutes;
  const deptAvgHours = Math.round((deptAvgMinutes / 60) * 10) / 10;
  const deptAvgPoints = peerPool.length > 0 ? Math.round(deptTotalPoints / peerPool.length) : totalPointsCount;
  const empRankIdx = peerMetrics.findIndex(p => normalizeEmployeeId(p.employeeId) === normalizeEmployeeId(targetUser.employeeId));
  const deptRank = empRankIdx >= 0 ? empRankIdx + 1 : 1;
  const deptTotalPeers = Math.max(1, peerMetrics.length);

  // 4-Pillar Efficiency Model
  // Pillar 1: Time Utilization (vs 7.5h / 450m per active or net working day)
  const targetActiveMins = dateRange.isDaily ? 450 : Math.max(1, submissionDays * 450);
  const pillarTimePct = submissionDays > 0 ? Math.min(100, Math.round((totalMinutes / targetActiveMins) * 100)) : 0;

  // Pillar 2: DAR Compliance Rate
  const pillarCompliancePct = complianceRate;

  // Pillar 3: Point Granularity & Documentation Quality (target ~5+ detailed timed points/day)
  const timedRatio = totalPointsCount > 0 ? (timedPointsCount / totalPointsCount) : 0;
  const densityScore = submissionDays > 0 ? Math.min(100, Math.round(((totalPointsCount / submissionDays) / 5) * 70 + (timedRatio * 30))) : 0;
  const pillarGranularityPct = Math.min(100, densityScore);

  // Pillar 4: Reporting Punctuality
  const pillarPunctualityPct = submissionDays > 0 ? punctualityRate : 0;

  const efficiencyScore = submissionDays === 0 ? 0 : Math.min(100, Math.round(
    (pillarTimePct * 0.35) +
    (pillarCompliancePct * 0.35) +
    (pillarGranularityPct * 0.15) +
    (pillarPunctualityPct * 0.15)
  ));

  let efficiencyTier = "No Submissions Yet";
  let tierColor = "#94a3b8";
  if (submissionDays > 0) {
    if (efficiencyScore >= 85) {
      efficiencyTier = "Exceptional Output (Tier 1)";
      tierColor = "#10b981";
    } else if (efficiencyScore >= 72) {
      efficiencyTier = "Strong Contributor (Tier 2)";
      tierColor = "#2563eb";
    } else if (efficiencyScore >= 55) {
      efficiencyTier = "Moderate / Developing (Tier 3)";
      tierColor = "#f59e0b";
    } else {
      efficiencyTier = "Needs Coaching (Tier 4)";
      tierColor = "#ef4444";
    }
  }

  return {
    careerReportsCount: careerReports.length,
    careerTotalPoints,
    careerTotalFormatted: formatMinutesToHrMin(careerTotalMinutes),
    careerFirstDate,
    careerLastDate,
    totalMinutes,
    totalHours,
    totalFormatted,
    totalPointsCount,
    timedPointsCount,
    avgPointsPerDay,
    avgMinutesPerPoint,
    submissionDays,
    expectedWorkingDays,
    holidayDays,
    leaveDays,
    netWorkingDays,
    complianceRate,
    avgDailyMinutes,
    avgDailyHours,
    avgDailyFormatted,
    punctualityRate,
    approvedReportsCount,
    activeTasksCount,
    completedTasksCount,
    projects,
    deptAvgHours,
    deptAvgFormatted: formatMinutesToHrMin(deptAvgMinutes),
    deptAvgPoints,
    deptRank,
    deptTotalPeers,
    pillarTimePct,
    pillarCompliancePct,
    pillarGranularityPct,
    pillarPunctualityPct,
    efficiencyScore,
    efficiencyTier,
    tierColor,
    dateList,
    dailyReportsList: Object.values(dailyMap).sort((a, b) => b.date.localeCompare(a.date))
  };
}

function generateExecutiveAppraisal(emp, stats, periodLabel, seed) {
  const {
    totalFormatted, totalHours, avgDailyFormatted, submissionDays, netWorkingDays,
    leaveDays, complianceRate, efficiencyScore, efficiencyTier, projects,
    deptAvgHours, deptRank, deptTotalPeers, totalPointsCount, avgPointsPerDay, avgMinutesPerPoint
  } = stats;

  if (submissionDays === 0) {
    return `
      <div style="padding: 16px; background: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 8px; color: #92400e;">
        <strong>No DAR Submissions Recorded in ${escapeHtml(periodLabel)}:</strong>
        <p style="margin: 6px 0 0;"><strong>${escapeHtml(emp.name)}</strong> (${escapeHtml(emp.employeeId)}) has not logged any Daily Activity Reports during the selected period (${escapeHtml(periodLabel)}). All-time career records show <strong>${stats.careerReportsCount} reports</strong> and <strong>${stats.careerTotalPoints} points (${stats.careerTotalFormatted})</strong> between ${stats.careerFirstDate} and ${stats.careerLastDate}. Switch the period filter above or click <em>All Time</em> to inspect historical performance.</p>
      </div>
    `;
  }

  const topProject = projects[0];
  const secondProject = projects[1];
  const thirdProject = projects[2];
  const topProjName = topProject ? topProject.name : "Core Departmental Operations";
  const topProjTime = topProject ? topProject.formattedTime : totalFormatted;
  const topProjPct = topProject ? topProject.percentage : 100;
  const topDeliverables = topProject && topProject.deliverables.length > 0
    ? topProject.deliverables.slice(0, 2).map(d => `"${escapeHtml(d)}"`).join(" and ")
    : "daily operational execution and milestone follow-ups";

  // Paragraph 1: Volume, Points Granularity & Department Standing
  let p1 = "";
  const diffFromDept = totalHours - deptAvgHours;
  const rankBadge = `(ranked <strong>#${deptRank} of ${deptTotalPeers}</strong> in ${escapeHtml(emp.department)})`;

  if (diffFromDept >= 3) {
    const variations = [
      `During <strong>${escapeHtml(periodLabel)}</strong>, <strong>${escapeHtml(emp.name)}</strong> (${escapeHtml(emp.role || "Team Member")}, ${escapeHtml(emp.department)}) demonstrated high-output execution ${rankBadge}. Cumulatively logging <strong>${totalFormatted}</strong> across <strong>${submissionDays} active reporting days</strong> and documenting <strong>${totalPointsCount} granular DAR points</strong> (averaging <strong>${avgDailyFormatted}/day</strong> and <strong>${avgPointsPerDay} points/day</strong>), their logged volume exceeds the departmental peer average of ${deptAvgHours} hrs.`,
      `Over the evaluated cycle of <strong>${escapeHtml(periodLabel)}</strong>, <strong>${escapeHtml(emp.name)}</strong> delivered strong operational productivity within ${escapeHtml(emp.department)} ${rankBadge}. With <strong>${totalFormatted}</strong> recorded across <strong>${totalPointsCount} action items</strong> over <strong>${submissionDays} days</strong> (daily mean of <strong>${avgDailyFormatted}</strong>, ~<strong>${avgMinutesPerPoint}m per task</strong>), ${escapeHtml(emp.name)} outperformed the department benchmark of ${deptAvgHours} hrs.`
    ];
    p1 = variations[seed % variations.length];
  } else if (diffFromDept >= -8) {
    const variations = [
      `Throughout <strong>${escapeHtml(periodLabel)}</strong>, <strong>${escapeHtml(emp.name)}</strong> (${escapeHtml(emp.role || "Team Member")}, ${escapeHtml(emp.department)}) maintained a steady operational cadence ${rankBadge}. Recording <strong>${totalFormatted}</strong> and <strong>${totalPointsCount} DAR points</strong> across <strong>${submissionDays} working days</strong> (averaging <strong>${avgDailyFormatted}/day</strong> and <strong>${avgPointsPerDay} tasks/day</strong>), their output aligns with the departmental benchmark (${deptAvgHours} hrs).`,
      `In <strong>${escapeHtml(periodLabel)}</strong>, <strong>${escapeHtml(emp.name)}</strong> posted consistent activity metrics within ${escapeHtml(emp.department)} ${rankBadge}, totaling <strong>${totalFormatted}</strong> across <strong>${totalPointsCount} logged points</strong> over <strong>${submissionDays} days</strong>. Averaging <strong>${avgDailyFormatted} daily</strong>, their work logs reflect structured task progression across assigned responsibilities.`
    ];
    p1 = variations[seed % variations.length];
  } else {
    p1 = `During <strong>${escapeHtml(periodLabel)}</strong>, <strong>${escapeHtml(emp.name)}</strong> (${escapeHtml(emp.role || "Team Member")}, ${escapeHtml(emp.department)}) logged <strong>${totalFormatted}</strong> and <strong>${totalPointsCount} DAR points</strong> across <strong>${submissionDays} submitted days</strong> ${rankBadge}, averaging <strong>${avgDailyFormatted} per active day</strong>. As this volume is below the departmental peer average (${deptAvgHours} hrs), ensuring all field activities, meetings, and follow-ups are thoroughly time-logged will improve visibility.`;
  }

  // Paragraph 2: Project, Site & Customer Attribution
  let p2 = "";
  if (topProject) {
    const secondClause = secondProject
      ? `Secondary bandwidth was directed toward <strong>${escapeHtml(secondProject.name)}</strong> (${secondProject.formattedTime}, ${secondProject.percentage}% across ${secondProject.taskCount} points)${thirdProject ? ` and <strong>${escapeHtml(thirdProject.name)}</strong> (${thirdProject.formattedTime}, ${thirdProject.percentage}%)` : ""}.`
      : `Remaining time was invested in routine departmental coordination.`;

    p2 = `Analysis of DAR point descriptions reveals focused effort on <strong>${escapeHtml(topProjName)}</strong> (${escapeHtml(topProject.category)}), which accounted for <strong>${topProjTime} (${topProjPct}% of total logged time across ${topProject.taskCount} points)</strong>, including key deliverables such as ${topDeliverables}. ${secondClause}`;
  }

  // Paragraph 3: Compliance, Attendance & Multi-Pillar Efficiency
  const leaveClause = leaveDays > 0
    ? `with <strong>${leaveDays} approved leave day(s)</strong> factored into the schedule`
    : `with zero leave absences recorded`;

  const p3 = `From a governance standpoint, <strong>${escapeHtml(emp.name)}</strong> achieved a <strong>${complianceRate}% DAR submission compliance rate</strong> (${submissionDays} of ${netWorkingDays} net working days logged, ${leaveClause}) and a <strong>${stats.punctualityRate}% on-time submission rate</strong>. Combining Time Utilization (${stats.pillarTimePct}%), Compliance (${stats.pillarCompliancePct}%), Point Granularity (${stats.pillarGranularityPct}%), and Punctuality (${stats.pillarPunctualityPct}%), the Smart Rule Engine assigns a composite Efficiency Index of <strong>${efficiencyScore}/100 (<span style="color:${stats.tierColor};font-weight:700;">${efficiencyTier}</span>)</strong>.`;

  // Paragraph 4: Managerial Recommendation
  let p4 = "";
  if (efficiencyScore >= 80) {
    p4 = `<strong>Executive Recommendation:</strong> ${escapeHtml(emp.name)} demonstrates strong self-management and detailed DAR documentation across <em>${escapeHtml(topProjName)}</em>. Recommended for continued ownership of high-priority site/client deliverables and cross-functional coordination.`;
  } else if (efficiencyScore >= 60) {
    p4 = `<strong>Executive Recommendation:</strong> ${escapeHtml(emp.name)} is delivering solid task volume on <em>${escapeHtml(topProjName)}</em>. Encouraging consistent 8-hour daily time logging and closing any remaining unsubmitted working days will elevate their efficiency index into Tier 1.`;
  } else {
    p4 = `<strong>Executive Recommendation:</strong> A brief review with ${escapeHtml(emp.name)} is advised to align daily DAR submission habits with the 8-hour daily benchmark and ensure all site/office tasks are logged promptly each evening.`;
  }

  return `
    <p style="margin: 0 0 12px;">${p1}</p>
    <p style="margin: 0 0 12px;">${p2}</p>
    <p style="margin: 0 0 12px;">${p3}</p>
    <div style="background: var(--bg-muted, #f8fafc); border-left: 4px solid ${stats.tierColor}; padding: 12px 14px; border-radius: 0 8px 8px 0; font-size: 13.5px; color: var(--text-main, #1e293b); margin-top: 14px;">
      ${p4}
    </div>
  `;
}

function renderAnalyticsDailyChart(stats) {
  const container = document.getElementById("analyticsDailyHoursChart");
  const summaryStrip = document.getElementById("analyticsChartSummaryStrip");
  if (!container) return;

  const dateList = (stats.dateList || []).filter(d => !d.isFuture || d.hasSubmission);

  if (summaryStrip) {
    const activeDays = dateList.filter(d => d.minutes > 0);
    const peakDay = activeDays.length > 0
      ? activeDays.reduce((best, cur) => cur.minutes > best.minutes ? cur : best, activeDays[0])
      : null;
    const targetMetDays = activeDays.filter(d => d.minutes >= 450).length; // >= 7.5h
    const missedWorkingDays = dateList.filter(d => !d.isSunday && !d.isHoliday && !d.onLeave && !d.isFuture && !d.hasSubmission).length;

    summaryStrip.innerHTML = `
      <div>
        <span style="color: var(--text-muted, #64748b); display: block; font-size: 11px; text-transform: uppercase; font-weight: 600;">Peak Output Day</span>
        <strong style="color: var(--text-main, #0f172a); font-size: 13px;">${peakDay ? `${peakDay.dateStr.slice(5)} (${peakDay.formattedTime}, ${peakDay.pointsCount} pts)` : "N/A"}</strong>
      </div>
      <div>
        <span style="color: var(--text-muted, #64748b); display: block; font-size: 11px; text-transform: uppercase; font-weight: 600;">Optimal Days (&ge;7.5h)</span>
        <strong style="color: #10b981; font-size: 13px;">${targetMetDays} of ${stats.submissionDays} active days</strong>
      </div>
      <div>
        <span style="color: var(--text-muted, #64748b); display: block; font-size: 11px; text-transform: uppercase; font-weight: 600;">Task Granularity</span>
        <strong style="color: #06b6d4; font-size: 13px;">${stats.totalPointsCount} pts (~${stats.avgMinutesPerPoint}m / pt)</strong>
      </div>
      <div>
        <span style="color: var(--text-muted, #64748b); display: block; font-size: 11px; text-transform: uppercase; font-weight: 600;">Missed Working Days</span>
        <strong style="color: ${missedWorkingDays > 0 ? '#ef4444' : '#10b981'}; font-size: 13px;">${missedWorkingDays} day(s)</strong>
      </div>
    `;
  }

  if (dateList.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-muted,#64748b);">No date activity to display for this range.</div>';
    return;
  }

  const maxHours = Math.max(9.5, ...dateList.map(d => d.hours));
  const svgHeight = 235;
  const barWidth = Math.max(16, Math.min(34, Math.floor(720 / dateList.length) - 6));
  const gap = 6;
  const totalWidth = Math.max(640, dateList.length * (barWidth + gap) + 60);
  const chartHeight = 150;
  const yZero = 185;

  let barsSvg = "";
  const monthShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  dateList.forEach((d, idx) => {
    const x = 40 + idx * (barWidth + gap);
    const barH = d.hours > 0 ? Math.max(6, Math.round((d.hours / maxHours) * chartHeight)) : 0;
    const y = yZero - barH;
    const isSelected = analyticsSelectedDateFilter === d.dateStr;

    let color = "#3b82f6";
    if (d.hours >= 7.5) color = "#10b981";
    else if (d.hours >= 5) color = "#3b82f6";
    else if (d.hours > 0) color = "#f59e0b";
    else if (d.onLeave) color = "#a855f7";
    else if (d.isSunday || d.isHoliday) color = "#cbd5e1";
    else color = "#e2e8f0";

    const dayNum = d.dateStr.slice(8);
    const mIdx = Number(d.dateStr.slice(5, 7)) - 1;
    const mLabel = monthShort[mIdx] || "";
    const statusTag = d.isSunday ? "Sunday" : d.isHoliday ? "Holiday" : d.onLeave ? "Approved Leave" : (d.hasSubmission ? "Submitted" : "Not Submitted");
    const titleText = `${d.dateStr} (${statusTag}): ${d.formattedTime} across ${d.pointsCount} DAR point(s) — Click to inspect points`;

    barsSvg += `
      <g class="analytics-day-bar" data-date="${d.dateStr}" style="cursor: pointer;">
        <title>${titleText}</title>
        <rect x="${x}" y="${yZero - chartHeight}" width="${barWidth}" height="${chartHeight}" fill="${isSelected ? '#dbeafe' : '#f8fafc'}" rx="4" stroke="${isSelected ? '#2563eb' : 'none'}" stroke-width="1.5" />
        ${barH > 0 ? `
          <rect x="${x}" y="${y}" width="${barWidth}" height="${barH}" fill="${color}" rx="4" opacity="${isSelected ? '1' : '0.92'}" />
          <text x="${x + barWidth / 2}" y="${y - 6}" text-anchor="middle" font-size="9" font-weight="700" fill="var(--text-main, #1e293b)">${d.hours}h</text>
        ` : (d.onLeave ? `
          <rect x="${x}" y="${yZero - 18}" width="${barWidth}" height="18" fill="#f3e8ff" stroke="#a855f7" stroke-width="1" rx="3" />
          <text x="${x + barWidth / 2}" y="${yZero - 6}" text-anchor="middle" font-size="8" font-weight="700" fill="#7e22ce">LV</text>
        ` : (!d.isSunday && !d.isHoliday && !d.isFuture ? `
          <circle cx="${x + barWidth / 2}" cy="${yZero - 6}" r="3" fill="#ef4444" opacity="0.65" />
        ` : ''))}
        ${d.pointsCount > 0 ? `
          <rect x="${x + 2}" y="${yZero + 22}" width="${barWidth - 4}" height="13" rx="3" fill="#ecfeff" />
          <text x="${x + barWidth / 2}" y="${yZero + 31}" text-anchor="middle" font-size="8" font-weight="700" fill="#0891b2">${d.pointsCount}p</text>
        ` : ''}
        <text x="${x + barWidth / 2}" y="${yZero + 14}" text-anchor="middle" font-size="9.5" font-weight="${isSelected ? '800' : '600'}" fill="${isSelected ? '#2563eb' : (d.isSunday ? '#94a3b8' : 'var(--text-muted, #475569)')}">${dayNum}</text>
        ${(idx === 0 || dayNum === "01" || dateList.length <= 10) ? `<text x="${x + barWidth / 2}" y="${yZero + 44}" text-anchor="middle" font-size="8" fill="#94a3b8">${mLabel}</text>` : ''}
      </g>
    `;
  });

  const ref8Y = yZero - Math.round((8 / maxHours) * chartHeight);
  const avgH = Number(stats.avgDailyHours) || 0;
  const avgY = avgH > 0 ? (yZero - Math.round((Math.min(maxHours, avgH) / maxHours) * chartHeight)) : null;

  container.innerHTML = `
    <svg viewBox="0 0 ${totalWidth} ${svgHeight}" style="width: 100%; height: 240px; min-width: ${totalWidth}px;" preserveAspectRatio="xMinYMin meet">
      <!-- Y-axis grid lines -->
      <line x1="32" y1="${ref8Y}" x2="${totalWidth - 10}" y2="${ref8Y}" stroke="#10b981" stroke-dasharray="4,4" stroke-width="1.2" opacity="0.7" />
      <text x="30" y="${ref8Y + 3}" text-anchor="end" font-size="9" fill="#10b981" font-weight="700">8h</text>
      ${avgY ? `
        <line x1="32" y1="${avgY}" x2="${totalWidth - 10}" y2="${avgY}" stroke="#3b82f6" stroke-dasharray="2,3" stroke-width="1" opacity="0.65" />
      ` : ''}
      <line x1="32" y1="${yZero}" x2="${totalWidth - 10}" y2="${yZero}" stroke="#cbd5e1" stroke-width="1.5" />
      ${barsSvg}
    </svg>
  `;

  container.querySelectorAll(".analytics-day-bar").forEach(bar => {
    bar.addEventListener("click", () => {
      const clickedDate = bar.getAttribute("data-date");
      if (!clickedDate) return;
      analyticsSelectedDateFilter = (analyticsSelectedDateFilter === clickedDate) ? "" : clickedDate;
      renderWorkAnalytics(activeUser(), true);
      const explorer = document.getElementById("analyticsPointsExplorerCard");
      if (explorer && analyticsSelectedDateFilter) {
        explorer.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    });
  });
}

function renderAnalyticsCircularScore(score, tier, tierColor, stats) {
  const circle = document.getElementById("analyticsScoreMeterCircle");
  const numEl = document.getElementById("analyticsCircularScoreNum");
  const badgeEl = document.getElementById("analyticsCircularTierBadge");
  const pillarsList = document.getElementById("analyticsCircularPillarsList");

  const safeScore = Math.min(100, Math.max(0, Math.round(Number(score) || 0)));
  const circumference = 364.4; // 2 * Math.PI * 58
  const offset = circumference - (circumference * safeScore / 100);

  if (circle) {
    circle.style.strokeDashoffset = offset.toFixed(1);
    let strokeCol = "#ef4444";
    if (safeScore >= 85) strokeCol = "#10b981";
    else if (safeScore >= 70) strokeCol = "#2563eb";
    else if (safeScore >= 50) strokeCol = "#f59e0b";
    circle.setAttribute("stroke", strokeCol);
  }

  if (numEl) {
    numEl.textContent = safeScore;
  }

  if (badgeEl) {
    badgeEl.textContent = tier || "Calculating...";
    let bg = "#f1f5f9";
    let col = "#475569";
    if (safeScore >= 85) { bg = "rgba(16, 185, 129, 0.12)"; col = "#059669"; }
    else if (safeScore >= 70) { bg = "rgba(37, 99, 235, 0.12)"; col = "#2563eb"; }
    else if (safeScore >= 50) { bg = "rgba(245, 158, 11, 0.12)"; col = "#d97706"; }
    else if (safeScore > 0) { bg = "rgba(239, 68, 68, 0.12)"; col = "#dc2626"; }
    badgeEl.style.background = bg;
    badgeEl.style.color = col;
  }

  if (pillarsList && stats) {
    const pillars = [
      { name: "Time Utilization", pct: stats.pillarTimePct, color: "#3b82f6" },
      { name: "Submission Compliance", pct: stats.pillarCompliancePct, color: "#10b981" },
      { name: "Task Granularity", pct: stats.pillarGranularityPct, color: "#06b6d4" },
      { name: "Evening Punctuality", pct: stats.pillarPunctualityPct, color: "#8b5cf6" }
    ];
    pillarsList.innerHTML = pillars.map(p => `
      <div>
        <div style="display:flex; justify-content:space-between; margin-bottom:2px; font-weight:600; color:var(--text, #334155); font-size:11.5px;">
          <span>${p.name}</span>
          <span style="color:${p.color}; font-weight:700;">${p.pct}%</span>
        </div>
        <div style="background:var(--bg-soft, #f1f5f9); height:5px; border-radius:3px; overflow:hidden;">
          <div style="background:${p.color}; width:${p.pct}%; height:100%; border-radius:3px;"></div>
        </div>
      </div>
    `).join("");
  }
}

function renderAnalyticsExecutiveSummary(stats, targetUser) {
  const grid = document.getElementById("analyticsExecutiveSummaryGrid");
  const countBadge = document.getElementById("analyticsSummaryDeliverablesCount");
  const rawCountBadge = document.getElementById("analyticsRawPointsCount");
  if (!grid) return;

  if (rawCountBadge) {
    rawCountBadge.textContent = `${stats.totalPointsCount} points`;
  }

  // Aggregate points by Category
  const categoryMap = {};
  stats.dailyReportsList.forEach(dayObj => {
    (dayObj.points || []).forEach(pt => {
      const cat = pt.category || "General Operations";
      if (!categoryMap[cat]) {
        categoryMap[cat] = {
          category: cat,
          minutes: 0,
          pointsCount: 0,
          streams: new Set(),
          highlights: []
        };
      }
      categoryMap[cat].minutes += pt.minutes;
      categoryMap[cat].pointsCount++;
      if (pt.stream) categoryMap[cat].streams.add(pt.stream);

      const clean = pt.cleanText;
      if (clean && categoryMap[cat].highlights.length < 4) {
        if (!categoryMap[cat].highlights.some(h => h.text.toLowerCase().startsWith(clean.slice(0, 20).toLowerCase()))) {
          categoryMap[cat].highlights.push({
            text: clean,
            time: pt.formattedTime,
            stream: pt.stream
          });
        }
      }
    });
  });

  const categories = Object.values(categoryMap).sort((a, b) => b.minutes - a.minutes || b.pointsCount - a.pointsCount);

  if (countBadge) {
    countBadge.textContent = `${categories.length} Work Categories`;
  }

  if (categories.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 30px; color: var(--muted, #64748b);">
        <i class="fa-regular fa-clipboard" style="font-size: 28px; margin-bottom: 8px; color: #94a3b8;"></i>
        <p style="margin: 0; font-size: 14px;">No deliverables recorded for the selected period.</p>
      </div>
    `;
    return;
  }

  function getCategoryIcon(catName) {
    const c = catName.toLowerCase();
    if (c.includes("site") || c.includes("civil") || c.includes("construct")) return "fa-helmet-safety";
    if (c.includes("quality") || c.includes("inspect")) return "fa-clipboard-check";
    if (c.includes("quantity") || c.includes("estimation") || c.includes("boq")) return "fa-calculator";
    if (c.includes("contractor") || c.includes("labour")) return "fa-people-group";
    if (c.includes("draw") || c.includes("3d") || c.includes("design") || c.includes("render")) return "fa-compass-drafting";
    if (c.includes("sale") || c.includes("client") || c.includes("walk-in")) return "fa-handshake";
    if (c.includes("lead") || c.includes("call")) return "fa-phone-volume";
    if (c.includes("book") || c.includes("pricing")) return "fa-file-invoice-dollar";
    if (c.includes("bank") || c.includes("financ") || c.includes("treasury")) return "fa-vault";
    if (c.includes("invoice") || c.includes("bill") || c.includes("voucher")) return "fa-receipt";
    if (c.includes("tax") || c.includes("gst") || c.includes("audit")) return "fa-scale-balanced";
    if (c.includes("collect") || c.includes("receivable")) return "fa-money-bill-trend-up";
    if (c.includes("legal") || c.includes("approval") || c.includes("mutation")) return "fa-gavel";
    if (c.includes("hr") || c.includes("recruit") || c.includes("interview")) return "fa-user-group";
    if (c.includes("purchase") || c.includes("po") || c.includes("order")) return "fa-cart-flatbed";
    if (c.includes("crm") || c.includes("customer")) return "fa-headset";
    return "fa-briefcase";
  }

  grid.innerHTML = categories.map(cat => {
    const formattedTime = formatMinutesToHrMin(cat.minutes);
    const pct = stats.totalMinutes > 0 ? Math.round((cat.minutes / stats.totalMinutes) * 100) : 0;
    const icon = getCategoryIcon(cat.category);
    const streamsList = Array.from(cat.streams).slice(0, 3).join(", ");

    const highlightBullets = cat.highlights.map(h => `
      <li style="margin-bottom: 6px; font-size: 13px; line-height: 1.45; color: var(--text, #334155);">
        <strong style="color: var(--text, #0f172a);">${escapeHtml(h.text)}</strong>
        <span style="font-size: 11px; color: var(--muted, #64748b); margin-left: 4px;">(${escapeHtml(h.time)})</span>
      </li>
    `).join("");

    return `
      <div class="analytics-summary-cat-card" style="background: var(--panel, #fff); border: 1px solid var(--line, #e2e8f0); border-radius: 12px; padding: 18px; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="width: 36px; height: 36px; border-radius: 8px; background: rgba(59, 130, 246, 0.1); color: #2563eb; display: flex; align-items: center; justify-content: center; font-size: 16px;">
                <i class="fa-solid ${icon}"></i>
              </div>
              <div>
                <h5 style="margin: 0; font-size: 14.5px; font-weight: 800; color: var(--text, #0f172a);">${escapeHtml(cat.category)}</h5>
                <span style="font-size: 11px; color: var(--muted, #64748b);">${escapeHtml(streamsList || "General Operations")}</span>
              </div>
            </div>
            <span style="background: #eff6ff; color: #2563eb; font-size: 11.5px; font-weight: 700; padding: 3px 8px; border-radius: 6px; white-space: nowrap;">
              ${cat.pointsCount} points
            </span>
          </div>

          <div style="margin-bottom: 12px; padding: 8px 12px; background: var(--bg-soft, #f8fafc); border-radius: 8px; display: flex; justify-content: space-between; align-items: center; font-size: 12px;">
            <span style="color: var(--muted, #64748b); font-weight: 600;">Logged Duration:</span>
            <div style="display: flex; align-items: center; gap: 8px;">
              <strong style="color: #2563eb; font-size: 13px;">${formattedTime}</strong>
              <span style="color: var(--muted, #64748b); font-size: 11px;">(${pct}% of bandwidth)</span>
            </div>
          </div>

          <div style="margin-top: 10px;">
            <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--muted, #64748b); margin-bottom: 8px;">Key Accomplishments:</div>
            <ul style="margin: 0; padding-left: 18px;">
              ${highlightBullets || '<li style="font-size: 12.5px; color: var(--muted, #94a3b8);">Standard operational maintenance</li>'}
            </ul>
          </div>
        </div>

        <div style="margin-top: 14px; padding-top: 10px; border-top: 1px solid var(--line, #f1f5f9); font-size: 11.5px; color: var(--muted, #64748b); display: flex; justify-content: space-between;">
          <span>Category Share</span>
          <span style="font-weight: 700; color: #2563eb;">${pct}%</span>
        </div>
      </div>
    `;
  }).join("");
}

function renderDepartmentAnalytics(deptName, dateRange) {
  const allEligible = getEligibleAnalyticsUsers();
  const deptEmployees = allEligible.filter(u => u.department === deptName);
  const allReps = getAllMergedAnalyticsReports();
  const todayStr = today();

  const bannerTitle = document.getElementById("analyticsDeptBannerTitle");
  const bannerSub = document.getElementById("analyticsDeptBannerSub");
  const contribBadge = document.getElementById("analyticsDeptContributorsBadge");
  const memberCountBadge = document.getElementById("analyticsDeptMemberCount");
  const streamCountBadge = document.getElementById("analyticsDeptWorkStreamCount");

  if (bannerTitle) bannerTitle.textContent = deptName || "Select Department";
  if (bannerSub) bannerSub.textContent = `Team Strength: ${deptEmployees.length} Members • Connected across operational submission streams`;
  if (memberCountBadge) memberCountBadge.textContent = `${deptEmployees.length} Team Members`;

  const deptEmpIds = new Set(deptEmployees.map(u => normalizeEmployeeId(u.employeeId)));
  const deptReports = allReps.filter(r => {
    if (!deptEmpIds.has(normalizeEmployeeId(r.employeeId))) return false;
    const rDate = r.date || r.report_date || "";
    return rDate >= dateRange.startDate && rDate <= dateRange.endDate && rDate <= todayStr;
  });

  let deptTotalMinutes = 0;
  let deptTotalPoints = 0;
  const activeContributors = new Set();
  const memberStatsMap = new Map();

  deptEmployees.forEach(emp => {
    memberStatsMap.set(normalizeEmployeeId(emp.employeeId), {
      user: emp,
      minutes: 0,
      pointsCount: 0,
      submissions: 0
    });
  });

  const streamConnectivityMap = {};

  deptReports.forEach(r => {
    const empNormId = normalizeEmployeeId(r.employeeId);
    const mStat = memberStatsMap.get(empNormId);
    if (!mStat) return;

    activeContributors.add(empNormId);
    mStat.submissions++;

    const pts = Array.isArray(r.points) ? r.points : [];
    pts.forEach(p => {
      const mins = parsePointMinutes(p);
      const classification = classifyDarPoint(p, r, mStat.user.department);
      mStat.minutes += mins;
      mStat.pointsCount++;
      deptTotalMinutes += mins;
      deptTotalPoints++;

      const streamKey = classification.stream || "Core Departmental Operations";
      if (!streamConnectivityMap[streamKey]) {
        streamConnectivityMap[streamKey] = {
          stream: streamKey,
          category: classification.category,
          minutes: 0,
          pointsCount: 0,
          contributors: new Map(),
          deliverables: []
        };
      }

      const st = streamConnectivityMap[streamKey];
      st.minutes += mins;
      st.pointsCount++;
      const currentEmpPts = st.contributors.get(mStat.user.name) || 0;
      st.contributors.set(mStat.user.name, currentEmpPts + 1);

      if (classification.cleanText && st.deliverables.length < 4) {
        if (!st.deliverables.some(d => d.toLowerCase().startsWith(classification.cleanText.slice(0, 20).toLowerCase()))) {
          st.deliverables.push(classification.cleanText);
        }
      }
    });
  });

  if (contribBadge) contribBadge.textContent = `${activeContributors.size} Active Contributors`;

  const totalMembers = Math.max(1, deptEmployees.length);
  const avgMinsPerMember = Math.round(deptTotalMinutes / totalMembers);
  const avgPtsPerMember = Math.round(deptTotalPoints / totalMembers);

  const kpiHours = document.getElementById("analyticsDeptKpiTotalHours");
  if (kpiHours) kpiHours.textContent = formatMinutesToHrMin(deptTotalMinutes);
  const kpiAvgPerMem = document.getElementById("analyticsDeptKpiAvgPerMember");
  if (kpiAvgPerMem) kpiAvgPerMem.textContent = `Avg ${formatMinutesToHrMin(avgMinsPerMember)} / member`;

  const kpiPoints = document.getElementById("analyticsDeptKpiTotalPoints");
  if (kpiPoints) kpiPoints.textContent = `${deptTotalPoints} Points`;
  const kpiPointsPerMem = document.getElementById("analyticsDeptKpiPointsPerMember");
  if (kpiPointsPerMem) kpiPointsPerMem.textContent = `Avg ${avgPtsPerMember} points / member`;

  const memberRowsData = [];
  let sumEfficiency = 0;

  deptEmployees.forEach(emp => {
    const memberStreamCounts = {};
    (deptReports.filter(r => normalizeEmployeeId(r.employeeId) === normalizeEmployeeId(emp.employeeId))).forEach(r => {
      (r.points || []).forEach(p => {
        const cl = classifyDarPoint(p, r, emp.department);
        memberStreamCounts[cl.stream] = (memberStreamCounts[cl.stream] || 0) + 1;
      });
    });
    let topStream = "General Operations";
    let maxCnt = 0;
    Object.entries(memberStreamCounts).forEach(([st, cnt]) => {
      if (cnt > maxCnt) { maxCnt = cnt; topStream = st; }
    });

    const mMetrics = calculateAnalyticsMetrics(emp, dateRange);
    sumEfficiency += mMetrics.efficiencyScore;

    memberRowsData.push({
      user: emp,
      hours: mMetrics.totalFormatted,
      minutes: mMetrics.totalMinutes,
      points: mMetrics.totalPointsCount,
      compliance: mMetrics.complianceRate,
      score: mMetrics.efficiencyScore,
      tier: mMetrics.efficiencyTier,
      tierColor: mMetrics.tierColor,
      topFocus: topStream
    });
  });

  memberRowsData.sort((a, b) => b.score - a.score || b.minutes - a.minutes);

  const avgDeptScore = totalMembers > 0 ? Math.round(sumEfficiency / totalMembers) : 0;
  const kpiEff = document.getElementById("analyticsDeptKpiEfficiency");
  if (kpiEff) kpiEff.textContent = `${avgDeptScore} / 100`;

  const kpiTier = document.getElementById("analyticsDeptKpiTier");
  if (kpiTier) {
    if (avgDeptScore >= 85) { kpiTier.textContent = "Exceptional Output (Tier 1)"; kpiTier.style.color = "#10b981"; }
    else if (avgDeptScore >= 70) { kpiTier.textContent = "Strong Contributor (Tier 2)"; kpiTier.style.color = "#2563eb"; }
    else if (avgDeptScore >= 50) { kpiTier.textContent = "Moderate (Tier 3)"; kpiTier.style.color = "#f59e0b"; }
    else { kpiTier.textContent = "Needs Coaching (Tier 4)"; kpiTier.style.color = "#ef4444"; }
  }

  const totalSubmissions = Array.from(memberStatsMap.values()).reduce((acc, m) => acc + m.submissions, 0);
  const sampleMetrics = deptEmployees.length > 0 ? calculateAnalyticsMetrics(deptEmployees[0], dateRange) : { netWorkingDays: 24 };
  const totalExpectedSubs = Math.max(1, (sampleMetrics.netWorkingDays || 24) * deptEmployees.length);
  const deptCompliancePct = Math.min(100, Math.round((totalSubmissions / totalExpectedSubs) * 100));

  const kpiComp = document.getElementById("analyticsDeptKpiCompliance");
  if (kpiComp) kpiComp.textContent = `${deptCompliancePct}%`;
  const kpiCompSub = document.getElementById("analyticsDeptKpiComplianceSub");
  if (kpiCompSub) kpiCompSub.textContent = `${totalSubmissions} of ${totalExpectedSubs} expected submissions`;

  const streamsGrid = document.getElementById("analyticsDeptStreamsGrid");
  const streams = Object.values(streamConnectivityMap).sort((a, b) => b.minutes - a.minutes || b.pointsCount - a.pointsCount);

  if (streamCountBadge) streamCountBadge.textContent = `${streams.length} Active Streams`;

  if (streamsGrid) {
    if (streams.length === 0) {
      streamsGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 30px; color: var(--muted, #64748b);">
          <i class="fa-solid fa-network-wired" style="font-size: 28px; margin-bottom: 8px; color: #94a3b8;"></i>
          <p style="margin: 0; font-size: 14px;">No team submission points recorded for ${escapeHtml(deptName)} in this period.</p>
        </div>
      `;
    } else {
      streamsGrid.innerHTML = streams.map(st => {
        const formattedTime = formatMinutesToHrMin(st.minutes);
        const pct = deptTotalMinutes > 0 ? Math.round((st.minutes / deptTotalMinutes) * 100) : 0;
        
        const contributorChips = Array.from(st.contributors.entries()).map(([name, count]) => `
          <span style="background: rgba(99, 102, 241, 0.1); color: #4f46e5; font-size: 11px; font-weight: 700; padding: 2px 7px; border-radius: 999px; white-space: nowrap;">
            ${escapeHtml(name)} (${count} pts)
          </span>
        `).join("");

        const deliverableBullets = st.deliverables.map(d => `
          <li style="margin-bottom: 4px; font-size: 12.5px; color: var(--text, #334155); line-height: 1.4;">${escapeHtml(d)}</li>
        `).join("");

        return `
          <div class="analytics-dept-stream-card" style="background: var(--panel, #fff); border: 1px solid var(--line, #e2e8f0); border-radius: 12px; padding: 18px; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; gap: 8px;">
                <div>
                  <h5 style="margin: 0; font-size: 14.5px; font-weight: 800; color: var(--text, #0f172a);">
                    <i class="fa-solid fa-diagram-project" style="color: #6366f1; margin-right: 6px;"></i>${escapeHtml(st.stream)}
                  </h5>
                  <span style="font-size: 11.5px; color: var(--muted, #64748b);">${escapeHtml(st.category)}</span>
                </div>
                <span style="background: #eef2ff; color: #4338ca; font-size: 11.5px; font-weight: 700; padding: 3px 8px; border-radius: 6px; white-space: nowrap;">
                  ${st.pointsCount} team pts
                </span>
              </div>

              <div style="padding: 8px 12px; background: var(--bg-soft, #f8fafc); border-radius: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; font-size: 12px;">
                <span style="color: var(--muted, #64748b);">Dept Hours:</span>
                <strong style="color: #4f46e5; font-size: 13px;">${formattedTime} (${pct}%)</strong>
              </div>

              <div style="margin-bottom: 12px;">
                <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--muted, #64748b); margin-bottom: 6px;">Connected Members (${st.contributors.size}):</div>
                <div style="display: flex; flex-wrap: wrap; gap: 5px;">
                  ${contributorChips}
                </div>
              </div>

              <div>
                <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--muted, #64748b); margin-bottom: 6px;">Key Deliverables:</div>
                <ul style="margin: 0; padding-left: 18px;">
                  ${deliverableBullets || '<li style="font-size: 12px; color: var(--muted, #94a3b8);">Operational coordination</li>'}
                </ul>
              </div>
            </div>

            <div style="margin-top: 14px; padding-top: 10px; border-top: 1px solid var(--line, #f1f5f9); font-size: 11.5px; color: var(--muted, #64748b); display: flex; justify-content: space-between;">
              <span>Department Bandwidth</span>
              <strong style="color: #4f46e5;">${pct}%</strong>
            </div>
          </div>
        `;
      }).join("");
    }
  }

  const tableBody = document.getElementById("analyticsDeptMembersTableBody");
  if (tableBody) {
    if (memberRowsData.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 24px; color: var(--muted, #64748b);">No members found in this department.</td></tr>';
    } else {
      tableBody.innerHTML = memberRowsData.map(row => {
        const initials = (row.user.name || "EM").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
        return `
          <tr style="border-bottom: 1px solid var(--line, #f1f5f9); transition: background 0.15s;">
            <td style="padding: 12px;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <div style="width: 32px; height: 32px; border-radius: 50%; background: #3b82f6; color: #fff; font-size: 12px; font-weight: 800; display: flex; align-items: center; justify-content: center;">
                  ${escapeHtml(initials)}
                </div>
                <div>
                  <div style="font-weight: 700; color: var(--text, #0f172a);">${escapeHtml(row.user.name)}</div>
                  <div style="font-size: 11px; color: var(--muted, #64748b);">ID: ${escapeHtml(row.user.employeeId)}</div>
                </div>
              </div>
            </td>
            <td style="padding: 12px;">
              <span style="font-size: 12px; color: var(--text, #334155); font-weight: 600;">${escapeHtml(row.user.role || "Team Member")}</span>
              <div style="font-size: 11px; color: var(--muted, #64748b);">Level ${escapeHtml(row.user.level || "--")}</div>
            </td>
            <td style="padding: 12px; font-weight: 700; color: #2563eb;">${escapeHtml(row.hours)}</td>
            <td style="padding: 12px; font-weight: 600; color: var(--text, #334155);">${row.points} pts</td>
            <td style="padding: 12px;">
              <span style="font-weight: 700; color: ${row.compliance >= 80 ? '#10b981' : (row.compliance >= 50 ? '#f59e0b' : '#ef4444')};">
                ${row.compliance}%
              </span>
            </td>
            <td style="padding: 12px;">
              <span style="display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 800; background: ${row.score >= 80 ? 'rgba(16, 185, 129, 0.12)' : (row.score >= 60 ? 'rgba(37, 99, 235, 0.12)' : 'rgba(239, 68, 68, 0.12)')}; color: ${row.tierColor};">
                ${row.score} / 100
              </span>
            </td>
            <td style="padding: 12px; font-size: 12.5px; color: var(--muted, #475569); max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${escapeHtml(row.topFocus)}
            </td>
            <td style="padding: 12px; text-align: right;">
              <button type="button" class="btn-secondary analytics-drilldown-emp-btn" data-empid="${escapeHtml(row.user.employeeId)}" style="font-size: 11.5px; padding: 5px 12px; border-radius: 6px; cursor: pointer;">
                <i class="fa-solid fa-arrow-right" style="margin-right: 4px;"></i> View Dashboard
              </button>
            </td>
          </tr>
        `;
      }).join("");

      tableBody.querySelectorAll(".analytics-drilldown-emp-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          const empId = btn.getAttribute("data-empid");
          if (!empId) return;
          selectedAnalyticsEmployeeId = empId;
          const viewEmpBtn = document.getElementById("analyticsViewEmployeeBtn");
          const viewDeptBtn = document.getElementById("analyticsViewDeptBtn");
          const activeLabel = document.getElementById("analyticsActiveViewLabel");
          const empWrap = document.getElementById("analyticsEmployeeDashboardWrap");
          const deptWrap = document.getElementById("analyticsDeptDashboardWrap");
          const empSearchWrap = document.getElementById("analyticsEmployeeSearchWrap");
          const empSelectWrap = document.getElementById("analyticsEmployeeSelectWrap");

          analyticsViewMode = "employee";
          viewEmpBtn?.classList.add("active");
          viewDeptBtn?.classList.remove("active");
          if (activeLabel) activeLabel.textContent = "Viewing: Individual Appraisal Mode";
          if (empWrap) empWrap.style.display = "block";
          if (deptWrap) deptWrap.style.display = "none";
          if (empSearchWrap) empSearchWrap.style.display = "block";
          if (empSelectWrap) empSelectWrap.style.display = "block";

          renderWorkAnalytics(activeUser());
          window.scrollTo({ top: 0, behavior: "smooth" });
        });
      });
    }
  }
}

function renderAnalyticsPointsExplorer(stats) {
  const listEl = document.getElementById("analyticsPointsExplorerList");
  const filterSummaryEl = document.getElementById("analyticsPointsFilterSummary");
  const clearBtn = document.getElementById("analyticsClearPointFilterBtn");
  if (!listEl) return;

  const hasFilter = Boolean(analyticsPointSearchQuery || analyticsSelectedDateFilter || analyticsSelectedProjectFilter);
  if (clearBtn) clearBtn.classList.toggle("hidden", !hasFilter);

  const queryLower = analyticsPointSearchQuery.toLowerCase();
  let filteredDays = stats.dailyReportsList || [];

  if (analyticsSelectedDateFilter) {
    filteredDays = filteredDays.filter(d => d.date === analyticsSelectedDateFilter);
  }

  let matchingPointsTotal = 0;
  let matchingMinutesTotal = 0;
  const renderedDayCards = [];

  filteredDays.forEach(dayObj => {
    const matchingPts = (dayObj.points || []).filter(pt => {
      if (analyticsSelectedProjectFilter && pt.stream !== analyticsSelectedProjectFilter) return false;
      if (queryLower) {
        const hay = `${pt.cleanText} ${pt.stream} ${pt.category} ${dayObj.date}`.toLowerCase();
        if (!hay.includes(queryLower)) return false;
      }
      return true;
    });

    if (matchingPts.length === 0) return;

    let dayFilteredMins = 0;
    matchingPts.forEach(pt => {
      matchingPointsTotal++;
      matchingMinutesTotal += pt.minutes;
      dayFilteredMins += pt.minutes;
    });

    const dateObj = new Date(`${dayObj.date}T00:00:00`);
    const dayName = Number.isNaN(dateObj.getTime()) ? "" : dateObj.toLocaleDateString("en-US", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
    const subTime = dayObj.submittedAt ? formatTimeAmPm(dayObj.submittedAt) : "--";
    const statusColor = dayObj.approvalStatus === "approved" ? "#10b981" : (dayObj.approvalStatus === "declined" ? "#ef4444" : "#f59e0b");

    const ptsRows = matchingPts.map((pt, idx) => `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; padding: 8px 10px; background: var(--surface, #fff); border: 1px solid var(--border-color, #e2e8f0); border-radius: 8px;">
        <div style="display: flex; gap: 8px; align-items: flex-start; flex: 1;">
          <span style="background: #eff6ff; color: #2563eb; font-weight: 700; font-size: 11px; padding: 2px 6px; border-radius: 4px; flex-shrink: 0; margin-top: 1px;">#${idx + 1}</span>
          <div style="flex: 1;">
            <div style="font-size: 13.5px; color: var(--text-main, #1e293b); line-height: 1.45; font-weight: 500;">${escapeHtml(pt.cleanText)}</div>
            <div style="display: flex; gap: 6px; align-items: center; margin-top: 4px; flex-wrap: wrap;">
              <span style="font-size: 11px; color: #2563eb; background: #eff6ff; padding: 1px 7px; border-radius: 4px; font-weight: 600;">${escapeHtml(pt.stream)}</span>
              <span style="font-size: 11px; color: var(--text-muted, #64748b);">${escapeHtml(pt.category)}</span>
              ${pt.attachmentName ? `<span style="font-size: 11px; color: #0891b2;"><i class="fa-solid fa-paperclip"></i> ${escapeHtml(pt.attachmentName)}</span>` : ""}
            </div>
          </div>
        </div>
        <span style="background: ${pt.minutes >= 60 ? '#dcfce7' : '#f1f5f9'}; color: ${pt.minutes >= 60 ? '#15803d' : '#475569'}; font-weight: 700; font-size: 12px; padding: 4px 9px; border-radius: 6px; white-space: nowrap; flex-shrink: 0;">
          <i class="fa-regular fa-clock" style="margin-right: 3px;"></i>${escapeHtml(pt.formattedTime)}
        </span>
      </div>
    `).join("");

    renderedDayCards.push(`
      <div style="background: var(--bg-muted, #f8fafc); border: 1px solid var(--border-color, #e2e8f0); border-radius: 10px; padding: 14px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <strong style="font-size: 14px; color: var(--text-main, #0f172a);"><i class="fa-regular fa-calendar-check" style="color: #2563eb; margin-right: 5px;"></i>${escapeHtml(dayName || dayObj.date)}</strong>
            <span style="font-size: 11.5px; color: var(--text-muted, #64748b);">Submitted at ${escapeHtml(subTime)}</span>
            <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: ${statusColor}; background: rgba(0,0,0,0.04); padding: 2px 8px; border-radius: 999px;">${escapeHtml(dayObj.approvalStatus)}</span>
          </div>
          <div style="display: flex; gap: 10px; align-items: center; font-size: 12.5px;">
            <span style="font-weight: 700; color: #0891b2;">${matchingPts.length} Point(s)</span>
            <span style="font-weight: 800; color: #2563eb; background: #dbeafe; padding: 3px 10px; border-radius: 6px;">Day Total: ${formatMinutesToHrMin(dayFilteredMins)}</span>
          </div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 6px;">
          ${ptsRows}
        </div>
      </div>
    `);
  });

  if (filterSummaryEl) {
    if (hasFilter) {
      const filterParts = [];
      if (analyticsSelectedDateFilter) filterParts.push(`Date: ${analyticsSelectedDateFilter}`);
      if (analyticsSelectedProjectFilter) filterParts.push(`Stream: ${analyticsSelectedProjectFilter}`);
      if (analyticsPointSearchQuery) filterParts.push(`Keyword: "${analyticsPointSearchQuery}"`);
      filterSummaryEl.style.display = "block";
      filterSummaryEl.innerHTML = `<i class="fa-solid fa-filter-circle-xmark" style="margin-right:6px;"></i>Active Filter (${escapeHtml(filterParts.join(" | "))}) — Showing <strong>${matchingPointsTotal} DAR point(s)</strong> across <strong>${renderedDayCards.length} day(s)</strong> &bull; Total Filtered Time: <strong>${formatMinutesToHrMin(matchingMinutesTotal)}</strong>`;
    } else {
      filterSummaryEl.style.display = "none";
    }
  }

  if (renderedDayCards.length === 0) {
    listEl.innerHTML = `
      <div style="text-align: center; padding: 32px; color: var(--text-muted, #64748b);">
        <i class="fa-regular fa-folder-open" style="font-size: 28px; margin-bottom: 8px; color: #94a3b8;"></i>
        <p style="margin: 0; font-size: 13.5px;">No DAR points found matching the current period or filter criteria.</p>
      </div>
    `;
  } else {
    listEl.innerHTML = renderedDayCards.join("");
  }
}

function renderWorkAnalytics(viewer, skipCloudFetch = false) {
  if (!canUseAnalytics(viewer)) return;
  initWorkAnalyticsEvents();

  const allEligibleUsers = getEligibleAnalyticsUsers();

  // Populate Department Filter
  const deptSelect = document.getElementById("analyticsDeptFilter");
  const depts = Array.from(new Set(allEligibleUsers.map(u => u.department).filter(Boolean))).sort();
  if (deptSelect) {
    const currentOptCount = deptSelect.options.length;
    if (currentOptCount <= 1 && depts.length > 0) {
      deptSelect.innerHTML = '<option value="">All Departments (' + allEligibleUsers.length + ' Employees)</option>' +
        depts.map(d => {
          const cnt = allEligibleUsers.filter(u => u.department === d).length;
          return `<option value="${escapeHtml(d)}">${escapeHtml(d)} (${cnt})</option>`;
        }).join("");
      deptSelect.value = selectedAnalyticsDepartment || "";
    }
  }

  const eligibleUsers = allEligibleUsers.filter(u => !selectedAnalyticsDepartment || u.department === selectedAnalyticsDepartment);

  // Pick default employee (prefer one with existing reports so initial load is immediately rich)
  if (!selectedAnalyticsEmployeeId && eligibleUsers.length > 0) {
    const localReps = reports();
    const activeEmp = eligibleUsers.find(u => localReps.some(r => normalizeEmployeeId(r.employeeId) === normalizeEmployeeId(u.employeeId)));
    selectedAnalyticsEmployeeId = (activeEmp || eligibleUsers[0]).employeeId;
  }

  // Populate Datalist & Direct Select Dropdown
  const datalist = document.getElementById("analyticsEmployeeDatalist");
  if (datalist) {
    datalist.innerHTML = eligibleUsers.map(u =>
      `<option value="${escapeHtml(u.name)} (${escapeHtml(u.employeeId)})">${escapeHtml(u.department || "")} — Level ${escapeHtml(u.level || "")}</option>`
    ).join("");
  }

  const empSelect = document.getElementById("analyticsEmployeeSelect");
  if (empSelect) {
    empSelect.innerHTML = eligibleUsers.map(u =>
      `<option value="${escapeHtml(u.employeeId)}" ${normalizeEmployeeId(u.employeeId) === normalizeEmployeeId(selectedAnalyticsEmployeeId) ? "selected" : ""}>${escapeHtml(u.name)} (${escapeHtml(u.employeeId)}) — ${escapeHtml(u.department || "General")}</option>`
    ).join("");
  }

  const dateInput = document.getElementById("analyticsDateInput");
  if (dateInput && !dateInput.value) {
    if (selectedAnalyticsPeriod === "monthly") {
      dateInput.type = "month";
      dateInput.value = today().slice(0, 7);
      selectedAnalyticsDate = dateInput.value;
    } else {
      dateInput.type = "date";
      dateInput.value = today();
      selectedAnalyticsDate = dateInput.value;
    }
  }

  const targetUser = users().find(u => normalizeEmployeeId(u.employeeId) === normalizeEmployeeId(selectedAnalyticsEmployeeId));
  const dateRange = getAnalyticsDateRange(selectedAnalyticsPeriod, selectedAnalyticsDate, targetUser);

  // Update Week Range Display badge if weekly
  const weekRangeDisp = document.getElementById("analyticsWeekRangeDisplay");
  if (weekRangeDisp) {
    if (dateRange.isWeekly) {
      weekRangeDisp.style.display = "block";
      weekRangeDisp.textContent = `${dateRange.label}`;
    } else {
      weekRangeDisp.style.display = "none";
    }
  }

  const activeLabel = document.getElementById("analyticsActiveViewLabel");
  const empWrap = document.getElementById("analyticsEmployeeDashboardWrap");
  const deptWrap = document.getElementById("analyticsDeptDashboardWrap");
  const empSearchWrap = document.getElementById("analyticsEmployeeSearchWrap");
  const empSelectWrap = document.getElementById("analyticsEmployeeSelectWrap");
  const noNotice = document.getElementById("analyticsNoEmployeeNotice");

  if (analyticsViewMode === "dept") {
    // ─── DEPARTMENT-WIDE MODE ───────────────────────
    if (activeLabel) activeLabel.textContent = "Viewing: Department Operations Analysis";
    if (empWrap) empWrap.style.display = "none";
    if (deptWrap) deptWrap.style.display = "block";
    if (empSearchWrap) empSearchWrap.style.display = "none";
    if (empSelectWrap) empSelectWrap.style.display = "none";
    if (noNotice) noNotice.style.display = "none";

    const currentDept = selectedAnalyticsDepartment || (targetUser ? targetUser.department : "") || depts[0] || "Engineering";

    if (!skipCloudFetch) {
      fetchAnalyticsDeptCloudData(currentDept, dateRange, false);
    }

    renderDepartmentAnalytics(currentDept, dateRange);
    return;
  }

  // ─── INDIVIDUAL EMPLOYEE MODE ─────────────────────
  if (activeLabel) activeLabel.textContent = "Viewing: Individual Appraisal Mode";
  if (deptWrap) deptWrap.style.display = "none";
  if (empWrap) empWrap.style.display = "block";
  if (empSearchWrap) empSearchWrap.style.display = "block";
  if (empSelectWrap) empSelectWrap.style.display = "block";

  const banner = document.getElementById("analyticsEmployeeBanner");

  if (!targetUser) {
    if (banner) banner.style.display = "none";
    if (noNotice) noNotice.style.display = "block";
    return;
  }

  if (noNotice) noNotice.style.display = "none";
  if (banner) banner.style.display = "block";

  const empInput = document.getElementById("analyticsEmployeeInput");
  if (empInput && document.activeElement !== empInput) {
    empInput.value = `${targetUser.name} (${targetUser.employeeId})`;
  }

  // Trigger Cloud Fetch for this Employee and Period so 100% of Supabase data is loaded
  if (!skipCloudFetch) {
    fetchAnalyticsCloudData(targetUser, dateRange, false);
  }

  const stats = calculateAnalyticsMetrics(targetUser, dateRange);

  // Update Header Banner & Career Summary Strip
  const avatarEl = document.getElementById("analyticsAvatar");
  if (avatarEl) {
    const initials = (targetUser.name || "EM").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
    avatarEl.textContent = initials;
  }
  const nameEl = document.getElementById("analyticsEmpName");
  if (nameEl) nameEl.textContent = targetUser.name;
  const subEl = document.getElementById("analyticsEmpSub");
  if (subEl) subEl.textContent = `ID: ${targetUser.employeeId} | Dept: ${targetUser.department || "N/A"} | Entity: ${targetUser.entity || "Metro Group"} | Role: ${targetUser.role || "Team Member"} (Level ${targetUser.level})`;

  const statusEl = document.getElementById("analyticsStatusBadge");
  if (statusEl) {
    const isInactive = targetUser.isActive === false || String(targetUser.status || "").toLowerCase() === "inactive";
    statusEl.textContent = isInactive ? "Deactivated" : "Active";
    statusEl.style.background = isInactive ? "rgba(239, 68, 68, 0.2)" : "rgba(34, 197, 94, 0.2)";
    statusEl.style.color = isInactive ? "#f87171" : "#4ade80";
  }

  const mgrEl = document.getElementById("analyticsManagerName");
  if (mgrEl) {
    const mgr = users().find(u => normalizeEmployeeId(u.employeeId) === normalizeEmployeeId(targetUser.managerId));
    mgrEl.textContent = mgr ? `${mgr.name} (${mgr.employeeId})` : (targetUser.managerName || targetUser.managerId || "Direct Director Umbrella");
  }

  const careerStrip = document.getElementById("analyticsCareerSummaryStrip");
  if (careerStrip) {
    careerStrip.innerHTML = `
      <span><i class="fa-solid fa-database" style="color:#60a5fa;margin-right:5px;"></i>All-Time Cloud Records: <strong style="color:#fff;">${stats.careerReportsCount} DARs</strong></span>
      <span><i class="fa-solid fa-list-ol" style="color:#38bdf8;margin-right:5px;"></i>All-Time Points: <strong style="color:#fff;">${stats.careerTotalPoints} Points</strong></span>
      <span><i class="fa-solid fa-clock" style="color:#4ade80;margin-right:5px;"></i>Cumulative Career Time: <strong style="color:#fff;">${stats.careerTotalFormatted}</strong></span>
      <span><i class="fa-regular fa-calendar" style="color:#fbbf24;margin-right:5px;"></i>Active Span: <strong style="color:#fff;">${stats.careerFirstDate} &rarr; ${stats.careerLastDate}</strong></span>
    `;
  }

  // Update 4 KPI Cards
  const kpiHours = document.getElementById("analyticsKpiTotalHours");
  if (kpiHours) kpiHours.textContent = stats.totalFormatted;
  const kpiAvg = document.getElementById("analyticsKpiAvgDaily");
  if (kpiAvg) kpiAvg.textContent = `Avg ${stats.avgDailyFormatted} / active day`;

  const kpiPoints = document.getElementById("analyticsKpiTotalPoints");
  if (kpiPoints) kpiPoints.textContent = `${stats.totalPointsCount} Points`;
  const kpiAvgPoints = document.getElementById("analyticsKpiAvgPoints");
  if (kpiAvgPoints) kpiAvgPoints.textContent = `Avg ${stats.avgPointsPerDay} pts/day (~${stats.avgMinutesPerPoint}m/pt)`;

  const kpiComp = document.getElementById("analyticsKpiCompliance");
  if (kpiComp) kpiComp.textContent = `${stats.complianceRate}%`;
  const kpiSubs = document.getElementById("analyticsKpiSubmissions");
  if (kpiSubs) kpiSubs.textContent = `${stats.submissionDays} of ${stats.netWorkingDays} net working days`;

  const kpiLvs = document.getElementById("analyticsKpiLeaves");
  if (kpiLvs) kpiLvs.textContent = `${stats.leaveDays} Leave(s)`;
  const kpiActiveTasks = document.getElementById("analyticsKpiActiveTasks");
  if (kpiActiveTasks) kpiActiveTasks.textContent = `${stats.completedTasksCount} done / ${stats.activeTasksCount} pending tasks`;

  // Render SVG Circular Score Meter out of 100
  renderAnalyticsCircularScore(stats.efficiencyScore, stats.efficiencyTier, stats.tierColor, stats);

  // Render Executive Appraisal Narrative
  const reviewContent = document.getElementById("analyticsSmartReviewContent");
  if (reviewContent) {
    reviewContent.innerHTML = generateExecutiveAppraisal(targetUser, stats, dateRange.label, analyticsReviewStyleSeed);
  }

  // Render Daily Work Progression Chart
  renderAnalyticsDailyChart(stats);

  // Render Executive Deliverables Summary Grid
  renderAnalyticsExecutiveSummary(stats, targetUser);

  // Render Collapsible Raw Activity Log Points Explorer
  renderAnalyticsPointsExplorer(stats);
}


function renderCompliance(user) {
  if(!canUseCompliance(user)) return;
  
  const dateSelect = document.getElementById("complianceDateFilter");
  const customDateInput = document.getElementById("complianceCustomDateFilter");
  
  let reportDate = "";
  if (dateSelect) {
    if (dateSelect.value === "custom") {
      reportDate = customDateInput && customDateInput.value ? customDateInput.value : today();
    } else {
      reportDate = dateSelect.value || today();
    }
  } else {
    reportDate = today();
  }

  let allUsers = complianceUsers(user);
  
  // Consecutive missing filter
  const consecutiveFilterEl = document.getElementById("complianceConsecutiveDaysFilter");
  const consecutiveDays = consecutiveFilterEl ? parseInt(consecutiveFilterEl.value, 10) : 0;
  if (consecutiveDays >= 3 && consecutiveDays <= 10) {
    allUsers = allUsers.filter(u => hasNotSubmittedConsecutive(u.employeeId, reportDate, consecutiveDays));
  }

  const holiday = holidayForDate(reportDate);
  const submittedMap = new Map(reports().filter(r=>r.date===reportDate).map(r=>[r.employeeId,r]));
  
  const submittedCount = allUsers.filter(u=>submittedMap.has(u.employeeId)).length;
  const pendingCount = holiday ? 0 : Math.max(0, allUsers.length - submittedCount);
  const compliancePct = allUsers.length > 0 ? ((submittedCount / allUsers.length) * 100).toFixed(1) : "0.0";

  const setMetric = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = String(v); };
  setMetric("metricTotalEmployees", allUsers.length);
  setMetric("metricTotalPercent", "Active in scope");
  setMetric("metricSubmittedEmployees", submittedCount);
  setMetric("metricSubmittedPercent", `${allUsers.length ? Math.round((submittedCount/allUsers.length)*100) : 0}%`);
  setMetric("metricPendingEmployees", pendingCount);
  setMetric("metricPendingPercent", `${allUsers.length ? Math.round((pendingCount/allUsers.length)*100) : 0}%`);
  setMetric("metricComplianceRate", `${compliancePct}%`);
  setMetric("metricWorkingDaysInfo", holiday ? "Holiday" : (isSundayDateKey(reportDate) ? "Sunday" : "Working Day"));

  // Date Dropdown Population
  if (dateSelect && dateSelect.options.length === 0) {
    let optionsHtml = '';
    for(let i=0; i<30; i++) {
      const d = dateKeyDaysAgo(i);
      optionsHtml += '<option value="' + d + '">' + (i===0?"Today ("+d+")":d) + '</option>';
    }
    optionsHtml += '<option value="custom">Choose from Calendar...</option>';
    dateSelect.innerHTML = optionsHtml;
  }
  populateComplianceWeekFilter();
  
  const monthInput = document.getElementById("complianceMonthFilter");
  if (monthInput && !monthInput.value) {
    monthInput.value = selectedComplianceMonth();
  }

  // Populate Entity/Dept dropdowns
  const entSelect = document.getElementById("complianceEntityFilter");
  if (entSelect && entSelect.options.length <= 1) {
    const uniqueEnts = [...new Set(allUsers.map(u=>u.entity).filter(Boolean))].sort();
    entSelect.innerHTML = '<option value="">All Entities</option>' + uniqueEnts.map(e=>`<option value="${escapeHtml(e)}">${escapeHtml(e)}</option>`).join('');
  }
  const deptSelect = document.getElementById("complianceDeptFilter");
  if (deptSelect && deptSelect.options.length <= 1) {
    const uniqueDepts = [...new Set(allUsers.map(u=>u.department).filter(Boolean))].sort();
    deptSelect.innerHTML = '<option value="">All Departments</option>' + uniqueDepts.map(d=>`<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join('');
  }

  // Filtering Table Rows
  const searchQuery = (document.getElementById("complianceSearchInput")?.value || "").toLowerCase().trim();
  const entValue = entSelect ? entSelect.value : "";
  const deptValue = deptSelect ? deptSelect.value : "";
  
  let list = allUsers;
  if (entValue) list = list.filter(u => u.entity === entValue);
  if (deptValue) list = list.filter(u => u.department === deptValue);
  if (searchQuery) {
    list = list.filter(u => 
      (u.name && u.name.toLowerCase().includes(searchQuery)) || 
      (u.employeeId && u.employeeId.toLowerCase().includes(searchQuery)) ||
      (u.department && u.department.toLowerCase().includes(searchQuery)) ||
      (u.entity && u.entity.toLowerCase().includes(searchQuery))
    );
  }
  
  if (complianceFilter === "submitted") list = list.filter(u => submittedMap.has(u.employeeId));
  if (complianceFilter === "pending") list = list.filter(u => !submittedMap.has(u.employeeId));

  // Render Employee Compliance Table
  const tableBody = document.getElementById("complianceEmployeeTableBody");
  const countInfo = document.getElementById("complianceEmployeeCountInfo");
  if (countInfo) {
    countInfo.textContent = `Showing ${list.length} of ${allUsers.length} scoped employees (${formatDate(reportDate)})`;
  }

  if (tableBody) {
    if (list.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="11" class="empty-state" style="padding: 24px; text-align: center; color: var(--muted);">No employee records match the selected filter criteria.</td></tr>';
    } else {
      tableBody.innerHTML = list.map((emp, index) => {
        const report = submittedMap.get(emp.employeeId);
        const leave = typeof leaveForDateAndUser === 'function' ? leaveForDateAndUser(reportDate, emp.employeeId) : null;
        const mgr = emp.managerId ? findUser(emp.managerId) : null;
        const managerName = mgr ? mgr.name : (emp.managerName || "-");

        let statusBadge = '';
        let submittedAtDisplay = '--';
        let totalTimeDisplay = '--';
        let expandedContent = '';

        if (report) {
          statusBadge = '<span class="status-pill submitted"><i class="fa-solid fa-check"></i> Submitted</span>';
          submittedAtDisplay = formatDateTime(report.submittedAt) || "--";
          totalTimeDisplay = reportTotalTime(report) || "--";

          const points = report.points || [];
          if (points.length > 0) {
            const pointsHtml = points.map((pt, pIdx) => {
              const text = pt.rawText || String(pt.text || "").replace(/^\d+\.\s*/, "");
              const dur = pt.totalTime || (pt.hours ? `${pt.hours}h ${pt.minutes||0}m` : "--");
              const att = pt.attachmentName ? `<a href="${pt.attachmentUrl || '#'}" target="_blank" class="task-file-link" style="margin-left: 8px; font-size: 0.75rem; color: #2563eb;"><i class="fa-solid fa-paperclip"></i> ${escapeHtml(pt.attachmentName)}</a>` : '';
              return `
                <div class="compliance-task-point-item" style="display: flex; align-items: flex-start; gap: 10px; padding: 8px 0; border-bottom: 1px dashed var(--line, #e2e8f0);">
                  <span style="background: rgba(139,10,26,0.1); color: var(--maroon, #8B0A1A); font-weight: 700; font-size: 0.75rem; padding: 2px 7px; border-radius: 4px; flex-shrink: 0;">#${pIdx + 1}</span>
                  <div style="flex: 1; min-width: 0;">
                    <div style="font-size: 0.86rem; color: var(--text, #1e293b); font-weight: 500; white-space: pre-wrap;">${escapeHtml(text)}</div>
                    <div style="display: flex; align-items: center; gap: 10px; margin-top: 4px;">
                      <span class="org-tag-pill" style="font-size: 0.7rem; background: #e0f2fe; color: #0369a1;"><i class="fa-regular fa-clock"></i> ${escapeHtml(dur)}</span>
                      ${att}
                    </div>
                  </div>
                </div>`;
            }).join("");

            expandedContent = `
              <div style="padding: 14px 18px; background: var(--panel, #f8fafc); border-radius: 8px;">
                <div style="font-size: 0.82rem; font-weight: 700; color: var(--maroon, #8B0A1A); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
                  <i class="fa-solid fa-list-check" style="margin-right: 6px;"></i> Submitted Tasks Breakdown (${points.length} points)
                </div>
                <div class="compliance-task-points-list">${pointsHtml}</div>
              </div>`;
          } else {
            expandedContent = '<div style="padding: 12px; color: var(--muted); font-size: 0.85rem;">Report submitted with no detailed task points recorded.</div>';
          }
        } else if (leave) {
          const leaveDesc = leave.leaveType === "half" ? `Half Day (${leave.halfType === 'first' ? '1st Half' : '2nd Half'})` : "Full Day Leave";
          statusBadge = '<span class="status-pill leave"><i class="fa-solid fa-umbrella-beach"></i> On Leave</span>';
          expandedContent = `<div style="padding: 12px 16px; background: #f0f9ff; border-left: 3px solid #0284c7; border-radius: 6px; font-size: 0.85rem; color: #0369a1;">
            <strong>Leave Applied:</strong> ${escapeHtml(leaveDesc)} - <em>"${escapeHtml(leave.remarks || 'No remarks provided')}"</em>
          </div>`;
        } else if (holiday) {
          statusBadge = `<span class="status-pill holiday"><i class="fa-solid fa-calendar-day"></i> ${escapeHtml(formatHolidayName(holiday))}</span>`;
          expandedContent = `<div style="padding: 12px 16px; background: #fefce8; border-left: 3px solid #ca8a04; border-radius: 6px; font-size: 0.85rem; color: #854d0e;">
            Official Holiday: ${escapeHtml(formatHolidayName(holiday))}
          </div>`;
        } else {
          const isPastCompDate = reportDate < today();
          const isCompClosed = isPastCompDate || (typeof autoSubmitWindowReached === 'function' && autoSubmitWindowReached());
          if (isCompClosed) {
            statusBadge = '<span class="status-pill not-submitted"><i class="fa-solid fa-circle-xmark"></i> Not Submitted</span>';
            expandedContent = `<div style="padding: 12px 16px; background: #fef2f2; border-left: 3px solid #dc2626; border-radius: 6px; font-size: 0.85rem; color: #991b1b;">
              <i class="fa-solid fa-circle-xmark" style="margin-right: 6px;"></i> DAR not submitted for ${formatDate(reportDate)}.
            </div>`;
          } else {
            statusBadge = '<span class="status-pill pending"><i class="fa-regular fa-clock"></i> Pending</span>';
            expandedContent = `<div style="padding: 12px 16px; background: #fffbeb; border-left: 3px solid #d97706; border-radius: 6px; font-size: 0.85rem; color: #92400e;">
              <i class="fa-regular fa-clock" style="margin-right: 6px;"></i> DAR pending for today.
            </div>`;
          }
        }

        const actionBtn = report || leave ? `
          <button type="button" class="button button-secondary toggle-compliance-row" data-emp-id="${emp.employeeId}" style="padding: 4px 10px; font-size: 0.78rem;" title="Toggle details">
            <i class="fa-solid fa-chevron-down"></i> Tasks
          </button>` : `
          <button type="button" class="button button-secondary toggle-compliance-row" data-emp-id="${emp.employeeId}" style="padding: 4px 10px; font-size: 0.78rem; opacity: 0.65;" title="Toggle status">
            <i class="fa-solid fa-chevron-down"></i> Status
          </button>`;

        return `
          <tr class="compliance-main-row ${index % 2 === 0 ? '' : 'cred-row-alt'}">
            <td style="font-weight: 600; color: var(--muted); font-size: 0.8rem;">${index + 1}</td>
            <td><strong style="font-size: 0.82rem; color: var(--text);">${escapeHtml(emp.employeeId)}</strong></td>
            <td>
              <button type="button" class="profile-link" data-open-profile="${escapeHtml(emp.employeeId)}" style="font-weight: 600; color: var(--maroon, #8B0A1A); text-align: left;">
                ${escapeHtml(emp.name)}
              </button>
            </td>
            <td><span class="org-tag-pill" style="font-size: 0.72rem;">${escapeHtml(emp.department || "-")}</span></td>
            <td><span class="org-tag-pill" style="font-size: 0.72rem;">${escapeHtml(emp.entity || "-")}</span></td>
            <td>${escapeHtml(emp.location || "-")}</td>
            <td style="font-size: 0.82rem; color: var(--muted);">${escapeHtml(managerName)}</td>
            <td>${statusBadge}</td>
            <td style="font-size: 0.82rem;">${escapeHtml(submittedAtDisplay)}</td>
            <td><strong style="font-size: 0.82rem; color: var(--text);">${escapeHtml(totalTimeDisplay)}</strong></td>
            <td style="text-align: center;">${actionBtn}</td>
          </tr>
          <tr id="complianceExpanded-${emp.employeeId}" class="compliance-task-expanded-row hidden">
            <td colspan="11" style="padding: 10px 16px; background: rgba(0,0,0,0.02); border-left: 4px solid var(--maroon, #8B0A1A);">
              ${expandedContent}
            </td>
          </tr>`;
      }).join("");
    }
  }

  // Render Sub Breakdown Sections
  renderComplianceEntities(user);
  renderComplianceDepartments(user);
}

function calculateGroupMetrics(usersList, period) {
  let totalSubmissions = 0;
  let totalPossible = 0;
  
  if (period === 'daily') {
    const reportDate = selectedComplianceDate();
    const holiday = holidayForDate(reportDate);
    const submittedMap = new Map(reports().filter(r=>r.date===reportDate).map(r=>[r.employeeId,r]));
    
    totalPossible = holiday ? 0 : usersList.length;
    totalSubmissions = usersList.filter(u => submittedMap.has(u.employeeId)).length;
  } else {
    const range = period === 'weekly' ? weekRangeForDate(new Date(`${selectedComplianceDate()}T00:00:00`)) : monthRangeForSelection();
    const datesArr = datesBetween(range.start, range.end);
    let workingDaysCount = 0;
    
    const validReports = reports().filter(r => r.date >= range.start && r.date <= range.end);
    
    datesArr.forEach(d => {
      if (!holidayForDate(d)) workingDaysCount++;
    });
    
    totalPossible = workingDaysCount * usersList.length;
    usersList.forEach(u => {
      totalSubmissions += validReports.filter(r => r.employeeId === u.employeeId).length;
    });
  }
  
  let pending = totalPossible - totalSubmissions;
  if (pending < 0) pending = 0;
  return { total: usersList.length, expected: totalPossible, submitted: totalSubmissions, pending };
}

function renderComplianceEntities(user) {
  const container = document.getElementById("entitySubmissionTable");
  if(!container) return;
  const allUsers = complianceUsers(user);
  const entities = [...new Set(allUsers.map(u=>u.entity).filter(Boolean))].sort();
  
  let rowsHtml = entities.map(ent => {
    const entUsers = allUsers.filter(u=>u.entity === ent);
    const m = calculateGroupMetrics(entUsers, currentEntityPeriod);
    return `<tr>
      <td style="font-weight: 600;">${escapeHtml(ent)}</td>
      <td>${m.total}</td>
      <td><span style="color: #2b8a3e; font-weight: 700;">${m.submitted}</span></td>
      <td><span style="color: #e03131; font-weight: 700;">${m.pending}</span></td>
      <td style="text-align: center;"><button type="button" class="button button-secondary" data-open-drawer="Entity|${escapeHtml(ent)}|${currentEntityPeriod}" style="padding: 4px 10px; font-size: 0.78rem;"><i class="fa-solid fa-arrow-right"></i> Inspect</button></td>
    </tr>`;
  }).join("");

  const grand = calculateGroupMetrics(allUsers, currentEntityPeriod);
  rowsHtml += `<tr class="total-row" style="background: rgba(139,10,26,0.06); font-weight: 700;">
    <td>Total</td>
    <td>${grand.total}</td>
    <td><span style="color: #2b8a3e;">${grand.submitted}</span></td>
    <td><span style="color: #e03131;">${grand.pending}</span></td>
    <td style="text-align: center;"><button type="button" class="button button-secondary" data-open-drawer="All|All|${currentEntityPeriod}" style="padding: 4px 10px; font-size: 0.78rem;"><i class="fa-solid fa-arrow-right"></i> All</button></td>
  </tr>`;

  container.innerHTML = rowsHtml;
}

function renderComplianceDepartments(user) {
  const container = document.getElementById("departmentSubmissionAccordions");
  if(!container) return;
  const allUsers = complianceUsers(user);
  const depts = [...new Set(allUsers.map(u=>u.department).filter(Boolean))].sort();
  
  let html = depts.map(dept => {
    const deptUsers = allUsers.filter(u=>u.department === dept);
    const m = calculateGroupMetrics(deptUsers, currentDeptPeriod);
    const pct = m.expected > 0 ? Math.round((m.submitted / m.expected) * 100) : 0;
    
    return `
    <div class="dept-accordion" style="background: var(--panel-strong, #fff); border: 1px solid var(--line, #e2e8f0); border-radius: 10px; margin-bottom: 10px; overflow: hidden;">
      <div class="dept-accordion-header" data-toggle-accordion style="padding: 12px 18px; display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
        <div class="dept-accordion-title" style="font-weight: 700; color: var(--text); font-size: 0.95rem;">
          <i class="fa-solid fa-chevron-right dept-accordion-icon" style="margin-right: 8px; font-size: 0.8rem; transition: transform 0.2s;"></i>
          ${escapeHtml(dept)}
        </div>
        <div class="dept-accordion-pills" style="display: flex; gap: 8px; align-items: center;">
          <span class="org-tag-pill">Total: ${m.total}</span>
          <span class="org-tag-pill" style="background: #e6fcf5; color: #0ca678; font-weight: 700;">Sub: ${m.submitted} (${pct}%)</span>
          <span class="org-tag-pill" style="background: #fff5f5; color: #f03e3e; font-weight: 700;">Pending: ${m.pending}</span>
          <button type="button" class="button button-secondary" data-open-drawer="Department|${escapeHtml(dept)}|${currentDeptPeriod}" style="padding: 3px 8px; font-size: 0.75rem; margin-left: 6px;">
            <i class="fa-solid fa-arrow-right"></i>
          </button>
        </div>
      </div>
      <div class="dept-accordion-body hidden" style="padding: 14px 18px; border-top: 1px solid var(--line, #f1f5f9); background: var(--panel, #f8fafc);">
        <table class="credential-table">
          <thead><tr><th>Department</th><th>Employees</th><th>Submitted</th><th>Not Submitted</th><th>Action</th></tr></thead>
          <tbody>
            <tr>
              <td><strong>${escapeHtml(dept)}</strong></td>
              <td>${m.total}</td>
              <td><span style="color: #2b8a3e; font-weight: 700;">${m.submitted}</span></td>
              <td><span style="color: #e03131; font-weight: 700;">${m.pending}</span></td>
              <td><button type="button" class="button button-secondary" data-open-drawer="Department|${escapeHtml(dept)}|${currentDeptPeriod}" style="padding: 4px 10px; font-size: 0.78rem;"><i class="fa-solid fa-arrow-right"></i> Open Unit Drawer</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>`;
  }).join("");

  container.innerHTML = html;
}

// =========================================================================
// SIDE DRAWER CONTROLLER
// =========================================================================

currentDrawerState = {
  groupType: 'Entity',
  groupName: 'All',
  period: 'daily',
  tab: 'all',
  search: ''
};

function openComplianceDrawer(groupType, groupName, period = 'daily') {
  currentDrawerState = {
    groupType,
    groupName,
    period,
    tab: 'all',
    search: ''
  };

  const drawer = document.getElementById("complianceDetailDrawer");
  const backdrop = document.getElementById("complianceDrawerBackdrop");
  const badge = document.getElementById("drawerGroupTypeBadge");
  const title = document.getElementById("drawerGroupTitle");
  const searchInput = document.getElementById("drawerMemberSearchInput");

  if (badge) badge.textContent = groupType;
  if (title) title.textContent = groupName === 'All' ? 'All Scoped Employees' : groupName;
  if (searchInput) searchInput.value = '';

  document.querySelectorAll(".drawer-filter-tab").forEach(tabBtn => {
    tabBtn.classList.toggle("active", tabBtn.getAttribute("data-drawer-tab") === "all");
  });

  renderDrawerContent();

  if (drawer) drawer.classList.remove("hidden");
  if (backdrop) backdrop.classList.remove("hidden");
}

function closeComplianceDrawer() {
  const drawer = document.getElementById("complianceDetailDrawer");
  const backdrop = document.getElementById("complianceDrawerBackdrop");
  if (drawer) drawer.classList.add("hidden");
  if (backdrop) backdrop.classList.add("hidden");
}

function getDrawerUsersList(user) {
  let usersList = complianceUsers(user);
  if (currentDrawerState.groupType === 'Entity') {
    usersList = usersList.filter(u => u.entity === currentDrawerState.groupName);
  } else if (currentDrawerState.groupType === 'Department') {
    usersList = usersList.filter(u => u.department === currentDrawerState.groupName);
  }
  return usersList;
}

function renderDrawerContent() {
  const user = activeUser();
  if (!user) return;

  let allUnitMembers = getDrawerUsersList(user);
  const reportDate = selectedComplianceDate();
  const todayStr = today();
  const isPastDate = reportDate < todayStr;
  const isWindowClosed = isPastDate || (typeof autoSubmitWindowReached === 'function' && autoSubmitWindowReached());

  const submittedMap = new Map(reports().filter(r => r.date === reportDate).map(r => [r.employeeId, r]));

  const totalMembers = allUnitMembers.length;
  const submittedCount = allUnitMembers.filter(u => submittedMap.has(u.employeeId)).length;
  const pendingCount = Math.max(0, totalMembers - submittedCount);

  // Update tab counts and dynamic labels
  const tabAll = document.getElementById("drawerTabCountAll");
  const tabSub = document.getElementById("drawerTabCountSubmitted");
  const tabPen = document.getElementById("drawerTabCountPending");
  const tabPenBtn = document.querySelector('.drawer-filter-tab[data-drawer-tab="pending"]');

  if (tabAll) tabAll.textContent = String(totalMembers);
  if (tabSub) tabSub.textContent = String(submittedCount);
  if (tabPen) tabPen.textContent = String(pendingCount);

  if (tabPenBtn) {
    const label = isWindowClosed ? "Not Submitted" : "Pending";
    tabPenBtn.innerHTML = `${label} (<span id="drawerTabCountPending">${pendingCount}</span>)`;
  }

  const countEl = document.getElementById("drawerSummaryCount");
  const compEl = document.getElementById("drawerSummaryCompliance");
  if (countEl) countEl.textContent = `Total Members: ${totalMembers}`;
  if (compEl) {
    const pendingLabel = isWindowClosed ? "Not Submitted" : "Pending";
    compEl.textContent = `Submitted: ${submittedCount} | ${pendingLabel}: ${pendingCount}`;
  }

  // Filter by tab
  let displayList = allUnitMembers;
  const activeTab = currentDrawerState.tab || 'all';
  if (activeTab === 'submitted') {
    displayList = displayList.filter(u => submittedMap.has(u.employeeId));
  } else if (activeTab === 'pending') {
    displayList = displayList.filter(u => !submittedMap.has(u.employeeId));
  }

  // Filter by search
  const searchVal = (currentDrawerState.search || "").toLowerCase().trim();
  if (searchVal) {
    displayList = displayList.filter(u => 
      (u.name && u.name.toLowerCase().includes(searchVal)) || 
      (u.employeeId && u.employeeId.toLowerCase().includes(searchVal)) ||
      (u.department && u.department.toLowerCase().includes(searchVal)) ||
      (u.entity && u.entity.toLowerCase().includes(searchVal))
    );
  }

  const container = document.getElementById("drawerMemberList");
  if (!container) return;

  if (displayList.length === 0) {
    container.innerHTML = '<div class="empty-state" style="padding: 24px; text-align: center; color: var(--muted, #64748b);">No member records match the active filter criteria.</div>';
    return;
  }

  container.innerHTML = displayList.map(emp => {
    const report = submittedMap.get(emp.employeeId);
    const leave = typeof leaveForDateAndUser === 'function' ? leaveForDateAndUser(reportDate, emp.employeeId) : null;
    const initials = (emp.name || "U").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();

    let statusPill = '';
    let pointsToggleBtn = '';
    let pointsPanelHtml = '';
    let avatarBg = '#64748b';

    if (report) {
      avatarBg = '#16a34a';
      statusPill = '<span class="status-pill submitted" style="font-size: 0.72rem;"><i class="fa-solid fa-check"></i> SUBMITTED</span>';
      const points = report.points || [];
      if (points.length > 0) {
        pointsToggleBtn = `
          <button type="button" class="drawer-points-toggle" data-pts-id="${escapeHtml(emp.employeeId)}">
            <i class="fa-solid fa-chevron-down"></i> ${points.length} Tasks
          </button>`;
        
        const ptsItems = points.map((pt, pIdx) => {
          const text = pt.rawText || String(pt.text || "").replace(/^\d+\.\s*/, "");
          const dur = pt.totalTime || (pt.hours ? `${pt.hours}h ${pt.minutes||0}m` : "--");
          const att = pt.attachmentName ? `<a href="${pt.attachmentUrl || '#'}" target="_blank" class="task-file-link" style="margin-left: 8px; font-size: 0.72rem; color: #2563eb;"><i class="fa-solid fa-paperclip"></i> ${escapeHtml(pt.attachmentName)}</a>` : '';
          return `
            <div class="drawer-point-item" style="display: flex; align-items: flex-start; gap: 8px; font-size: 0.8rem;">
              <span style="background: rgba(22, 163, 74, 0.12); color: #15803d; font-weight: 700; font-size: 0.7rem; padding: 1px 6px; border-radius: 4px; flex-shrink: 0; margin-top: 2px;">#${pIdx + 1}</span>
              <div style="flex: 1; min-width: 0;">
                <div style="color: var(--text, #1e293b); font-weight: 500; white-space: pre-wrap; line-height: 1.4;">${escapeHtml(text)}</div>
                <div style="display: flex; align-items: center; gap: 8px; margin-top: 3px;">
                  <span class="org-tag-pill" style="font-size: 0.68rem; background: #e0f2fe; color: #0369a1;"><i class="fa-regular fa-clock"></i> ${escapeHtml(dur)}</span>
                  ${att}
                </div>
              </div>
            </div>`;
        }).join("");

        pointsPanelHtml = `
          <div id="drawerPts-${escapeHtml(emp.employeeId)}" class="drawer-points-panel hidden" style="border-left-color: #16a34a; background: #f0fdf4;">
            <div style="font-size: 0.75rem; font-weight: 700; color: #15803d; margin-bottom: 6px; text-transform: uppercase;">
              <i class="fa-solid fa-list-check" style="margin-right: 4px;"></i> Tasks Breakdown (${points.length} points)
            </div>
            ${ptsItems}
          </div>`;
      } else {
        pointsToggleBtn = `<span style="font-size: 0.72rem; color: #16a34a; font-weight: 600;">Submitted</span>`;
      }
    } else if (leave) {
      avatarBg = '#0284c7';
      const leaveDesc = leave.leaveType === "half" ? `Half Day` : "Full Day Leave";
      statusPill = '<span class="status-pill leave" style="font-size: 0.72rem;"><i class="fa-solid fa-umbrella-beach"></i> LEAVE</span>';
      pointsPanelHtml = `<div class="drawer-points-panel" style="border-left-color: #0284c7; background: #f0f9ff; font-size: 0.8rem; color: #0369a1;"><strong>Leave:</strong> ${escapeHtml(leaveDesc)} - <em>"${escapeHtml(leave.remarks || 'No remarks')}"</em></div>`;
    } else {
      avatarBg = isWindowClosed ? '#dc2626' : '#d97706';
      if (isWindowClosed) {
        statusPill = '<span class="status-pill not-submitted" style="font-size: 0.72rem;"><i class="fa-solid fa-circle-xmark"></i> NOT SUBMITTED</span>';
        pointsPanelHtml = `<div class="drawer-points-panel" style="border-left-color: #dc2626; background: #fef2f2; font-size: 0.78rem; color: #991b1b;"><i class="fa-solid fa-circle-xmark" style="margin-right: 4px;"></i> Not submitted for ${formatDate(reportDate)}</div>`;
      } else {
        statusPill = '<span class="status-pill pending" style="font-size: 0.72rem;"><i class="fa-regular fa-clock"></i> PENDING</span>';
        pointsPanelHtml = `<div class="drawer-points-panel" style="border-left-color: #d97706; background: #fffbeb; font-size: 0.78rem; color: #92400e;"><i class="fa-regular fa-clock" style="margin-right: 4px;"></i> DAR pending for today</div>`;
      }
    }

    return `
      <div class="drawer-member-card">
        <div class="drawer-member-header">
          <div style="display: flex; align-items: center; gap: 10px; min-width: 0;">
            <div class="sidebar-profile-avatar" style="width: 34px; height: 34px; font-size: 0.8rem; background: ${avatarBg}; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0;">
              ${initials}
            </div>
            <div style="min-width: 0;">
              <div style="font-weight: 700; font-size: 0.88rem; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${escapeHtml(emp.name)}
              </div>
              <div style="font-size: 0.75rem; color: var(--muted); display: flex; gap: 6px; align-items: center;">
                <span>${escapeHtml(emp.employeeId)}</span> • <span>${escapeHtml(emp.department || "-")}</span>
              </div>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
            ${statusPill}
            ${pointsToggleBtn}
            <button type="button" class="profile-link" data-open-profile="${escapeHtml(emp.employeeId)}" style="font-size: 0.75rem; color: var(--muted); padding: 2px 6px;" title="View Profile">
              <i class="fa-solid fa-user"></i>
            </button>
          </div>
        </div>
        ${pointsPanelHtml}
      </div>`;
  }).join("");
}

// =========================================================================
// PROFESSIONAL INTERACTIVE ORGANIZATION GRAPH & STRUCTURE TAGGING ENGINE
// =========================================================================
// PROFESSIONAL INTERACTIVE ORGANIZATION GRAPH & STRUCTURE TAGGING ENGINE
// =========================================================================

let currentGraphZoom = 1.0;
let collapsedOrgNodeIds = new Set();
let expandedDeptNodeIds = new Set();
let lastToggledOrgNodeId = null;
let isInitialGraphRender = true;

function renderOrganizationGraph(user) {
  const canvas = document.getElementById("orgGraphCanvas");
  const viewport = document.getElementById("orgGraphContainer");
  if (!canvas) return;

  const isMasterAdmin = !!(user && isAdmin(user));

  // Gate edit & sync toolbar buttons to Master Admin only
  const editHierarchyBtn = document.getElementById("btnEditOrgHierarchy");
  if (editHierarchyBtn) editHierarchyBtn.style.display = isMasterAdmin ? "inline-flex" : "none";
  const excelSyncBtn = document.getElementById("btnGraphExcelSync");
  if (excelSyncBtn) excelSyncBtn.style.display = isMasterAdmin ? "inline-flex" : "none";

  const all = users().filter(u => u.level !== "admin" && (u.isActive !== false || u.includeInOrgTree === true));

  // Identify Managing Director (Md. Moquim, D01) & Other Level 1 Directors
  const allDirectors = all.filter(u => String(u.level) === "1");
  const mdMoquim = all.find(u => u.employeeId === "D01" || (u.name && u.name.toLowerCase().includes("moquim")) || (u.role && u.role.toLowerCase().includes("managing director"))) || allDirectors[0] || all[0];
  const otherDirectors = allDirectors.filter(u => u && mdMoquim && u.employeeId !== mdMoquim.employeeId);

  // Populate Director Filter Dropdown
  const directorFilter = document.getElementById("graphDirectorFilter");
  if (directorFilter) {
    const currentVal = directorFilter.value || "All";
    let dirOpts = '<option value="All">All Directors</option>';
    if (mdMoquim) {
      const isSel = mdMoquim.employeeId === currentVal ? "selected" : "";
      dirOpts += `<option value="${escapeHtml(mdMoquim.employeeId)}" ${isSel}>${escapeHtml(mdMoquim.name)} (${escapeHtml(mdMoquim.employeeId)}) - Managing Director</option>`;
    }
    otherDirectors.forEach(d => {
      const isSel = d.employeeId === currentVal ? "selected" : "";
      dirOpts += `<option value="${escapeHtml(d.employeeId)}" ${isSel}>${escapeHtml(d.name)} (${escapeHtml(d.employeeId)}) - Director</option>`;
    });
    if (directorFilter.options.length !== allDirectors.length + 1) {
      directorFilter.innerHTML = dirOpts;
      directorFilter.value = currentVal;
    }
  }

  // Populate Department Filter Dropdown
  const deptFilter = document.getElementById("graphDeptFilter");
  if (deptFilter && deptFilter.options.length <= 1) {
    const depts = [...new Set(all.map(u => u.department).filter(Boolean))].sort();
    deptFilter.innerHTML = '<option value="All">All Departments</option>' + depts.map(d => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join("");
  }

  const selectedDirector = directorFilter ? directorFilter.value : "All";
  const selectedDept = deptFilter ? deptFilter.value : "All";
  const searchVal = (document.getElementById("graphSearchInput")?.value || "").toLowerCase().trim();

  // Helper to test if an employee matches search
  function matchesSearch(u) {
    if (!u || !searchVal) return false;
    return (
      (u.name && u.name.toLowerCase().includes(searchVal)) ||
      (u.employeeId && u.employeeId.toLowerCase().includes(searchVal)) ||
      (u.department && u.department.toLowerCase().includes(searchVal)) ||
      (u.entity && u.entity.toLowerCase().includes(searchVal)) ||
      (u.role && u.role.toLowerCase().includes(searchVal)) ||
      (u.location && u.location.toLowerCase().includes(searchVal))
    );
  }

  // Determine Director Association for all employees upfront
  // Map: directorId -> List of direct / tagged subordinates grouped by department
  const allAssignedIds = new Set();
  if (mdMoquim) allAssignedIds.add(mdMoquim.employeeId);
  otherDirectors.forEach(d => allAssignedIds.add(d.employeeId));

  // Helper to resolve which Director an employee belongs to:
  function resolveDirectorForUser(emp) {
    if (String(emp.level) === "1") return emp.employeeId;
    if (emp.taggedDirectorId) return emp.taggedDirectorId;
    
    // Trace manager chain
    let curr = emp;
    let visited = new Set();
    while (curr && curr.managerId && !visited.has(curr.employeeId)) {
      visited.add(curr.employeeId);
      const parent = all.find(p => p.employeeId === curr.managerId);
      if (!parent) break;
      if (String(parent.level) === "1") return parent.employeeId;
      if (parent.taggedDirectorId) return parent.taggedDirectorId;
      curr = parent;
    }
    return "";
  }

  // Pre-index all employees under their assigned directors
  const directorSubordinatesMap = new Map(); // directorId -> Map(deptName -> [employees])
  allDirectors.forEach(d => directorSubordinatesMap.set(d.employeeId, new Map()));

  all.forEach(u => {
    if (String(u.level) === "1") return; // Directors are root branches
    const dirId = resolveDirectorForUser(u);
    if (dirId && directorSubordinatesMap.has(dirId)) {
      allAssignedIds.add(u.employeeId);
      const dept = u.department || "General";
      const deptMap = directorSubordinatesMap.get(dirId);
      if (!deptMap.has(dept)) deptMap.set(dept, []);
      deptMap.get(dept).push(u);
    } else if (u.managerId) {
      // Has a manager even if director is unresolved
      allAssignedIds.add(u.employeeId);
    }
  });

  // Helper to check if a node or any of its descendants matches the department filter
  function subtreeMatchesDept(empNode, visited = new Set()) {
    if (selectedDept === "All") return true;
    if (empNode.department === selectedDept) return true;
    if (visited.has(empNode.employeeId)) return false;
    visited.add(empNode.employeeId);
    
    const subs = all.filter(u => !visited.has(u.employeeId) && (u.managerId === empNode.employeeId || (String(empNode.level) === "1" && !u.managerId && u.taggedDirectorId === empNode.employeeId)));
    return subs.some(sub => subtreeMatchesDept(sub, visited));
  }

  let html = '';

  // Helper to build individual node card HTML with full metadata tags (Dept, Location, Entity)
  function buildOrgCardHtml(node, roleBadge, cardClass, directSubsCount, isCollapsed, isMatch, customAvatarHtml = "") {
    const initial = (node.name || "E").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
    const avatarHtml = customAvatarHtml || `<div class="org-node-avatar">${escapeHtml(initial)}</div>`;
    const isInactive = node.isActive === false;

    return `
      <div class="org-node-card ${cardClass} ${isInactive ? 'org-node-inactive' : ''} ${isMatch ? 'org-node-match' : ''}" 
           draggable="${isMasterAdmin ? 'true' : 'false'}" 
           ${isMasterAdmin ? `data-drag-emp="${escapeHtml(node.employeeId)}"` : ''} 
           data-org-node-id="${escapeHtml(node.employeeId)}" 
           data-open-profile="${escapeHtml(node.employeeId)}"
           ${isInactive ? 'style="border-style: dashed; opacity: 0.9;"' : ''}>
        ${isMasterAdmin ? `
          <button type="button" class="org-node-edit-btn" data-edit-org="${escapeHtml(node.employeeId)}" title="Edit hierarchy & tagging">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
        ` : ''}
        <div class="org-node-top">
          ${avatarHtml}
          <div class="org-node-info">
            <h5 title="${escapeHtml(node.name)}">${escapeHtml(node.name)}</h5>
            <span>${roleBadge}${isInactive ? ` <span class="org-tag-pill" style="background: rgba(220, 38, 38, 0.12); color: #dc2626; font-weight: 700; padding: 1px 5px; margin-left: 4px;" title="Deactivated Staff Attached to Org Tree"><i class="fa-solid fa-user-slash"></i> Inactive</span>` : ''}</span>
          </div>
        </div>
        <div class="org-node-tags">
          <span class="org-tag-pill" title="Department"><i class="fa-solid fa-building"></i> ${escapeHtml(node.department || "-")}</span>
          <span class="org-tag-pill" title="Location"><i class="fa-solid fa-location-dot"></i> ${escapeHtml(node.location || "-")}</span>
          <span class="org-tag-pill" title="Entity"><i class="fa-solid fa-briefcase"></i> ${escapeHtml(node.entity || "-")}</span>
        </div>
        ${directSubsCount > 0 ? `
          <button type="button" class="org-node-toggle-btn" data-toggle-org="${escapeHtml(node.employeeId)}" title="${isCollapsed ? 'Expand subordinates' : 'Collapse subordinates'}">
            <i class="fa-solid ${isCollapsed ? 'fa-plus' : 'fa-minus'}"></i> ${directSubsCount} ${isCollapsed ? 'Hidden' : 'Subs'}
          </button>
        ` : ''}
      </div>`;
  }

  // Generalized Recursive Subtree Branch Builder (Supports any depth, including L3 -> L3 leads)
  function buildSubtreeBranchHtml(node, depth = 0, currentBranchPath = new Set()) {
    if (!node || currentBranchPath.has(node.employeeId)) return '';
    const branchVisited = new Set(currentBranchPath);
    branchVisited.add(node.employeeId);

    // Find direct subordinates
    const directSubs = all.filter(u => {
      if (branchVisited.has(u.employeeId) || u.employeeId === node.employeeId) return false;
      if (u.managerId === node.employeeId) return true;
      if (String(node.level) === "1" && !u.managerId && u.taggedDirectorId === node.employeeId) return true;
      return false;
    });

    if (selectedDept !== "All" && !subtreeMatchesDept(node)) {
      return '';
    }

    const isMatch = matchesSearch(node);
    const isCollapsed = collapsedOrgNodeIds.has(node.employeeId);

    // Determine card level styling and role badge
    let cardClass = "level3-card";
    let roleBadge = `${escapeHtml(node.employeeId)} • Member`;

    if (String(node.level) === "1") {
      cardClass = (mdMoquim && node.employeeId === mdMoquim.employeeId) ? "apex-card" : "director-card";
      roleBadge = (mdMoquim && node.employeeId === mdMoquim.employeeId) ? `${escapeHtml(node.employeeId)} • Managing Director` : `${escapeHtml(node.employeeId)} • Executive Director`;
    } else if (String(node.level) === "2") {
      cardClass = "level2-card";
      roleBadge = `${escapeHtml(node.employeeId)} • Reporting Manager`;
    } else if (directSubs.length > 0) {
      cardClass = "level3-card is-lead";
      roleBadge = `${escapeHtml(node.employeeId)} • Team Lead (L3)`;
    }

    let branchHtml = `
      <div class="org-tree-branch">
        ${buildOrgCardHtml(node, roleBadge, cardClass, directSubs.length, isCollapsed, isMatch)}
    `;

    if (directSubs.length > 0 && !isCollapsed) {
      branchHtml += `<div class="org-tree-stem-down"></div>`;
      branchHtml += `<div class="org-tree-children">`;

      directSubs.forEach(subNode => {
        branchHtml += buildSubtreeBranchHtml(subNode, depth + 1, branchVisited);
      });

      branchHtml += `</div>`;
    }

    branchHtml += `</div>`;
    return branchHtml;
  }

  // Build Department Sub-Node Branch (Grouped under a Director)
  function buildDepartmentBranchHtml(director, deptName, deptMembers) {
    if (!deptMembers || deptMembers.length === 0) return '';
    if (selectedDept !== "All" && deptName !== selectedDept) return '';

    const deptNodeId = `dept_${director.employeeId}_${encodeURIComponent(deptName)}`;
    const totalDeptCount = deptMembers.length;
    const isDeptSearchMatch = searchVal && deptMembers.some(m => matchesSearch(m));
    
    // Initial state: Department sub-nodes are collapsed by default.
    // Expands when in expandedDeptNodeIds, or when user searched, or when department filter is explicitly chosen.
    const isDeptExpanded = expandedDeptNodeIds.has(deptNodeId) || Boolean(searchVal && isDeptSearchMatch) || (selectedDept !== "All" && selectedDept === deptName);

    let deptHtml = `
      <div class="org-tree-branch">
        <div class="org-node-card dept-card ${isDeptSearchMatch ? 'org-node-match' : ''}" 
             data-org-node-id="${escapeHtml(deptNodeId)}">
          <div class="org-node-top">
            <div class="org-node-avatar" style="background: linear-gradient(135deg, #6366f1, #8b5cf6);">
              <i class="fa-solid fa-layer-group"></i>
            </div>
            <div class="org-node-info">
              <h5 title="${escapeHtml(deptName)} Department">${escapeHtml(deptName)}</h5>
              <span>${totalDeptCount} Member${totalDeptCount === 1 ? '' : 's'}</span>
            </div>
          </div>
          <div class="org-node-tags">
            <span class="org-tag-pill" title="Department"><i class="fa-solid fa-building"></i> ${escapeHtml(deptName)}</span>
            <span class="org-tag-pill" title="Director Division"><i class="fa-solid fa-user-tie"></i> ${escapeHtml((director.name || '').split(' ')[0])}</span>
          </div>
          <button type="button" class="org-node-toggle-btn" data-toggle-org="${escapeHtml(deptNodeId)}" title="${isDeptExpanded ? 'Collapse Department' : 'Expand Department Members'}">
            <i class="fa-solid ${isDeptExpanded ? 'fa-minus' : 'fa-plus'}"></i> ${isDeptExpanded ? 'Collapse' : `+${totalDeptCount} Staff`}
          </button>
        </div>`;

    if (isDeptExpanded) {
      deptHtml += `<div class="org-tree-stem-down" style="background: #6366f1; box-shadow: 0 0 6px rgba(99, 102, 241, 0.4);"></div>`;
      deptHtml += `<div class="org-tree-children">`;

      // Top-level members in this department:
      // Members who have no manager inside this department or report directly to Director
      const deptMemberIds = new Set(deptMembers.map(m => m.employeeId));
      const deptTopMembers = deptMembers.filter(m => {
        if (!m.managerId) return true;
        if (m.managerId === director.employeeId) return true;
        return !deptMemberIds.has(m.managerId);
      });

      const membersToRender = deptTopMembers.length > 0 ? deptTopMembers : deptMembers;

      membersToRender.forEach(m => {
        deptHtml += buildSubtreeBranchHtml(m, 1, new Set([director.employeeId]));
      });

      deptHtml += `</div>`;
    }

    deptHtml += `</div>`;
    return deptHtml;
  }

  // Build Director Branch with Grouped Department Sub-Nodes
  function buildDirectorBranchHtml(director, isApex = false) {
    if (!director) return '';

    const deptMap = directorSubordinatesMap.get(director.employeeId) || new Map();
    const isMatch = matchesSearch(director);
    const isDirCollapsed = collapsedOrgNodeIds.has(director.employeeId);
    
    // Filter deptMap if selectedDept is active
    let visibleDepts = [...deptMap.entries()];
    if (selectedDept !== "All") {
      visibleDepts = visibleDepts.filter(([dName]) => dName === selectedDept);
    }
    const totalDeptCount = visibleDepts.length;

    const cardClass = isApex ? "apex-card" : "director-card";
    const roleBadge = isApex ? `${escapeHtml(director.employeeId)} • Managing Director` : `${escapeHtml(director.employeeId)} • Executive Director`;
    const avatarHtml = isApex 
      ? `<div class="org-node-avatar" style="background: linear-gradient(135deg, #8B0A1A, #dc2626); font-size: 0.95rem;"><i class="fa-solid fa-crown"></i></div>`
      : `<div class="org-node-avatar" style="background: linear-gradient(135deg, #e11d48, #fb7185);">${escapeHtml((director.name || "D").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase())}</div>`;

    let dirHtml = `
      <div class="org-tree-branch">
        <div class="org-node-card ${cardClass} ${isMatch ? 'org-node-match' : ''}" 
             draggable="${isMasterAdmin ? 'true' : 'false'}" 
             ${isMasterAdmin ? `data-drag-emp="${escapeHtml(director.employeeId)}"` : ''} 
             data-org-node-id="${escapeHtml(director.employeeId)}" 
             data-open-profile="${escapeHtml(director.employeeId)}">
          ${isMasterAdmin ? `
            <button type="button" class="org-node-edit-btn" data-edit-org="${escapeHtml(director.employeeId)}" title="Edit hierarchy & tagging">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
          ` : ''}
          <div class="org-node-top">
            ${avatarHtml}
            <div class="org-node-info">
              <h5 title="${escapeHtml(director.name)}">${escapeHtml(director.name)}</h5>
              <span>${roleBadge}</span>
            </div>
          </div>
          <div class="org-node-tags">
            <span class="org-tag-pill" title="Department"><i class="fa-solid fa-building"></i> ${escapeHtml(director.department || "Executive")}</span>
            <span class="org-tag-pill" title="Location"><i class="fa-solid fa-location-dot"></i> ${escapeHtml(director.location || "Head Office")}</span>
            <span class="org-tag-pill" title="Entity"><i class="fa-solid fa-briefcase"></i> ${escapeHtml(director.entity || "Metro Group")}</span>
          </div>
          ${totalDeptCount > 0 ? `
            <button type="button" class="org-node-toggle-btn" data-toggle-org="${escapeHtml(director.employeeId)}" title="${isDirCollapsed ? 'Expand Departments' : 'Collapse Departments'}">
              <i class="fa-solid ${isDirCollapsed ? 'fa-plus' : 'fa-minus'}"></i> ${totalDeptCount} ${isDirCollapsed ? 'Hidden Depts' : 'Departments'}
            </button>
          ` : ''}
        </div>`;

    if (totalDeptCount > 0 && !isDirCollapsed) {
      dirHtml += `<div class="org-tree-stem-down"></div>`;
      dirHtml += `<div class="org-tree-children">`;

      visibleDepts.forEach(([deptName, members]) => {
        dirHtml += buildDepartmentBranchHtml(director, deptName, members);
      });

      dirHtml += `</div>`;
    }

    dirHtml += `</div>`;
    return dirHtml;
  }

  // Render the Tree
  if (selectedDirector === "All" && mdMoquim) {
    // Managing Director (Md. Moquim) as Corporate Apex Node
    const isMdMatch = matchesSearch(mdMoquim);
    const isMdCollapsed = collapsedOrgNodeIds.has(mdMoquim.employeeId);

    const mdDeptMap = directorSubordinatesMap.get(mdMoquim.employeeId) || new Map();
    let visibleMdDepts = [...mdDeptMap.entries()];
    if (selectedDept !== "All") {
      visibleMdDepts = visibleMdDepts.filter(([dName]) => dName === selectedDept);
    }

    const isDirectorsSearchMatch = searchVal && otherDirectors.some(d => matchesSearch(d) || (directorSubordinatesMap.get(d.employeeId) && [...directorSubordinatesMap.get(d.employeeId).values()].flat().some(m => matchesSearch(m))));
    const isMdDeptsSearchMatch = searchVal && visibleMdDepts.some(([dName, members]) => dName.toLowerCase().includes(searchVal) || members.some(m => matchesSearch(m)));

    // Both hubs start collapsed initially by default unless expanded or matching search
    const isDirectorsHubExpanded = expandedDeptNodeIds.has("__directors_hub__") || Boolean(searchVal && isDirectorsSearchMatch);
    const isMdDeptsHubExpanded = expandedDeptNodeIds.has("__md_direct_depts_hub__") || Boolean(searchVal && isMdDeptsSearchMatch) || (selectedDept !== "All" && visibleMdDepts.length > 0);

    html += '<div class="org-tree-root">';
    html += `
      <div class="org-tree-branch">
        <div class="org-node-card apex-card ${isMdMatch ? 'org-node-match' : ''}" 
             draggable="${isMasterAdmin ? 'true' : 'false'}" 
             ${isMasterAdmin ? `data-drag-emp="${escapeHtml(mdMoquim.employeeId)}"` : ''} 
             data-org-node-id="${escapeHtml(mdMoquim.employeeId)}" 
             data-open-profile="${escapeHtml(mdMoquim.employeeId)}">
          ${isMasterAdmin ? `
            <button type="button" class="org-node-edit-btn" data-edit-org="${escapeHtml(mdMoquim.employeeId)}" title="Edit hierarchy & tagging">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
          ` : ''}
          <div class="org-node-top">
            <div class="org-node-avatar" style="background: linear-gradient(135deg, #8B0A1A, #dc2626); font-size: 0.95rem;">
              <i class="fa-solid fa-crown"></i>
            </div>
            <div class="org-node-info">
              <h5 title="${escapeHtml(mdMoquim.name)}">${escapeHtml(mdMoquim.name)}</h5>
              <span style="color: #b91c1c; font-weight: 700;">${escapeHtml(mdMoquim.employeeId)} • Managing Director</span>
            </div>
          </div>
          <div class="org-node-tags">
            <span class="org-tag-pill" title="Department"><i class="fa-solid fa-building"></i> ${escapeHtml(mdMoquim.department || "Directorate")}</span>
            <span class="org-tag-pill" title="Location"><i class="fa-solid fa-location-dot"></i> ${escapeHtml(mdMoquim.location || "Head Office")}</span>
            <span class="org-tag-pill" title="Entity"><i class="fa-solid fa-briefcase"></i> ${escapeHtml(mdMoquim.entity || "Metro Group")}</span>
          </div>
          <button type="button" class="org-node-toggle-btn" data-toggle-org="${escapeHtml(mdMoquim.employeeId)}" title="${isMdCollapsed ? 'Expand Organization' : 'Collapse Organization'}">
            <i class="fa-solid ${isMdCollapsed ? 'fa-plus' : 'fa-minus'}"></i> ${isMdCollapsed ? 'Hidden' : 'Organization'}
          </button>
        </div>`;

    if (!isMdCollapsed) {
      html += `<div class="org-tree-stem-down"></div>`;
      html += `<div class="org-tree-children">`;

      // Branch 1: Executive Directorate (5 Directors Hub)
      if (otherDirectors.length > 0) {
        html += `
          <div class="org-tree-branch">
            <div class="org-node-card directors-hub-card ${isDirectorsSearchMatch ? 'org-node-match' : ''}" 
                 data-org-node-id="__directors_hub__">
              <div class="org-node-top">
                <div class="org-node-avatar">
                  <i class="fa-solid fa-users-line"></i>
                </div>
                <div class="org-node-info">
                  <h5>Executive Directorate</h5>
                  <span>${otherDirectors.length} Executive Directors</span>
                </div>
              </div>
              <div class="org-node-tags">
                <span class="org-tag-pill" title="Directors"><i class="fa-solid fa-user-tie"></i> ${otherDirectors.length} Directors</span>
                <span class="org-tag-pill" title="Division"><i class="fa-solid fa-sitemap"></i> Board Level</span>
              </div>
              <button type="button" class="org-node-toggle-btn" data-toggle-org="__directors_hub__" title="${isDirectorsHubExpanded ? 'Collapse Directors' : 'Expand Directors'}">
                <i class="fa-solid ${isDirectorsHubExpanded ? 'fa-minus' : 'fa-plus'}"></i> ${isDirectorsHubExpanded ? 'Collapse' : `+${otherDirectors.length} Directors`}
              </button>
            </div>`;

        if (isDirectorsHubExpanded) {
          html += `<div class="org-tree-stem-down" style="background: #e11d48; box-shadow: 0 0 6px rgba(225, 29, 72, 0.4);"></div>`;
          html += `<div class="org-tree-children">`;
          otherDirectors.forEach(dir => {
            html += buildDirectorBranchHtml(dir, false);
          });
          html += `</div>`;
        }

        html += `</div>`;
      }

      // Branch 2: MD Direct Reporting Departments Hub
      if (visibleMdDepts.length > 0) {
        html += `
          <div class="org-tree-branch">
            <div class="org-node-card md-direct-hub-card ${isMdDeptsSearchMatch ? 'org-node-match' : ''}" 
                 data-org-node-id="__md_direct_depts_hub__">
              <div class="org-node-top">
                <div class="org-node-avatar">
                  <i class="fa-solid fa-building-user"></i>
                </div>
                <div class="org-node-info">
                  <h5>MD Direct Departments</h5>
                  <span>${visibleMdDepts.length} Direct Department${visibleMdDepts.length === 1 ? '' : 's'}</span>
                </div>
              </div>
              <div class="org-node-tags">
                <span class="org-tag-pill" title="Departments"><i class="fa-solid fa-layer-group"></i> ${visibleMdDepts.length} Depts</span>
                <span class="org-tag-pill" title="Reporting"><i class="fa-solid fa-user-check"></i> Direct to MD</span>
              </div>
              <button type="button" class="org-node-toggle-btn" data-toggle-org="__md_direct_depts_hub__" title="${isMdDeptsHubExpanded ? 'Collapse Direct Departments' : 'Expand Direct Departments'}">
                <i class="fa-solid ${isMdDeptsHubExpanded ? 'fa-minus' : 'fa-plus'}"></i> ${isMdDeptsHubExpanded ? 'Collapse' : `+${visibleMdDepts.length} Depts`}
              </button>
            </div>`;

        if (isMdDeptsHubExpanded) {
          html += `<div class="org-tree-stem-down" style="background: #0284c7; box-shadow: 0 0 6px rgba(2, 132, 199, 0.4);"></div>`;
          html += `<div class="org-tree-children">`;
          visibleMdDepts.forEach(([deptName, members]) => {
            html += buildDepartmentBranchHtml(mdMoquim, deptName, members);
          });
          html += `</div>`;
        }

        html += `</div>`;
      }

      html += `</div>`;
    }

    html += `</div></div>`;
  } else if (selectedDirector !== "All") {
    // Single Director Filtered View
    const targetDir = all.find(u => u.employeeId === selectedDirector);
    if (targetDir) {
      const isApex = targetDir.employeeId === (mdMoquim ? mdMoquim.employeeId : "");
      html += '<div class="org-tree-root">';
      html += buildDirectorBranchHtml(targetDir, isApex);
      html += '</div>';
    }
  } else {
    // Fallback: render directors directly
    html += '<div class="org-tree-root">';
    allDirectors.forEach(d => {
      html += buildDirectorBranchHtml(d, d.employeeId === (mdMoquim ? mdMoquim.employeeId : ""));
    });
    html += '</div>';
  }

  // Unassigned / Orphan Personnel Branch (ONLY truly unassigned users who have no manager and no director)
  const unassignedUsers = all.filter(u => !allAssignedIds.has(u.employeeId));
  if (unassignedUsers.length > 0 && (selectedDirector === "All" || allDirectors.length === 0)) {
    const isUnassignedCollapsed = !expandedDeptNodeIds.has("__unassigned_branch__");
    html += `
      <div class="org-tree-root unassigned-branch" style="margin-top: 36px; padding-top: 24px; border-top: 1px dashed rgba(245, 158, 11, 0.3);">
        <div class="org-tree-branch">
          <div class="org-node-card unassigned-card" style="width: 250px;">
            <div class="org-node-top">
              <div class="org-node-avatar" style="background: linear-gradient(135deg, #f59e0b, #d97706);"><i class="fa-solid fa-triangle-exclamation"></i></div>
              <div class="org-node-info">
                <h5>Unassigned Personnel</h5>
                <span style="color: #fbbf24;">Awaiting Structure Tagging</span>
              </div>
            </div>
            <div class="org-node-tags">
              <span class="org-tag-pill" style="background: rgba(245, 158, 11, 0.2); color: #fbbf24;">${unassignedUsers.length} Personnel</span>
              ${isMasterAdmin ? `<button type="button" class="button" data-edit-org="${escapeHtml(unassignedUsers[0].employeeId)}" style="padding: 2px 8px; font-size: 0.68rem; background: #f59e0b; color: #000; font-weight: 700; border-radius: 4px;">Tag Now</button>` : ''}
            </div>
            <button type="button" class="org-node-toggle-btn" data-toggle-org="__unassigned_branch__" style="border-color: #f59e0b; color: #f59e0b;" title="${isUnassignedCollapsed ? 'Expand unassigned employees' : 'Collapse unassigned employees'}">
              <i class="fa-solid ${isUnassignedCollapsed ? 'fa-plus' : 'fa-minus'}"></i> ${unassignedUsers.length} ${isUnassignedCollapsed ? 'Hidden' : 'Records'}
            </button>
          </div>`;

    if (!isUnassignedCollapsed) {
      html += `<div class="org-tree-stem-down" style="background: #f59e0b; box-shadow: 0 0 6px rgba(245, 158, 11, 0.5);"></div>`;
      html += `<div class="org-tree-children">`;

      unassignedUsers.forEach(u => {
        if (selectedDept !== "All" && u.department !== selectedDept) return;
        const isMatch = matchesSearch(u);
        const uInitial = (u.name || "U").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();

        html += `
          <div class="org-tree-branch">
            <div class="org-node-card unassigned-card ${isMatch ? 'org-node-match' : ''}" 
                 draggable="${isMasterAdmin ? 'true' : 'false'}" 
                 ${isMasterAdmin ? `data-drag-emp="${escapeHtml(u.employeeId)}"` : ''} 
                 data-org-node-id="${escapeHtml(u.employeeId)}" 
                 data-open-profile="${escapeHtml(u.employeeId)}">
              ${isMasterAdmin ? `
                <button type="button" class="org-node-edit-btn" data-edit-org="${escapeHtml(u.employeeId)}" title="Assign Manager & Level">
                  <i class="fa-solid fa-pen-to-square"></i>
                </button>
              ` : ''}
              <div class="org-node-top">
                <div class="org-node-avatar" style="background: linear-gradient(135deg, #f59e0b, #b45309);">${escapeHtml(uInitial)}</div>
                <div class="org-node-info">
                  <h5 title="${escapeHtml(u.name)}">${escapeHtml(u.name)}</h5>
                  <span style="color: #fbbf24;">${escapeHtml(u.employeeId)} • Unlinked</span>
                </div>
              </div>
              <div class="org-node-tags">
                <span class="org-tag-pill" title="Department"><i class="fa-solid fa-building"></i> ${escapeHtml(u.department || "-")}</span>
                <span class="org-tag-pill" title="Location"><i class="fa-solid fa-location-dot"></i> ${escapeHtml(u.location || "-")}</span>
                <span class="org-tag-pill" title="Entity"><i class="fa-solid fa-briefcase"></i> ${escapeHtml(u.entity || "-")}</span>
              </div>
            </div>
          </div>`;
      });

      html += `</div>`;
    }

    html += `</div></div>`;
  }

  canvas.innerHTML = html;
  applyGraphZoom();

  // Smoothly manage viewport positioning without jumping to white space
  requestAnimationFrame(() => {
    if (!viewport || !canvas) return;

    if (lastToggledOrgNodeId) {
      const toggledEl = canvas.querySelector(`[data-org-node-id="${lastToggledOrgNodeId}"]`) || canvas.querySelector(`[data-toggle-org="${lastToggledOrgNodeId}"]`);
      if (toggledEl) {
        toggledEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      }
      lastToggledOrgNodeId = null;
      return;
    }

    if (searchVal) {
      const match = canvas.querySelector(".org-node-match");
      if (match) {
        match.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        return;
      }
    }

    if (isInitialGraphRender) {
      isInitialGraphRender = false;
      const rootCard = canvas.querySelector(".apex-card") || canvas.querySelector(".director-card") || canvas.querySelector(".org-node-card");
      if (rootCard) {
        const vpWidth = viewport.clientWidth;
        const cardLeft = rootCard.offsetLeft;
        const cardWidth = rootCard.offsetWidth;
        viewport.scrollLeft = Math.max(0, cardLeft - (vpWidth / 2) + (cardWidth / 2));
        viewport.scrollTop = 0;
      }
    }
  });
}

function applyGraphZoom() {
  const canvas = document.getElementById("orgGraphCanvas");
  if (canvas) {
    canvas.style.transform = `scale(${currentGraphZoom})`;
  }
}

function downloadOrgGraphAsPng() {
  const canvas = document.getElementById("orgGraphCanvas");
  if (!canvas) return;
  
  const width = Math.max(canvas.scrollWidth, 1200);
  const height = Math.max(canvas.scrollHeight, 800);
  
  const canvasEl = document.createElement("canvas");
  canvasEl.width = width * 2;
  canvasEl.height = height * 2;
  const ctx = canvasEl.getContext("2d");
  ctx.scale(2, 2);
  
  // Draw background
  ctx.fillStyle = "#070d1e";
  ctx.fillRect(0, 0, width, height);

  // Title header
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 20px Arial";
  ctx.fillText("Metro Group - Organization Hierarchy Graph", 40, 40);
  ctx.fillStyle = "#94a3b8";
  ctx.font = "12px Arial";
  ctx.fillText("Generated on: " + new Date().toLocaleString(), 40, 62);

  // Convert SVG foreign object
  const clone = canvas.cloneNode(true);
  clone.style.transform = "none";
  clone.style.color = "#ffffff";
  
  const data = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <foreignObject width="100%" height="100%">
      <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: Arial, sans-serif; color: #fff;">
        <style>
          .org-tree-root { display: inline-flex; flex-direction: column; align-items: center; width: 100%; }
          .org-tree-branch { display: inline-flex; flex-direction: column; align-items: center; position: relative; padding: 0 14px; }
          .org-tree-children { display: inline-flex; justify-content: center; position: relative; padding-top: 36px; gap: 24px; }
          .org-tree-stem-down { width: 2px; height: 28px; background: rgba(56, 189, 248, 0.6); margin: 0 auto; }
          .org-node-card { width: 230px; background: #111827; border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; padding: 12px 14px; color: #fff; margin-bottom: 8px; text-align: left; }
          .director-card { border-top: 4px solid #f43f5e; background: #1e293b; }
          .level2-card { border-top: 4px solid #38bdf8; background: #0f172a; }
          .level3-card { border-top: 3px solid #10b981; }
          .unassigned-card { border-top: 3px solid #f59e0b; }
          .org-node-top { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
          .org-node-avatar { width: 34px; height: 34px; border-radius: 50%; background: #38bdf8; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 11px; }
          .org-node-info h5 { margin: 0; font-size: 13px; font-weight: bold; color: #f8fafc; }
          .org-node-info span { font-size: 10px; color: #94a3b8; }
          .org-node-tags { display: flex; justify-content: space-between; font-size: 10px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 4px; }
          .org-tag-pill { background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; color: #cbd5e1; }
          .org-node-toggle-btn, .org-node-edit-btn { display: none; }
        </style>
        ${clone.outerHTML}
      </div>
    </foreignObject>
  </svg>`;

  const img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(data);
  img.onload = () => {
    ctx.drawImage(img, 0, 80);
    const a = document.createElement("a");
    a.download = "Metro_Organization_Graph.png";
    a.href = canvasEl.toDataURL("image/png");
    a.click();
  };
  img.onerror = () => {
    showToast("Graph Ready", "Downloading SVG representation of Organization Hierarchy.");
    triggerBlobDownload("Metro_Organization_Graph.svg", new Blob([data], { type: "image/svg+xml;charset=utf-8" }));
  };
}

// =========================================================================
// ORGANIZATION STRUCTURE & TAGGING MODAL CONTROLLER
// =========================================================================

function openOrgHierarchyModal(preselectedEmployeeId = "") {
  const user = activeUser();
  if (!isAdmin(user)) {
    showToast("Access Denied", "Only Master Administrator accounts can modify organizational structure and hierarchy.");
    return;
  }
  const modal = document.getElementById("orgHierarchyModal");
  if (!modal) return;

  const empSelect = document.getElementById("orgEditEmployeeSelect");
  const directorSelect = document.getElementById("orgEditDirectorSelect");
  const managerSelect = document.getElementById("orgEditManagerSelect");
  const entitySelect = document.getElementById("orgEditEntitySelect");
  const mgrSearchInput = document.getElementById("orgManagerSearchInput");
  const clearMgrSearchBtn = document.getElementById("btnOrgClearManagerSearch");
  const searchMgrBtn = document.getElementById("btnOrgSearchManager");
  const mgrFeedback = document.getElementById("orgManagerSearchFeedback");
  const feedbackEl = document.getElementById("orgHierarchyFeedback");
  if (feedbackEl) feedbackEl.textContent = "";

  const allUsers = users().filter(u => u.level !== "admin");
  const activeUsers = allUsers.filter(u => u.isActive !== false);
  const deactUsers = allUsers.filter(u => u.isActive === false);
  const directors = allUsers.filter(u => String(u.level) === "1" && u.isActive !== false);

  // Populate employee select (with Active and Deactivated groupings)
  if (empSelect) {
    let opts = '<optgroup label="Active Employees">';
    opts += activeUsers.map(u => 
      `<option value="${escapeHtml(u.employeeId)}">${escapeHtml(u.name)} (${escapeHtml(u.employeeId)}) - Level ${escapeHtml(u.level || '3')} [${escapeHtml(u.department || 'General')}]</option>`
    ).join("");
    opts += '</optgroup>';
    if (deactUsers.length > 0) {
      opts += '<optgroup label="Deactivated Staff">';
      opts += deactUsers.map(u => 
        `<option value="${escapeHtml(u.employeeId)}">⛔ ${escapeHtml(u.name)} (${escapeHtml(u.employeeId)}) [Deactivated${u.includeInOrgTree ? ' - Attached to Tree' : ''}]</option>`
      ).join("");
      opts += '</optgroup>';
    }
    empSelect.innerHTML = opts;
  }

  // Populate director select
  if (directorSelect) {
    directorSelect.innerHTML = '<option value="">-- Choose / Auto Director --</option>' + directors.map(d =>
      `<option value="${escapeHtml(d.employeeId)}">${escapeHtml(d.name)} (${escapeHtml(d.employeeId)}) - ${escapeHtml(d.department || 'Executive')}</option>`
    ).join("");
  }

  // Helper to populate and filter Reporting Manager options
  function populateManagerOptions(filterQuery = "", currentEmpId = "", currentMgrId = "") {
    const q = filterQuery.toLowerCase().trim();
    if (clearMgrSearchBtn) clearMgrSearchBtn.style.display = q ? "block" : "none";

    // Exclude the current employee from being their own manager
    const eligible = allUsers
      .filter(u => u.employeeId !== currentEmpId && u.isActive !== false)
      .sort((a, b) => (String(a.level || "3")).localeCompare(String(b.level || "3")) || (a.name || "").localeCompare(b.name || ""));

    let filtered = eligible;
    if (q) {
      filtered = eligible.filter(u => 
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.employeeId && u.employeeId.toLowerCase().includes(q)) ||
        (u.department && u.department.toLowerCase().includes(q)) ||
        (u.role && u.role.toLowerCase().includes(q))
      );
    }

    if (managerSelect) {
      let opts = '<option value="">-- Choose Reporting Manager --</option>';
      const l1 = filtered.filter(u => String(u.level) === "1");
      const l2 = filtered.filter(u => String(u.level) === "2");
      const l3 = filtered.filter(u => String(u.level) === "3" || !u.level);

      if (l1.length > 0) {
        opts += '<optgroup label="Directors (Level 1)">';
        opts += l1.map(m => `<option value="${escapeHtml(m.employeeId)}" ${m.employeeId === currentMgrId ? "selected" : ""}>${escapeHtml(m.name)} (${escapeHtml(m.employeeId)}) - ${escapeHtml(m.department || '')}</option>`).join("");
        opts += '</optgroup>';
      }
      if (l2.length > 0) {
        opts += '<optgroup label="Managers (Level 2)">';
        opts += l2.map(m => `<option value="${escapeHtml(m.employeeId)}" ${m.employeeId === currentMgrId ? "selected" : ""}>${escapeHtml(m.name)} (${escapeHtml(m.employeeId)}) - ${escapeHtml(m.department || '')}</option>`).join("");
        opts += '</optgroup>';
      }
      if (l3.length > 0) {
        opts += '<optgroup label="Team Leads / Peers (Level 3)">';
        opts += l3.map(m => `<option value="${escapeHtml(m.employeeId)}" ${m.employeeId === currentMgrId ? "selected" : ""}>${escapeHtml(m.name)} (${escapeHtml(m.employeeId)}) - ${escapeHtml(m.department || '')}</option>`).join("");
        opts += '</optgroup>';
      }
      managerSelect.innerHTML = opts;

      if (currentMgrId && filtered.some(m => m.employeeId === currentMgrId)) {
        managerSelect.value = currentMgrId;
      } else if (q && filtered.length === 1) {
        managerSelect.value = filtered[0].employeeId;
      }
    }

    if (mgrFeedback) {
      if (q) {
        if (filtered.length === 0) {
          mgrFeedback.innerHTML = `<span style="color: #ef4444;"><i class="fa-solid fa-circle-xmark"></i> No managers found matching "${escapeHtml(filterQuery)}"</span>`;
        } else {
          mgrFeedback.innerHTML = `<span style="color: #0284c7;"><i class="fa-solid fa-check"></i> Found ${filtered.length} matching manager(s)</span>`;
        }
      } else {
        mgrFeedback.textContent = "";
      }
    }
  }

  // Populate entity select
  if (entitySelect) {
    const standardEntities = ["Metro Group", "Moquim Foundation", "CTAPL", "MEDPL", "Realty", "Studio Red", "ASF"];
    const customEntities = [...new Set(allUsers.map(u => u.entity).filter(Boolean))];
    const allEntities = [...new Set([...standardEntities, ...customEntities])].sort();
    entitySelect.innerHTML = '<option value="">-- Choose Entity --</option>' + allEntities.map(e =>
      `<option value="${escapeHtml(e)}">${escapeHtml(e)}</option>`
    ).join("");
  }

  // Helper to populate form fields for a selected user
  function populateUserFields(empId) {
    const targetUser = allUsers.find(u => u.employeeId === empId) || allUsers[0];
    if (!targetUser) return;

    if (empSelect) empSelect.value = targetUser.employeeId;

    const levelSelect = document.getElementById("orgEditLevelSelect");
    const deptInput = document.getElementById("orgEditDepartmentInput");
    const roleInput = document.getElementById("orgEditRoleInput");
    const locInput = document.getElementById("orgEditLocationInput");
    const deactCheckWrap = document.getElementById("orgEditDeactCheckWrap");
    const deactCheck = document.getElementById("orgEditIncludeDeactivatedCheck");

    if (levelSelect) levelSelect.value = String(targetUser.level || "3");
    if (directorSelect) directorSelect.value = targetUser.taggedDirectorId || "";
    if (deptInput) deptInput.value = targetUser.department || "";
    if (entitySelect) entitySelect.value = targetUser.entity || "";
    if (roleInput) roleInput.value = targetUser.role || "";
    if (locInput) locInput.value = targetUser.location || "";

    if (targetUser.isActive === false) {
      if (deactCheckWrap) deactCheckWrap.style.display = "flex";
      if (deactCheck) deactCheck.checked = Boolean(targetUser.includeInOrgTree);
    } else {
      if (deactCheckWrap) deactCheckWrap.style.display = "none";
      if (deactCheck) deactCheck.checked = true;
    }

    if (mgrSearchInput) mgrSearchInput.value = "";
    populateManagerOptions("", targetUser.employeeId, targetUser.managerId || "");

    updateLevelFieldStates(levelSelect ? levelSelect.value : "3");
  }

  function updateLevelFieldStates(level) {
    const dirWrap = document.getElementById("orgDirectorFieldWrap");
    const mgrWrap = document.getElementById("orgManagerFieldWrap");
    if (level === "1") {
      if (dirWrap) dirWrap.style.opacity = "0.4";
      if (mgrWrap) mgrWrap.style.opacity = "0.4";
      if (managerSelect) { managerSelect.disabled = true; managerSelect.required = false; }
      if (directorSelect) directorSelect.disabled = true;
      if (mgrSearchInput) mgrSearchInput.disabled = true;
      if (searchMgrBtn) searchMgrBtn.disabled = true;
    } else {
      if (dirWrap) dirWrap.style.opacity = "1";
      if (mgrWrap) mgrWrap.style.opacity = "1";
      if (managerSelect) { managerSelect.disabled = false; managerSelect.required = true; }
      if (directorSelect) directorSelect.disabled = false;
      if (mgrSearchInput) mgrSearchInput.disabled = false;
      if (searchMgrBtn) searchMgrBtn.disabled = false;
    }
  }

  // Pre-select employee
  const selectId = preselectedEmployeeId || (empSelect ? empSelect.value : "");
  populateUserFields(selectId);

  // Wire internal change events
  empSelect?.addEventListener("change", (e) => {
    populateUserFields(e.target.value);
  });
  document.getElementById("orgEditLevelSelect")?.addEventListener("change", (e) => {
    updateLevelFieldStates(e.target.value);
  });

  // Wire Reporting Manager Search events
  searchMgrBtn?.addEventListener("click", () => {
    const currentEmpId = empSelect?.value || "";
    const currentMgrId = managerSelect?.value || "";
    populateManagerOptions(mgrSearchInput?.value || "", currentEmpId, currentMgrId);
  });
  mgrSearchInput?.addEventListener("input", (e) => {
    const currentEmpId = empSelect?.value || "";
    const currentMgrId = managerSelect?.value || "";
    populateManagerOptions(e.target.value, currentEmpId, currentMgrId);
  });
  mgrSearchInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const currentEmpId = empSelect?.value || "";
      const currentMgrId = managerSelect?.value || "";
      populateManagerOptions(mgrSearchInput?.value || "", currentEmpId, currentMgrId);
    }
  });
  clearMgrSearchBtn?.addEventListener("click", () => {
    if (mgrSearchInput) mgrSearchInput.value = "";
    const currentEmpId = empSelect?.value || "";
    const currentMgrId = managerSelect?.value || "";
    populateManagerOptions("", currentEmpId, currentMgrId);
  });

  // Render matrix table for tab 2
  renderOrgMatrixTable();

  // Reset tab to Single Edit by default
  switchOrgModalTab("single");

  modal.classList.remove("hidden");
}

function closeOrgHierarchyModal() {
  document.getElementById("orgHierarchyModal")?.classList.add("hidden");
}

let stagedHierarchyUpdates = [];

function switchOrgModalTab(tabName) {
  const tabSingle = document.getElementById("tabOrgSingleEdit");
  const tabMatrix = document.getElementById("tabOrgBulkMatrix");
  const tabExcel = document.getElementById("tabOrgExcelSync");
  const tabDeact = document.getElementById("tabOrgDeactivated");
  const viewSingle = document.getElementById("orgSingleEditView");
  const viewMatrix = document.getElementById("orgBulkMatrixView");
  const viewExcel = document.getElementById("orgExcelSyncView");
  const viewDeact = document.getElementById("orgDeactivatedView");

  if (tabName === "excel" || tabName === "deactivated") {
    const user = activeUser();
    if (!isAdmin(user)) {
      showToast("Access Denied", "Only Administrator accounts can manage hierarchy updates.");
      return;
    }
  }

  tabSingle?.classList.toggle("active", tabName === "single");
  tabMatrix?.classList.toggle("active", tabName === "matrix");
  tabExcel?.classList.toggle("active", tabName === "excel");
  tabDeact?.classList.toggle("active", tabName === "deactivated");

  viewSingle?.classList.toggle("hidden", tabName !== "single");
  viewMatrix?.classList.toggle("hidden", tabName !== "matrix");
  viewExcel?.classList.toggle("hidden", tabName !== "excel");
  viewDeact?.classList.toggle("hidden", tabName !== "deactivated");

  if (tabName === "matrix") {
    renderOrgMatrixTable();
  } else if (tabName === "deactivated") {
    renderOrgDeactivatedTable();
  }
}

// =========================================================================
// HIERARCHY EXCEL TEMPLATE & BULK SYNC (ADMIN ONLY) - SIMPLIFIED FORMAT
// =========================================================================

function downloadHierarchyExcelTemplate(user) {
  if (!isAdmin(user)) {
    showToast("Access Denied", "Only Administrator accounts can download the hierarchy template.");
    return;
  }

  const allUsers = users().filter(u => u.level !== "admin" && u.isActive !== false);
  const directors = allUsers.filter(u => String(u.level) === "1");
  const managers = allUsers.filter(u => String(u.level) === "1" || String(u.level) === "2");

  function getLevelText(level) {
    if (String(level) === "1") return "Director";
    if (String(level) === "2") return "Manager";
    return "Member";
  }

  const rows = allUsers.map(u => {
    const isDir = String(u.level) === "1";
    const dir = directors.find(d => d.employeeId === u.taggedDirectorId);
    const mgr = allUsers.find(m => m.employeeId === u.managerId);

    return {
      "Employee ID": u.employeeId || "",
      "Employee Name": u.name || "",
      "Role Level": getLevelText(u.level),
      "Director": isDir ? "" : (dir ? dir.name : (u.taggedDirectorId || "")),
      "Reporting Manager": isDir ? "" : (mgr ? mgr.name : (u.managerName || u.managerId || "")),
      "Department": u.department || "General",
      "Entity": u.entity || "",
      "Designation": u.role || "",
      "Location": u.location || ""
    };
  });

  if (typeof XLSX !== "undefined" && XLSX.utils && XLSX.writeFile) {
    try {
      const ws = XLSX.utils.json_to_sheet(rows);
      const colWidths = [
        { wch: 15 }, // Employee ID
        { wch: 25 }, // Employee Name
        { wch: 16 }, // Role Level
        { wch: 24 }, // Director
        { wch: 24 }, // Reporting Manager
        { wch: 20 }, // Department
        { wch: 18 }, // Entity
        { wch: 24 }, // Designation
        { wch: 18 }  // Location
      ];
      ws['!cols'] = colWidths;
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Metro Hierarchy");
      XLSX.writeFile(wb, `Metro_Group_Hierarchy_${today()}.xlsx`);
      showToast("Template Downloaded", "Simple Hierarchy Excel template downloaded successfully.");
      return;
    } catch (e) {
      console.warn("XLSX export failed, falling back to CSV", e);
    }
  }

  // Fallback to CSV
  const headers = ["Employee ID", "Employee Name", "Role Level", "Director", "Reporting Manager", "Department", "Entity", "Designation", "Location"];
  const csvRows = [headers.join(",")];
  rows.forEach(r => {
    const vals = headers.map(h => `"${String(r[h] || '').replace(/"/g, '""')}"`);
    csvRows.push(vals.join(","));
  });
  triggerBlobDownload(`Metro_Group_Hierarchy_${today()}.csv`, new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8" }));
  showToast("Template Downloaded", "Simple Hierarchy CSV template downloaded successfully.");
}

function handleHierarchyExcelUpload(event) {
  const user = activeUser();
  if (!isAdmin(user)) {
    showToast("Access Denied", "Only Administrator accounts can import hierarchy updates.");
    return;
  }

  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      if (typeof XLSX === "undefined") {
        showToast("Error", "Excel parsing engine (SheetJS) is not loaded.");
        return;
      }

      const workbook = XLSX.read(data, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      if (!rawRows || rawRows.length === 0) {
        showToast("Empty File", "No data rows found in the uploaded spreadsheet.");
        return;
      }

      processParsedHierarchyRows(rawRows);
    } catch (err) {
      console.error("Excel import parse error:", err);
      showToast("Import Error", "Failed to parse Excel file: " + err.message);
    }
  };
  reader.readAsArrayBuffer(file);
}

// Helper to resolve an employee by either Name OR Employee ID flexibly
function findUserByNameOrId(query, candidateUsers, allUsers) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return null;

  // 1. Direct ID exact match in candidates
  const byId = candidateUsers.find(u => String(u.employeeId || "").trim().toLowerCase() === q);
  if (byId) return byId;

  // 2. Direct exact Name match in candidates
  const byNameExact = candidateUsers.find(u => String(u.name || "").trim().toLowerCase() === q);
  if (byNameExact) return byNameExact;

  // 3. Name contains query or query contains name in candidates
  const byNameSub = candidateUsers.find(u => {
    const uName = String(u.name || "").trim().toLowerCase();
    return uName.includes(q) || q.includes(uName);
  });
  if (byNameSub) return byNameSub;

  // 4. Fallback search across all users (ID, exact name, substring)
  const byIdAll = allUsers.find(u => String(u.employeeId || "").trim().toLowerCase() === q);
  if (byIdAll) return byIdAll;

  const byNameAllExact = allUsers.find(u => String(u.name || "").trim().toLowerCase() === q);
  if (byNameAllExact) return byNameAllExact;

  const byNameAllSub = allUsers.find(u => {
    const uName = String(u.name || "").trim().toLowerCase();
    return uName.includes(q) || q.includes(uName);
  });
  return byNameAllSub || null;
}

function normalizeImportLevel(val) {
  const str = String(val || "").trim().toLowerCase();
  if (str === "1" || str.includes("dir")) return "1"; // Director
  if (str === "2" || str.includes("manag") || str.includes("lead") || str.includes("head") || str.includes("mgr")) return "2"; // Manager
  if (str === "3" || str.includes("memb") || str.includes("staff") || str.includes("exec") || str.includes("emp")) return "3"; // Member
  return "3";
}

function processParsedHierarchyRows(rows) {
  const allUsers = users().filter(u => u.level !== "admin" && u.isActive !== false);
  const directors = allUsers.filter(u => String(u.level) === "1");
  const managers = allUsers;

  stagedHierarchyUpdates = [];
  let updateCount = 0;
  let unchangedCount = 0;
  let invalidCount = 0;

  const previewTableBody = document.getElementById("orgImportPreviewTableBody");
  if (!previewTableBody) return;

  let tableHtml = "";

  rows.forEach((row) => {
    // Recognize Employee ID and Name flexibly
    const rawEmpId = row["Employee ID"] || row["EmployeeID"] || row["EMP ID"] || row["Emp ID"] || row["employeeId"] || row["id"] || row["EmpId"] || "";
    const rawEmpName = row["Employee Name"] || row["EmployeeName"] || row["Name"] || row["Employee"] || row["name"] || "";

    const cleanEmpId = String(rawEmpId).trim();
    const cleanEmpName = String(rawEmpName).trim();

    // Match existing user by ID or by Name
    let existingUser = null;
    if (cleanEmpId) {
      existingUser = allUsers.find(u => String(u.employeeId).trim().toUpperCase() === cleanEmpId.toUpperCase());
    }
    if (!existingUser && cleanEmpName) {
      existingUser = allUsers.find(u => String(u.name).trim().toLowerCase() === cleanEmpName.toLowerCase());
    }

    if (!existingUser) {
      invalidCount++;
      tableHtml += `
        <tr style="background: rgba(239, 68, 68, 0.05);">
          <td style="font-weight:700; font-family: monospace; color:#dc2626;">${escapeHtml(cleanEmpId || "UNKNOWN")}</td>
          <td>${escapeHtml(cleanEmpName || "Unknown Employee")}</td>
          <td>-</td>
          <td>-</td>
          <td>-</td>
          <td>-</td>
          <td><span class="status-pill" style="background:#fee2e2;color:#dc2626;font-size:0.7rem;">Not Found in DB</span></td>
        </tr>`;
      return;
    }

    // Resolve Role Level
    const rawLevel = row["Role Level"] || row["Level"] || row["Role / Level"] || row["Role"] || row["level"] || row["Level (1=Director, 2=Manager, 3=Member)"] || existingUser.level || "3";
    const newLevel = normalizeImportLevel(rawLevel);

    // Resolve Director
    const rawDirector = row["Director"] || row["Director Name"] || row["Director ID"] || row["Director Umbrella"] || row["taggedDirectorId"] || "";
    let newDirectorId = "";
    if (newLevel !== "1" && rawDirector) {
      const resolvedDir = findUserByNameOrId(rawDirector, directors, allUsers);
      newDirectorId = resolvedDir ? resolvedDir.employeeId : String(rawDirector).trim();
    } else if (newLevel !== "1") {
      newDirectorId = existingUser.taggedDirectorId || "";
    }

    // Resolve Reporting Manager
    const rawManager = row["Reporting Manager"] || row["Manager"] || row["Reporting Manager Name"] || row["Reports To"] || row["Reporting Manager ID"] || row["Manager ID"] || row["managerId"] || "";
    let newManagerId = "";
    let newManagerName = "";
    if (newLevel !== "1" && rawManager) {
      const resolvedMgr = findUserByNameOrId(rawManager, managers, allUsers);
      if (resolvedMgr) {
        newManagerId = resolvedMgr.employeeId;
        newManagerName = resolvedMgr.name;
      } else {
        newManagerId = String(rawManager).trim();
        newManagerName = newManagerId;
      }
    } else if (newLevel !== "1") {
      newManagerId = existingUser.managerId || "";
      newManagerName = existingUser.managerName || "";
    }

    // If Director is tagged but manager is not, or if manager points to a director, keep consistent
    if (!newDirectorId && newManagerId) {
      const mgrUser = allUsers.find(u => u.employeeId === newManagerId);
      if (mgrUser && String(mgrUser.level) === "1") {
        newDirectorId = mgrUser.employeeId;
      } else if (mgrUser && mgrUser.taggedDirectorId) {
        newDirectorId = mgrUser.taggedDirectorId;
      }
    }

    const newDepartment = String(row["Department"] || row["Dept"] || row["department"] || existingUser.department || "General").trim();
    const newEntity = String(row["Entity"] || row["Subsidiary Entity"] || row["Company"] || row["entity"] || existingUser.entity || "").trim();
    const newRole = String(row["Designation"] || row["Job Title"] || row["Role Title"] || row["role"] || existingUser.role || "").trim();
    const newLocation = String(row["Location"] || row["Work Location"] || row["City"] || row["location"] || existingUser.location || "").trim();

    // Check changes
    const hasLevelChange = String(existingUser.level || "3") !== newLevel;
    const hasDirectorChange = (existingUser.taggedDirectorId || "") !== newDirectorId;
    const hasManagerChange = (existingUser.managerId || "") !== newManagerId;
    const hasDeptChange = (existingUser.department || "") !== newDepartment;
    const hasEntityChange = (existingUser.entity || "") !== newEntity;
    const hasRoleChange = (existingUser.role || "") !== newRole;
    const hasLocChange = (existingUser.location || "") !== newLocation;

    const isChanged = hasLevelChange || hasDirectorChange || hasManagerChange || hasDeptChange || hasEntityChange || hasRoleChange || hasLocChange;

    const updatedRecord = {
      ...existingUser,
      level: newLevel,
      taggedDirectorId: newDirectorId,
      managerId: newManagerId,
      managerName: newManagerName,
      department: newDepartment,
      entity: newEntity,
      role: newRole,
      location: newLocation,
      _isChanged: isChanged,
      _hasLevelChange: hasLevelChange,
      _hasDirectorChange: hasDirectorChange,
      _hasManagerChange: hasManagerChange,
      _hasDeptChange: hasDeptChange
    };

    if (isChanged) {
      updateCount++;
      stagedHierarchyUpdates.push(updatedRecord);
    } else {
      unchangedCount++;
    }

    function levelBadgeText(lvl) {
      if (lvl === "1") return "Director";
      if (lvl === "2") return "Manager";
      return "Member";
    }

    let levelHtml = `<span>${levelBadgeText(newLevel)}</span>`;
    if (hasLevelChange) {
      levelHtml = `<span style="text-decoration: line-through; color: #94a3b8; font-size: 0.72rem;">${levelBadgeText(existingUser.level || '3')}</span> &rarr; <strong style="color: ${newLevel === '1' ? '#c92a2a' : newLevel === '2' ? '#1971c2' : '#2b8a3e'};">${levelBadgeText(newLevel)}</strong>`;
    }

    // Resolve director and manager names for friendly display
    const dirObj = allUsers.find(u => u.employeeId === newDirectorId);
    const dirDisplayName = dirObj ? dirObj.name : (newDirectorId || "--");
    const oldDirObj = allUsers.find(u => u.employeeId === existingUser.taggedDirectorId);
    const oldDirDisplayName = oldDirObj ? oldDirObj.name : (existingUser.taggedDirectorId || "--");

    let dirHtml = escapeHtml(dirDisplayName);
    if (hasDirectorChange) {
      dirHtml = `<span style="text-decoration: line-through; color: #94a3b8; font-size: 0.72rem;">${escapeHtml(oldDirDisplayName)}</span> &rarr; <strong style="color: #c92a2a;">${escapeHtml(dirDisplayName)}</strong>`;
    }

    const mgrObj = allUsers.find(u => u.employeeId === newManagerId);
    const mgrDisplayName = mgrObj ? mgrObj.name : (newManagerName || newManagerId || "--");
    const oldMgrObj = allUsers.find(u => u.employeeId === existingUser.managerId);
    const oldMgrDisplayName = oldMgrObj ? oldMgrObj.name : (existingUser.managerName || existingUser.managerId || "--");

    let mgrHtml = escapeHtml(mgrDisplayName);
    if (hasManagerChange) {
      mgrHtml = `<span style="text-decoration: line-through; color: #94a3b8; font-size: 0.72rem;">${escapeHtml(oldMgrDisplayName)}</span> &rarr; <strong style="color: #1971c2;">${escapeHtml(mgrDisplayName)}</strong>`;
    }

    let deptHtml = escapeHtml(newDepartment);
    if (hasDeptChange) {
      deptHtml = `<span style="text-decoration: line-through; color: #94a3b8; font-size: 0.72rem;">${escapeHtml(existingUser.department || '--')}</span> &rarr; <strong>${escapeHtml(newDepartment)}</strong>`;
    }

    const statusBadge = isChanged 
      ? `<span class="status-pill" style="background:#e6fcf5;color:#0ca678;font-weight:700;font-size:0.7rem;"><i class="fa-solid fa-pen"></i> Update Staged</span>`
      : `<span class="status-pill" style="background:#f1f5f9;color:#64748b;font-size:0.7rem;">Unchanged</span>`;

    tableHtml += `
      <tr style="${isChanged ? 'background: rgba(16, 185, 129, 0.05);' : ''}">
        <td style="font-weight:700; font-family: monospace;">${escapeHtml(existingUser.employeeId)}</td>
        <td><strong>${escapeHtml(existingUser.name)}</strong></td>
        <td>${levelHtml}</td>
        <td>${dirHtml}</td>
        <td>${mgrHtml}</td>
        <td>${deptHtml}</td>
        <td>${statusBadge}</td>
      </tr>`;
  });

  previewTableBody.innerHTML = tableHtml;

  const container = document.getElementById("orgImportPreviewContainer");
  const summary = document.getElementById("orgImportPreviewSummary");
  const confirmBtn = document.getElementById("btnConfirmHierarchyImport");

  if (summary) {
    summary.innerHTML = `<strong>${updateCount}</strong> changes staged &bull; <strong>${unchangedCount}</strong> unchanged &bull; <strong>${invalidCount}</strong> unmatched`;
  }

  if (confirmBtn) {
    confirmBtn.disabled = updateCount === 0;
    confirmBtn.style.opacity = updateCount === 0 ? "0.5" : "1";
  }

  if (container) {
    container.classList.remove("hidden");
  }

  showToast("Excel Analyzed", `Found ${updateCount} hierarchy update(s) ready for review.`);
}

async function executeHierarchyBulkUpdate() {
  const user = activeUser();
  if (!isAdmin(user)) {
    showToast("Access Denied", "Only Administrator accounts can execute bulk hierarchy updates.");
    return;
  }

  if (!stagedHierarchyUpdates || stagedHierarchyUpdates.length === 0) {
    showToast("No Updates", "There are no staged hierarchy updates to apply.");
    return;
  }

  const confirmBtn = document.getElementById("btnConfirmHierarchyImport");
  const cancelBtn = document.getElementById("btnCancelHierarchyImport");

  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving Updates...';
  }
  if (cancelBtn) cancelBtn.disabled = true;

  let successCount = 0;
  let failCount = 0;

  try {
    for (const u of stagedHierarchyUpdates) {
      try {
        const cleanUser = { ...u };
        delete cleanUser._isChanged;
        delete cleanUser._hasLevelChange;
        delete cleanUser._hasDirectorChange;
        delete cleanUser._hasManagerChange;
        delete cleanUser._hasDeptChange;

        await cloudSaveUser(cleanUser);
        successCount++;
      } catch (err) {
        console.error(`Failed to update hierarchy for ${u.employeeId}:`, err);
        failCount++;
      }
    }

    await cloudUsers();

    showToast("Bulk Sync Complete", `Successfully updated hierarchy for ${successCount} employees${failCount > 0 ? ` (${failCount} failed)` : ''}.`);
    
    stagedHierarchyUpdates = [];
    const fileInput = document.getElementById("importHierarchyExcelFileInput");
    if (fileInput) fileInput.value = "";
    document.getElementById("orgImportPreviewContainer")?.classList.add("hidden");
    closeOrgHierarchyModal();

    renderOrganizationGraph(activeUser());
    if (typeof renderCompliance === 'function') renderCompliance(activeUser());
  } catch (err) {
    console.error("executeHierarchyBulkUpdate fatal error:", err);
    showToast("Error", "Bulk update encountered an error: " + err.message);
  } finally {
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = '<i class="fa-solid fa-check" style="margin-right: 5px;"></i> Confirm & Update Graph';
    }
    if (cancelBtn) cancelBtn.disabled = false;
  }
}

function renderOrgMatrixTable(filterQuery = "") {
  const tbody = document.getElementById("orgMatrixTableBody");
  const countInfo = document.getElementById("orgMatrixCountInfo");
  if (!tbody) return;

  const allUsers = users().filter(u => u.level !== "admin" && u.isActive !== false);
  const q = filterQuery.toLowerCase().trim();

  let filtered = allUsers;
  if (q) {
    filtered = allUsers.filter(u => 
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.employeeId && u.employeeId.toLowerCase().includes(q)) ||
      (u.department && u.department.toLowerCase().includes(q)) ||
      (u.managerName && u.managerName.toLowerCase().includes(q)) ||
      (u.managerId && u.managerId.toLowerCase().includes(q))
    );
  }

  if (countInfo) countInfo.textContent = `Showing ${filtered.length} of ${allUsers.length} members`;

  tbody.innerHTML = filtered.map(u => {
    const mgr = allUsers.find(m => m.employeeId === u.managerId);
    const mgrDisplay = mgr ? `${escapeHtml(mgr.name)} (${escapeHtml(mgr.employeeId)})` : (u.managerId ? escapeHtml(u.managerId) : `<span style="color:#f59e0b;">Unassigned</span>`);
    const dir = allUsers.find(d => d.employeeId === u.taggedDirectorId);
    const dirDisplay = dir ? `${escapeHtml(dir.name)} (${escapeHtml(dir.employeeId)})` : (u.taggedDirectorId ? escapeHtml(u.taggedDirectorId) : `<span style="color:#94a3b8;">--</span>`);

    let levelBadge = '';
    if (u.level === "1") levelBadge = '<span class="status-pill" style="background:#ffe3e3;color:#c92a2a;font-weight:700;">L1 Director</span>';
    else if (u.level === "2") levelBadge = '<span class="status-pill" style="background:#e7f5ff;color:#1971c2;font-weight:700;">L2 Manager</span>';
    else levelBadge = '<span class="status-pill" style="background:#ebfbee;color:#2b8a3e;font-weight:700;">L3 Member</span>';

    return `
      <tr>
        <td style="font-weight:700; font-family: monospace;">${escapeHtml(u.employeeId)}</td>
        <td><strong>${escapeHtml(u.name)}</strong></td>
        <td>${levelBadge}</td>
        <td>${dirDisplay}</td>
        <td>${mgrDisplay}</td>
        <td><span class="org-tag-pill" style="color:var(--text);">${escapeHtml(u.department || "-")}</span></td>
        <td style="text-align: center;">
          <button type="button" class="button button-secondary" data-matrix-edit="${escapeHtml(u.employeeId)}" style="padding: 3px 10px; font-size: 0.75rem;">
            <i class="fa-solid fa-pen-to-square"></i> Tag
          </button>
        </td>
      </tr>`;
  }).join("");
}

async function saveOrgHierarchy(e) {
  if (e) e.preventDefault();
  const empSelect = document.getElementById("orgEditEmployeeSelect");
  const empId = empSelect?.value;
  if (!empId) return;

  const allUsers = users();
  const targetUser = allUsers.find(u => u.employeeId === empId);
  if (!targetUser) {
    showToast("Error", "Selected employee record not found.");
    return;
  }

  const level = document.getElementById("orgEditLevelSelect")?.value || "3";
  let taggedDirectorId = document.getElementById("orgEditDirectorSelect")?.value || "";
  const managerId = level === "1" ? "" : (document.getElementById("orgEditManagerSelect")?.value || "");
  const department = document.getElementById("orgEditDepartmentInput")?.value.trim() || targetUser.department || "General";
  const entity = document.getElementById("orgEditEntitySelect")?.value || targetUser.entity || "";
  const role = document.getElementById("orgEditRoleInput")?.value.trim() || targetUser.role || "";
  const location = document.getElementById("orgEditLocationInput")?.value.trim() || targetUser.location || "";

  let managerName = "";
  if (managerId) {
    const mgr = allUsers.find(u => u.employeeId === managerId);
    if (mgr) {
      managerName = mgr.name;
      if (!taggedDirectorId) {
        if (String(mgr.level) === "1") {
          taggedDirectorId = mgr.employeeId;
        } else if (mgr.taggedDirectorId) {
          taggedDirectorId = mgr.taggedDirectorId;
        }
      }
    }
  }

  const isDeactivated = targetUser.isActive === false;
  const includeInOrgTree = isDeactivated 
    ? Boolean(document.getElementById("orgEditIncludeDeactivatedCheck")?.checked)
    : targetUser.includeInOrgTree;

  const updatedUser = {
    ...targetUser,
    level,
    taggedDirectorId,
    managerId,
    managerName,
    department,
    entity,
    role,
    location,
    ...(isDeactivated ? { includeInOrgTree } : {})
  };

  const btn = document.getElementById("saveOrgHierarchyBtn");
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...'; }

  try {
    const res = await cloudSaveUser(updatedUser);
    if (res && res.ok) {
      showToast("Hierarchy Updated", `Structure & Tagging saved for ${updatedUser.name}.`);
      closeOrgHierarchyModal();
      renderOrganizationGraph(activeUser());
      if (typeof renderCompliance === 'function') renderCompliance(activeUser());
    } else {
      showToast("Save Warning", "Changes saved locally, cloud sync pending.");
      closeOrgHierarchyModal();
      renderOrganizationGraph(activeUser());
    }
  } catch (err) {
    console.error("saveOrgHierarchy error:", err);
    showToast("Error", "Could not save structure changes: " + err.message);
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-floppy-disk" style="margin-right: 6px;"></i> Save Structure & Update Graph'; }
  }
}

// ─── Attach Deactivated Staff to Org Tree Controller ────────────
function renderOrgDeactivatedTable(filterQuery = "") {
  const tbody = document.getElementById("orgDeactivatedTableBody");
  const countInfo = document.getElementById("orgDeactivatedCountInfo");
  if (!tbody) return;

  const allUsers = users().filter(u => u.level !== "admin");
  const deactUsers = allUsers.filter(u => u.isActive === false);
  const q = filterQuery.toLowerCase().trim();

  let filtered = deactUsers;
  if (q) {
    filtered = deactUsers.filter(u => 
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.employeeId && u.employeeId.toLowerCase().includes(q)) ||
      (u.department && u.department.toLowerCase().includes(q)) ||
      (u.managerName && u.managerName.toLowerCase().includes(q)) ||
      (u.managerId && u.managerId.toLowerCase().includes(q))
    );
  }

  const attachedCount = deactUsers.filter(u => u.includeInOrgTree === true).length;
  if (countInfo) {
    countInfo.innerHTML = `<span><strong>${attachedCount}</strong> of ${deactUsers.length} attached to tree</span>`;
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--muted); padding: 24px;">No deactivated personnel found.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(u => {
    const isAttached = u.includeInOrgTree === true;
    const mgr = allUsers.find(m => m.employeeId === u.managerId);
    const mgrDisplay = mgr ? `${escapeHtml(mgr.name)} (${escapeHtml(mgr.employeeId)})` : (u.managerId ? escapeHtml(u.managerId) : `<span style="color:#f59e0b;">Unassigned</span>`);
    const dir = allUsers.find(d => d.employeeId === u.taggedDirectorId);
    const dirDisplay = dir ? `${escapeHtml(dir.name)} (${escapeHtml(dir.employeeId)})` : (u.taggedDirectorId ? escapeHtml(u.taggedDirectorId) : `<span style="color:#94a3b8;">--</span>`);

    let levelBadge = '';
    if (u.level === "1") levelBadge = '<span class="status-pill" style="background:#ffe3e3;color:#c92a2a;font-weight:700;">L1 Director</span>';
    else if (u.level === "2") levelBadge = '<span class="status-pill" style="background:#e7f5ff;color:#1971c2;font-weight:700;">L2 Manager</span>';
    else levelBadge = '<span class="status-pill" style="background:#ebfbee;color:#2b8a3e;font-weight:700;">L3 Member</span>';

    return `
      <tr style="${isAttached ? 'background: rgba(43, 138, 62, 0.04);' : ''}">
        <td style="font-weight:700; font-family: monospace;">${escapeHtml(u.employeeId)}</td>
        <td>
          <strong>${escapeHtml(u.name)}</strong>
          <span style="display: block; font-size: 0.72rem; color: #dc2626;"><i class="fa-solid fa-user-slash"></i> Inactive</span>
        </td>
        <td>${levelBadge}</td>
        <td>${dirDisplay}</td>
        <td>${mgrDisplay}</td>
        <td><span class="org-tag-pill" style="color:var(--text);">${escapeHtml(u.department || "-")}</span></td>
        <td style="text-align: center;">
          <button type="button" class="button ${isAttached ? 'button-danger' : 'button-secondary'}" 
                  data-toggle-deact-tree="${escapeHtml(u.employeeId)}" 
                  data-attached="${isAttached ? 'true' : 'false'}"
                  style="padding: 4px 10px; font-size: 0.75rem; font-weight: 600; white-space: nowrap;">
            ${isAttached 
              ? '<i class="fa-solid fa-link-slash" style="margin-right: 4px;"></i> Detach from Tree' 
              : '<i class="fa-solid fa-plus" style="margin-right: 4px; color: #2b8a3e;"></i> Attach to Tree'}
          </button>
        </td>
        <td style="text-align: center;">
          <button type="button" class="button button-secondary" data-matrix-edit="${escapeHtml(u.employeeId)}" style="padding: 4px 10px; font-size: 0.75rem;">
            <i class="fa-solid fa-pen-to-square"></i> Tag
          </button>
        </td>
      </tr>`;
  }).join("");

  // Attach toggle listeners
  tbody.querySelectorAll("[data-toggle-deact-tree]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const empId = btn.getAttribute("data-toggle-deact-tree");
      const currentAttached = btn.getAttribute("data-attached") === "true";
      await toggleDeactivatedTreeAttachment(empId, !currentAttached);
    });
  });
}

async function toggleDeactivatedTreeAttachment(empId, shouldAttach) {
  const user = activeUser();
  if (!isAdmin(user)) {
    showToast("Access Denied", "Only Master Administrator can attach/detach personnel in the Org Tree.");
    return;
  }
  const allUsers = users();
  const targetUser = allUsers.find(u => u.employeeId === empId);
  if (!targetUser) return;

  const updatedUser = {
    ...targetUser,
    includeInOrgTree: shouldAttach
  };

  try {
    const res = await cloudSaveUser(updatedUser);
    if (res && res.ok) {
      showToast(
        shouldAttach ? "Attached to Org Tree" : "Detached from Org Tree",
        `${targetUser.name} (${targetUser.employeeId}) is ${shouldAttach ? 'now attached to' : 'removed from'} the Organization Tree.`
      );
    } else {
      showToast("Updated", `Attachment updated for ${targetUser.name}.`);
    }
    renderOrgDeactivatedTable(document.getElementById("orgDeactivatedSearchInput")?.value || "");
    renderOrganizationGraph(activeUser());
  } catch (err) {
    console.error("toggleDeactivatedTreeAttachment error:", err);
    showToast("Error", "Could not update tree attachment: " + err.message);
  }
}


function updateReportApproval(reportId,status,comment,toastTitle="Updated",toastText="Submission updated successfully."){
  const user=activeUser();if(!user)return;
  const localReports=readStore(STORAGE_KEYS.reports,[]);
  const idx=localReports.findIndex(r=>r.id===reportId);
  if(idx<0)return;
  if(!canReviewReport(user,localReports[idx])){showToast("Review Closed","Review time ended at 11 PM on the next day.");renderPortal();return;}
  cloudUpdateReportApproval(reportId,status,comment,user);
  const nextReport={...localReports[idx]};
  const statusLabel=status==="approved"?"approved":status==="declined"?"declined":"updated";
  const notifText=comment.trim()?`${user.name} ${statusLabel} your DAR for ${nextReport.date}: ${comment.trim()}`:`${user.name} ${statusLabel} your DAR for ${nextReport.date}.`;
  addNotification(nextReport.employeeId,notifText,{kind:status||"feedback",title:comment.trim()?"DAR Feedback":`DAR ${statusLabel.charAt(0).toUpperCase()+statusLabel.slice(1)}`,reportId:nextReport.id,actorName:user.name});
  selectedHistoryReviewEditId="";
  showToast(toastTitle,toastText);renderPortal();
}

// ─── Tasks / Team / Subordinates ──────────────────────────────
function renderTasks(user){
  const list=document.getElementById("taskList");if(!list)return;
  const myTasks=tasks().filter(t=>t.targetId===user.employeeId).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  if(!myTasks.length){list.className="stack-list empty-state";list.textContent="No assigned tasks yet.";return;}
  list.className="stack-list";
  list.innerHTML=myTasks.map(task=>{
    const assigner=findUser(task.assignedBy);
    const completed=Boolean(task.completed);
    const statusLabel=completed?"Completed":"Open";
    const actionLabel=completed?"Reopen task":"Mark complete";
    return`<article class="assignment-card task-card ${completed?"task-card-complete":""}">
      <header>
        <div>
          <strong>${escapeHtml(task.title)}</strong>
          <p class="task-card-meta">${escapeHtml(task.notes||"No notes added.")}</p>
        </div>
        <span class="status-pill ${completed?"status-approved":"status-pending"}">${escapeHtml(statusLabel)}</span>
      </header>
      <p>Assigned by ${escapeHtml(assigner?.name||task.assignedBy)} | Due ${escapeHtml(task.dueDate||"--")}</p>
      <div class="action-row task-card-actions">
        ${completed ? `<span class="status-pill status-approved" style="margin-right:12px;"><i class="fa-solid fa-check"></i> Completed</span>` : `<button type="button" class="compact-button action-approve" data-task-toggle-complete="${escapeHtml(task.id)}">Mark complete</button>`}
      </div>
      ${task.completedAt?`<p class="helper-text">Completed ${escapeHtml(formatDateTime(task.completedAt))}</p>`:""}
    </article>`;
  }).join("");
  list.querySelectorAll("[data-task-toggle-complete]").forEach(btn=>btn.addEventListener("click",async()=>{
    const id=btn.getAttribute("data-task-toggle-complete");
    const task=tasks().find(t=>t.id===id);
    const user=activeUser();
    if(!id||!task||!user)return;

    if (!task.completed) {
      const modal = document.getElementById("taskTimeModal");
      const title = document.getElementById("taskTimeModalTitle");
      if(modal && title) {
        title.textContent = `Complete Task: ${truncateText(task.title, 30)}`;
        document.getElementById("taskTimeHours").value = "0";
        document.getElementById("taskTimeMinutes").value = "0";
        window.activeCompleteTaskId = id;
        modal.classList.remove("hidden");
      }
    }
  }));
}
function renderTeamReports(user,targetId="teamReportsList"){
  const list=document.getElementById(targetId);const directSubs=directSubordinates(user);if(!list||(!isLevel2(user)&&directSubs.length===0))return;
  const subIds=new Set(directSubordinates(user).map(u=>u.employeeId));
  const items=reports().filter(r=>subIds.has(r.employeeId)||r.managerId===user.employeeId).sort((a,b)=>new Date(b.submittedAt)-new Date(a.submittedAt));
  if(!items.length){list.className="stack-list empty-state";list.textContent="No submitted DARs from direct subordinates yet.";return;}
  list.className="stack-list";
  list.innerHTML=items.map(report=>{
    const expanded=selectedTeamReportId===report.id;
    const reviewEditMode=selectedHistoryReviewEditId===report.id;
    const reviewActionsVisible=canReviewReport(user,report)&&(report.approvalStatus==="pending"||reviewEditMode);
    const actionBlock=reviewActionsVisible?`<div class="inline-feedback-row"><button type="button" class="compact-button action-approve" data-approve="${escapeHtml(report.id)}">Approve</button><button type="button" class="compact-button action-reject" data-decline="${escapeHtml(report.id)}">Reject</button><button type="button" class="compact-button action-feedback" data-feedback-toggle="${escapeHtml(report.id)}">Add Feedback</button></div><div class="feedback-input-wrap hidden" id="feedbackWrap-${escapeHtml(report.id)}"><input type="text" id="feedbackInput-${escapeHtml(report.id)}" placeholder="Write feedback for this submission"><button type="button" class="compact-button action-feedback" data-feedback-save="${escapeHtml(report.id)}">Save Feedback</button></div>`:(canReviewReport(user,report)&&report.approvalStatus!=="pending"&&!reviewEditMode?`<div class="action-row history-review-actions"><button type="button" class="compact-button" data-history-review-edit="${escapeHtml(report.id)}">Edit Action</button></div>`:"");
    const feedbackBlock=report.reviewComment?`<div class="feedback-history"><strong>Feedback</strong><p>${escapeHtml(report.reviewComment)}</p></div>`:"";
    const title=reportDisplayTitle(report);
    return`<article class="${reportCardClass(report)}"><header><div><strong class="report-hero-name">${escapeHtml(report.employeeName)}</strong>${title?`<p class="report-subtitle">${escapeHtml(title)}</p>`:""}</div><span class="${escapeHtml(reportStatusClass(report))}">${escapeHtml(reportStatusDisplay(report))}</span></header><p>${escapeHtml((report.points||[]).map(p=>p.text).join(" | "))}</p><p>Submitted ${escapeHtml(formatDateTime(report.submittedAt))}</p><button type="button" class="history-row-open history-inline-toggle" data-team-report-open="${escapeHtml(report.id)}"><span class="history-view-link">${expanded?"Hide Details":"View Details"}</span><span class="history-row-chevron" aria-hidden="true">${expanded?"^":">"}</span></button>${expanded?`<div class="history-inline-expansion">${historyDrawerMarkup(user,report,selectedTeamReportPointId)}</div>`:""}${feedbackBlock}${actionBlock}</article>`;
  }).join("");
  list.querySelectorAll("[data-approve]").forEach(btn=>btn.addEventListener("click",()=>{animateActionSuccess(btn);updateReportApproval(btn.getAttribute("data-approve"),"approved","","Approved","Team submission approved.");}));
  list.querySelectorAll("[data-decline]").forEach(btn=>btn.addEventListener("click",()=>{animateActionSuccess(btn);updateReportApproval(btn.getAttribute("data-decline"),"declined","","Rejected","Team submission rejected.");}));
  list.querySelectorAll("[data-feedback-toggle]").forEach(btn=>btn.addEventListener("click",()=>document.getElementById(`feedbackWrap-${btn.getAttribute("data-feedback-toggle")}`)?.classList.toggle("hidden")));
  list.querySelectorAll("[data-feedback-save]").forEach(btn=>btn.addEventListener("click",()=>{const id=btn.getAttribute("data-feedback-save");const input=document.getElementById(`feedbackInput-${id}`);animateActionSuccess(btn);updateReportApproval(id,"",input?.value||"","Feedback Sent","Team feedback saved.");}));
  list.querySelectorAll("[data-history-review-edit]").forEach(btn=>btn.addEventListener("click",()=>{selectedHistoryReviewEditId=btn.getAttribute("data-history-review-edit")||"";renderTeamReports(user,targetId);}));
  list.querySelectorAll("[data-team-report-open]").forEach(btn=>btn.addEventListener("click",()=>{const id=btn.getAttribute("data-team-report-open")||"";selectedTeamReportId=selectedTeamReportId===id?"":id;selectedTeamReportPointId="";renderTeamReports(user,targetId);}));
  list.querySelectorAll("[data-history-point]").forEach(btn=>btn.addEventListener("click",()=>{selectedTeamReportPointId=btn.getAttribute("data-history-point")||"";renderTeamReports(user,targetId);}));
}
function renderSubordinates(user){
  const list=document.getElementById("subordinateList");const subs=assignableTaskTargets(user);if(!list||(!isLevel2(user)&&subs.length===0))return;

  if(!subs.length){list.className="stack-list empty-state";list.textContent="No reportees available.";return;}
  list.className="stack-list";
  list.innerHTML=subs.map(sub=>`<article class="assignment-card"><header><strong>${escapeHtml(sub.name)}</strong><span class="status-pill">${escapeHtml(sub.employeeId)}</span></header><p>${escapeHtml(sub.department)} | Reports to ${escapeHtml(sub.managerName||"--")}</p></article>`).join("");
}

// ─── History section ──────────────────────────────────────────
function historySummaryDuration(reportsList){
  const totalSeconds=(reportsList||[]).reduce((sum,r)=>{const norm=reportTotalTime(r);const parts=[...String(norm).matchAll(/(\d+)(h|m|s)/g)];return sum+parts.reduce((inner,[,v,u])=>{if(u==="h")return inner+Number(v)*3600;if(u==="m")return inner+Number(v)*60;return inner+Number(v);},0);},0);
  return normalizeDuration(`${totalSeconds}s`)||"0m";
}
function historyReportSummary(report){ const headline=report.projectName||report.points?.[0]?.rawText||report.points?.map(p=>p.rawText||p.text).join(" | ")||"DAR";return truncateText(headline,92); }
function historyReportPoints(report){ return(report.points||[]).map((p,i)=>({...p,displayNo:i+1})); }
function historyPointDetailMarkup(point,report){
  if(!point)return'<div class="empty-state">Select a task to see full point details.</div>';
  const reviewer=report.reviewedBy?(findUser(report.reviewedBy)?.name||report.reviewedBy):"Pending review";
  const user=activeUser();
  const adminEditBtn=isAdmin(user)?`<div class="action-row" style="margin-top:12px;"><button type="button" class="compact-button" data-admin-edit-time="${escapeHtml(report.id)}|${escapeHtml(point.id)}">Admin: Edit Time</button></div>`:"";
  return`<article class="history-point-detail-card"><div class="history-point-head"><strong>${escapeHtml(point.displayNo||0)}. ${escapeHtml(point.rawText||point.text)}</strong><span class="status-pill">${escapeHtml(point.totalTime||"--")}</span></div><p>${escapeHtml(formatPointMeta(point))}</p>${point.attachmentName&&point.attachmentData?`<a class="compact-button attachment-inline" download="${escapeHtml(point.attachmentName)}" href="${escapeHtml(point.attachmentData)}">Download ${escapeHtml(point.attachmentName)}</a>`:""}<div class="history-point-detail-meta"><span>Report status: ${escapeHtml(reportStatusDisplay(report))}</span><span>Submitted: ${escapeHtml(formatDateTime(report.submittedAt))}</span></div><div class="history-approval-info"><span>Reviewer: ${escapeHtml(reviewer)}</span><span>Reviewed: ${escapeHtml(report.reviewedAt?formatDateTime(report.reviewedAt):"Pending review")}</span></div>${adminEditBtn}</article>`;
}
function historyTableHeaderMarkup(showEmployee,sortKey="date",sortDirection="desc"){
  const arrow=key=>sortKey===key?(sortDirection==="asc"?"^":"v"):"-";
  return`<div class="history-summary-strip"><span class="section-tag">${showEmployee?"Employee history":"My history"}</span><div class="history-summary-strip-actions"><button type="button" class="history-sort-trigger ${sortKey==="date"?"history-sort-trigger-active":""}" data-history-sort="date">Date <span aria-hidden="true">${arrow("date")}</span></button><button type="button" class="history-sort-trigger ${sortKey==="efficiency"?"history-sort-trigger-active":""}" data-history-sort="efficiency">Efficiency <span aria-hidden="true">${arrow("efficiency")}</span></button></div></div>`;
}
function historyTableRowMarkup(viewer,report,index,employee,showEmployee,selected,selectedPointId=""){
  const efficiency=efficiencyBandForMinutes(reportTotalMinutes(report));
  const employeeName=employee?.name||report.employeeName||"Unknown";
  const headline=showEmployee?employeeName:report.date;
  const subline=showEmployee?`${employee?.employeeId||report.employeeId}${employee?` | ${employee.department||""}`:""}`:historyReportSummary(report);
  return`<article class="history-item-card ${selected?"history-item-card-active":""}">
    <div class="history-item-head">
      <div class="history-item-leading">
        <div class="history-serial">#${String(index+1).padStart(2,"0")}</div>
        <div class="history-item-copy"><strong>${escapeHtml(headline)}</strong><span>${escapeHtml(subline)}</span></div>
      </div>
      <span class="${escapeHtml(reportStatusClass(report))}">${escapeHtml(reportStatusDisplay(report))}</span>
    </div>
    <div class="history-item-body">
      <p class="history-item-summary">${escapeHtml(showEmployee?historyReportSummary(report):`Short project note: ${historyReportSummary(report)}`)}</p>
      <div class="history-item-meta"><span>${escapeHtml(reportTotalTime(report)||"--")} worked</span><span>${escapeHtml(efficiency.value)}% efficiency</span><span>${escapeHtml(formatDateTime(report.submittedAt))}</span></div>
      <div class="efficiency-track ${efficiency.className}" aria-hidden="true"><span style="width:${efficiency.width}"></span></div>
      <button type="button" class="history-row-open history-inline-toggle" data-history-open="${escapeHtml(report.id)}" aria-label="${selected?"Hide":"Show"} details for ${escapeHtml(formatDate(report.date))}"><span class="history-view-link">${selected?"Hide details":"Show details"}</span><span class="history-row-chevron" aria-hidden="true">${selected?"^":">"}</span></button>
    </div>
    ${selected?`<div class="history-inline-expansion">${historyDrawerMarkup(viewer,report,selectedPointId)}</div>`:""}
  </article>`;
}
function historyDrawerMarkup(user,report,selectedPointId=""){
  if(!report)return'<div class="empty-state">Select a submission to view details.</div>';
  const points=historyReportPoints(report);
  const efficiency=efficiencyBandForMinutes(reportTotalMinutes(report));
  const selectedPoint=points.find(p=>p.id===selectedPointId)||points[0]||null;
  const canReview=canReviewReport(user,report);
  const canEdit=reportIsEditable(report)&&report.employeeId===user.employeeId;
  const reviewEditMode=selectedHistoryReviewEditId===report.id;
  const reviewActionsVisible=canReview&&(report.approvalStatus==="pending"||reviewEditMode);
  return`<div class="history-drawer-card">
    <div class="history-expanded-summary">
      <div class="history-expanded-item"><span>Employee</span><strong>${escapeHtml(report.employeeName||report.employeeId)}</strong></div>
      <div class="history-expanded-item"><span>Date</span><strong>${escapeHtml(report.date)}</strong></div>
      <div class="history-expanded-item"><span>Total Time</span><strong>${escapeHtml(reportTotalTime(report)||"--")}</strong></div>
      <div class="history-expanded-item"><span>Tasks</span><strong>${escapeHtml(points.length)}</strong></div>
      <div class="history-expanded-item"><span>Approval</span><strong>${escapeHtml(reportStatusDisplay(report))}</strong></div>
    </div>
    <div class="history-detail-status-row"><span class="${escapeHtml(reportStatusClass(report))}">${escapeHtml(reportStatusDisplay(report))}</span><span class="status-pill">${escapeHtml(report.type==="project"?"Project DAR":"Daily DAR")}</span></div>
    <div class="history-approval-info"><span>Reviewer: ${escapeHtml(report.reviewedBy?(findUser(report.reviewedBy)?.name||report.reviewedBy):"Pending review")}</span><span>Reviewed: ${escapeHtml(report.reviewedAt?formatDateTime(report.reviewedAt):"Pending review")}</span></div>
    <div class="efficiency-cell efficiency-cell-expanded"><div class="history-efficiency-head"><strong>Work Efficiency</strong><span>Efficiency: ${escapeHtml(efficiency.value)}% (Target: 85%)</span></div><div class="efficiency-track ${efficiency.className}" aria-hidden="true"><span style="width:${efficiency.width}"></span></div><div class="efficiency-meta"><strong>${escapeHtml(efficiency.label)}</strong><span>${escapeHtml(efficiency.hint)}</span></div></div>
    <div class="history-task-section"><div class="panel-header"><div><p class="section-tag">Tasks</p><h3>Click any task for full detail</h3></div></div><div class="history-task-list">${points.length?points.map(p=>`<div class="history-task-item"><button type="button" class="history-task-row ${selectedPoint?.id===p.id?"history-task-row-active":""}" data-history-point="${escapeHtml(p.id)}"><span class="history-task-row-title">${escapeHtml(p.displayNo||0)}. ${escapeHtml(p.rawText||p.text)}</span><span class="history-task-row-meta">${escapeHtml(p.totalTime||"--")} | ${escapeHtml(formatPointMeta(p))} | ${escapeHtml(reportStatusDisplay(report))}</span></button>${selectedPoint?.id===p.id?`<div class="history-task-inline-detail">${historyPointDetailMarkup(selectedPoint,report)}</div>`:""}</div>`).join(""):'<div class="empty-state">No tasks logged.</div>'}</div></div>
    ${report.reviewComment?`<div class="feedback-history"><strong>Reviewer comments</strong><p>${escapeHtml(report.reviewComment)}</p></div>`:""}
    ${canReview&&report.approvalStatus!=="pending"&&!reviewEditMode?`<div class="action-row history-review-actions"><button type="button" class="compact-button" data-history-review-edit="${escapeHtml(report.id)}">Edit Review</button></div>`:""}
    ${reviewActionsVisible?`<div class="action-row history-review-actions"><button type="button" class="compact-button action-approve" data-approve="${escapeHtml(report.id)}">Approve</button><button type="button" class="compact-button action-decline" data-decline="${escapeHtml(report.id)}">Reject</button><button type="button" class="compact-button" data-feedback-toggle="${escapeHtml(report.id)}">Feedback</button></div><div class="feedback-wrap hidden" id="feedbackWrap-${escapeHtml(report.id)}"><label>Reviewer note<textarea id="feedbackInput-${escapeHtml(report.id)}" rows="3" placeholder="Add quick feedback"></textarea></label><button type="button" class="button" data-feedback-save="${escapeHtml(report.id)}">Save Feedback</button></div>`:""}
    ${canEdit?`<div class="action-row history-edit-row"><button type="button" class="compact-button" data-history-edit="${escapeHtml(report.id)}">Edit DAR</button></div>`:""}
  </div>`;
}
function renderHistory(user){
  const content = document.getElementById("historyDashboardContent");
  if(!content) return;

  const month = new Date().getMonth();
  const year = new Date().getFullYear();
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const fullMonthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  
  const query = (historyEmployeeSearchQuery || "").toLowerCase().trim();
  const targetId = selectedHistoryEmployeeId ? selectedHistoryEmployeeId.toLowerCase() : "";
  const myReports = reports().filter(r => {
    if (query) {
      return (r.employeeId && r.employeeId.toLowerCase() === query) || 
             (r.employeeName && r.employeeName.toLowerCase().includes(query)) ||
             (targetId && r.employeeId && r.employeeId.toLowerCase() === targetId);
    } else if (targetId) {
      return r.employeeId && r.employeeId.toLowerCase() === targetId;
    }
    return r.employeeId === user.employeeId;
  });
  const monthlyReports = myReports.filter(r => new Date(r.date).getMonth() === month && new Date(r.date).getFullYear() === year);
  
  let totalMinutes = 0;
  let totalTasks = 0;
  let approvedTasks = 0;
  let pendingApprovals = 0;
  
  monthlyReports.forEach(r => {
    totalMinutes += reportTotalMinutes(r);
    totalTasks += (r.points || []).length;
    if(r.approvalStatus === "approved") approvedTasks += (r.points || []).length;
    if(r.approvalStatus === "pending") pendingApprovals++;
  });
  
  const avgScore = monthlyReports.length ? Math.round(monthlyReports.reduce((s,r) => s + efficiencyBandForMinutes(reportTotalMinutes(r)).value, 0) / monthlyReports.length) : 0;
  
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const avgHrs = monthlyReports.length ? Math.round((hours / monthlyReports.length) * 10) / 10 : 0;
  
  const monthlyHtml = `
    <div class="history-monthly-overview">
      <h3 class="history-monthly-title">Monthly Overview - ${fullMonthNames[month]} ${year}</h3>
      <div class="history-monthly-content">
        <div class="history-circle-wrap">
          <svg width="160" height="160" viewBox="0 0 160 160" class="history-svg-circle">
            <circle cx="80" cy="80" r="72" fill="none" stroke="var(--line, #e2e8f0)" stroke-width="12"></circle>
            <circle cx="80" cy="80" r="72" fill="none" stroke="#b51f3b" stroke-width="12" stroke-dasharray="452.4" stroke-dashoffset="${452.4 - (452.4 * avgScore / 100)}" stroke-linecap="round"></circle>
          </svg>
          <div class="history-circle-inner">
            <h3>${avgScore}%</h3>
            <p>Avg. Work Efficiency</p>
            <div class="trend"><i class="fa-solid fa-arrow-up"></i> 5% from last month</div>
          </div>
        </div>
        <div class="history-metrics-grid">
          <div class="history-metric-item">
            <i class="fa-solid fa-pen-to-square history-metric-icon"></i>
            <div class="history-metric-content">
              <h4>${totalTasks}</h4>
              <p>Total Tasks Submitted</p>
              <span>Across ${monthlyReports.length} DARs</span>
            </div>
          </div>
          <div class="history-metric-item">
            <i class="fa-solid fa-clipboard-check history-metric-icon"></i>
            <div class="history-metric-content">
              <h4>${approvedTasks}</h4>
              <p>Tasks Completed</p>
              <span>${totalTasks>0?Math.round((approvedTasks/totalTasks)*100):0}% completion rate</span>
            </div>
          </div>
          <div class="history-metric-item">
            <i class="fa-regular fa-clock history-metric-icon"></i>
            <div class="history-metric-content">
              <h4>${hours}h ${mins}m</h4>
              <p>Total Time</p>
              <span>Avg. ${avgHrs} hrs per day</span>
            </div>
          </div>
          <div class="history-metric-item">
            <i class="fa-solid fa-hourglass-half history-metric-icon" style="color:var(--warning)"></i>
            <div class="history-metric-content">
              <h4>${pendingApprovals}</h4>
              <p>Pending Approvals</p>
              <span>${monthlyReports.length ? Math.round((pendingApprovals/monthlyReports.length)*100) : 0}% of total DARs</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const dailyHtml = myReports.sort((a,b) => new Date(b.date) - new Date(a.date)).map((r, i) => {
    const d = new Date(r.date);
    const dayName = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][d.getDay()];
    const dayNum = String(d.getDate()).padStart(2, '0');
    const monthName = monthNames[d.getMonth()].toUpperCase();
    
    const eff = efficiencyBandForMinutes(reportTotalMinutes(r));
    const isBelow = eff.value < 50;
    const effColor = isBelow ? "#ef4444" : (eff.value >= 85 ? "#10b981" : "var(--primary)");
    const effStatusText = isBelow ? "Below 50% target" : (eff.value >= 85 ? "Excellent" : "Good Progress");
    const effStatusClass = isBelow ? "text-danger" : (eff.value >= 85 ? "text-success" : "text-success");
    
    const tasksCount = (r.points || []).length;
    const rMins = reportTotalMinutes(r);
    const rh = Math.floor(rMins / 60);
    const rm = String(rMins % 60).padStart(2, '0');
    
    let approvalIcon = '<i class="fa-solid fa-hourglass-half" style="color:#f59e0b"></i>';
    let approvalText = "Pending";
    if(r.approvalStatus === "approved") {
      approvalIcon = '<i class="fa-solid fa-check-double" style="color:#10b981"></i>';
      approvalText = "Completed";
    } else if(r.approvalStatus === "declined") {
      approvalIcon = '<i class="fa-solid fa-xmark" style="color:#ef4444"></i>';
      approvalText = "Rejected";
    } else if(r.approvalStatus === "partial") {
      approvalIcon = '<i class="fa-solid fa-hourglass-half" style="color:#f59e0b"></i>';
      approvalText = "Partial";
    }

    const tasksHtml = (r.points || []).map((p, idx) => `
      <div class="history-task-entry ${idx===0?'highlight':''}">
        <div>
          <h5>${idx+1}. ${escapeHtml(p.rawText || p.text)}</h5>
          <p>${escapeHtml(p.totalTime||"--")} | Total time: ${escapeHtml(p.totalTime||"--")}</p>
          ${isAdmin(user) ? `<button type="button" class="compact-button" style="margin-top:4px;" data-admin-edit-time="${escapeHtml(r.id)}|${escapeHtml(p.id)}">Admin: Edit Time</button>` : ""}
        </div>
        <div class="status">
          ${approvalIcon} ${approvalText}
        </div>
      </div>
    `).join("");

    return `
      <div class="history-daily-card ${i===0 ? 'is-expanded' : ''}">
        <div class="history-daily-summary">
          <div class="history-daily-date">
            <span>${dayName}</span>
            <strong>${dayNum}</strong>
            <span>${monthName}</span>
          </div>
          <div class="history-daily-circle">
            <svg width="56" height="56" viewBox="0 0 56 56" class="history-svg-circle">
              <circle cx="28" cy="28" r="23" fill="none" stroke="var(--line, #e2e8f0)" stroke-width="6"></circle>
              <circle cx="28" cy="28" r="23" fill="none" stroke="${effColor}" stroke-width="6" stroke-dasharray="144.5" stroke-dashoffset="${144.5 - (144.5 * eff.value / 100)}" stroke-linecap="round"></circle>
            </svg>
            <span>${eff.value}%</span>
          </div>
          <div class="history-daily-stat">
            <div class="history-daily-stat-text">
              <h5>Work Efficiency</h5>
              <p class="${effStatusClass}">${effStatusText}</p>
              <span>Target: 85%</span>
            </div>
          </div>
          <div class="history-daily-stat">
            <i class="fa-regular fa-check-square history-metric-icon"></i>
            <div class="history-daily-stat-text">
              <h5>${tasksCount}</h5>
              <p>Tasks Completed</p>
            </div>
          </div>
          <div class="history-daily-stat">
            <i class="fa-regular fa-clock history-metric-icon"></i>
            <div class="history-daily-stat-text">
              <h5>${rh}h ${rm}m</h5>
              <p>Total Time</p>
            </div>
          </div>
          <div class="history-daily-stat">
            ${approvalIcon}
            <div class="history-daily-stat-text">
              <h5>${approvalText}</h5>
              <p>Approval Status</p>
            </div>
          </div>
          <button type="button" class="history-daily-toggle" data-report-id="${r.id}">See Details <i class="fa-solid fa-chevron-${i===0?'up':'down'}"></i></button>
        </div>
        
        <div class="history-daily-detail">
          <div class="history-detail-left">
            <h4>Work Efficiency</h4>
            <div style="display:flex; gap: 32px; align-items:center;">
              <div class="history-circle-wrap" style="width: 120px; height: 120px;">
                <svg width="120" height="120" viewBox="0 0 120 120" class="history-svg-circle">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="var(--line, #e2e8f0)" stroke-width="10"></circle>
                  <circle cx="60" cy="60" r="50" fill="none" stroke="${effColor}" stroke-width="10" stroke-dasharray="314.16" stroke-dashoffset="${314.16 - (314.16 * eff.value / 100)}" stroke-linecap="round"></circle>
                </svg>
                <div class="history-circle-inner">
                  <h3 style="font-size: 24px">${eff.value}%</h3>
                  <p>Efficiency</p>
                </div>
              </div>
              <div style="flex: 1">
                <div class="history-target-bar">
                  <p>Target: 85%</p>
                  <div class="history-bar-bg">
                    <div class="history-bar-fill" style="width: ${eff.value}%; background: ${effColor}"></div>
                  </div>
                  <div class="history-bar-legend">
                    <span style="color:#ef4444">Needs Attention<br>Below 50% target</span>
                    <span style="color:#10b981; text-align:right">Good Progress<br>Keep it up!</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="history-about-box">
              <h5><i class="fa-solid fa-info-circle"></i> About Work Efficiency</h5>
              <p>Efficiency is calculated based on tasks completed vs. standard time.<br>Higher efficiency indicates better productivity.</p>
            </div>
          </div>
          <div class="history-detail-right">
            <div class="history-detail-right-header">
              <h4>Tasks (${tasksCount})</h4>
              <a href="#">View all tasks <i class="fa-solid fa-arrow-right"></i></a>
            </div>
            ${tasksHtml}
            <div class="history-tasks-footer">
              <span>Total Tasks: <strong>${tasksCount}</strong></span>
              <span>Total Time: <strong>${rh}h ${rm}m</strong></span>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join("");

  content.innerHTML = `
    ${monthlyHtml}
    <h3 class="history-daily-header">Daily Breakdown</h3>
    ${dailyHtml || '<div class="empty-state">No submissions found.</div>'}
    <div style="text-align: center; margin-top: 20px; padding-bottom: 20px;">
      <button type="button" id="historyLoadMoreBtn" class="primary-button" onclick="loadMoreReports()" style="padding: 8px 16px;">Load More Reports</button>
    </div>
  `;

  content.querySelectorAll('.history-daily-toggle').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const card = e.currentTarget.closest('.history-daily-card');
      const isExpanded = card.classList.contains('is-expanded');
      
      if (!isExpanded) {
        card.classList.add('is-expanded');
        e.currentTarget.innerHTML = 'See Details <i class="fa-solid fa-chevron-up"></i>';
      } else {
        card.classList.remove('is-expanded');
        e.currentTarget.innerHTML = 'See Details <i class="fa-solid fa-chevron-down"></i>';
      }
    });
  });
  
  const fromDate = document.getElementById("historyFromDate");
  const toDate = document.getElementById("historyToDate");
  if(fromDate && !fromDate.value) fromDate.value = `${year}-${String(month+1).padStart(2,'0')}-01`;
  if(toDate && !toDate.value) {
     const lastDay = new Date(year, month + 1, 0).getDate();
     toDate.value = `${year}-${String(month+1).padStart(2,'0')}-${lastDay}`;
  }
}

// ─── DAR section ──────────────────────────────────────────────
function normalizeDuration(input){
  const raw=String(input||"").trim().toLowerCase();if(!raw)return"";
  const compact=raw.replace(/\s+/g,"");if(/^\d+$/.test(compact))return Number(compact)>0?`${compact}m`:"";
  const matches=[...compact.matchAll(/(\d+)(h|hr|hrs|hour|hours|m|min|mins|minute|minutes|s|sec|secs|second|seconds)/g)];if(!matches.length)return"";
  let totalSeconds=0;
  matches.forEach(([,v,u])=>{const a=Number(v);if(u.startsWith("h"))totalSeconds+=a*3600;else if(u.startsWith("m"))totalSeconds+=a*60;else totalSeconds+=a;});
  if(totalSeconds<=0)return"";
  const h=Math.floor(totalSeconds/3600);const m=Math.floor((totalSeconds%3600)/60);const s=totalSeconds%60;
  const parts=[];if(h)parts.push(`${h}h`);if(m)parts.push(`${m}m`);if(s)parts.push(`${s}s`);return parts.join(" ");
}
function durationFromParts(h,m,s){
  const hh=Number(h||0);const mm=Number(m||0);const ss=Number(s||0);
  if(![hh,mm,ss].every(v=>Number.isFinite(v)&&v>=0))return"";
  return normalizeDuration(`${hh*3600+mm*60+ss}s`);
}
function durationFromHourMinuteParts(h,m){ return durationFromParts(h,m,0); }
function activeDarDate(value){ return String(value||"")>=today()?String(value||""):today(); }
function syncDarFormFromDraft(user){
  const draft=getDraft(user);const byId=id=>document.getElementById(id);
  const currentDate=activeDarDate(draft.date||today());
  if(byId("darDate")){byId("darDate").value=currentDate;byId("darDate").min=today();}
  if(byId("darType"))byId("darType").value=draft.type||"internal";
  if(byId("mobileDarDate")){byId("mobileDarDate").value=activeDarDate(draft.mobileDate||draft.date||today());byId("mobileDarDate").min=today();}
  if(byId("mobileDarType"))byId("mobileDarType").value=draft.mobileType||draft.type||"internal";
  if(byId("mobileDarLocation"))byId("mobileDarLocation").value=draft.mobileLocation||draft.location||"";
  if(byId("pointInput"))byId("pointInput").value=draft.currentPoint||"";
  if(byId("mobilePointInput"))byId("mobilePointInput").value=draft.currentPoint||"";
  if(byId("pointHours"))byId("pointHours").value=draft.pointHours||"";
  if(byId("mobilePointHours"))byId("mobilePointHours").value=draft.pointHours||"";
  if(byId("pointMinutes"))byId("pointMinutes").value=draft.pointMinutes||"";
  if(byId("mobilePointMinutes"))byId("mobilePointMinutes").value=draft.pointMinutes||"";
  const att=byId("pointAttachment");if(att)att.value="";
  const charCount=byId("pointCharCount");
  if(charCount)charCount.textContent=`${(draft.currentPoint||"").length} / 600`;
  renderQuickPointsDropdown(user);
  renderDraftPointEditor(user);
  renderSidebarDarStream(user);
  syncTimePillsFromInputs();
}
function updatePointIndicator(user){
  renderDraftPointEditor(user);
}
async function addDarPoint(user){
  const input=document.getElementById("pointInput");const hours=document.getElementById("pointHours");const minutes=document.getElementById("pointMinutes");const attachment=document.getElementById("pointAttachment");const feedback=document.getElementById("darFeedback");const draftStatus=document.getElementById("darDraftStatus");
  const rawText=String(input?.value||"").trim();
  const totalTime=durationFromHourMinuteParts(hours?.value,minutes?.value);
  if(!rawText){if(feedback){feedback.textContent="Write a DAR point before clicking [+] Add.";feedback.style.color="red";}return;}
  if(/\b(lunch|break|snacks?|dinner|breakfast)\b/i.test(rawText)){
    if(feedback){feedback.textContent="Break terms (Lunch, Break, Snacks, Dinner, Breakfast) are not allowed in DAR.";feedback.style.color="red";}
    return;
  }
  if(!totalTime){if(feedback){feedback.textContent="Enter hours or minutes before adding the DAR point.";feedback.style.color="red";}return;}
  const file=attachment?.files?.[0]||null;
  const attachmentData=await fileToData(file);
  const draft=getDraft(user);const pointNumber=draft.points.length+1;
  const editingIndex=editingDraftPointId?draft.points.findIndex(p=>p.id===editingDraftPointId):-1;
  const existingPoint=editingIndex>=0?draft.points[editingIndex]:null;
  const point={id:existingPoint?.id||`PT-${Date.now()}-${pointNumber}`,text:`${pointNumber}. ${rawText}`,rawText,totalTime,attachmentName:file?attachmentData.name:(existingPoint?.attachmentName||""),attachmentData:file?attachmentData.data:(existingPoint?.attachmentData||""),attachmentSize:file?attachmentData.size:(existingPoint?.attachmentSize||""),createdAt:existingPoint?.createdAt||nowIso(),updatedAt:nowIso()};
  if(editingIndex>=0)draft.points[editingIndex]=point;else draft.points.push(point);
  renumberDraftPoints(draft);
  draft.currentPoint="";draft.pointHours="";draft.pointMinutes="";draft.attachmentName="";draft.attachmentData="";draft.attachmentSize="";
  saveDraft(user,draft);
  editingDraftPointId="";
  latestSidebarDraftPointId=point.id;
  if(input){input.value="";input.classList.add("point-feedback-pop");window.setTimeout(()=>input.classList.remove("point-feedback-pop"),420);}
  const minput=document.getElementById("mobilePointInput");
  if(minput){minput.value="";minput.classList.add("point-feedback-pop");window.setTimeout(()=>minput.classList.remove("point-feedback-pop"),420);}
  if(hours)hours.value="";if(minutes)minutes.value="";if(attachment)attachment.value="";
  const mhours=document.getElementById("mobilePointHours");const mminutes=document.getElementById("mobilePointMinutes");
  if(mhours)mhours.value="";if(mminutes)mminutes.value="";
  
  const dropzoneContent=document.getElementById("darDropzoneContent");
  const dropzoneFileInfo=document.getElementById("darDropzoneFileInfo");
  if(dropzoneContent)dropzoneContent.classList.remove("hidden");
  if(dropzoneFileInfo)dropzoneFileInfo.classList.add("hidden");
  const count=document.getElementById("pointCharCount");
  if(count)count.textContent="0 / 600";
  syncTimePillsFromInputs();
  updateDarTypingState();
  if(feedback){feedback.textContent=editingIndex>=0?"DAR point updated and auto-saved to draft.":"DAR point added and auto-saved to draft.";feedback.style.color="var(--good)";window.setTimeout(()=>{if(feedback)feedback.textContent="";},3000);}
  if(draftStatus)draftStatus.textContent="Draft saved just now";
  renderDraftPointEditor(user);renderSidebarDarStream(user);
}
function saveCurrentDraftFromInputs(user){
  const draft=getDraft(user);
  const getVal = (dId, mId) => {
    const dEl = document.getElementById(dId);
    const mEl = document.getElementById(mId);
    if (dEl && dEl.offsetParent !== null) return dEl.value;
    if (mEl && mEl.offsetParent !== null) return mEl.value;
    return dEl ? dEl.value : (mEl ? mEl.value : "");
  };
  draft.date = activeDarDate(getVal("darDate", "mobileDarDate") || today());
  draft.type = getVal("darType", "mobileDarType") || "internal";
  draft.location = document.getElementById("mobileDarLocation")?.value || draft.location || "";
  draft.currentPoint = getVal("pointInput", "mobilePointInput");
  draft.pointHours = getVal("pointHours", "mobilePointHours");
  draft.pointMinutes = getVal("pointMinutes", "mobilePointMinutes");
  draft.mobileDate = draft.date;
  draft.mobileType = draft.type;
  draft.mobileLocation = draft.location;
  saveDraft(user,draft);
  const count=document.getElementById("pointCharCount");
  if(count)count.textContent=`${(draft.currentPoint||"").length} / 600`;
  const draftStatus=document.getElementById("darDraftStatus");
  if(draftStatus)draftStatus.textContent="Draft saved just now";
  updateDarTypingState();
}
function updateDarTypingState(){
  const input=document.getElementById("pointInput");
  const box=input?.closest(".increment-box");
  if(!input||!box)return;
  const typing=document.activeElement===input||String(input.value||"").trim().length>0;
  box.classList.toggle("is-writing",typing);
}

// ─── Real-Time Voice-to-Text Speech Dictation ─────────────────────
function initDarVoiceRecognition() {
  const voiceBtn = document.getElementById("btnDarVoiceRecord");
  if (!voiceBtn) return;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const equalizerEl = document.getElementById("darVoiceEqualizer");
  const langToggleBtn = document.getElementById("darVoiceLangToggle");

  let recognition = null;
  let isRecording = false;
  let baseTextAtStart = "";
  let sessionFinalText = "";
  let sessionInterimText = "";
  let draftSaveDebounceTimer = null;
  let restartTimeout = null;

  // Language preference: explicitly default to "en-IN" (Indian English)
  // This prevents mobile browsers from defaulting to US English or regional scripts which corrupt Indian diction
  let activeLang = localStorage.getItem("metro_dar_voice_lang") || "en-IN";
  if (activeLang !== "en-IN" && activeLang !== "hi-IN") {
    activeLang = "en-IN";
  }

  function updateLangToggleUI() {
    if (!langToggleBtn) return;
    if (activeLang === "hi-IN") {
      langToggleBtn.textContent = "HI";
      langToggleBtn.setAttribute("title", "Voice Language: Hindi. Click to switch to English (India)");
      langToggleBtn.setAttribute("aria-label", "Switch voice language to English");
    } else {
      langToggleBtn.textContent = "EN";
      langToggleBtn.setAttribute("title", "Voice Language: English (India). Click to switch to Hindi");
      langToggleBtn.setAttribute("aria-label", "Switch voice language to Hindi");
    }
  }
  updateLangToggleUI();

  if (langToggleBtn) {
    langToggleBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      activeLang = activeLang === "en-IN" ? "hi-IN" : "en-IN";
      localStorage.setItem("metro_dar_voice_lang", activeLang);
      updateLangToggleUI();
      // If actively recording, commit text and restart recognition with the new language
      if (isRecording && recognition) {
        commitCurrentSessionText();
        try { recognition.stop(); } catch (err) {}
      }
    });
  }

  // Domain terms and punctuation post-processing
  function formatSpokenText(raw, lang, isInterim) {
    if (!raw) return "";
    let t = raw;

    // Spoken punctuation commands
    t = t.replace(/\b(full\s*stop|period)\b/gi, ".");
    t = t.replace(/\b(comma)\b/gi, ",");
    t = t.replace(/\b(question\s*mark)\b/gi, "?");
    t = t.replace(/\b(exclamation\s*mark|exclamation\s*point)\b/gi, "!");
    t = t.replace(/\b(colon)\b/gi, ":");
    t = t.replace(/\b(new\s*line|next\s*line)\b/gi, "\n");

    // Real estate and construction portal terminology
    t = t.replace(/\b(d\s*a\s*r|the\s*a\s*r)\b/gi, "DAR");
    t = t.replace(/\b(m\s*d\s*a\s*r)\b/gi, "MDAR");
    t = t.replace(/\b(b\s*o\s*q|be\s*okay)\b/gi, "BOQ");
    t = t.replace(/\b(p\s*o)\b/gi, "PO");
    t = t.replace(/\b(r\s*e\s*r\s*a)\b/gi, "RERA");
    t = t.replace(/\b(m\s*k\s*c)\b/gi, "MKC");
    t = t.replace(/\b(r\s*c\s*c)\b/gi, "RCC");
    t = t.replace(/\b(p\s*c\s*c)\b/gi, "PCC");
    t = t.replace(/\b(m\s*o\s*m)\b/gi, "MOM");
    t = t.replace(/\b(square\s*feet|sq\s*ft|sqft)\b/gi, "sq.ft");
    t = t.replace(/\b(square\s*meter|square\s*meters|sq\s*m|sqm)\b/gi, "sq.m");

    // Clean up punctuation spacing
    t = t.replace(/\s+([.,!?:])/g, "$1");
    t = t.replace(/([.,!?:])([^\s0-9\n])/g, "$1 $2");

    // Deduplicate immediate accidental duplicate words emitted by mobile audio stutter
    t = t.replace(/\b([a-zA-Z]{2,})\s+\1\b/gi, "$1");

    // Capitalize sentence beginnings
    t = t.replace(/(^\s*|[.!?\n]\s+)([a-z])/g, (m, p1, p2) => p1 + p2.toUpperCase());

    return t;
  }

  function cleanJoin(base, addition) {
    const b = (base || "").trim();
    const a = (addition || "").trim();
    if (!b) return a;
    if (!a) return b;
    if (b.endsWith("\n")) return b + a;
    if (/^[.,!?:;]/.test(a)) return b + a;
    return b + " " + a;
  }

  function commitCurrentSessionText() {
    if (!sessionFinalText && !sessionInterimText) return;
    const finalClean = formatSpokenText(sessionFinalText, activeLang);
    const interimClean = formatSpokenText(sessionInterimText, activeLang, true);
    const combinedSession = cleanJoin(finalClean, interimClean);
    if (combinedSession) {
      baseTextAtStart = cleanJoin(baseTextAtStart, combinedSession);
    }
    sessionFinalText = "";
    sessionInterimText = "";
  }

  function applyTextToInputs(text) {
    const safeText = (text || "").slice(0, 600);
    const pointDesk = document.getElementById("pointInput");
    const pointMob = document.getElementById("mobilePointInput");

    if (pointDesk && pointDesk.value !== safeText) {
      pointDesk.value = safeText;
    }
    if (pointMob && pointMob.value !== safeText) {
      pointMob.value = safeText;
    }

    const charCount = document.getElementById("pointCharCount");
    if (charCount) charCount.textContent = `${safeText.length} / 600`;

    updateDarTypingState();

    // Debounce draft save (800ms) to keep UI thread fast and audio buffer clear
    clearTimeout(draftSaveDebounceTimer);
    draftSaveDebounceTimer = setTimeout(() => {
      const user = activeUser();
      if (user) saveCurrentDraftFromInputs(user);
    }, 800);
  }

  function stopRecognition() {
    isRecording = false;
    clearTimeout(restartTimeout);

    if (recognition) {
      try { recognition.stop(); } catch (e) {}
    }

    // Tactile confirmation on mobile
    if (navigator.vibrate) {
      try { navigator.vibrate([25, 40, 25]); } catch (e) {}
    }

    // Visual indicators off
    voiceBtn.classList.remove("is-recording");
    voiceBtn.setAttribute("title", "Click to speak (Real-time voice-to-text dictation)");
    if (equalizerEl) {
      equalizerEl.classList.remove("active");
      equalizerEl.classList.add("hidden");
    }
    const pointInput = document.getElementById("pointInput");
    if (pointInput) {
      pointInput.classList.remove("is-voice-listening");
    }

    // Commit any in-flight speech cleanly
    commitCurrentSessionText();
    applyTextToInputs(baseTextAtStart);

    // Save final draft immediately
    clearTimeout(draftSaveDebounceTimer);
    const user = activeUser();
    if (user) saveCurrentDraftFromInputs(user);
  }

  function startRecognition() {
    if (!SpeechRecognition) {
      showToast("Voice Recognition Unavailable", "Web Speech API is not supported in this browser. Please open in Google Chrome, Microsoft Edge, or Safari.");
      return;
    }

    if (window.location.protocol === "file:") {
      showToast("Local Server Required", "Browser security blocks microphone speech recognition on file:/// URLs. Please open via Live Server or http://localhost.");
    }

    const pointInput = document.getElementById("pointInput") || document.getElementById("mobilePointInput");
    baseTextAtStart = pointInput ? pointInput.value.trim() : "";
    sessionFinalText = "";
    sessionInterimText = "";

    try {
      recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.lang = activeLang;

      recognition.onstart = () => {
        isRecording = true;
        // Tactile vibration on touch (mobile)
        if (navigator.vibrate) {
          try { navigator.vibrate(45); } catch (e) {}
        }
        // Visual indicator on microphone and textarea (No popup toast per user request!)
        voiceBtn.classList.add("is-recording");
        voiceBtn.setAttribute("title", "Listening attentively... Click to stop dictation");
        if (equalizerEl) {
          equalizerEl.classList.remove("hidden");
          equalizerEl.classList.add("active");
        }
        if (pointInput) {
          pointInput.classList.add("is-voice-listening");
        }
      };

      recognition.onresult = (event) => {
        let curFinal = "";
        let curInterim = "";

        // Iterate the entire result list of the current recognition session
        // This is mathematically immune to the Android Chrome resultIndex reset / duplicate bug
        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i];
          if (!res || !res[0]) continue;
          const phrase = (res[0].transcript || "").trim();
          if (!phrase) continue;

          if (res.isFinal) {
            curFinal += (curFinal ? " " : "") + phrase;
          } else {
            curInterim += (curInterim ? " " : "") + phrase;
          }
        }

        sessionFinalText = curFinal;
        sessionInterimText = curInterim;

        const formattedFinal = formatSpokenText(sessionFinalText, activeLang);
        const formattedInterim = formatSpokenText(sessionInterimText, activeLang, true);

        let liveText = baseTextAtStart;
        if (formattedFinal) {
          liveText = cleanJoin(liveText, formattedFinal);
        }
        if (formattedInterim) {
          liveText = cleanJoin(liveText, formattedInterim);
        }

        applyTextToInputs(liveText);
      };

      recognition.onerror = (event) => {
        console.warn("Speech recognition error:", event.error);
        if (event.error === "no-speech" || event.error === "aborted") {
          // Normal pauses or browser restart; do not alert or stop
          return;
        }
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          showToast("Microphone Blocked", "Microphone access denied. Please allow microphone permissions in your browser address bar.");
          stopRecognition();
        } else if (event.error === "network") {
          showToast("Speech Network", "Speech recognition service unreachable. If running on file://, please run via http://localhost or Live Server.");
          stopRecognition();
        } else {
          stopRecognition();
        }
      };

      recognition.onend = () => {
        // Mobile browsers frequently stop continuous speech on short silence breaks
        if (isRecording) {
          // Commit finalized session text into baseTextAtStart
          commitCurrentSessionText();

          // Seamless auto-restart
          clearTimeout(restartTimeout);
          restartTimeout = setTimeout(() => {
            if (isRecording) {
              try {
                recognition.start();
              } catch (e) {
                // Micro-retry if browser needs brief moment
                setTimeout(() => {
                  if (isRecording) {
                    try { recognition.start(); } catch (err) { stopRecognition(); }
                  }
                }, 200);
              }
            }
          }, 100);
        } else {
          stopRecognition();
        }
      };

      recognition.start();
    } catch (err) {
      console.error("Failed to start speech recognition:", err);
      showToast("Speech Error", "Could not start voice recognition: " + err.message);
      stopRecognition();
    }
  }

  voiceBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isRecording) {
      stopRecognition();
    } else {
      startRecognition();
    }
  });
}

function isDarDraftFieldActive(){
  const active=document.activeElement;
  return active instanceof HTMLElement && Boolean(active.closest("#darForm") || active.closest("#mobileDarForm"));
}
async function fileToData(file){
  return new Promise(resolve=>{
    if(!file){resolve({name:"",data:"",size:""});return;}
    const reader=new FileReader();
    reader.onload=()=>resolve({name:file.name,data:String(reader.result||""),size:`${Math.max(1,Math.round(file.size/1024))} KB`});
    reader.onerror=()=>resolve({name:file.name,data:"",size:`${Math.max(1,Math.round(file.size/1024))} KB`});
    reader.readAsDataURL(file);
  });
}
async function submitDar(user){
  const feedback=document.getElementById("darFeedback");
  const draft=getDraft(user);
  draft.date=activeDarDate(document.getElementById("darDate")?.value||today());
  const nowH1 = new Date().getHours();
  const nowM1 = new Date().getMinutes();
  if (draft.date === today() && (nowH1 > 22 || (nowH1 === 22 && nowM1 >= 30))) {
    if(feedback)feedback.textContent="Manual submission for today's DAR is not accepted after 10:30 PM. It will be auto-submitted at 11:00 PM.";
    return;
  }
  draft.type=document.getElementById("darType")?.value||"internal";
  renumberDraftPoints(draft);
  saveDraft(user,draft);
  if(!draft.points.length){if(feedback)feedback.textContent="Add at least one DAR point before submitting.";return;}
  const { result, appendResult } = await cloudAppendPointsToReport(user, draft.date, draft.type, "", draft.points);
  
  if(appendResult&&appendResult.addedCount===0){
    if(feedback)feedback.textContent="No new draft points found to add. Existing submitted points cannot be edited.";
    return;
  }
  if(!result.ok){
    if(feedback)feedback.textContent=`DAR could not sync to the cloud: ${result.error?.message||"Unknown error"}.`;
    return;
  }
  editingDraftPointId="";
  await clearDraft(user);latestSidebarDraftPointId="";
  notifySubmissionReviewers(user,`${user.name} ${appendResult?"added new DAR points":"submitted DAR"} for ${draft.date}.`,{kind:"submission",title:appendResult?"DAR Updated":"DAR Submitted",reportId:result.report.id,actorName:user.name});
  showToast(appendResult?"DAR Updated":"DAR Submitted",appendResult?`${appendResult.addedCount} new point(s) added to today's DAR.`:"Your report has been saved to the cloud.");
  await refreshAllCloudData();
  syncDarFormFromDraft(user);renderPortal();
}

async function submitMobileDar(user){
  const feedback=document.getElementById("mobileDarFeedback")||document.getElementById("darFeedback");
  const draft=getDraft(user);
  const date=activeDarDate(document.getElementById("mobileDarDate")?.value||today());
  const nowH2 = new Date().getHours();
  const nowM2 = new Date().getMinutes();
  if (date === today() && (nowH2 > 22 || (nowH2 === 22 && nowM2 >= 30))) {
    if(feedback)feedback.textContent="Manual submission for today's DAR is not accepted after 10:30 PM. It will be auto-submitted at 11:00 PM.";
    return;
  }
  const type=document.getElementById("mobileDarType")?.value||"internal";
  const location=String(document.getElementById("mobileDarLocation")?.value||"").trim();
  if(!date||!type||!location){
    if(feedback)feedback.textContent="Choose a date, DAR type, and location before submitting.";
    return;
  }
  draft.mobileDate=date;
  draft.mobileType=type;
  draft.mobileLocation=location;
  draft.date=date;
  draft.type=type;
  draft.location=location;
  renumberDraftPoints(draft);
  saveDraft(user,draft);
  const summaryPoint={
    id:`PT-${Date.now()}-1`,
    text:`1. ${location}`,
    rawText:location,
    totalTime:"0m",
    attachmentName:"",
    attachmentData:"",
    attachmentSize:"",
    createdAt:nowIso()
  };
  const { result, appendResult } = await cloudAppendPointsToReport(user, date, type, location, [summaryPoint]);
  
  if(appendResult&&appendResult.addedCount===0){
    if(feedback)feedback.textContent="No new draft point found to add. Existing submitted points cannot be edited.";
    return;
  }
  if(!result.ok){
    if(feedback)feedback.textContent=`DAR could not sync to the cloud: ${result.error?.message||"Unknown error"}.`;
    return;
  }
  editingDraftPointId="";
  editingDraftPointId="";
  await clearDraft(user);latestSidebarDraftPointId="";
  notifySubmissionReviewers(user,`${user.name} ${appendResult?"added a new DAR point":"submitted DAR"} for ${date}.`,{kind:"submission",title:appendResult?"DAR Updated":"DAR Submitted",reportId:result.report.id,actorName:user.name});
  showToast(appendResult?"DAR Updated":"DAR Submitted",appendResult?"New point added to today's DAR.":"Your report has been saved to the cloud.");
  await refreshAllCloudData();
  syncDarFormFromDraft(user);
  renderPortal();
}
function renderDar(user){
  const switcher=document.getElementById("darModeSwitcher");const selfView=document.getElementById("darSelfView");const teamView=document.getElementById("darTeamView");const selfBtn=document.getElementById("darModeSelfButton");const teamBtn=document.getElementById("darModeTeamButton");
  const showTeamToggle=isAdmin(user) || isLevel1(user);
  if(switcher){
    if(showTeamToggle){ switcher.classList.remove("hidden"); switcher.style.display=""; }
    else { switcher.classList.add("hidden"); switcher.style.display="none"; }
  }
  const mobileView=document.getElementById("darMobileView");
  if(mobileView)mobileView.classList.add("hidden");
  if(selfView)selfView.classList.toggle("hidden",showTeamToggle&&darViewMode==="team");
  if(teamView)teamView.classList.toggle("hidden",!showTeamToggle||darViewMode!=="team");
  if(selfBtn)selfBtn.classList.toggle("active-mode",!showTeamToggle||darViewMode==="self");
  if(teamBtn)teamBtn.classList.toggle("active-mode",showTeamToggle&&darViewMode==="team");
  syncDarFormFromDraft(user);if(showTeamToggle)renderTeamReports(user,"embeddedTeamReportsList");
}

// ─── Issues ───────────────────────────────────────────────────
function renderIssueForm(){ const fb=document.getElementById("issueFeedback");if(fb)fb.textContent="Issues raised here go directly to Admin."; }
function renderAdminIssues(){
  const list=document.getElementById("adminIssueList");if(!list)return;
  const items=issues().sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  if(!items.length){list.className="stack-list empty-state";list.textContent="No issues reported yet.";return;}
  list.className="stack-list";
  list.innerHTML=items.map(issue=>{const raiser=findUser(issue.raisedBy);return`<article class="report-card"><header><div><strong>${escapeHtml(issue.title)}</strong><p>${escapeHtml(raiser?.name||issue.raisedBy)} | ${escapeHtml(issue.raisedBy)}</p></div><span class="status-pill">${escapeHtml(formatDateTime(issue.createdAt))}</span></header><p>${escapeHtml(issue.description)}</p></article>`;}).join("");
}

// ─── User management ──────────────────────────────────────────
function toggleManagerField(){
  const level=document.getElementById("createLevel")?.value||"3";const field=document.getElementById("createManagerField");const input=document.getElementById("createManagerId");const hint=document.getElementById("createManagerHint");
  if(!field||!input)return;
  const isManagerOptional=level==="admin"||level==="1";
  input.required=!isManagerOptional;input.disabled=isManagerOptional;
  if(isManagerOptional){input.value="";input.placeholder="Not required for this role";field.classList.add("manager-field-disabled");if(hint)hint.textContent="Level 1 and Admin do not require a reporting manager.";}
  else if(level==="2"){input.placeholder="Select Level 1 Employee ID";field.classList.remove("manager-field-disabled");if(hint)hint.textContent="Mandatory: Level 2 must report to a Level 1 manager.";}
  else{input.placeholder="Select Level 1 or 2 Employee ID";field.classList.remove("manager-field-disabled");if(hint)hint.textContent="Mandatory: Level 3 must report to a Level 1 or Level 2 manager.";}
}
function renderDeletedUsers(){
  const list=document.getElementById("deletedUserList");if(!list)return;
  const items=deletedUsers();
  if(!items.length){list.className="stack-list empty-state";list.textContent="No deleted employees yet.";return;}
  list.className="stack-list";
  list.innerHTML=items.map(item=>`<article class="assignment-card"><header><strong>${escapeHtml(item.name)}</strong><span class="status-pill">${escapeHtml(item.employeeId)}</span></header><p>${escapeHtml(ROLE_LABELS[item.level]||item.level)} | ${escapeHtml(item.department)}</p><p>Deleted by ${escapeHtml(item.deletedBy)} on ${escapeHtml(formatDateTime(item.deletedAt))}</p><p>Reason: ${escapeHtml(item.reason||"--")}</p></article>`).join("");
}
function renderHolidayManagement(){
  const list=document.getElementById("holidayList");if(!list)return;
  const customDates=new Set(customHolidays().map(item=>item.date));
  const items=holidays();
  if(!items.length){list.className="stack-list empty-state";list.textContent="No holidays available.";return;}
  list.className="stack-list holiday-admin-list";
  list.innerHTML=items.map(item=>`<article class="assignment-card holiday-admin-card"><header><div><strong>${escapeHtml(item.name)}</strong><p>${escapeHtml(formatDate(item.date))} | ${escapeHtml(item.day||holidayDayName(item.date))}</p></div><span class="status-pill">${customDates.has(item.date)?"Admin":"Default"}</span></header>${customDates.has(item.date)?`<div class="action-row"><button type="button" class="compact-button action-reject" data-delete-holiday="${escapeHtml(item.date)}">Remove</button></div>`:""}</article>`).join("");
  list.querySelectorAll("[data-delete-holiday]").forEach(btn=>btn.addEventListener("click",async()=>{await cloudDeleteHoliday(btn.getAttribute("data-delete-holiday")||"");showToast("Holiday Removed","The custom holiday override was removed.");renderPortal();}));
}
function renderAdminUsers(){
  const list=document.getElementById("adminUserList");if(!list)return;
  const adminUser=activeUser();const activeUsers=users().sort((a,b)=>a.name.localeCompare(b.name));
  
  // Group by department
  const depts = {};
  for (const u of activeUsers) {
    const d = u.department || "Unassigned";
    if (!depts[d]) depts[d] = [];
    depts[d].push(u);
  }
  
  const allEntities = typeof entities === 'function' ? entities() : [];
  
  let html = `
    <div class="bulk-delete-toolbar"><label class="bulk-select-all-label"><input type="checkbox" id="selectAllUsers"> Select All</label><button type="button" class="compact-button action-reject" id="bulkDeleteButton" disabled>Delete Selected</button></div>
  `;
  
  for (const [deptName, deptUsers] of Object.entries(depts).sort((a,b)=>a[0].localeCompare(b[0]))) {
    html += `
    <div class="panel-inline" style="margin-bottom: 24px;">
      <h3 style="margin-bottom: 12px; border-bottom: 1px solid var(--line); padding-bottom: 4px;">Department: ${escapeHtml(deptName)}</h3>
      <div class="admin-user-table-wrap"><table class="credential-table">
        <thead><tr><th style="width:36px"></th><th>Employee ID</th><th>Name</th><th>Entity Name</th><th>Department</th><th>Role</th><th>Work Location</th><th>Work E-Mail</th><th>Official Mobile</th><th>Personal Num</th><th>Operational Manager Name</th><th>Level</th><th>Action</th></tr></thead>
        <tbody>
    `;
    
    html += deptUsers.map((u,idx)=>{
      const editing=editingAdminUserId===u.employeeId;
      if(editing){
        const entityOpts = `<option value="">-- No Entity --</option>` + allEntities.map(e => `<option value="${escapeHtml(e.name)}" ${u.entity===e.name?"selected":""}>${escapeHtml(e.name)}</option>`).join("");
        
        // Departments Multiselect
        const allDepts = Array.from(new Set(users().map(x=>x.department).filter(Boolean)));
        let deptsHtml = `<select class="admin-inline-input" multiple size="3" data-edit-field="taggedDepartments">
          <option value="All Departments" ${(u.taggedDepartments||"").includes("All Departments")?"selected":""}>All Departments</option>
          ${allDepts.map(d => `<option value="${escapeHtml(d)}" ${(u.taggedDepartments||"").includes(d)?"selected":""}>${escapeHtml(d)}</option>`).join("")}
        </select>`;

        // Entities Multiselect
        let entsHtml = `<select class="admin-inline-input" multiple size="3" data-edit-field="taggedEntities">
          <option value="All Entities" ${(u.taggedEntities||"").includes("All Entities")?"selected":""}>All Entities</option>
          ${allEntities.map(e => `<option value="${escapeHtml(e.name)}" ${(u.taggedEntities||"").includes(e.name)?"selected":""}>${escapeHtml(e.name)}</option>`).join("")}
        </select>`;

        let tagsHtml = "";
        let managerHtml = `<input class="admin-inline-input" data-edit-field="managerId" list="userSearchList" value="${escapeHtml(u.managerId||"")}" placeholder="Manager ID">`;
        if (u.level === "1" || u.level === "2") {
          if (u.level === "1") {
            managerHtml = `<input type="hidden" data-edit-field="managerId" value="">-`;
          }
          tagsHtml = `<br><span>Tagged Depts:</span><br>${deptsHtml}<br><span>Tagged Entities:</span><br>${entsHtml}`;
        }
        
        return `<tr class="admin-user-edit-row ${idx%2===0?"":"cred-row-alt"}" data-editing-user="${escapeHtml(u.employeeId)}">
          <td></td>
          <td><input class="admin-inline-input" data-edit-field="employeeId" value="${escapeHtml(u.employeeId)}"></td>
          <td><input class="admin-inline-input" data-edit-field="name" value="${escapeHtml(u.name)}"></td>
          <td><select class="admin-inline-input" data-edit-field="entity">${entityOpts}</select>${tagsHtml}</td>
          <td><input class="admin-inline-input" data-edit-field="department" value="${escapeHtml(u.department)}" placeholder="Department"></td>
          <td><input class="admin-inline-input" data-edit-field="role" value="${escapeHtml(u.role||"")}" placeholder="Software Engineer"></td>
          <td><input class="admin-inline-input" data-edit-field="workLocation" value="${escapeHtml(u.location||"")}" placeholder="HQ"></td>
          <td><input class="admin-inline-input" data-edit-field="email" type="email" value="${escapeHtml(u.email||"")}" placeholder="name@company.com"></td>
          <td><input class="admin-inline-input" data-edit-field="officialPhone" value="${escapeHtml(u.officialPhone||"")}" placeholder="Official Phone"></td>
          <td><input class="admin-inline-input" data-edit-field="personalPhone" value="${escapeHtml(u.personalPhone||"")}" placeholder="Personal Phone"></td>
          <td>${managerHtml}</td>
          <td><select class="admin-inline-input" data-edit-field="level">${["admin","1","2","3"].map(level=>`<option value="${level}" ${u.level===level?"selected":""}>${escapeHtml(ROLE_LABELS[level]||level)}</option>`).join("")}</select></td>
          <td><div class="action-row"><button type="button" class="compact-button action-approve" data-save-user="${escapeHtml(u.employeeId)}">Save</button><button type="button" class="compact-button" data-cancel-user-edit>Cancel</button></div></td>
        </tr>`;
      }
      
      let tagDisplay = escapeHtml(u.entity||"-");
      if (u.level === "1" || u.level === "2") {
         const dTags = u.taggedDepartments ? `Depts: ${u.taggedDepartments}` : "";
         const eTags = u.taggedEntities ? `Ents: ${u.taggedEntities}` : "";
         if(dTags||eTags) {
            tagDisplay += `<br><span style="font-size:0.8rem;color:var(--text-muted)">${escapeHtml(dTags)}<br>${escapeHtml(eTags)}</span>`;
         }
      }
      
      const statusPill = u.isActive === false 
        ? `<span class="status-pill" style="background-color: #ffeef0; color: #ff3b30; border: 1px solid #ffccd0; margin-left: 6px; font-size: 0.75rem; padding: 2px 6px; border-radius: 4px; font-weight: bold; display: inline-block; white-space: nowrap;">Inactive</span>`
        : "";
        
      const toggleActiveBtn = u.employeeId !== adminUser?.employeeId
        ? (u.isActive === false
           ? `<button type="button" class="compact-button action-approve" data-toggle-active="${escapeHtml(u.employeeId)}" data-status="activate">Activate</button>`
           : `<button type="button" class="compact-button action-reject" data-toggle-active="${escapeHtml(u.employeeId)}" data-status="deactivate" style="background-color: #f39c12; border-color: #e67e22; color: white;">Deactivate</button>`
          )
        : "";

      return `<tr class="${idx%2===0?"":"cred-row-alt"}">
        <td>${u.employeeId!==adminUser?.employeeId?`<input type="checkbox" class="user-select-cb" data-id="${escapeHtml(u.employeeId)}">`:`<span title="Cannot delete own account">-</span>`}</td>
        <td>${escapeHtml(u.employeeId)}</td>
        <td><button type="button" class="profile-link" data-open-profile="${escapeHtml(u.employeeId)}">${escapeHtml(u.name)}</button>${statusPill}</td>
        <td>${tagDisplay}</td>
        <td>${escapeHtml(u.department||"-")}</td>
        <td>${escapeHtml(u.role||"-")}</td>
        <td>${escapeHtml(u.location||"-")}</td>
        <td>${escapeHtml(u.email||"-")}</td>
        <td>${escapeHtml(u.officialPhone||"-")}</td>
        <td>${escapeHtml(u.personalPhone||"-")}</td>
        <td>${u.level === "1" ? "-" : escapeHtml(u.managerName||"-")}</td>
        <td>${escapeHtml(ROLE_LABELS[u.level]||u.level)}</td>
        <td><div class="action-row"><button type="button" class="compact-button" data-edit-user="${escapeHtml(u.employeeId)}">Edit</button>${toggleActiveBtn}${u.employeeId!==adminUser?.employeeId?`<button type="button" class="compact-button action-reject" data-delete-user="${escapeHtml(u.employeeId)}">Delete</button>`:`<span class="helper-text">You</span>`}</div></td>
      </tr>`;
    }).join("");
    
    html += `</tbody></table></div></div>`;
  }
  
  list.innerHTML = html;
  
  const selectAll=list.querySelector("#selectAllUsers");const bulkBtn=list.querySelector("#bulkDeleteButton");
  const updateBulkBtn=()=>{const checked=list.querySelectorAll(".user-select-cb:checked").length;if(bulkBtn)bulkBtn.disabled=checked===0;};
  selectAll?.addEventListener("change",()=>{list.querySelectorAll(".user-select-cb").forEach(cb=>cb.checked=selectAll.checked);updateBulkBtn();});
  list.querySelectorAll(".user-select-cb").forEach(cb=>cb.addEventListener("change",updateBulkBtn));
  bulkBtn?.addEventListener("click",async()=>{
    const ids=[...list.querySelectorAll(".user-select-cb:checked")].map(cb=>cb.getAttribute("data-id"));if(!ids.length)return;
    const names=ids.map(id=>findUser(id)?.name||id).join(", ");const confirmed=window.confirm(`Delete ${ids.length} employee(s)?\n\n${names}`);if(!confirmed)return;
    const reason=window.prompt("Enter reason for bulk deletion:");if(!reason||!reason.trim()){window.alert("Reason is required.");return;}
    let removed=0;
    for(const id of ids){if(findUser(id)&&await cloudDeleteUser(id,adminUser.employeeId,reason.trim()))removed++;}
    if(removed){showToast("Bulk Delete",`${removed} employee(s) removed successfully.`);await refreshAllCloudData();renderPortal();}
  });
  list.querySelectorAll("[data-open-profile]").forEach(btn=>btn.addEventListener("click",()=>openProfile(btn.getAttribute("data-open-profile"))));
  list.querySelectorAll("[data-edit-user]").forEach(btn=>btn.addEventListener("click",()=>{editingAdminUserId=btn.getAttribute("data-edit-user")||"";renderUserManagement();}));
  list.querySelectorAll("[data-cancel-user-edit]").forEach(btn=>btn.addEventListener("click",()=>{editingAdminUserId="";renderUserManagement();}));
  list.querySelectorAll("[data-toggle-active]").forEach(btn => btn.addEventListener("click", async () => {
    const empId = btn.getAttribute("data-toggle-active");
    const action = btn.getAttribute("data-status");
    const user = findUser(empId);
    if (!user) return;
    const confirmed = window.confirm(`Are you sure you want to ${action} user "${user.name}" (ID: ${user.employeeId})?`);
    if (!confirmed) return;
    
    user.isActive = (action === "activate");
    try {
      const saved = await cloudSaveUser(user);
      if (saved) {
        showToast("User Status Updated", `User ${user.name} is now ${user.isActive ? 'Active' : 'Deactivated'}.`);
        await refreshAllCloudData();
        renderPortal();
      } else {
        window.alert("Failed to update user status.");
      }
    } catch(err) {
      console.error("Error toggling active status:", err);
      window.alert("Error updating user status: " + err.message);
    }
  }));
  list.querySelectorAll("[data-save-user]").forEach(btn=>btn.addEventListener("click",async()=>{
    const originalId=btn.getAttribute("data-save-user")||"";const row=list.querySelector("[data-editing-user]");if(!row)return;
    const get = field => {
      const el = row.querySelector(`[data-edit-field="${field}"]`);
      if (!el) return "";
      if (el.tagName === 'SELECT' && el.multiple) {
        return Array.from(el.selectedOptions).map(o => o.value).join(", ");
      }
      return String(el.value || "").trim();
    };
    const level=get("level");const employeeId=normalizeEmployeeId(get("employeeId"));const managerId=normalizeEmployeeId(get("managerId"));
    if(!employeeId||!get("name")||!get("department")){window.alert("Name, Employee ID, and Department are required.");return;}
    if((level==="2"||level==="3")&&!managerId){window.alert("Select a valid reporting manager.");return;}
    const manager=managerId?findUser(managerId):null;


    const result=await cloudUpdateUserProfile(originalId,{employeeId,name:get("name"),level,department:get("department"),email:get("email"),managerId,entity:get("entity"),taggedDepartments:get("taggedDepartments"),taggedEntities:get("taggedEntities"),role:get("role"),location:get("workLocation"),officialPhone:get("officialPhone"),personalPhone:get("personalPhone")});
    if(!result.ok){window.alert(`Could not update user: ${result.error?.message||"Unknown error"}`);return;}
    editingAdminUserId="";showToast("User Updated",`${employeeId} was updated.`);await refreshAllCloudData();renderPortal();
  }));
  list.querySelectorAll("[data-delete-user]").forEach(btn => btn.addEventListener("click", async () => {
    const id = btn.getAttribute("data-delete-user");
    const target = findUser(id);
    if (!target) return;
    
    const subordinates = users().filter(u => u.managerId === target.employeeId);
    let newManagerId = "";
    if (subordinates.length > 0) {
      const p = window.prompt(`This employee has ${subordinates.length} subordinate(s).\nTo reassign them, enter the Employee ID of the new manager.\nLeave blank to orphan them.`);
      if (p !== null && p.trim()) {
        const newManager = findUser(p.trim());
        if (!newManager) {
          window.alert("New manager not found. Deletion cancelled.");
          return;
        }
        const pLevel = target.level;
        const newLevel = newManager.level;
        let proceed = true;
        if (pLevel === "2" && newLevel !== "1") {
           proceed = window.confirm("Warning: A Level 2 employee should normally report to a Level 1. Continue?");
           if(!proceed) return;
        }
        if (pLevel === "3" && newLevel !== "1" && newLevel !== "2") {
           proceed = window.confirm("Warning: A Level 3 employee should normally report to a Level 1 or 2. Continue?");
           if(!proceed) return;
        }
        newManagerId = newManager.employeeId;
      } else if (p === null) {
        return; // Cancelled
      }
    }

    const confirmed = window.confirm(`Delete employee ${target.employeeId}?`);
    if (!confirmed) return;
    const reason = window.prompt("Enter reason for deletion:");
    if (!reason || !reason.trim()) {
      window.alert("Reason is required.");
      return;
    }

    if (subordinates.length > 0) {
      for (const sub of subordinates) {
        await cloudUpdateUserProfile(sub.employeeId, { ...sub, managerId: newManagerId });
      }
    }

    const removed = await cloudDeleteUser(id, adminUser.employeeId, reason.trim());
    if (!removed) {
      window.alert("Could not delete this employee in Supabase. Check the console for details.");
      return;
    }
    showToast("User Deleted", `${target.name} was removed.`);
    await refreshAllCloudData();
    renderPortal();
  }));
}
function renderAdminCredentials(){
  const container=document.getElementById("adminCredentialList");if(!container)return;
  const LEVEL_TABS=[{key:"all",label:"All"},{key:"admin",label:"Admin"},{key:"1",label:"Level 1"},{key:"2",label:"Level 2"},{key:"3",label:"Level 3"}];
  const allUsers=users().sort((a,b)=>{const lo=({admin:0,"1":1,"2":2,"3":3}[a.level]??9)-({admin:0,"1":1,"2":2,"3":3}[b.level]??9);return lo!==0?lo:a.name.localeCompare(b.name);});
  const filtered=credentialLevelFilter==="all"?allUsers:allUsers.filter(u=>u.level===credentialLevelFilter);
  container.innerHTML=`<div class="cred-filter-bar">${LEVEL_TABS.map(t=>`<button type="button" class="compact-button cred-tab ${credentialLevelFilter===t.key?"active-mode":""}" data-cred-level="${escapeHtml(t.key)}">${escapeHtml(t.label)}</button>`).join("")}</div><div class="cred-table-wrap table-wrap"><table class="credential-table"><thead><tr><th>#</th><th>Name</th><th>Employee ID</th><th>Role</th><th>Department</th><th>Password</th></tr></thead><tbody>${filtered.map((u,idx)=>`<tr class="${idx%2===0?"":"cred-row-alt"}"><td class="cred-num">${idx+1}</td><td>${escapeHtml(u.name)}</td><td class="cred-id">${escapeHtml(u.employeeId)}</td><td><span class="cred-level-badge cred-level-${escapeHtml(u.level)}">${escapeHtml(ROLE_LABELS[u.level]||u.level)}</span></td><td>${escapeHtml(u.department)}</td><td class="cred-pass">${escapeHtml(u.password||"—")}</td></tr>`).join("")}</tbody></table>${filtered.length===0?'<p class="empty-state" style="padding:16px">No employees in this level.</p>':""}</div>`;
  container.querySelectorAll("[data-cred-level]").forEach(btn=>btn.addEventListener("click",()=>{credentialLevelFilter=btn.getAttribute("data-cred-level")||"all";renderAdminCredentials();}));
}
function renderEntities() {
  const list = document.getElementById("entityList");
  if (!list) return;
  const all = typeof entities === 'function' ? entities() : [];
  if (!all.length) {
    list.className = "stack-list empty-state";
    list.innerHTML = "No entities available.";
  } else {
    list.className = "stack-list";
    list.className = "stack-list";
    list.innerHTML = all.map(e => {
      const isEditing = editingEntityId === e.id;
      if (isEditing) {
        return `<article class="assignment-card" data-editing-entity="${escapeHtml(e.id)}">
          <div style="display:flex; gap:8px; align-items:center;">
             <input type="text" class="admin-inline-input" data-edit-entity-name value="${escapeHtml(e.name)}" style="flex:1;">
             <button type="button" class="compact-button action-approve" data-save-entity="${escapeHtml(e.id)}">Save</button>
             <button type="button" class="compact-button" data-cancel-entity>Cancel</button>
          </div>
        </article>`;
      }
      return `<article class="assignment-card">
        <header style="display:flex; justify-content:space-between; align-items:center; width:100%;">
           <strong>${escapeHtml(e.name)}</strong>
           <button type="button" class="compact-button" data-edit-entity="${escapeHtml(e.id)}">Edit</button>
   <button type="button" class="compact-button" style="color:var(--maroon);" data-delete-entity="${escapeHtml(e.id)}" data-entity-name="${escapeHtml(e.name)}"><i class="fa-solid fa-trash"></i></button>
        </header>
      </article>`;
    }).join("");
    
    
    list.querySelectorAll("[data-delete-entity]").forEach(btn => btn.addEventListener("click", async () => {
       const id = btn.getAttribute("data-delete-entity");
       const name = btn.getAttribute("data-entity-name");
       if(confirm('Are you sure you want to delete the entity "' + name + '"? All employees under this entity will become entity-less.')) {
           await cloudDeleteEntity(id);
           await refreshAllCloudData();
           renderPortal();
           showToast("Entity Deleted", "Entity and its associations removed safely.");
       }
    }));

    list.querySelectorAll("[data-edit-entity]").forEach(btn => btn.addEventListener("click", () => {
       editingEntityId = btn.getAttribute("data-edit-entity");
       renderEntities();
    }));
    
    list.querySelectorAll("[data-cancel-entity]").forEach(btn => btn.addEventListener("click", () => {
       editingEntityId = "";
       renderEntities();
    }));
    
    list.querySelectorAll("[data-save-entity]").forEach(btn => btn.addEventListener("click", async () => {
       const id = btn.getAttribute("data-save-entity");
       const row = list.querySelector(`[data-editing-entity="${id}"]`);
       if (!row) return;
       const nameInput = row.querySelector("[data-edit-entity-name]");
       const newName = nameInput.value.trim();
       if (!newName) { alert("Entity name cannot be empty."); return; }
       
       await cloudUpdateEntity(id, newName);
       editingEntityId = "";
       await refreshAllCloudData();
       renderPortal();
       showToast("Entity Updated", "The entity name has been updated successfully.");
    }));
  }
}
function renderUserManagement(){ renderHolidayManagement();renderAdminUsers();renderAdminCredentials();renderDeletedUsers();renderEntities();toggleManagerField(); }
function renderAdminCollapsibles(){
  document.querySelectorAll("[data-admin-toggle]").forEach(toggle=>{
    const key=toggle.getAttribute("data-admin-toggle")||"";
    const expanded=adminExpandedPanels.has(key);
    const panel=document.getElementById(`adminPanel-${key}`);
    toggle.setAttribute("aria-expanded",expanded?"true":"false");
    toggle.closest(".admin-collapsible")?.classList.toggle("is-open",expanded);
    panel?.classList.toggle("hidden",!expanded);
  });
}
function renderGlobalTaskForm(){
  const fb=document.getElementById("globalTaskFeedback");
  const user=activeUser();
  if(fb)fb.textContent=isLevel1(user)?"Level 1 can assign internal or project tasks to Level 2 and Level 3 employees.":"Tagged tasks appear instantly in the assignee's Assigned Tasks section.";
}

// ─── News ─────────────────────────────────────────────────────
function festivalForToday(){ const key=dateKey().slice(5);return FESTIVAL_EVENTS.find(e=>e.date===key)||null; }
function renderNews(user){
  const container=document.getElementById("metroDailyFeed");const banner=document.getElementById("festivalBanner");const ticker=document.getElementById("metroTicker");const adminPanel=document.getElementById("broadcastComposer");
  const currentFestival=festivalForToday();const items=announcementsForUser(user).slice(0,6);
  if(banner){if(currentFestival){banner.classList.remove("hidden");banner.innerHTML=`<div class="festival-banner-copy"><span class="section-tag">Metro Daily</span><h2>${escapeHtml(currentFestival.title)}</h2><p>${escapeHtml(currentFestival.message)}</p></div>`;}else{banner.classList.add("hidden");banner.innerHTML="";}}
  if(ticker){if(!items.length){ticker.className="metro-ticker empty-state";ticker.textContent="No broadcasts yet.";}else{ticker.className="metro-ticker";ticker.innerHTML=`<div class="metro-ticker-track">${items.concat(items).map(i=>`<article class="metro-ticker-item"><strong>${escapeHtml(i.title||"Broadcast")}</strong><span>${escapeHtml(i.message)}</span></article>`).join("")}</div>`;}}
  if(adminPanel)adminPanel.classList.toggle("hidden",!canPublishDailyUpdates(user));
  if(container){const latest=items.slice(0,3);container.innerHTML=latest.length?latest.map(i=>`<article class="assignment-card news-card"><header><strong>${escapeHtml(i.title||"Broadcast")}</strong><span class="status-pill">${escapeHtml(formatDateTime(i.createdAt))}</span></header><p>${escapeHtml(i.message)}</p><p class="helper-text">${escapeHtml(i.createdByName||"Metro Daily")}</p></article>`).join(""):'<div class="empty-state">Company updates will appear here.</div>';}
}

// ─── Notification routing ─────────────────────────────────────
function openReportFromNotification(reportId){
  const user=activeUser();const report=findReportById(reportId);if(!user||!report)return;
  if(report.employeeId===user.employeeId){
    selectedHistoryReportId=report.id;showSection("historySection");renderPortal();
    document.getElementById("historySection")?.scrollIntoView({behavior:"smooth",block:"start"});
    return;
  }
  if(isLevel2(user) && canUseCompliance(user)){
     const owner = findUser(report.employeeId);
     if (owner) {
       const vTaggedDepts = (user.taggedDepartments || "").split(",").map(s=>s.trim()).filter(Boolean);
       const vTaggedEntities = (user.taggedEntities || "").split(",").map(s=>s.trim()).filter(Boolean);
       const inDept = vTaggedDepts.includes(owner.department);
       const inEntity = owner.entity && vTaggedEntities.includes(owner.entity);
       if (inDept || inEntity) {
         selectedComplianceEmployeeId=report.employeeId;showSection("complianceSection");renderPortal();
         return;
       }
     }
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
}

// ─── Employee search helpers ──────────────────────────────────
function searchableEmployees(viewer,scope="profile"){
  const all=users().filter(u=>u.level!=="admin");
  if(scope==="profile" && viewer && !isAdmin(viewer)) {
     const vTaggedDepts = (viewer.taggedDepartments || "").split(",").map(s=>s.trim()).filter(Boolean);
     const vTaggedEntities = (viewer.taggedEntities || "").split(",").map(s=>s.trim()).filter(Boolean);
     if (vTaggedDepts.length > 0 || vTaggedEntities.length > 0) {
        return all.filter(u => {
          if (u.level === "1") return false;
          return vTaggedDepts.includes(u.department) || (u.entity && vTaggedEntities.includes(u.entity));
        });
     }
     if (isLevel2(viewer)) {
        return directSubordinates(viewer);
     }
  }
  if(scope==="history-level1") {
    return all.filter(u=>{
       if(u.level!=="2" && u.level!=="3") return false;
       const vTaggedDepts = (viewer.taggedDepartments || "").split(",").map(s=>s.trim()).filter(Boolean);
       const vTaggedEntities = (viewer.taggedEntities || "").split(",").map(s=>s.trim()).filter(Boolean);
       if (vTaggedDepts.length > 0 || vTaggedEntities.length > 0) {
          return vTaggedDepts.includes(u.department) || (u.entity && vTaggedEntities.includes(u.entity));
       }
       return true;
    });
  }
  if(scope==="task")return assignableTaskTargets(viewer);
  if(scope==="team")return viewer&&isLevel2(viewer)?directSubordinates(viewer):[];
  return all;
}
function employeeMatchesSearch(user,query){
  const search=String(query||"").trim().toLowerCase();if(!search)return true;
  return[user.name,user.employeeId,user.department,ROLE_LABELS[user.level]||user.level,user.managerName||""].some(v=>String(v||"").toLowerCase().includes(search));
}
function matchingEmployees(viewer,query,scope="profile"){ return searchableEmployees(viewer,scope).filter(u=>employeeMatchesSearch(u,query)); }
function parseEmployeeSelection(value,viewer=activeUser(),scope="profile"){
  const match=/\[([^\]]+)\]\s*$/.exec((value||"").trim());if(match)return match[1].toUpperCase();
  const id=String(value||"").trim().toUpperCase();const byId=searchableEmployees(viewer,scope).find(u=>u.employeeId===id);if(byId)return byId.employeeId;
  const search=String(value||"").trim().toLowerCase();if(!search)return"";
  const byExact=searchableEmployees(viewer,scope).find(u=>u.name.toLowerCase()===search);if(byExact)return byExact.employeeId;
  return matchingEmployees(viewer,search,scope)[0]?.employeeId||"";
}
function splitCsvLine(line){
  const text=String(line||"");
  const cells=[];let value="";let quoted=false;
  for(let i=0;i<text.length;i+=1){
    const char=text[i];
    if(char==='"'&&text[i+1]==='"'){value+='"';i+=1;continue;}
    if(char==='"'){quoted=!quoted;continue;}
    if(char===","&&!quoted){cells.push(value.trim());value="";continue;}
    value+=char;
  }
  cells.push(value.trim());
  return cells;
}
function parseTaskCsv(value){
  const lines=String(value||"").split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
  if(!lines.length)return [];
  const first=splitCsvLine(lines[0]).map(cell=>cell.toLowerCase().replace(/\s+/g,"_"));
  const hasHeader=first.includes("target_id")||first.includes("title");
  const headers=hasHeader?first:["target_id","title","notes","type","due_date"];
  return lines.slice(hasHeader?1:0).map(line=>{
    const cells=splitCsvLine(line);
    const row={};
    headers.forEach((header,index)=>{row[header]=cells[index]||"";});
    return {
      targetId:String(row.target_id||row.employee_id||row.target||"").trim().toUpperCase(),
      title:String(row.title||row.task||"").trim(),
      notes:String(row.notes||row.note||"").trim(),
      type:String(row.type||row.task_type||"internal").trim().toLowerCase(),
      dueDate:String(row.due_date||row.due||"").trim()
    };
  }).filter(row=>row.targetId||row.title);
}
async function assignTasksFromRows(rows,viewer,eligibleTargets,feedback){
  const eligibleById=new Map(eligibleTargets.map(user=>[user.employeeId,user]));
  let assigned=0;
  const skipped=[];
  for(const [index,row] of rows.entries()){
    const parsedTargetId=parseEmployeeSelection(row.targetId,viewer,"task");
    const target=eligibleById.get(parsedTargetId||row.targetId);
    const type=row.type==="project"?"project":"internal";
    if(!target||!row.title||!row.dueDate){
      skipped.push(index+1);
      continue;
    }
    await cloudAssignTask({id:`TSK-${Date.now()}-${index}`,targetId:target.employeeId,title:row.title,notes:row.notes,type,dueDate:row.dueDate,assignedBy:viewer.employeeId,createdAt:nowIso(),completed:false});
    addNotification(target.employeeId,`${viewer.name} assigned you a new task.`);
    assigned+=1;
  }
  const message=skipped.length?`Assigned ${assigned} task(s). Skipped CSV row(s): ${skipped.join(", ")}.`:`Assigned ${assigned} task(s) from CSV.`;
  if(feedback)feedback.textContent=message;
  return {assigned,skipped,message};
}

// ─── Master render ────────────────────────────────────────────
function renderPortal(){
  const user=activeUser();if(!user)return;
  fillDatalists(user);renderGhostTyping(user);renderSidebar(user);renderAnnouncementBell(user);renderPersonalProgressWidget(user);renderSubmissionHeatmap(user);
  renderNews(user);renderProfileSection(user);renderOverview(user);renderCompliance(user);
  renderEmailReminders(user);renderTasks(user);renderTeamReports(user);renderSubordinates(user);renderHistory(user);
  renderDar(user);renderAdminIssues();renderUserManagement();renderAdminCollapsibles();renderGlobalTaskForm();
  if(typeof renderLeaveSection === 'function') renderLeaveSection(user);
  if(canUseAnalytics(user)) renderWorkAnalytics(user);
}

// ─── Login / Logout ───────────────────────────────────────────
function loginPortal(employeeId,resolvedUser){
  activePortalUserId=String(employeeId).toUpperCase();_currentUserCache=resolvedUser;
  const existingLocal=users().find(u=>u.employeeId===activePortalUserId);
  if(!existingLocal&&resolvedUser)writeStore(STORAGE_KEYS.users,[...users(),resolvedUser]);
  selectedProfileEmployeeId=activePortalUserId;historyViewMode="my";historyReportTypeFilter="all";historyPage=1;
  profileSearchQuery="";historyEmployeeSearchQuery="";window.clearTimeout(historySearchTimer);
  selectedHistoryPointId="";darViewMode="self";
  setSession(activePortalUserId);setHeaderState(true);
  document.getElementById("portalGate")?.classList.add("hidden");
  document.getElementById("portalDashboard")?.classList.remove("hidden");
  activeSectionId=defaultSectionForUser(resolvedUser);
  showSection(activeSectionId);
  syncMobileChrome(resolvedUser);
  setMobileDrawerState(false);
  // Load fresh cloud data after login
  initRealtimeSync();
  refreshAllCloudData().then(()=>{renderPortal();ensureTodayAutoSubmitCatchup();});
  scheduleDraftAutoSubmit();
}
async function logoutPortal() {
    const current=activeUser();
    if(current){
      const key=getDraftKey(current.employeeId);
      window.clearTimeout(draftCloudSaveTimers[key]);
      const currentDraft=getDraft(current);
      if(draftHasContent(currentDraft))await cloudSaveDraft(current,currentDraft);
    }
    await db.auth.signOut(); // Secure cloud sign out
    
    activePortalUserId = "";
    _currentUserCache = null; 
    activeSectionId = "";
    personalProgressExpanded = false;
    
    stopGhostTyping();
    document.getElementById("announcementPopover")?.classList.add("hidden");
    clearSession();
    setHeaderState(false);
    
    document.documentElement.classList.remove("js-pre-logged-in");
    document.getElementById("portalGate")?.classList.remove("hidden");
    document.getElementById("portalDashboard")?.classList.add("hidden");
}

// ─── Refresh all cloud data into cache ───────────────────────
async function refreshAllCloudData(options={}){
  try {
    if(!options.skipRemoteAutoSubmit){
      try {
        const {error}=await db.rpc("metro_auto_submit_due_drafts");
        if(error&&!isMissingAutoSubmitFunctionError(error))console.warn("metro_auto_submit_due_drafts RPC skipped:",error.message);
      } catch(rpcErr) {
        console.warn("metro_auto_submit_due_drafts RPC exception:",rpcErr.message);
      }
    }
    await Promise.all([cloudUsers(),cloudReports(),cloudDrafts(),cloudTasks(),cloudNotifications(),cloudAnnouncements(),cloudIssues(),cloudReminderLogs(),cloudDeletedUsers(),cloudHolidays(),cloudLeaves(),cloudEntities()]);
    
    // Sync current user cache from updated local store
    if (activePortalUserId) {
      const oldCanUse = canUseCompliance(_currentUserCache);
      const freshMe = users().find(u => u.employeeId === activePortalUserId);
      if (freshMe) {
        _currentUserCache = freshMe;
        const newCanUse = canUseCompliance(freshMe);
        if (!oldCanUse && newCanUse) {
          // Compliance access was just granted! Re-run cloudUsers and cloudReports to populate cache
          await Promise.all([cloudUsers(), cloudReports()]);
        }
      }
    }

    if(!options.skipLocalAutoSubmit&&await autoSubmitDueDrafts())renderPortal();
  } catch(e){ console.warn("refreshAllCloudData partial error:",e.message); }
}
let realtimeSyncTimer = null;
function initRealtimeSync(){
  if(realtimeChannel)return;
  const triggerSync = () => {
    if (realtimeSyncTimer) clearTimeout(realtimeSyncTimer);
    realtimeSyncTimer = setTimeout(async () => {
      if (activePortalUserId && !isDarDraftFieldActive()) {
        await refreshAllCloudData({skipLocalAutoSubmit: true, skipRemoteAutoSubmit: true});
        renderPortal();
      }
    }, 500); // 500ms debounce for instant sync
  };

  realtimeChannel=db.channel("metro-dar-live")
    .on("postgres_changes",{event:"*",schema:"public",table:"metro_notifications"},triggerSync)
    .on("postgres_changes",{event:"*",schema:"public",table:"metro_reports"},triggerSync)
    .on("postgres_changes",{event:"*",schema:"public",table:"metro_profiles"},triggerSync)
    .on("postgres_changes",{event:"*",schema:"public",table:"metro_tasks"},triggerSync)
    .on("postgres_changes",{event:"*",schema:"public",table:"metro_drafts"},triggerSync)
    .on("postgres_changes",{event:"*",schema:"public",table:"metro_holidays"},triggerSync)
    .on("postgres_changes",{event:"*",schema:"public",table:"metro_leaves"},triggerSync)
    .on("postgres_changes",{event:"*",schema:"public",table:"metro_entities"},triggerSync)
    .on("postgres_changes",{event:"*",schema:"public",table:"metro_email_reminder_logs"},triggerSync)
    .subscribe();
}

// ─── Seed data init (first run only) ─────────────────────────
async function initData(){
  // If Supabase already has users, just pull from cloud
  try {
    const {data}=await db.from('metro_profiles').select('employee_id').limit(1);
    if(data&&data.length>0){
      await refreshAllCloudData();return;
    }
  } catch(e){ console.warn("initData cloud check error:",e.message); }

  // First run: seed to Supabase
  const seedUsers=[
    {employeeId:"METRO-000",name:"Master Admin",password:"Master@123",level:"admin",department:"Administration",managerId:"",managerName:"",phone:"+91 90000 00000",email:"admin@metrogroup.local",location:"Corporate HQ",bio:"Master directory owner and policy reviewer for Metro Group.",profileImgUrl:"",lastDarDate:"",createdBy:"developer-seed",isSeed:true},
    {employeeId:"METRO-001",name:"Ananya Rao",password:"metro123",level:"1",department:"Executive",managerId:"",managerName:"",phone:"+91 98765 10001",email:"ananya.rao@metrogroup.local",location:"Mumbai",bio:"Leads executive operations.",profileImgUrl:"",lastDarDate:"",createdBy:"METRO-000",isSeed:true},
    {employeeId:"METRO-101",name:"Ritika Verma",password:"metro123",level:"2",department:"Operations",managerId:"METRO-001",managerName:"Ananya Rao",phone:"+91 98765 10101",email:"ritika.verma@metrogroup.local",location:"Delhi",bio:"Coordinates operations.",profileImgUrl:"",lastDarDate:"",createdBy:"METRO-001",isSeed:true},
    {employeeId:"METRO-201",name:"Aarav Sharma",password:"metro123",level:"3",department:"Operations",managerId:"METRO-101",managerName:"Ritika Verma",phone:"+91 98765 10201",email:"aarav.sharma@metrogroup.local",location:"Bengaluru",bio:"Handles daily operational execution.",profileImgUrl:"",lastDarDate:"",createdBy:"METRO-001",isSeed:true}
  ];
  const seedTasks=[
    {id:"TSK-1",targetId:"METRO-101",title:"Review branch collection summary and assign follow-up work.",notes:"Split this into team actions after your review.",type:"project",dueDate:today(),assignedBy:"METRO-001",createdAt:nowIso(),completed:false},
    {id:"TSK-2",targetId:"METRO-201",title:"Complete invoice generation and upload proof.",notes:"Add all completed points in today's DAR.",type:"internal",dueDate:today(),assignedBy:"METRO-101",createdAt:nowIso(),completed:false}
  ];

  // Write seed users to Supabase
  try {
    const seedAuthClient = supabase.createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, storageKey: 'seed-auth-token' } });
    const seededProfiles = [];
    for (const seed of seedUsers) {
      const authUserId = await ensureSupabaseAuthUser(seedAuthClient, `${seed.employeeId.toLowerCase()}@metrogroup.local`, seed.password);
      seededProfiles.push(userToSupabaseProfile({ ...seed, authUserId }));
    }
    const rows=seededProfiles;
    await db.from('metro_profiles').upsert(rows,{onConflict:'employee_id'});
  } catch(e){ console.warn("Seed users to Supabase failed:",e.message); }

  // Write seed tasks to Supabase
  for(const t of seedTasks){
    try{
      await db.from('metro_tasks').upsert([{
        id:t.id,target_employee_id:t.targetId,assigned_by_employee_id:t.assignedBy,
        title:t.title,notes:t.notes||"",task_type:t.type||"internal",
        due_date:t.dueDate||null,completed:false
      }],{onConflict:'id'});
    }catch(e){console.warn("Seed task failed:",e.message);}
  }

  // Initialize localStorage with seeds
  writeStore(STORAGE_KEYS.users,seedUsers);writeStore(STORAGE_KEYS.tasks,seedTasks);
  if(!readStore(STORAGE_KEYS.reports,null))writeStore(STORAGE_KEYS.reports,[]);
  if(!readStore(STORAGE_KEYS.drafts,null))writeStore(STORAGE_KEYS.drafts,{});
  if(!readStore(STORAGE_KEYS.notifications,null))writeStore(STORAGE_KEYS.notifications,[]);
  if(!readStore(STORAGE_KEYS.announcements,null))writeStore(STORAGE_KEYS.announcements,[]);
  if(!readStore(STORAGE_KEYS.issues,null))writeStore(STORAGE_KEYS.issues,[]);
  if(!readStore(STORAGE_KEYS.deletedUsers,null))writeStore(STORAGE_KEYS.deletedUsers,[]);
}

// ─── Event bindings ───────────────────────────────────────────
function bindPortalEvents(){

  // Submission Hub Interactive Elements (Toggle Button, Tabs, Month Selector, Close, Leaderboard Filters)
  const heatmapEl = document.getElementById("submissionHeatmap");
  if (heatmapEl) {
    heatmapEl.addEventListener("click", (e) => {
      const user = activeUser();
      if (!user) return;

      // 0. Main Toggle Button
      const toggle = e.target.closest("#submissionHeatmapToggle");
      if (toggle) {
        e.preventDefault();
        e.stopPropagation();
        submissionHeatmapExpanded = !submissionHeatmapExpanded;
        personalProgressExpanded = false;
        renderPersonalProgressWidget(user);
        renderSubmissionHeatmap(user);
        return;
      }

      // 1. Close Button
      if (e.target.closest("#closeSubHubBtn")) {
        e.preventDefault();
        e.stopPropagation();
        submissionHeatmapExpanded = false;
        renderSubmissionHeatmap(user);
        return;
      }

      // 2. Tab Buttons
      const tabBtn = e.target.closest("[data-hub-tab]");
      if (tabBtn) {
        e.preventDefault();
        e.stopPropagation();
        submissionHubTab = tabBtn.getAttribute("data-hub-tab");
        renderSubmissionHeatmap(user);
        return;
      }

      // 3. Month Pills & Blocks
      const monthBtn = e.target.closest("[data-select-month]");
      if (monthBtn) {
        e.preventDefault();
        e.stopPropagation();
        submissionHubSelectedMonth = Number(monthBtn.getAttribute("data-select-month")) || 0;
        renderSubmissionHeatmap(user);
        return;
      }
    });
  }

  document.getElementById("submissionHeatmap")?.addEventListener("input", (e) => {
    if (e.target.id === "subLeaderboardSearchInput") {
      submissionLeaderboardSearch = e.target.value;
      const user = activeUser();
      if (user) renderSubmissionHeatmap(user);
    }
  });

  document.getElementById("submissionHeatmap")?.addEventListener("change", (e) => {
    if (e.target.id === "subLeaderboardDeptFilter") {
      submissionLeaderboardDept = e.target.value;
      const user = activeUser();
      if (user) renderSubmissionHeatmap(user);
    }
  });

  initDarVoiceRecognition();
  document.getElementById("announcementsToggle")?.addEventListener("click",toggleAnnouncementPopover);
  document.getElementById("mobileMenuToggle")?.addEventListener("click",()=>setMobileDrawerState(!document.body.classList.contains("mobile-drawer-open")));
  document.getElementById("mobileSidebarClose")?.addEventListener("click",()=>setMobileDrawerState(false));
  document.getElementById("mobileDrawerOverlay")?.addEventListener("click",()=>setMobileDrawerState(false));
  document.getElementById("mobileLoginSigninTab")?.addEventListener("click",()=>setMobileLoginTab("signin"));
  document.getElementById("mobileLoginAboutTab")?.addEventListener("click",()=>setMobileLoginTab("about"));
  document.getElementById("sidebarProfileButton")?.addEventListener("click",()=>{selectedProfileEmployeeId=activeUser()?.employeeId||selectedProfileEmployeeId;showSection("profileSection");renderPortal();});
  document.getElementById("sidebarSignOutButton")?.addEventListener("click",logoutPortal);
  document.getElementById("sidebarCollapseToggle")?.addEventListener("click",()=>document.body.classList.toggle("sidebar-collapsed"));
  document.addEventListener("pointerdown",event=>{
    const target=event.target;
    if(!(target instanceof Node))return;
    closeTopbarWidgetsOnOutsideClick(target);
  },true);
  document.addEventListener("click",event=>{
    const popover=document.getElementById("announcementPopover");const toggle=document.getElementById("announcementsToggle");const target=event.target;
    if(!(target instanceof Node))return;
    const progressButton=target instanceof Element?target.closest("#personalProgressToggle"):null;
    if(progressButton){togglePersonalProgressPopover();return;}
    const hit=!!popover&&!!toggle&&(popover.contains(target)||toggle.contains(target));
    if(popover&&!popover.classList.contains("hidden")&&!hit){popover.classList.add("hidden");const user=activeUser();if(user)renderAnnouncementBell(user);}
    const heatmapToggle=target instanceof Element?target.closest("#submissionHeatmapToggle"):null;
    if(heatmapToggle){
      submissionHeatmapExpanded=!submissionHeatmapExpanded;
      personalProgressExpanded=false;
      const user=activeUser();
      if(user){
        renderPersonalProgressWidget(user);
        renderSubmissionHeatmap(user);
        if(submissionHeatmapExpanded){
          cloudReports().then(()=>{
            if(submissionHeatmapExpanded && activeUser()) renderSubmissionHeatmap(activeUser());
          });
        }
      }
      return;
    }
  });
  document.addEventListener("input",event=>{
    const target=event.target;if(!(target instanceof HTMLInputElement))return;
    const user=activeUser();
    if(target.id==="profileSearchInput"){profileSearchQuery=target.value;if(user)renderProfileSection(user);}
    if(target.id==="historyEmployeeSearchInput"){historyEmployeeSearchQuery=target.value;historyPage=1;selectedHistoryReportId="";selectedHistoryPointId="";window.clearTimeout(historySearchTimer);if(user)historySearchTimer=window.setTimeout(()=>renderHistory(user),220);}
  });
  // Removed keydown animation listener
  document.addEventListener("click",event=>{
    const target=event.target;if(!(target instanceof Element))return;
    const profileButton=target.closest("[data-profile-search]");const historyButton=target.closest("[data-history-employee]");const user=activeUser();
    const adminToggle=target.closest("[data-admin-toggle]");
    if(adminToggle){
      event.preventDefault();
      const key=adminToggle.getAttribute("data-admin-toggle")||"";
      if(adminExpandedPanels.has(key))adminExpandedPanels.delete(key);
      else adminExpandedPanels.add(key);
      renderAdminCollapsibles();
      return;
    }
    if(profileButton&&user){event.preventDefault();profileSearchQuery=String(profileButton.getAttribute("data-profile-search")||"").trim();const exact=findUser(profileSearchQuery);let eId=exact?exact.employeeId:parseEmployeeSelection(profileSearchQuery,user,"profile")||profileSearchQuery.toUpperCase();if(eId){selectedProfileEmployeeId=eId;showSection("profileSection");renderPortal();}}
    if(historyButton&&user){historyEmployeeSearchQuery=String(historyButton.getAttribute("data-history-employee")||"");const eId=parseEmployeeSelection(historyEmployeeSearchQuery,user,"history-level1")||historyEmployeeSearchQuery.toUpperCase();if(eId){selectedHistoryEmployeeId=eId;selectedHistoryReportId="";showSection("historySection");renderPortal();}}
  });
  document.getElementById("dashboardHomeLink")?.addEventListener("click",()=>{if(!activePortalUserId){window.location.href="index.html";return;}const user=activeUser();if(!user)return;showSection(defaultSectionForUser(user));renderPortal();});

  // ── LOGIN ──
  // --- NEW LOGIN LOGIC ---
document.getElementById("portalLoginForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const employeeId = normalizeEmployeeId(document.getElementById("portalEmployeeId")?.value || "");
    const password = String(document.getElementById("portalPassword")?.value || "").trim();
    const submitBtn = event.target.querySelector("button[type=submit]");
    
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Signing in..."; }
    
    try {
        const authEmail = `${employeeId.toLowerCase()}@metrogroup.local`;
        let authData = null;
        
        // Secure Supabase Auth check
        const firstLogin = await db.auth.signInWithPassword({
            email: authEmail,
            password: password,
        });

        if (firstLogin.error) {
            const repairProfile = await findUserAsync(employeeId);
            if (!repairProfile || String(repairProfile.password||"").trim() !== password) throw firstLogin.error;

            const repairedAuthUserId = await ensureSupabaseAuthUser(null, authEmail, password);
            if (!repairedAuthUserId) throw firstLogin.error;

            if (repairProfile.authUserId !== repairedAuthUserId) {
                repairProfile.authUserId = repairedAuthUserId;
                await cloudSaveUser(repairProfile);
            }

            const retryLogin = await db.auth.signInWithPassword({ email: authEmail, password });
            if (retryLogin.error) throw retryLogin.error;
            authData = retryLogin.data;
        } else {
            authData = firstLogin.data;
        }

        const userProfile = await findUserAsync(employeeId);
        if (!userProfile) {
            window.alert("Auth success, but profile missing.");
            return;
        }

        if (userProfile.isActive === false) {
            await db.auth.signOut();
            window.alert("This account is deactivated. Please contact the administrator.");
            return;
        }

        if (authData?.user?.id && !userProfile.authUserId) {
            userProfile.authUserId = authData.user.id;
            try {
                await cloudSaveUser(userProfile);
            } catch (backfillErr) {
                console.warn("Profile auth link backfill failed:", backfillErr?.message || backfillErr);
            }
        }

        loginPortal(employeeId, userProfile);
        
    } catch (err) {
        console.error("Login error:", err.message);
        window.alert("Incorrect Employee ID or Password.");
    } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Open Portal"; }
    }
});

  
  document.getElementById("filterAllButton")?.addEventListener("click",()=>{
      complianceFilter="all"; renderCompliance(activeUser());
      openComplianceDrawer('All', 'All', 'daily');
      setTimeout(() => document.querySelector('#drawerTabs [data-filter="all"]')?.click(), 50);
  });

  
  document.getElementById("filterSubmittedButton")?.addEventListener("click",()=>{
      complianceFilter="submitted"; renderCompliance(activeUser());
      openComplianceDrawer('All', 'All', 'daily');
      setTimeout(() => document.querySelector('#drawerTabs [data-filter="submitted"]')?.click(), 50);
  });

  
  document.getElementById("filterPendingButton")?.addEventListener("click",()=>{
      complianceFilter="pending"; renderCompliance(activeUser());
      openComplianceDrawer('All', 'All', 'daily');
      setTimeout(() => document.querySelector('#drawerTabs [data-filter="pending"]')?.click(), 50);
  });

  document.getElementById("complianceDateFilter")?.addEventListener("change", async event=>{
    complianceDateFilter = event.target?.value || today();
    selectedComplianceEmployeeId = "";
    const container = document.getElementById("complianceTableContainer");
    if(container) container.innerHTML = '<div class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i> Loading DARs for selected date...</div>';
    await fetchReportsForDates([complianceDateFilter]);
    renderCompliance(activeUser());
  });
  document.getElementById("complianceMonthFilter")?.addEventListener("change",event=>{complianceMonthFilter=event.target?.value||selectedComplianceDate().slice(0,7);});
  document.getElementById("clearComplianceFiltersButton")?.addEventListener("click", async () => {
    complianceFilter = "all";
    complianceDateFilter = today();
    selectedComplianceEmployeeId = "";
    const dateInput = document.getElementById("complianceDateFilter");
    if (dateInput) dateInput.value = complianceDateFilter;
    const consecutiveInput = document.getElementById("complianceConsecutiveDaysFilter");
    if (consecutiveInput) consecutiveInput.value = "";
    const searchInput = document.getElementById("complianceSearchInput");
    if (searchInput) searchInput.value = "";
    const container = document.getElementById("complianceTableContainer");
    if(container) container.innerHTML = '<div class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</div>';
    await fetchReportsForDates([complianceDateFilter]);
    renderCompliance(activeUser());
  });
  document.getElementById("complianceSearchInput")?.addEventListener("input",()=>renderCompliance(activeUser()));
  document.getElementById("complianceEntityFilter")?.addEventListener("change",()=>renderCompliance(activeUser()));
  document.getElementById("complianceDeptFilter")?.addEventListener("change",()=>renderCompliance(activeUser()));
  document.getElementById("complianceConsecutiveDaysFilter")?.addEventListener("change", () => {
     renderCompliance(activeUser());
     const val = document.getElementById("complianceConsecutiveDaysFilter")?.value || "";
     if (val) {
        openComplianceDrawer('All', 'All', 'daily');
        setTimeout(() => document.querySelector('#drawerTabs [data-filter="pending"]')?.click(), 50);
     }
  });
  
  // Clickable Dashboard Title
  document.getElementById("clickableDashboardTitle")?.addEventListener("click", () => {
     openComplianceDrawer('All', 'All', 'daily');
  });

  document.getElementById("exportMenuButton")?.addEventListener("click",event=>{
    event.stopPropagation();
    const menu=document.getElementById("exportMenu");const button=document.getElementById("exportMenuButton");
    const willOpen=menu?.classList.contains("hidden");
    menu?.classList.toggle("hidden",!willOpen);
    button?.setAttribute("aria-expanded",willOpen?"true":"false");
  });
  
  // All 8 Export Dropdown Options
  document.getElementById("exportExcelButton")?.addEventListener("click", () => {
    const user = activeUser();
    if (user && canUseCompliance(user)) exportExcel(user);
    document.getElementById("exportMenu")?.classList.add("hidden");
    document.getElementById("exportMenuButton")?.setAttribute("aria-expanded", "false");
  });
  
  // All 8 Export Dropdown Options
  document.getElementById("exportExcelButton")?.addEventListener("click", () => {
    const user = activeUser();
    if (user && canUseCompliance(user)) exportExcel(user);
    document.getElementById("exportMenu")?.classList.add("hidden");
    document.getElementById("exportMenuButton")?.setAttribute("aria-expanded", "false");
  });
  document.getElementById("exportPdfButton")?.addEventListener("click", () => {
    const user = activeUser();
    if (user && canUseCompliance(user)) exportPdf(user);
    document.getElementById("exportMenu")?.classList.add("hidden");
    document.getElementById("exportMenuButton")?.setAttribute("aria-expanded", "false");
  });
  document.getElementById("exportWeeklyMatrixButton")?.addEventListener("click", () => {
    const user = activeUser();
    if (user && canUseCompliance(user)) exportStatusMatrixExcel(user, "weekly");
    document.getElementById("exportMenu")?.classList.add("hidden");
    document.getElementById("exportMenuButton")?.setAttribute("aria-expanded", "false");
  });
  document.getElementById("exportWeeklyExcelButton")?.addEventListener("click", () => {
    const user = activeUser();
    if (user && canUseCompliance(user)) exportWeeklyDetailedExcel(user);
    document.getElementById("exportMenu")?.classList.add("hidden");
    document.getElementById("exportMenuButton")?.setAttribute("aria-expanded", "false");
  });
  document.getElementById("exportWeeklyPdfButton")?.addEventListener("click", () => {
    const user = activeUser();
    if (user && canUseCompliance(user)) exportWeeklyPdf(user);
    document.getElementById("exportMenu")?.classList.add("hidden");
    document.getElementById("exportMenuButton")?.setAttribute("aria-expanded", "false");
  });
  document.getElementById("exportMonthlyMatrixButton")?.addEventListener("click", () => {
    const user = activeUser();
    if (user && canUseCompliance(user)) exportStatusMatrixExcel(user, "monthly");
    document.getElementById("exportMenu")?.classList.add("hidden");
    document.getElementById("exportMenuButton")?.setAttribute("aria-expanded", "false");
  });
  document.getElementById("exportMonthlyExcelButton")?.addEventListener("click", () => {
    const user = activeUser();
    if (user && canUseCompliance(user)) exportMonthlyDetailedExcel(user);
    document.getElementById("exportMenu")?.classList.add("hidden");
    document.getElementById("exportMenuButton")?.setAttribute("aria-expanded", "false");
  });
  document.getElementById("exportMonthlyPdfButton")?.addEventListener("click", () => {
    const user = activeUser();
    if (user && canUseCompliance(user)) exportMonthlyPdf(user);
    document.getElementById("exportMenu")?.classList.add("hidden");
    document.getElementById("exportMenuButton")?.setAttribute("aria-expanded", "false");
  });

  // Overview Tab Switcher (Table vs Graph)
  document.getElementById("overviewTabTable")?.addEventListener("click", () => {
    document.getElementById("overviewTabTable")?.classList.add("active-mode");
    document.getElementById("overviewTabGraph")?.classList.remove("active-mode");
    document.getElementById("overviewTableView")?.classList.remove("hidden");
    document.getElementById("overviewGraphView")?.classList.add("hidden");
  });
  document.getElementById("overviewTabGraph")?.addEventListener("click", () => {
    document.getElementById("overviewTabGraph")?.classList.add("active-mode");
    document.getElementById("overviewTabTable")?.classList.remove("active-mode");
    document.getElementById("overviewGraphView")?.classList.remove("hidden");
    document.getElementById("overviewTableView")?.classList.add("hidden");
    renderOrganizationGraph(activeUser());
  });

  // Organization Graph Toolbar & Controls
  document.getElementById("graphSearchInput")?.addEventListener("input", () => {
    renderOrganizationGraph(activeUser());
  });
  document.getElementById("graphDirectorFilter")?.addEventListener("change", () => {
    isInitialGraphRender = true;
    renderOrganizationGraph(activeUser());
  });
  document.getElementById("graphDeptFilter")?.addEventListener("change", () => {
    isInitialGraphRender = true;
    renderOrganizationGraph(activeUser());
  });
  document.getElementById("graphExpandAllBtn")?.addEventListener("click", () => {
    collapsedOrgNodeIds.clear();
    expandedDeptNodeIds.add("__directors_hub__");
    expandedDeptNodeIds.add("__md_direct_depts_hub__");
    const allUsers = users().filter(u => u.level !== "admin" && (u.isActive !== false || u.includeInOrgTree === true));
    allUsers.forEach(u => {
      const dirId = u.taggedDirectorId || u.managerId || u.employeeId;
      const dept = u.department || "General";
      expandedDeptNodeIds.add(`dept_${dirId}_${encodeURIComponent(dept)}`);
    });
    renderOrganizationGraph(activeUser());
  });
  document.getElementById("graphCollapseAllBtn")?.addEventListener("click", () => {
    expandedDeptNodeIds.clear();
    const allUsers = users().filter(u => u.level !== "admin" && (u.isActive !== false || u.includeInOrgTree === true));
    allUsers.filter(u => String(u.level) === "1" || String(u.level) === "2").forEach(u => collapsedOrgNodeIds.add(u.employeeId));
    collapsedOrgNodeIds.add("__unassigned_branch__");
    renderOrganizationGraph(activeUser());
  });
  document.getElementById("btnEditOrgHierarchy")?.addEventListener("click", () => {
    openOrgHierarchyModal();
  });
  document.getElementById("btnGraphExcelSync")?.addEventListener("click", () => {
    const u = activeUser();
    if (!isAdmin(u)) {
      showToast("Access Denied", "Only Administrator accounts can manage bulk hierarchy updates.");
      return;
    }
    openOrgHierarchyModal();
    switchOrgModalTab("excel");
  });
  document.getElementById("graphZoomIn")?.addEventListener("click", () => {
    currentGraphZoom = Math.min(currentGraphZoom + 0.15, 2.0);
    applyGraphZoom();
  });
  document.getElementById("graphZoomOut")?.addEventListener("click", () => {
    currentGraphZoom = Math.max(currentGraphZoom - 0.15, 0.4);
    applyGraphZoom();
  });
  document.getElementById("graphZoomReset")?.addEventListener("click", () => {
    currentGraphZoom = 1.0;
    applyGraphZoom();
  });
  document.getElementById("btnDownloadGraph")?.addEventListener("click", () => {
    downloadOrgGraphAsPng();
  });

  // Graph Canvas Event Delegation (Toggles, Edit buttons, Profile Click, and Drag & Drop Reassignment)
  const graphCanvas = document.getElementById("orgGraphCanvas");
  if (graphCanvas) {
    let draggedEmpId = null;

    graphCanvas.addEventListener("click", (e) => {
      // 1. Edit / Tag Button
      const editBtn = e.target.closest("[data-edit-org]");
      if (editBtn) {
        e.stopPropagation();
        const empId = editBtn.getAttribute("data-edit-org");
        openOrgHierarchyModal(empId);
        return;
      }

      // 2. Collapse / Expand Toggle Button
      const toggleBtn = e.target.closest("[data-toggle-org]");
      if (toggleBtn) {
        e.stopPropagation();
        const nodeId = toggleBtn.getAttribute("data-toggle-org");
        lastToggledOrgNodeId = nodeId;
        if (nodeId.startsWith("dept_") || nodeId.startsWith("__")) {
          if (expandedDeptNodeIds.has(nodeId)) {
            expandedDeptNodeIds.delete(nodeId);
          } else {
            expandedDeptNodeIds.add(nodeId);
          }
        } else {
          if (collapsedOrgNodeIds.has(nodeId)) {
            collapsedOrgNodeIds.delete(nodeId);
          } else {
            collapsedOrgNodeIds.add(nodeId);
          }
        }
        renderOrganizationGraph(activeUser());
        return;
      }

      // 3. Open Employee Profile
      const card = e.target.closest("[data-open-profile]");
      if (card && !e.target.closest("button, input, select, a")) {
        const empId = card.getAttribute("data-open-profile");
        if (empId && typeof openUserProfile === "function") {
          openUserProfile(empId);
        }
      }
    });

    // Drag & Drop Listeners for Dynamic Reporting Hierarchy Reassignment
    graphCanvas.addEventListener("dragstart", (e) => {
      if (!isAdmin(activeUser())) {
        e.preventDefault();
        return;
      }
      const card = e.target.closest("[data-drag-emp]");
      if (!card) return;
      draggedEmpId = card.getAttribute("data-drag-emp");
      e.dataTransfer.setData("text/plain", draggedEmpId);
      e.dataTransfer.effectAllowed = "move";
      card.classList.add("is-dragging");
    });

    graphCanvas.addEventListener("dragend", () => {
      draggedEmpId = null;
      graphCanvas.querySelectorAll(".is-dragging").forEach(el => el.classList.remove("is-dragging"));
      graphCanvas.querySelectorAll(".drag-over").forEach(el => el.classList.remove("drag-over"));
    });

    graphCanvas.addEventListener("dragover", (e) => {
      if (!isAdmin(activeUser())) return;
      const targetCard = e.target.closest("[data-drag-emp]");
      if (!targetCard) return;
      const targetEmpId = targetCard.getAttribute("data-drag-emp");
      if (targetEmpId && targetEmpId !== draggedEmpId) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        targetCard.classList.add("drag-over");
      }
    });

    graphCanvas.addEventListener("dragleave", (e) => {
      const targetCard = e.target.closest("[data-drag-emp]");
      if (targetCard && !targetCard.contains(e.relatedTarget)) {
        targetCard.classList.remove("drag-over");
      }
    });

    graphCanvas.addEventListener("drop", async (e) => {
      if (!isAdmin(activeUser())) {
        e.preventDefault();
        return;
      }
      const targetCard = e.target.closest("[data-drag-emp]");
      if (!targetCard) return;
      e.preventDefault();
      e.stopPropagation();
      targetCard.classList.remove("drag-over");

      const sourceEmpId = e.dataTransfer.getData("text/plain") || draggedEmpId;
      const targetEmpId = targetCard.getAttribute("data-drag-emp");

      if (!sourceEmpId || !targetEmpId || sourceEmpId === targetEmpId) return;

      const allUsers = users();
      const sourceUser = allUsers.find(u => u.employeeId === sourceEmpId);
      const targetUser = allUsers.find(u => u.employeeId === targetEmpId);
      if (!sourceUser || !targetUser) return;

      // Cycle prevention: target cannot be a direct or indirect subordinate of source
      function isDescendantOf(ancestorId, testId) {
        let curr = allUsers.find(u => u.employeeId === testId);
        let guard = 0;
        while (curr && curr.managerId && guard < 100) {
          if (curr.managerId === ancestorId) return true;
          curr = allUsers.find(u => u.employeeId === curr.managerId);
          guard++;
        }
        return false;
      }

      if (isDescendantOf(sourceEmpId, targetEmpId)) {
        showToast("Invalid Move", `Cannot assign ${sourceUser.name} to report to subordinate ${targetUser.name}.`);
        return;
      }

      // Reassign Reporting Hierarchy
      sourceUser.managerId = targetUser.employeeId;
      sourceUser.managerName = targetUser.name;
      if (String(targetUser.level) === "1") {
        sourceUser.taggedDirectorId = targetUser.employeeId;
      } else if (targetUser.taggedDirectorId) {
        sourceUser.taggedDirectorId = targetUser.taggedDirectorId;
      }

      try {
        await cloudSaveUser(sourceUser);
        showToast("Hierarchy Reassigned", `${sourceUser.name} now reports to ${targetUser.name}.`);
        renderOrganizationGraph(activeUser());
        if (typeof renderCompliance === "function") renderCompliance(activeUser());
      } catch (err) {
        console.error("Drop reassignment error:", err);
        showToast("Error", "Could not reassign reporting manager: " + err.message);
      }
    });
  }

  // Smooth Drag-to-Pan on Graph Viewport Container (Isolated from Outer Page)
  const graphViewport = document.getElementById("orgGraphContainer");
  if (graphViewport) {
    let isPanning = false;
    let startX = 0, startY = 0, scrollLeft = 0, scrollTop = 0;

    graphViewport.addEventListener("mousedown", (e) => {
      // Don't initiate panning if clicking cards or interactive elements (preserves card dragging)
      if (e.target.closest("button, input, select, a, .org-node-card")) return;
      isPanning = true;
      graphViewport.classList.add("is-panning");
      startX = e.pageX - graphViewport.offsetLeft;
      startY = e.pageY - graphViewport.offsetTop;
      scrollLeft = graphViewport.scrollLeft;
      scrollTop = graphViewport.scrollTop;
    });

    const stopPanning = () => {
      if (isPanning) {
        isPanning = false;
        graphViewport.classList.remove("is-panning");
      }
    };

    window.addEventListener("mouseup", stopPanning);
    graphViewport.addEventListener("mouseleave", stopPanning);
    graphViewport.addEventListener("mousemove", (e) => {
      if (!isPanning) return;
      e.preventDefault();
      e.stopPropagation();
      const x = e.pageX - graphViewport.offsetLeft;
      const y = e.pageY - graphViewport.offsetTop;
      const walkX = (x - startX) * 1.5;
      const walkY = (y - startY) * 1.5;
      graphViewport.scrollLeft = scrollLeft - walkX;
      graphViewport.scrollTop = scrollTop - walkY;
    });
  }

  // Organization Structure & Tagging Modal Event Listeners
  document.getElementById("closeOrgHierarchyModalBtn")?.addEventListener("click", closeOrgHierarchyModal);
  document.getElementById("cancelOrgHierarchyBtn")?.addEventListener("click", closeOrgHierarchyModal);
  document.getElementById("tabOrgSingleEdit")?.addEventListener("click", () => switchOrgModalTab("single"));
  document.getElementById("tabOrgBulkMatrix")?.addEventListener("click", () => switchOrgModalTab("matrix"));
  document.getElementById("tabOrgExcelSync")?.addEventListener("click", () => switchOrgModalTab("excel"));
  document.getElementById("tabOrgDeactivated")?.addEventListener("click", () => switchOrgModalTab("deactivated"));
  document.getElementById("orgMatrixSearchInput")?.addEventListener("input", (e) => {
    renderOrgMatrixTable(e.target.value);
  });
  document.getElementById("orgDeactivatedSearchInput")?.addEventListener("input", (e) => {
    renderOrgDeactivatedTable(e.target.value);
  });
  document.getElementById("orgHierarchyForm")?.addEventListener("submit", saveOrgHierarchy);

  // Excel Hierarchy Template & Import Event Listeners
  document.getElementById("btnDownloadHierarchyExcelTemplate")?.addEventListener("click", () => {
    downloadHierarchyExcelTemplate(activeUser());
  });
  document.getElementById("btnTriggerHierarchyExcelImport")?.addEventListener("click", () => {
    const u = activeUser();
    if (!isAdmin(u)) {
      showToast("Access Denied", "Only Administrator accounts can import hierarchy updates.");
      return;
    }
    document.getElementById("importHierarchyExcelFileInput")?.click();
  });
  document.getElementById("importHierarchyExcelFileInput")?.addEventListener("change", handleHierarchyExcelUpload);
  document.getElementById("btnConfirmHierarchyImport")?.addEventListener("click", executeHierarchyBulkUpdate);
  document.getElementById("btnCancelHierarchyImport")?.addEventListener("click", () => {
    stagedHierarchyUpdates = [];
    const fileInput = document.getElementById("importHierarchyExcelFileInput");
    if (fileInput) fileInput.value = "";
    document.getElementById("orgImportPreviewContainer")?.classList.add("hidden");
  });

  // Matrix Table Quick Tag Edit button delegation
  document.getElementById("orgMatrixTableBody")?.addEventListener("click", (e) => {
    const editBtn = e.target.closest("[data-matrix-edit]");
    if (editBtn) {
      const empId = editBtn.getAttribute("data-matrix-edit");
      openOrgHierarchyModal(empId);
      switchOrgModalTab("single");
    }
  });

  // Deactivated Staff Table Quick Edit button delegation
  document.getElementById("orgDeactivatedTableBody")?.addEventListener("click", (e) => {
    const editBtn = e.target.closest("[data-matrix-edit]");
    if (editBtn) {
      const empId = editBtn.getAttribute("data-matrix-edit");
      openOrgHierarchyModal(empId);
      switchOrgModalTab("single");
    }
  });

  // Side Drawer Controls
  document.getElementById("closeComplianceDrawerBtn")?.addEventListener("click", closeComplianceDrawer);
  document.getElementById("complianceDrawerBackdrop")?.addEventListener("click", closeComplianceDrawer);

  // Drawer Filter Tabs Click Listener
  document.addEventListener("click", (e) => {
    const tabBtn = e.target.closest(".drawer-filter-tab");
    if (tabBtn) {
      e.preventDefault();
      const tabKey = tabBtn.getAttribute("data-drawer-tab");
      currentDrawerState.tab = tabKey;
      
      document.querySelectorAll(".drawer-filter-tab").forEach(b => {
        const isThis = b.getAttribute("data-drawer-tab") === tabKey;
        b.classList.toggle("active", isThis);
      });
      
      renderDrawerContent();
    }
  });
  document.getElementById("drawerMemberSearchInput")?.addEventListener("input", (e) => {
    currentDrawerState.search = e.target.value;
    renderDrawerContent();
  });
  document.getElementById("drawerExportExcelBtn")?.addEventListener("click", () => {
    const u = activeUser();
    if (u) {
      const list = getDrawerUsersList(u);
      if (currentDrawerState.period === 'daily') exportExcel(u, list);
      else if (currentDrawerState.period === 'weekly') exportWeeklyExcel(u, list);
      else exportMonthlyExcel(u, list);
    }
  });

  // Compliance Filter Inputs & KPI buttons
  document.getElementById("filterAllButton")?.addEventListener("click", () => {
    complianceFilter = "all";
    document.querySelectorAll(".compliance-metrics-row .metric-filter-card").forEach(c => c.classList.remove("active-filter"));
    document.getElementById("filterAllButton")?.classList.add("active-filter");
    renderCompliance(activeUser());
  });
  document.getElementById("filterSubmittedButton")?.addEventListener("click", () => {
    complianceFilter = "submitted";
    document.querySelectorAll(".compliance-metrics-row .metric-filter-card").forEach(c => c.classList.remove("active-filter"));
    document.getElementById("filterSubmittedButton")?.classList.add("active-filter");
    renderCompliance(activeUser());
  });
  document.getElementById("filterPendingButton")?.addEventListener("click", () => {
    complianceFilter = "pending";
    document.querySelectorAll(".compliance-metrics-row .metric-filter-card").forEach(c => c.classList.remove("active-filter"));
    document.getElementById("filterPendingButton")?.classList.add("active-filter");
    renderCompliance(activeUser());
  });

  document.getElementById("complianceSearchForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    e.stopPropagation();
    renderCompliance(activeUser());
  });

  document.getElementById("complianceSearchInput")?.addEventListener("input", () => {
    renderCompliance(activeUser());
  });
  document.getElementById("complianceSearchInput")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      renderCompliance(activeUser());
    }
  });
  document.getElementById("complianceEntityFilter")?.addEventListener("change", () => {
    renderCompliance(activeUser());
  });
  document.getElementById("complianceDeptFilter")?.addEventListener("change", () => {
    renderCompliance(activeUser());
  });
  document.getElementById("complianceConsecutiveDaysFilter")?.addEventListener("change", () => {
    renderCompliance(activeUser());
  });
  document.getElementById("clearComplianceFiltersButton")?.addEventListener("click", () => {
    const sIn = document.getElementById("complianceSearchInput"); if (sIn) sIn.value = "";
    const entIn = document.getElementById("complianceEntityFilter"); if (entIn) entIn.value = "";
    const dIn = document.getElementById("complianceDeptFilter"); if (dIn) dIn.value = "";
    const cIn = document.getElementById("complianceConsecutiveDaysFilter"); if (cIn) cIn.value = "";
    complianceFilter = "all";
    document.querySelectorAll(".compliance-metrics-row .metric-filter-card").forEach(c => c.classList.remove("active-filter"));
    document.getElementById("filterAllButton")?.classList.add("active-filter");
    renderCompliance(activeUser());
  });

  // Quick Points trigger & search listeners
  const qpTrigger = document.getElementById("quickPointsTrigger");
  const qpWrap = document.getElementById("quickPointsSelectWrap");
  const qpMenu = document.getElementById("quickPointsDropdownMenu");
  const qpSearch = document.getElementById("quickPointsSearchInput");

  if(qpTrigger && qpWrap && qpMenu){
    qpTrigger.addEventListener("click", (e)=>{
      e.stopPropagation();
      const isOpen = qpWrap.classList.contains("open");
      if(isOpen){
        qpWrap.classList.remove("open");
        qpMenu.classList.add("hidden");
      } else {
        const user = activeUser();
        if(user) renderQuickPointsDropdown(user, qpSearch?.value||"");
        qpWrap.classList.add("open");
        qpMenu.classList.remove("hidden");
        qpSearch?.focus();
      }
    });
    qpSearch?.addEventListener("input", (e)=>{
      const user = activeUser();
      if(user) renderQuickPointsDropdown(user, e.target.value||"");
    });
    qpSearch?.addEventListener("click", (e)=>e.stopPropagation());
  }

  // Add Quick Point Modal
  const addQpBtn = document.getElementById("addQuickPointBtn");
  const addQpModal = document.getElementById("addQuickPointModal");
  const closeAddQpModal = document.getElementById("closeAddQuickPointModal");
  const cancelAddQpBtn = document.getElementById("cancelAddQuickPointBtn");
  const saveQpBtn = document.getElementById("saveQuickPointBtn");
  const newQpText = document.getElementById("newQuickPointText");

  if(addQpBtn && addQpModal){
    addQpBtn.addEventListener("click", ()=>{
      if(newQpText) newQpText.value = "";
      addQpModal.classList.remove("hidden");
      newQpText?.focus();
    });
    const hideAddQpModal = () => addQpModal.classList.add("hidden");
    closeAddQpModal?.addEventListener("click", hideAddQpModal);
    cancelAddQpBtn?.addEventListener("click", hideAddQpModal);
    saveQpBtn?.addEventListener("click", async ()=>{
      const text = String(newQpText?.value||"").trim();
      if(!text){
        alert("Please enter quick point text.");
        return;
      }
      const user = activeUser();
      if(user){
        user.customTemplates = user.customTemplates || [];
        if(!user.customTemplates.includes(text)){
          user.customTemplates.push(text);
          await cloudSaveUser(user);
          showToast("Quick Point Added", "Template saved to your account.");
          renderQuickPointsDropdown(user, qpSearch?.value||"");
        }
        hideAddQpModal();
      }
    });
  }

  // Time Pills click handling
  const pillsContainer = document.getElementById("darTimePills");
  if(pillsContainer){
    pillsContainer.addEventListener("click", (e)=>{
      const pill = e.target.closest(".dar-pill");
      if(!pill) return;
      const minsAttr = pill.getAttribute("data-mins");
      const hInput = document.getElementById("pointHours");
      const mInput = document.getElementById("pointMinutes");
      if(minsAttr === "custom"){
        pillsContainer.querySelectorAll(".dar-pill").forEach(p => p.classList.remove("active"));
        pill.classList.add("active");
        if(mInput && (!mInput.value || mInput.value === "0")){
          mInput.focus();
          mInput.select();
        } else if(hInput) {
          hInput.focus();
          hInput.select();
        }
      } else {
        const totalM = Number(minsAttr) || 0;
        const hh = Math.floor(totalM / 60);
        const mm = totalM % 60;
        if(hInput) hInput.value = hh > 0 ? String(hh) : "";
        if(mInput) mInput.value = mm > 0 ? String(mm) : "";
        pillsContainer.querySelectorAll(".dar-pill").forEach(p => p.classList.remove("active"));
        pill.classList.add("active");
        const user = activeUser();
        if(user) saveCurrentDraftFromInputs(user);
      }
    });
  }

  // Drag and drop file attachment
  const dropzone = document.getElementById("darDropzone");
  const fileInput = document.getElementById("pointAttachment");
  const dropzoneContent = document.getElementById("darDropzoneContent");
  const dropzoneFileInfo = document.getElementById("darDropzoneFileInfo");
  const fileNameEl = document.getElementById("darFileName");
  const fileSizeEl = document.getElementById("darFileSize");
  const removeFileBtn = document.getElementById("darRemoveFileBtn");

  if(dropzone && fileInput){
    dropzone.addEventListener("click", (e)=>{
      if(e.target.closest("#darRemoveFileBtn")) return;
      fileInput.click();
    });
    dropzone.addEventListener("dragover", (e)=>{
      e.preventDefault();
      dropzone.classList.add("dragover");
    });
    dropzone.addEventListener("dragleave", ()=>dropzone.classList.remove("dragover"));
    dropzone.addEventListener("drop", (e)=>{
      e.preventDefault();
      dropzone.classList.remove("dragover");
      if(e.dataTransfer?.files?.length){
        fileInput.files = e.dataTransfer.files;
        handleFileSelected(fileInput.files[0]);
      }
    });
    fileInput.addEventListener("change", ()=>{
      if(fileInput.files?.length){
        handleFileSelected(fileInput.files[0]);
      }
    });
    const handleFileSelected = (file) => {
      if(!file) return;
      if(file.size > 10 * 1024 * 1024){
        alert("File size exceeds maximum 10MB limit.");
        fileInput.value = "";
        return;
      }
      if(fileNameEl) fileNameEl.textContent = file.name;
      if(fileSizeEl) fileSizeEl.textContent = `(${formatFileSize(file.size)})`;
      dropzoneContent?.classList.add("hidden");
      dropzoneFileInfo?.classList.remove("hidden");
    };
    removeFileBtn?.addEventListener("click", (e)=>{
      e.stopPropagation();
      fileInput.value = "";
      dropzoneFileInfo?.classList.add("hidden");
      dropzoneContent?.classList.remove("hidden");
    });
  }

  // Document click listener to close autocomplete & quick points dropdown
  document.addEventListener("click", (e)=>{
    const target = e.target;
    if(!(target instanceof HTMLElement)) return;
    if(!target.closest("#darAutocompleteMenu") && !target.closest("#pointInput")){
      document.getElementById("darAutocompleteMenu")?.classList.add("hidden");
    }
    if(!target.closest("#quickPointsSelectWrap")){
      document.getElementById("quickPointsSelectWrap")?.classList.remove("open");
      document.getElementById("quickPointsDropdownMenu")?.classList.add("hidden");
    }
  });

  // Sync logic for draft points between Desktop and Mobile
  const syncFields = [["pointInput", "mobilePointInput"], ["pointHours", "mobilePointHours"], ["pointMinutes", "mobilePointMinutes"]];
  syncFields.forEach(([deskId, mobId]) => {
    document.getElementById(deskId)?.addEventListener("input", (e) => {
        const mob = document.getElementById(mobId);
        if (mob && mob.value !== e.target.value) mob.value = e.target.value;
    });
    document.getElementById(mobId)?.addEventListener("input", (e) => {
        const desk = document.getElementById(deskId);
        if (desk && desk.value !== e.target.value) desk.value = e.target.value;
    });
  });

  // Enter key behavior for pointInput
  ["pointInput", "mobilePointInput"].forEach(id => {
      document.getElementById(id)?.addEventListener("keydown", async (e) => {
          if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              const user = activeUser();
              if (user) await addDarPoint(user);
          }
      });
  });

  document.getElementById("pointInput")?.addEventListener("focus",updateDarTypingState);
  document.getElementById("pointInput")?.addEventListener("blur",updateDarTypingState);
  document.getElementById("addPointButton")?.addEventListener("click",async()=>{const user=activeUser();if(!user)return;await addDarPoint(user);});
  document.getElementById("mobileAddPointButton")?.addEventListener("click",async()=>{const user=activeUser();if(!user)return;await addDarPoint(user);});
  
  // Submit confirmation logic
  const confirmSubmitHandler = (e) => {
      if (e && e.preventDefault) e.preventDefault();
      const user = activeUser();
      if (!user) return;
      const draft = getDraft(user);
      const pointText = (document.getElementById("pointInput")?.value || document.getElementById("mobilePointInput")?.value || "").trim();
      const hasDraftPoints = draft.points && draft.points.length > 0;
      const hasUnsavedPoint = pointText.length > 0;

      if (!hasDraftPoints && !hasUnsavedPoint) {
        showToast("No Points to Submit", "Please add at least one DAR point before submitting.");
        return;
      }

      let totalMins = 0;
      let totalPts = draft.points ? draft.points.length : 0;
      (draft.points || []).forEach(p => {
        const pts = parseDurationParts(p.totalTime);
        totalMins += (Number(pts.hours) || 0) * 60 + (Number(pts.minutes) || 0);
      });
      if (hasUnsavedPoint) {
        const h = Number(document.getElementById("pointHours")?.value || document.getElementById("mobilePointHours")?.value || 0);
        const m = Number(document.getElementById("pointMinutes")?.value || document.getElementById("mobilePointMinutes")?.value || 0);
        totalMins += (h * 60) + m;
        totalPts += 1;
      }

      const submitConfirmText = document.getElementById("submitConfirmText");
      if (submitConfirmText) {
        submitConfirmText.innerHTML = `You have <strong>${totalPts} point${totalPts === 1 ? '' : 's'}</strong> (Total time <strong>${formatMinutesToPadHours(totalMins)}</strong>).<br><br>Are you sure you want to submit? Or do you want to add more tasks?`;
      }
      document.getElementById("submitConfirmModal")?.classList.remove("hidden");
  };
  document.getElementById("submitDarButton")?.addEventListener("click", confirmSubmitHandler);
  document.getElementById("floatingSubmitDarBtn")?.addEventListener("click", confirmSubmitHandler);
  document.getElementById("mobileSubmitDarButton")?.addEventListener("click", confirmSubmitHandler);
  
  document.getElementById("darTimelineViewAllBtn")?.addEventListener("click", ()=>{
    showSection("historySection");
    renderPortal();
  });
  
  document.getElementById("cancelSubmitBtn")?.addEventListener("click", () => {
      document.getElementById("submitConfirmModal")?.classList.add("hidden");
  });
  
  document.getElementById("confirmSubmitBtn")?.addEventListener("click", async () => {
      document.getElementById("submitConfirmModal")?.classList.add("hidden");
      const user = activeUser();
      if (user) {
          // Check if there's any unsaved text in the draft point input
          const pointText = document.getElementById("pointInput")?.value || document.getElementById("mobilePointInput")?.value;
          if (pointText && pointText.trim().length > 0) {
              await addDarPoint(user);
          }
          await submitDar(user);
      }
  });

  document.getElementById("darForm")?.addEventListener("submit",event=>{event.preventDefault();});
  document.getElementById("mobileDarForm")?.addEventListener("submit",event=>{event.preventDefault();});
  document.getElementById("mobileDarTeamTab")?.addEventListener("click",()=>{const user=activeUser();if(!user||(!isLevel2(user)&&directSubordinates(user).length===0))return;darViewMode="team";renderDar(user);renderPortal();setMobileDrawerState(false);});
  document.getElementById("darSection")?.addEventListener("click",event=>{
    const target=event.target;if(!(target instanceof HTMLElement))return;
    const selfBtn=target.closest("#darModeSelfButton");const teamBtn=target.closest("#darModeTeamButton");const user=activeUser();
    if(selfBtn){darViewMode="self";if(user)renderDar(user);}
    else if(teamBtn){darViewMode="team";if(user)renderDar(user);}
  });
  document.getElementById("profileForm")?.addEventListener("submit",event=>{event.preventDefault();const user=activeUser();if(user)saveProfileChanges(user);});

  document.addEventListener("submit",async event=>{
    const form=event.target;if(!(form instanceof HTMLFormElement))return;
    if(form.id==="profileSearchForm"){
      event.preventDefault();const viewer=activeUser();if(!viewer||(!(isAdmin(viewer)||isLevel1(viewer))))return;
      const value=String(document.getElementById("profileSearchInput")?.value||"").trim();profileSearchQuery=value;
      const eId=parseEmployeeSelection(value,viewer,"profile")||matchingEmployees(viewer,value,"profile")[0]?.employeeId||"";
      if(!eId){window.alert("Choose a valid employee name or ID.");return;}
      selectedProfileEmployeeId=eId;showSection("profileSection");renderPortal();return;
    }
    if(form.id==="historyEmployeeSearchForm"){
      event.preventDefault();
      const viewer=activeUser();
      if(!viewer)return;
      const q = document.getElementById("historyEmployeeSearchInput")?.value?.trim() || "";
      if (q) {
        adminDb.from('metro_reports').select('id, employee_id, employee_name, manager_id, manager_name, report_date, report_type, project_name, approval_status, reviewed_by, reviewed_at, review_comment, submitted_at, points').eq('employee_id', q.toUpperCase()).then(({data, error}) => {
          if (!error && data && data.length > 0) {
            const current = reports();
            const newItems = data.map(r => normalizeReport({...r, employeeId: r.employee_id, employeeName: r.employee_name, managerId: r.manager_id, managerName: r.manager_name, date: r.report_date, type: r.report_type, projectName: r.project_name, approvalStatus: r.approval_status, reviewedBy: r.reviewed_by, reviewedAt: r.reviewed_at, submittedAt: r.submitted_at}));
            const merged = [...current.filter(r => !newItems.find(n => n.id === r.id)), ...newItems];
            writeStore(STORAGE_KEYS.reports, merged);
          }
          historyPage=1;renderHistory(viewer);
        });
        return;
      }
      historyPage=1;renderHistory(viewer);
      return;
    }
  });

  document.getElementById("broadcastComposer")?.addEventListener("submit",event=>{
    event.preventDefault();const user=activeUser();if(!user||!canPublishDailyUpdates(user))return;
    const input=document.getElementById("broadcastInput");const message=String(input?.value||"").trim();if(!message)return;
    addAnnouncement(message,user);if(input)input.value="";
    showToast("Broadcast Sent","Metro Daily has been updated for everyone.");renderPortal();
  });

  document.getElementById("historyFilterForm")?.addEventListener("change", async () => {
    const user = activeUser();
    if (!user) return;
    const fromDate = document.getElementById("historyFromDate")?.value;
    const toDate = document.getElementById("historyToDate")?.value;
    if (fromDate && toDate) {
      await fetchReportsForDates(datesBetween(fromDate, toDate));
    } else if (fromDate) {
      await fetchReportsForDates([fromDate]);
    } else if (toDate) {
      await fetchReportsForDates([toDate]);
    }
    renderHistory(user);
  });
  document.getElementById("createLevel")?.addEventListener("change",toggleManagerField);
  window.addEventListener("resize",updateViewportMode);

  document.getElementById("holidayCreateForm")?.addEventListener("submit",async event=>{
    event.preventDefault();
    const viewer=activeUser();if(!viewer||!canManageUsers(viewer))return;
    const date=String(document.getElementById("holidayDateInput")?.value||"").trim();
    let name=String(document.getElementById("holidayNameInput")?.value||"").trim();
    const type=String(document.getElementById("holidayTypeInput")?.value||"holiday");
    if(type === "system") name = "[SYSTEM] " + name;
    const feedback=document.getElementById("holidayFeedback");
    if(!await cloudSaveHoliday(date,name)){if(feedback)feedback.textContent="Add a valid holiday date and name.";return;}
    event.target.reset();
    if(feedback)feedback.textContent=`Saved ${name} on ${formatDate(date)}.`;
    showToast("Holiday Saved","The holiday calendar was updated.");
    renderPortal();
  });
  document.getElementById("holidayCsvForm")?.addEventListener("submit",async event=>{
    event.preventDefault();
    const viewer=activeUser();if(!viewer||!canManageUsers(viewer))return;
    const feedback=document.getElementById("holidayFeedback");
    const file=document.getElementById("holidayCsvFile")?.files?.[0]||null;
    const pasted=String(document.getElementById("holidayCsvInput")?.value||"");
    let text=pasted;
    if(file)text=await file.text();
    const rows=parseHolidayCsv(text);
    for(const row of rows){await cloudSaveHoliday(row.date,row.name);}
    if(document.getElementById("holidayCsvInput"))document.getElementById("holidayCsvInput").value="";
    if(document.getElementById("holidayCsvFile"))document.getElementById("holidayCsvFile").value="";
    if(feedback)feedback.textContent=rows.length?`Imported ${rows.length} holiday row(s).`:"No valid holiday rows found.";
    if(rows.length)showToast("Holiday CSV Imported",`${rows.length} holiday row(s) saved.`);
    renderPortal();
  });

  // ── Create single user ──
  document.getElementById("userCreateForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const viewer = activeUser();
    if (!viewer || !canManageUsers(viewer)) return;

    const feedback = document.getElementById("userCreateFeedback");
    const employeeId = normalizeEmployeeId(document.getElementById("createEmployeeId")?.value || "");
    const name = String(document.getElementById("createName")?.value || "").trim();
    const level = String(document.getElementById("createLevel")?.value || "3");
    const department = String(document.getElementById("createDepartment")?.value || "").trim();
    const email = String(document.getElementById("createEmail")?.value || "").trim();
    const password = String(document.getElementById("createPassword")?.value || "").trim();
    const managerId = parseEmployeeSelection(document.getElementById("createManagerId")?.value || "");

    if (!employeeId || !name || !department || !password) { if (feedback) feedback.textContent = "Fill all required fields."; return; }
    if (findUser(employeeId)) { if (feedback) feedback.textContent = "That Employee ID already exists."; return; }

    let managerName = "";
    if (level === "2" || level === "3") {
        const manager = findUser(managerId);
        if (!manager) { if (feedback) feedback.textContent = "Select a valid reporting ID."; return; }
        managerName = manager.name;
    }

    if (feedback) feedback.textContent = "Creating secure credentials...";

    // 1. THE FIX: Create the secure Auth login (using a background ghost client)
    const tempAuth = supabase.createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, storageKey: 'temp-auth-token-2' } });
    const authUserId = await ensureSupabaseAuthUser(tempAuth, `${employeeId.toLowerCase()}@metrogroup.local`, password);

    if (!authUserId) {
        if (feedback) feedback.textContent = "Auth Error: unable to create or locate the login account.";
        return;
    }

    // 2. Save profile to the database
    const newUser = { employeeId, name, password, level, department, email, managerId: level === "admin" || level === "1" ? "" : managerId, managerName: level === "admin" || level === "1" ? "" : managerName, createdBy: viewer.employeeId, isSeed: false, authUserId };
    
    // Check if cloudSaveUser exists, otherwise use db.from directly
    if (typeof cloudSaveUser === "function") {
        const result = await cloudSaveUser(newUser);
        if (!result?.ok) {
            if (feedback) feedback.textContent = `Profile sync failed: ${result?.error?.message || "Unknown error"}`;
            return;
        }
    } else {
        const { error } = await db.from('metro_profiles').upsert([userToSupabaseProfile(newUser)], { onConflict: 'employee_id' });
        if (error) {
            if (feedback) feedback.textContent = `Profile sync failed: ${error.message}`;
            return;
        }
        writeStore(STORAGE_KEYS.users, [...users(), newUser]);
    }

    event.target.reset();
    toggleManagerField();
    if (feedback) feedback.textContent = `Created ${employeeId} successfully.`;
    await refreshAllCloudData();
    renderPortal();
});

document.getElementById("bulkUserForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const viewer = activeUser();
    if (!viewer || !canManageUsers(viewer)) return;

    const textarea = document.getElementById("bulkUserInput");
    const feedback = document.getElementById("bulkUserFeedback");
    const lines = String(textarea?.value || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

    if (!lines.length) { if (feedback) feedback.textContent = "Paste one or more CSV rows first."; return; }
    if (feedback) feedback.textContent = "Importing CSV rows into Supabase...";

    const result = await cloudBulkImportUsers(lines, viewer.employeeId);
    if (textarea) textarea.value = "";

    if (!result || (result.created === 0 && result.updated === 0)) {
        if (feedback) feedback.textContent = `No rows were imported. ${result?.warnings?.[0] ? `First error: ${result.warnings[0]}` : "Check the CSV format and reporting IDs."}`;
        return;
    }

    if (result.warnings?.length) {
        if (feedback) feedback.textContent = `Processed ${result.created + (result.updated||0)} user(s). Some auth records need attention: ${result.warnings.slice(0, 3).join(" | ")}`;
    } else {
        if (feedback) feedback.textContent = `Imported ${result.created} new user(s) and updated ${result.updated||0} existing user(s) successfully.`;
    }
    await refreshAllCloudData();
    renderPortal();
});

  // ── Global task ──
  document.getElementById("globalTaskForm")?.addEventListener("submit",async event=>{
    event.preventDefault();const viewer=activeUser();if(!viewer||!canUseGlobalTasks(viewer))return;
    const feedback=document.getElementById("globalTaskFeedback");
    const eligibleTargets=assignableTaskTargets(viewer);
    const bulkRows=parseTaskCsv(document.getElementById("globalTaskBulkCsv")?.value||"");
    if(bulkRows.length){
      const result=await assignTasksFromRows(bulkRows,viewer,eligibleTargets,feedback);
      event.target.reset();renderPortal();showToast("Tasks Assigned", result.message); return;
    }
    const targetId=parseEmployeeSelection(document.getElementById("globalTaskTarget")?.value||"",viewer,"task");const target=eligibleTargets.find(u=>u.employeeId===targetId);
    if(!target){if(feedback)feedback.textContent=isLevel1(viewer)?"Choose a valid Level 2 or Level 3 target ID.":"Choose a valid target ID.";return;}
    const title=String(document.getElementById("globalTaskTitle")?.value||"").trim();
    const dueDate=String(document.getElementById("globalTaskDueDate")?.value||"");
    if(!title||!dueDate){if(feedback)feedback.textContent="Add a task title and due date, or paste CSV rows.";return;}
    await cloudAssignTask({id:`TSK-${Date.now()}`,targetId,title,notes:String(document.getElementById("globalTaskNotes")?.value||"").trim(),type:String(document.getElementById("globalTaskType")?.value||"internal"),dueDate,assignedBy:viewer.employeeId,createdAt:nowIso(),completed:false});
    const message=`Task assigned to ${target.name}.`;
    addNotification(targetId,`${viewer.name} assigned you a new task.`);event.target.reset();renderPortal();showToast("Task Assigned", message);
  });

  document.getElementById("emailReminderForm")?.addEventListener("submit",sendEmailReminder);
  document.getElementById("emailReminderDate")?.addEventListener("change",()=>{const user=activeUser();if(user)renderEmailReminders(user);});
  document.getElementById("emailReminderSearch")?.addEventListener("input",()=>{const user=activeUser();if(user)renderEmailReminders(user);});
  document.getElementById("selectAllReminderEmployees")?.addEventListener("click",()=>{
    const user=activeUser();if(!user)return;
    const visible = window._currentEmailReminderVisible || [];
    visible.forEach(employee=>{
      if(!String(employee.email||"").trim())return;
      selectedReminderEmployeeIds.add(employee.employeeId);
    });
    renderEmailReminders(user);
  });
  
  
  // Email Reminder Tabs
  document.getElementById("emailReminderSection")?.addEventListener("click", (e) => {
     if(e.target.classList.contains("tab-btn") && e.target.closest("#emailReminderTabs")) {
         const filter = e.target.getAttribute("data-filter");
         if(filter) {
            emailReminderFilter = filter;
            const user = activeUser();
            if(user) renderEmailReminders(user);
         }
     }
  });

  document.getElementById("clearReminderEmployees")?.addEventListener("click",()=>{
    selectedReminderEmployeeIds.clear();
    const user=activeUser();if(user)renderEmailReminders(user);
  });
  
  document.querySelector('#emailReminderSection')?.addEventListener("click", (e) => {
      const tab = e.target.closest('.tab-btn[data-filter]');
      if (tab) {
          emailReminderTabFilter = tab.getAttribute('data-filter');
          const user=activeUser();if(user)renderEmailReminders(user);
      }
  });
  document.getElementById("downloadReminderLogButton")?.addEventListener("click",()=>{const user=activeUser();if(user)downloadReminderReport(user);});
  document.getElementById("btnQuickYesterdayReminder")?.addEventListener("click",()=>{const user=activeUser();if(user)sendYesterdayMissedDarReminder(user);});

  // ── Manager task ──
  document.getElementById("managerTaskForm")?.addEventListener("submit",async event=>{
    event.preventDefault();const viewer=activeUser();if(!viewer||(!isLevel2(viewer)&&directSubordinates(viewer).length===0))return;
    const feedback=document.getElementById("managerTaskFeedback");
    const eligibleTargets=assignableTaskTargets(viewer);
    const bulkRows=parseTaskCsv(document.getElementById("managerTaskBulkCsv")?.value||"");
    if(bulkRows.length){
      const result=await assignTasksFromRows(bulkRows,viewer,eligibleTargets,feedback);
      event.target.reset();renderPortal();showToast("Tasks Assigned", result.message); return;
    }
    const targetId=parseEmployeeSelection(document.getElementById("managerTaskTarget")?.value||"",viewer,"task");const subordinate=eligibleTargets.find(u=>u.employeeId===targetId);
    if(!subordinate){if(feedback)feedback.textContent="Choose a valid reportee.";return;}
    const title=String(document.getElementById("managerTaskTitle")?.value||"").trim();
    const dueDate=String(document.getElementById("managerTaskDueDate")?.value||"");
    if(!title||!dueDate){if(feedback)feedback.textContent="Add a task title and due date, or paste CSV rows.";return;}
    await cloudAssignTask({id:`TSK-${Date.now()}`,targetId,title,notes:String(document.getElementById("managerTaskNotes")?.value||"").trim(),type:String(document.getElementById("managerTaskType")?.value||"internal"),dueDate,assignedBy:viewer.employeeId,createdAt:nowIso(),completed:false});
    const message=`Task assigned to ${subordinate.name}.`;
    addNotification(targetId,`${viewer.name} assigned you a team task.`);event.target.reset();renderPortal();showToast("Task Assigned", message);
  });

  // ── Issue form ──
  document.getElementById("issueForm")?.addEventListener("submit",async event=>{
    event.preventDefault();const viewer=activeUser();if(!viewer||!isLevel1(viewer))return;
    const title=String(document.getElementById("issueTitle")?.value||"").trim();const description=String(document.getElementById("issueDescription")?.value||"").trim();const feedback=document.getElementById("issueFeedback");
    if(!title||!description){if(feedback)feedback.textContent="Add both issue title and details.";return;}
    const item={id:`ISS-${Date.now()}`,title,description,raisedBy:viewer.employeeId,createdAt:nowIso()};
    const next=[item,...issues()];writeStore(STORAGE_KEYS.issues,next);
    try{await db.from('metro_issues').insert([{title,description,raised_by:viewer.employeeId}]);} catch(e){console.error("cloudIssue insert:",e.message);}
    event.target.reset();if(feedback)feedback.textContent="Issue sent to Admin.";showToast("Issue Submitted","Admin can now review the reported issue.");renderPortal();
  });
}

// ─── Session restore ──────────────────────────────────────────
async function restoreSessionIfAny() {
    try {
        const { data: { session }, error } = await db.auth.getSession();
        
        if (session && session.user) {
            const email = session.user.email;
            const employeeId = email.split('@')[0].toUpperCase();
            
            const user = await findUserAsync(employeeId);
            if (user) {
                if (user.isActive === false) {
                    await db.auth.signOut();
                    logoutPortal();
                    return;
                }
                loginPortal(employeeId, user);
            } else {
                logoutPortal();
            }
        } else {
            logoutPortal();
        }
    } catch (err) {
        console.warn("Secure session restore failed:", err);
        logoutPortal();
    }
}

function startHeaderDarTimer() {
  const display = document.getElementById("darTimerDisplay");
  if (!display) return;
  const updateTimer = () => {
    const now = new Date();
    const target = new Date();
    target.setHours(22, 30, 0, 0);
    if (now > target) {
      display.innerHTML = `<span style="color: var(--danger);"><i class="fa-regular fa-circle-xmark"></i> DAR closed for today</span>`;
    } else {
      const diffMs = target - now;
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
      const pad = n => String(n).padStart(2, '0');
      display.innerHTML = `DAR closes in <strong style="font-family: monospace; font-size: 0.95rem; margin-left: 2px;">${pad(hours)}:${pad(minutes)}:${pad(seconds)}</strong>`;
    }
  };
  updateTimer();
  window.setInterval(updateTimer, 1000);
}

// ─── Init ────────────────-------------------------------------
async function initPortal() {
    applyTheme(readStore(STORAGE_KEYS.theme, "light"));
    initThemeToggle();
    bindPortalEvents();
    updateViewportMode();
    
    await initData();
    
    // Check secure Supabase Auth session
    await restoreSessionIfAny();
    scheduleDraftAutoSubmit();
    ensureTodayAutoSubmitCatchup();
    startHeaderDarTimer();

    // Periodic background sync removed to save data egress

    window.setInterval(() => {
        const user = activeUser();
        if (user) renderGhostTyping(user);
    }, 60000);

    window.setInterval(() => {
        const user = activeUser();
        if (user && (isLevel2(user) || directSubordinates(user).length > 0)) {
            renderTeamReports(user);
            if (activeSectionId === "darSection" && !isDarDraftFieldActive()) renderDar(user);
        }
    }, 5000);

    // ==========================================
    // THE FIX: Removed 'refreshAllCloudData()' from these two listeners 
    // to stop the infinite network loop crash!
    // ==========================================
    if (syncBus) {
        syncBus.onmessage = () => {
            if (activePortalUserId) renderPortal();
            else restoreSessionIfAny();
        };
    }

    window.addEventListener("storage", () => {
        if (activePortalUserId) renderPortal();
        else restoreSessionIfAny();
    });
}


window.activeCompleteTaskId = null;
document.getElementById("taskTimeForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if(!window.activeCompleteTaskId) return;
  const hours = parseInt(document.getElementById("taskTimeHours").value) || 0;
  const minutes = parseInt(document.getElementById("taskTimeMinutes").value) || 0;
  if (hours === 0 && minutes === 0) {
    window.alert("Please enter a valid duration.");
    return;
  }
  const id = window.activeCompleteTaskId;
  window.activeCompleteTaskId = null;
  document.getElementById("taskTimeModal")?.classList.add("hidden");
  
  const task = tasks().find(t=>t.id===id);
  const user = activeUser();
  if(!task || !user) return;
  
  await cloudUpdateTaskCompletion(id, true, user);
  
  const taskPoint = {
    id: `PT-${Date.now()}-task`,
    text: `Completed assigned task: ${task.title}`,
    rawText: `Completed assigned task: ${task.title}`,
    totalTime: `${hours}h ${minutes}m`,
    attachmentName: "", attachmentData: "", attachmentSize: "",
    createdAt: nowIso()
  };
  
  await cloudAppendPointsToReport(user, today(), task.type || "internal", task.type === "project" ? task.title : "", [taskPoint]);
  showToast("Task Completed", "Time logged and DAR point added.");
  await refreshAllCloudData();
  renderPortal();
});

document.getElementById("closeTaskTimeModal")?.addEventListener("click", () => {
  document.getElementById("taskTimeModal")?.classList.add("hidden");
  window.activeCompleteTaskId = null;
});

function historyExportRows(user, exportDate) {
  const holiday=holidayForDate(exportDate);
  const submittedMap=new Map(reports().filter(r=>r.date===exportDate&&r.employeeId===user.employeeId).map(r=>[r.employeeId,r]));
  const rows=[["Date","Employee Name","Employee ID","Level","Department","Manager Name","Status","Submitted At","Total Time","DAR Points","Attachments"]];
  const emp=user;
  const report=submittedMap.get(emp.employeeId);
  if(report){
    const pts=(report.points||[]).map((p)=>"• " + (p.rawText||String(p.text||"").replace(/^\d+\.\s*/,"")) + " (" + (p.totalTime||"--") + ")").join("\n\n");
    const atts=(report.points||[]).filter(p=>p.attachmentName).map(p=>p.attachmentName).join(", ");
    rows.push([report.date,report.employeeName||emp.name,report.employeeId,ROLE_LABELS[emp.level]||emp.level,emp.department||"",managerDisplayName(emp),reportStatusDisplay(report),formatDateTime(report.submittedAt),reportTotalTime(report)||"--",pts,atts]);
  }else{
    const leave=typeof leaveForDateAndUser==='function'?leaveForDateAndUser(exportDate, emp.employeeId):null;
    if(leave){
      const leaveText = leave.leaveType === "half" ? `On Leave (Half: ${leave.halfType === 'first' ? '1st' : '2nd'}): ${leave.remarks}` : `On Leave: ${leave.remarks}`;
      rows.push([exportDate,emp.name,emp.employeeId,ROLE_LABELS[emp.level]||emp.level,emp.department||"",managerDisplayName(emp),leaveText,"","","",""]);
    }else if(holiday){
      rows.push([exportDate,emp.name,emp.employeeId,ROLE_LABELS[emp.level]||emp.level,emp.department||"",managerDisplayName(emp),formatHolidayName(holiday),"","","",""]);
    }else{
      rows.push([exportDate,emp.name,emp.employeeId,ROLE_LABELS[emp.level]||emp.level,emp.department||"",managerDisplayName(emp),"No DAR Submitted","","","",""]);
    }
  }
  return rows;
}

function historyExportRowsForDates(user, dateValues) {
  const rows=[["Date","Employee Name","Employee ID","Level","Department","Manager Name","Status","Submitted At","Total Time","DAR Points","Attachments"]];
  const emp=user;
  dateValues.forEach(exportDate=>{
    const holiday=holidayForDate(exportDate);
    const submittedMap=new Map(reports().filter(r=>r.date===exportDate&&r.employeeId===user.employeeId).map(r=>[r.employeeId,r]));
    const report=submittedMap.get(emp.employeeId);
    if(report){
    const pts=(report.points||[]).map((p)=>"• " + (p.rawText||String(p.text||"").replace(/^\d+\.\s*/,"")) + " (" + (p.totalTime||"--") + ")").join("\n\n");
    const atts=(report.points||[]).filter(p=>p.attachmentName).map(p=>p.attachmentName).join(", ");
    rows.push([report.date,report.employeeName||emp.name,report.employeeId,ROLE_LABELS[emp.level]||emp.level,emp.department||"",managerDisplayName(emp),reportStatusDisplay(report),formatDateTime(report.submittedAt),reportTotalTime(report)||"--",pts,atts]);
  }else{
    const leave=typeof leaveForDateAndUser==='function'?leaveForDateAndUser(exportDate, emp.employeeId):null;
    if(leave){
      const leaveText = leave.leaveType === "half" ? `On Leave (Half: ${leave.halfType === 'first' ? '1st' : '2nd'}): ${leave.remarks}` : `On Leave: ${leave.remarks}`;
      rows.push([exportDate,emp.name,emp.employeeId,ROLE_LABELS[emp.level]||emp.level,emp.department||"",managerDisplayName(emp),leaveText,"","","",""]);
    }else if(holiday){
      rows.push([exportDate,emp.name,emp.employeeId,ROLE_LABELS[emp.level]||emp.level,emp.department||"",managerDisplayName(emp),formatHolidayName(holiday),"","","",""]);
    }else{
      rows.push([exportDate,emp.name,emp.employeeId,ROLE_LABELS[emp.level]||emp.level,emp.department||"",managerDisplayName(emp),"No DAR Submitted","","","",""]);
    }
  }
  });
  return rows;
}

async function historyExportPdf(user) {
  const dateStr = document.getElementById("historyFromDate")?.value || today();
  await fetchReportsForDates([dateStr]);
  const rows = historyExportRows(user, dateStr);
  const title = `My DAR Submission Details - ${formatDate(dateStr)}`;
  const tableRows = rows.map((row,index)=>`<tr>${row.map(cell=>exportCellHtml(cell,index===0?"th":"td")).join("")}</tr>`).join("");
  const printable=window.open("","_blank","width=1100,height=800");
  if(!printable){window.alert("Allow pop-ups to export the PDF.");return;}
  printable.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>
    @page{size:A4 landscape;margin:14mm}
    body{font-family:Arial,sans-serif;color:#111;margin:0}
    h1{font-size:20px;margin:0 0 6px}
    p{margin:0 0 14px;color:#555;font-size:12px}
    table{width:100%;border-collapse:collapse;font-size:10px}
    th,td{border:1px solid #ccc;padding:6px;vertical-align:top;text-align:left}
    td{white-space:pre-line}
    th{background:#f2f2f2;font-weight:700}
    tr{break-inside:avoid}
  </style></head><body><h1>${escapeHtml(title)}</h1><p>Exported: ${escapeHtml(formatDateTime(nowIso()))}</p><table>${tableRows}</table><script>window.onload=function(){setTimeout(function(){window.print();},150);};<\/script></body></html>`);
  printable.document.close();
}

async function historyExportWeeklyPdf(user) {
  const dateStr = document.getElementById("historyFromDate")?.value || today();
  const range = weekRangeForDate(new Date(`${dateStr}T00:00:00`));
  const datesArr = datesBetween(range.start, range.end);
  await fetchReportsForDates(datesArr);
  const rows = historyExportRowsForDates(user, datesArr);
  const title = `My Weekly DAR Submission Details - ${formatDate(range.start)} to ${formatDate(range.end)}`;
  const tableRows = rows.map((row,index)=>`<tr>${row.map(cell=>exportCellHtml(cell,index===0?"th":"td")).join("")}</tr>`).join("");
  const printable=window.open("","_blank","width=1100,height=800");
  if(!printable){window.alert("Allow pop-ups to export the PDF.");return;}
  printable.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>
    @page{size:A4 landscape;margin:14mm}
    body{font-family:Arial,sans-serif;color:#111;margin:0}
    h1{font-size:20px;margin:0 0 6px}
    p{margin:0 0 14px;color:#555;font-size:12px}
    table{width:100%;border-collapse:collapse;font-size:9px}
    th,td{border:1px solid #ccc;padding:6px;vertical-align:top;text-align:left}
    td{white-space:pre-line}
    th{background:#f2f2f2;font-weight:700}
    tr{break-inside:avoid}
  </style></head><body><h1>${escapeHtml(title)}</h1><p>Exported: ${escapeHtml(formatDateTime(nowIso()))}</p><table>${tableRows}</table><script>window.onload=function(){setTimeout(function(){window.print();},150);};<\/script></body></html>`);
  printable.document.close();
}

async function historyExportMonthlyPdf(user) {
  const dateStr = document.getElementById("historyFromDate")?.value || today();
  const range = monthRangeForDate(new Date(`${dateStr}T00:00:00`));
  const datesArr = datesBetween(range.start, range.end);
  await fetchReportsForDates(datesArr);
  const rows = historyExportRowsForDates(user, datesArr);
  const title = `My Monthly DAR Submission Details - ${formatDate(range.start)} to ${formatDate(range.end)}`;
  const tableRows = rows.map((row,index)=>`<tr>${row.map(cell=>exportCellHtml(cell,index===0?"th":"td")).join("")}</tr>`).join("");
  const printable=window.open("","_blank","width=1200,height=800");
  if(!printable){window.alert("Allow pop-ups to export the PDF.");return;}
  printable.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>
    @page{size:A4 landscape;margin:12mm}
    body{font-family:Arial,sans-serif;color:#111;margin:0}
    h1{font-size:20px;margin:0 0 6px}
    p{margin:0 0 14px;color:#555;font-size:12px}
    table{width:100%;border-collapse:collapse;font-size:8px}
    th,td{border:1px solid #ccc;padding:5px;vertical-align:top;text-align:left}
    td{white-space:pre-line}
    th{background:#f2f2f2;font-weight:700}
    tr{break-inside:avoid}
  </style></head><body><h1>${escapeHtml(title)}</h1><p>Company holidays are marked as H - Holiday; Sundays are not marked H | Exported: ${escapeHtml(formatDateTime(nowIso()))}</p><table>${tableRows}</table><script>window.onload=function(){setTimeout(function(){window.print();},150);};<\/script></body></html>`);
  printable.document.close();
}

async function historyExportExcel(user) {
  const dateStr = document.getElementById("historyFromDate")?.value || today();
  const rows = historyExportRows(user, dateStr);
  exportRowsToExcel(`metro-dar-my-${dateStr}.xls`, `My Daily DAR Export`, formatDate(dateStr), rows, user);
}

async function historyExportWeeklyExcel(user) {
  const dateStr = document.getElementById("historyFromDate")?.value || today();
  const range = weekRangeForDate(new Date(`${dateStr}T00:00:00`));
  const datesArr = datesBetween(range.start, range.end);
  await fetchReportsForDates(datesArr);
  const rows = historyExportRowsForDates(user, datesArr);
  exportRowsToExcel(`metro-dar-my-week-${range.start}-to-${range.end}.xls`, `My Weekly DAR Export`, `${formatDate(range.start)} to ${formatDate(range.end)}`, rows, user);
}

async function historyExportMonthlyExcel(user) {
  const dateStr = document.getElementById("historyFromDate")?.value || today();
  const range = monthRangeForDate(new Date(`${dateStr}T00:00:00`));
  const datesArr = datesBetween(range.start, range.end);
  await fetchReportsForDates(datesArr);
  const rows = historyExportRowsForDates(user, datesArr);
  exportRowsToExcel(`metro-dar-my-month-${range.start}-to-${range.end}.xls`, `My Monthly DAR Export`, `${formatDate(range.start)} to ${formatDate(range.end)}`, rows, user);
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("historyExportMenuButton")?.addEventListener("click",event=>{
    event.stopPropagation();
    const menu=document.getElementById("historyExportMenu");const button=document.getElementById("historyExportMenuButton");
    const willOpen=menu?.classList.contains("hidden");
    menu?.classList.toggle("hidden",!willOpen);
    button?.setAttribute("aria-expanded",willOpen?"true":"false");
  });
  document.getElementById("historyExportPdfButton")?.addEventListener("click",()=>{const user=activeUser();if(user)historyExportPdf(user);document.getElementById("historyExportMenu")?.classList.add("hidden");document.getElementById("historyExportMenuButton")?.setAttribute("aria-expanded","false");});
  document.getElementById("historyExportExcelButton")?.addEventListener("click",()=>{const user=activeUser();if(user)historyExportExcel(user);document.getElementById("historyExportMenu")?.classList.add("hidden");document.getElementById("historyExportMenuButton")?.setAttribute("aria-expanded","false");});
  document.getElementById("historyExportWeeklyPdfButton")?.addEventListener("click",()=>{const user=activeUser();if(user)historyExportWeeklyPdf(user);document.getElementById("historyExportMenu")?.classList.add("hidden");document.getElementById("historyExportMenuButton")?.setAttribute("aria-expanded","false");});
  document.getElementById("historyExportWeeklyExcelButton")?.addEventListener("click",()=>{const user=activeUser();if(user)historyExportWeeklyExcel(user);document.getElementById("historyExportMenu")?.classList.add("hidden");document.getElementById("historyExportMenuButton")?.setAttribute("aria-expanded","false");});
  document.getElementById("historyExportMonthlyPdfButton")?.addEventListener("click",()=>{const user=activeUser();if(user)historyExportMonthlyPdf(user);document.getElementById("historyExportMenu")?.classList.add("hidden");document.getElementById("historyExportMenuButton")?.setAttribute("aria-expanded","false");});
  document.getElementById("historyExportMonthlyExcelButton")?.addEventListener("click",()=>{const user=activeUser();if(user)historyExportMonthlyExcel(user);document.getElementById("historyExportMenu")?.classList.add("hidden");document.getElementById("historyExportMenuButton")?.setAttribute("aria-expanded","false");});
  
  document.addEventListener("click",event=>{
    const target=event.target;if(!(target instanceof HTMLElement))return;
    if(target.closest("#historyExportDropdown"))return;
    document.getElementById("historyExportMenu")?.classList.add("hidden");
    document.getElementById("historyExportMenuButton")?.setAttribute("aria-expanded","false");
  });
});

document.addEventListener("DOMContentLoaded",initPortal);

// Admin Edit Time & Hour Validation Hooks
document.addEventListener("input", (e) => {
  if (e.target.id === "mobilePointHours" || e.target.id === "pointHours" || e.target.id === "taskTimeHours") {
    if (parseInt(e.target.value) > 8) {
      window.alert("You cannot log more than 8 hours. Please verify you didn't accidentally put minutes in the hours box.");
      e.target.value = "";
      const user = activeUser();
      if(user && typeof saveCurrentDraftFromInputs === 'function') saveCurrentDraftFromInputs(user);
    }
  }
});

document.addEventListener("click", async (e) => {
  const adminEditBtn = e.target.closest("[data-admin-edit-time]");
  if (adminEditBtn) {
    const user = activeUser();
    if (!user || user.level !== "admin") return;
    
    const [reportId, pointId] = adminEditBtn.getAttribute("data-admin-edit-time").split("|");
    const rep = reports().find(r => r.id === reportId);
    if (!rep) return;
    const pt = rep.points.find(p => p.id === pointId);
    if (!pt) return;
    
    const timeStr = window.prompt(`Admin Edit Time for: ${pt.rawText || pt.text}\nCurrent Time: ${pt.totalTime}\n\nEnter new time (e.g. "2h 30m"):`, pt.totalTime || "");
    if (timeStr !== null && timeStr.trim() !== "") {
      const parts = parseDurationParts(timeStr);
      pt.totalTime = `${parts.hours}h ${parts.minutes}m`;
      const result = await cloudUpsertReport(rep);
      if (result && result.ok) {
        showToast("Time Updated", "The submission time has been updated by admin.");
        await refreshAllCloudData();
        renderPortal();
      } else {
        window.alert(`Could not update report: ${result?.error?.message || "Unknown error"}`);
      }
    }
  }
});








// ==========================================
// LEAVE FEATURE LOGIC
// ==========================================

async function saveLeave(leave) {
  const row = leaveToSupabaseRow(leave);
  const { data, error } = await db
    .from('metro_leaves')
    .upsert([row], { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    console.error("Failed to save leave to cloud:", error.message);
    throw error;
  }

  // Update the local cache only after Supabase confirms the write. This avoids
  // duplicate entries and makes an immediate dashboard refresh deterministic.
  const savedLeave = supabaseRowToLeave(data || row);
  const currentLeaves = leaves().filter(item => item.id !== savedLeave.id);
  currentLeaves.unshift(savedLeave);
  writeStore(STORAGE_KEYS.leaves, currentLeaves);
  return savedLeave;
}

function leavesForUser(employeeId) {
  return leaves().filter(l => l.employeeId === employeeId);
}

function leaveForDateAndUser(dateStr, employeeId) {
  const userLeaves = leavesForUser(employeeId);
  const targetDate = new Date(dateStr);
  targetDate.setHours(0,0,0,0);
  
  for (const l of userLeaves) {
    const from = new Date(l.startDate);
    from.setHours(0,0,0,0);
    const to = new Date(l.endDate);
    to.setHours(0,0,0,0);
    if (targetDate >= from && targetDate <= to) {
      return l;
    }
  }
  return null;
}

function renderObsoleteLeaveSection(user) {
  const appContainer = document.getElementById("leaveApplicationContainer");
  const revContainer = document.getElementById("leaveReviewContainer");
  if (!appContainer || !revContainer) return;
  
  if (isLevel1(user) || isAdmin(user)) {
    // Show Manager Review Dashboard
    appContainer.classList.add("hidden");
    revContainer.classList.remove("hidden");
    
    const allLeaves = leaves();
    const getEmpName = (l) => { 
      const u = users().find(u => u.employeeId === l.employeeId);
      return u ? u.name : l.employeeName; 
    };
    const todayStr = dateKey(new Date());
    
    // Process today's leaves
    const onLeaveToday = allLeaves.filter(l => {
      if (l.leaveType === "single" || l.leaveType === "half") return (l.startDate || "") === todayStr;
      return todayStr >= (l.startDate || "") && todayStr <= (l.endDate || "");
    });
    
    // Process upcoming leaves (leaves that start tomorrow or later)
    const futureLeaves = allLeaves.filter(l => {
      return l.startDate > todayStr;
    });
    
    // Helper to format manager lists
    const formatLeaveItem = (l) => {
      const emp = users().find(u => u.employeeId === l.employeeId);
      const name = emp ? emp.name : l.employeeId;
      const t = l.leaveType === "half" ? ` (Half: ${l.halfType === 'first' ? '1st' : '2nd'})` : "";
      const d = (l.leaveType === "multi" || !l.leaveType) ? `${formatDate(l.startDate)} to ${formatDate(l.endDate)}` : formatDate(l.startDate);
      return `<li style="padding: 6px 0; border-bottom: 1px solid var(--line);"><strong style="color:var(--text)">${escapeHtml(name)}</strong><br><span style="font-size: 0.9rem;">${escapeHtml(d)}${t} - Reason: ${escapeHtml(l.remarks)}</span></li>`;
    };
    
    document.getElementById("leaveReviewTodayCount").textContent = onLeaveToday.length;
    document.getElementById("leaveReviewTodayList").innerHTML = onLeaveToday.length ? onLeaveToday.map(formatLeaveItem).join("") : "<li style='list-style:none;'>None</li>";
    
    document.getElementById("leaveReviewFutureCount").textContent = futureLeaves.length;
    document.getElementById("leaveReviewFutureList").innerHTML = futureLeaves.length ? futureLeaves.map(formatLeaveItem).join("") : "<li style='list-style:none;'>None</li>";
    
  } else {
    // Show Application Form for Level 2 & 3
    appContainer.classList.remove("hidden");
    revContainer.classList.add("hidden");
    
    const list = document.getElementById("leaveHistoryList");
    if (!list) return;
    const userLeaves = leavesForUser(user.employeeId).sort((a,b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    
    if (userLeaves.length === 0) {
      list.innerHTML = "<p style='color: var(--text-muted); font-family: Barlow, sans-serif;'>No leave applications found.</p>";
      return;
    }
    
    list.innerHTML = userLeaves.map(l => {
      let dateRange, diffDays, halfText = "";
      if (l.leaveType === "half") {
        dateRange = formatDate(l.startDate);
        diffDays = 0.5;
        halfText = ` (${l.halfType === "first" ? "1st Half" : "2nd Half"})`;
      } else if (l.leaveType === "single") {
        dateRange = formatDate(l.startDate);
        diffDays = 1;
      } else {
        const d1 = new Date(l.startDate);
        const d2 = new Date(l.endDate);
        const diffTime = Math.abs(d2 - d1);
        diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        dateRange = d1.getTime() === d2.getTime() ? formatDate(l.startDate) : formatDate(l.startDate) + " to " + formatDate(l.endDate);
      }
      
      return `<div class="leave-history-card">
        <div class="leave-history-header">
          <span class="leave-history-dates">${escapeHtml(dateRange)}${halfText}</span>
          <span class="leave-history-days">${diffDays} ${diffDays === 1 ? 'Day' : 'Days'}</span>
        </div>
        <div class="leave-history-remarks"><strong>Reason:</strong> ${escapeHtml(l.remarks)}</div>
        <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">Applied: ${escapeHtml(formatDate(l.submittedAt))}</div>
      </div>`;
    }).join("");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const leaveType = document.getElementById("leaveType");
  const dateGridMulti = document.getElementById("leaveDateGridMulti");
  const dateGridSingle = document.getElementById("leaveDateGridSingle");
  const halfTypeGroup = document.getElementById("leaveHalfTypeGroup");
  
  const fromDate = document.getElementById("leaveFromDate");
  const toDate = document.getElementById("leaveToDate");
  const singleDate = document.getElementById("leaveSingleDate");
  const daysCount = document.getElementById("leaveDaysCount");
  
  const form = document.getElementById("leaveApplicationForm");
  const feedback = document.getElementById("leaveFeedback");
  
  const leaveHistoryBtn = document.getElementById("leaveHistoryBtn");
  const leaveHistorySearchPanel = document.getElementById("leaveHistorySearchPanel");
  const leaveHistorySearchBtn = document.getElementById("leaveHistorySearchBtn");
  const leaveHistoryDate = document.getElementById("leaveHistoryDate");
  const leaveHistorySearchResult = document.getElementById("leaveHistorySearchResult");

  if(leaveHistoryBtn) {
    leaveHistoryBtn.addEventListener("click", () => {
      leaveHistorySearchPanel.classList.toggle("hidden");
    });
  }

  if(leaveHistorySearchBtn) {
    leaveHistorySearchBtn.addEventListener("click", () => {
      if(!leaveHistoryDate.value) {
        leaveHistorySearchResult.innerHTML = "<span style='color:red;'>Please select a date.</span>";
        return;
      }
      const targetStr = leaveHistoryDate.value;
      const allLeaves = leaves();
    const getEmpName = (l) => { 
      const u = users().find(u => u.employeeId === l.employeeId);
      return u ? u.name : l.employeeName; 
    };
      const onLeaveThatDay = allLeaves.filter(l => {
        if (l.leaveType === "single" || l.leaveType === "half") return (l.startDate || "") === targetStr;
        return targetStr >= (l.startDate || "") && targetStr <= (l.endDate || "");
      });
      if(onLeaveThatDay.length === 0) {
        leaveHistorySearchResult.innerHTML = `No employees were on leave on ${formatDate(targetStr)}.`;
      } else {
        const formatItem = (l) => {
          const emp = users().find(u => u.employeeId === l.employeeId);
          const name = emp ? emp.name : l.employeeId;
          const t = l.leaveType === "half" ? ` (Half: ${l.halfType === 'first' ? '1st' : '2nd'})` : "";
          return `<li style="padding: 4px 0;"><strong style="color:var(--text);">${escapeHtml(name)}</strong><span style="font-size: 0.9rem;">${t} - Reason: ${escapeHtml(l.remarks)}</span></li>`;
        };
        leaveHistorySearchResult.innerHTML = `<ol style="padding-left: 20px; margin: 0; color: var(--text);">${onLeaveThatDay.map(formatItem).join("")}</ol>`;
      }
    });
  }
  
  function updateUI() {
    if(!leaveType) return;
    const type = leaveType.value;
    if (type === "multi") {
      dateGridMulti.classList.remove("hidden");
      dateGridSingle.classList.add("hidden");
      halfTypeGroup.classList.add("hidden");
      if(fromDate) fromDate.required = true;
      if(toDate) toDate.required = true;
      if(singleDate) singleDate.required = false;
    } else if (type === "single") {
      dateGridMulti.classList.add("hidden");
      dateGridSingle.classList.remove("hidden");
      halfTypeGroup.classList.add("hidden");
      if(fromDate) fromDate.required = false;
      if(toDate) toDate.required = false;
      if(singleDate) singleDate.required = true;
    } else if (type === "half") {
      dateGridMulti.classList.add("hidden");
      dateGridSingle.classList.remove("hidden");
      halfTypeGroup.classList.remove("hidden");
      if(fromDate) fromDate.required = false;
      if(toDate) toDate.required = false;
      if(singleDate) singleDate.required = true;
    }
    updateDays();
  }
  
  if(leaveType) leaveType.addEventListener("change", updateUI);
  
  function updateDays() {
    if (!leaveType || !daysCount) return;
    const type = leaveType.value;
    
    if (type === "half") {
      if(singleDate && singleDate.value) {
        daysCount.textContent = "Number of Days: 0.5";
        daysCount.style.color = "var(--maroon)";
      } else {
        daysCount.textContent = "Number of Days: 0";
      }
    } else if (type === "single") {
      if(singleDate && singleDate.value) {
        daysCount.textContent = "Number of Days: 1";
        daysCount.style.color = "var(--maroon)";
      } else {
        daysCount.textContent = "Number of Days: 0";
      }
    } else {
      if (fromDate && toDate && fromDate.value && toDate.value) {
        const d1 = new Date(fromDate.value);
        const d2 = new Date(toDate.value);
        if (d2 < d1) {
          daysCount.textContent = "Invalid date range";
          daysCount.style.color = "red";
        } else {
          const diffTime = Math.abs(d2 - d1);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
          daysCount.textContent = "Number of Days: " + diffDays;
          daysCount.style.color = "var(--maroon)";
        }
      } else {
        daysCount.textContent = "Number of Days: 0";
      }
    }
  }
  
  if (fromDate) fromDate.addEventListener("change", updateDays);
  if (toDate) toDate.addEventListener("change", updateDays);
  if (singleDate) singleDate.addEventListener("change", updateDays);
  
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const user = activeUser();
      if (!user) return;
      
      const type = leaveType.value;
      let d1, d2, halfVal = null;
      
      if (type === "multi") {
        d1 = fromDate.value;
        d2 = toDate.value;
        const dt1 = new Date(d1);
        const dt2 = new Date(d2);
        if (dt2 < dt1) {
          feedback.textContent = "End date cannot be before start date.";
          feedback.style.color = "red";
          return;
        }
      } else {
        d1 = singleDate.value;
        d2 = singleDate.value;
        if (type === "half") {
          halfVal = document.getElementById("leaveHalfType").value;
        }
      }
      
      const remarks = document.getElementById("leaveRemarks").value;
      const leave = {
        id: "LV-" + Date.now(),
        employeeId: user.employeeId,
        leaveType: type,
        startDate: d1,
        endDate: d2,
        halfType: halfVal,
        remarks: remarks,
        submittedAt: nowIso()
      };
      
      saveLeave(leave);
      form.reset();
      updateUI(); // Resets ui back to multi or default
      
      feedback.textContent = "Leave application submitted successfully.";
      feedback.style.color = "green";
      setTimeout(() => feedback.textContent = "", 3000);
      showToast("Leave Submitted", "Your leave application has been recorded.");
      
      renderPortal(); // Re-render to update history and heatmap
    });
  }
});












document.getElementById("entityCreateForm")?.addEventListener("submit", async event => {
  event.preventDefault();
  const viewer = activeUser();
  if(!viewer || !isAdmin(viewer)) return;
  const name = String(document.getElementById("entityNameInput")?.value||"").trim();
  if (!name) return;
  
  const fb = document.getElementById("entityFeedback");
  if (fb) fb.textContent = "Creating entity...";
  
  await cloudCreateEntity(name);
  
  if (fb) fb.textContent = `Entity "${name}" created successfully.`;
  event.target.reset();
  await refreshAllCloudData();
  renderPortal();
});


document.addEventListener("DOMContentLoaded", () => {
  document.addEventListener("click", e => {
    // KPI Arrows
    const kpiArrow = e.target.closest('.kpi-arrow');
    if (kpiArrow) {
      const grp = kpiArrow.getAttribute("data-drawer-group");
      openComplianceDrawer('Custom', grp, 'daily');
    }

    // Action Arrows in Tables
    const actionArrow = e.target.closest('[data-open-drawer]');
    if (actionArrow) {
      const [gType, gName, period] = actionArrow.getAttribute("data-open-drawer").split("|");
      openComplianceDrawer(gType, gName, period);
    }

    // Accordions
    const accordionHead = e.target.closest('[data-toggle-accordion]');
    if (accordionHead) {
      accordionHead.closest('.dept-accordion').classList.toggle('expanded');
    }

    // Period Tabs (Entity)
    const entTab = e.target.closest('#entityPeriodTabs button');
    if (entTab) {
      document.querySelectorAll('#entityPeriodTabs button').forEach(b=>b.classList.remove('active'));
      entTab.classList.add('active');
      currentEntityPeriod = entTab.getAttribute('data-period');
      renderComplianceEntities(activeUser());
    }

    // Period Tabs (Dept)
    const deptTab = e.target.closest('#deptPeriodTabs button');
    if (deptTab) {
      document.querySelectorAll('#deptPeriodTabs button').forEach(b=>b.classList.remove('active'));
      deptTab.classList.add('active');
      currentDeptPeriod = deptTab.getAttribute('data-period');
      renderComplianceDepartments(activeUser());
    }

    // Drawer Close
    const closeDrawer = e.target.closest('#btnDrawerClose');
    if (closeDrawer) {
      document.getElementById("complianceDrawerOverlay")?.classList.remove("active");
    }

    // Drawer Tabs
    const dTab = e.target.closest('#drawerTabs button');
    if (dTab) {
      currentDrawerState.filter = dTab.getAttribute('data-filter');
      renderDrawerContent();
    }
    
    // Drawer Points Toggle
    const ptsToggle = e.target.closest('.drawer-points-toggle');
    if (ptsToggle) {
       const empId = ptsToggle.getAttribute("data-pts-id");
       const panel = document.getElementById(`drawerPts-${empId}`);
       if (panel) {
           panel.classList.toggle("hidden");
           const icon = ptsToggle.querySelector('i');
           if (icon) {
               icon.classList.toggle('fa-chevron-down');
               icon.classList.toggle('fa-chevron-up');
           }
       }
    }
    
    // Dashboard Export button
    if (e.target.closest('#btnDashboardExport')) {
        const u = activeUser(); if(u) exportExcel(u);
    }
    
    // Entity Export button
    if (e.target.closest('#btnEntityExport')) {
        const u = activeUser(); 
        if(u) {
            const type = document.getElementById("entityExportType")?.value || "excel";
            if (currentEntityPeriod === 'daily') type === 'excel' ? exportExcel(u) : exportPdf(u);
            else if (currentEntityPeriod === 'weekly') type === 'excel' ? exportWeeklyExcel(u) : exportWeeklyPdf(u);
            else type === 'excel' ? exportMonthlyExcel(u) : exportMonthlyPdf(u);
        }
    }
    
    // Drawer Export Excel
    if (e.target.closest('#btnDrawerExportExcel')) {
        const u = activeUser(); 
        if(u) {
            const list = getDrawerUsersList(u);
            if (currentDrawerState.period === 'daily') exportExcel(u, list);
            else if (currentDrawerState.period === 'weekly') exportWeeklyExcel(u, list);
            else exportMonthlyExcel(u, list);
        }
    }
    
    // Drawer Export PDF
    if (e.target.closest('#btnDrawerExportPdf')) {
        const u = activeUser(); 
        if(u) {
            const list = getDrawerUsersList(u);
            if (currentDrawerState.period === 'daily') exportPdf(u, list);
            else if (currentDrawerState.period === 'weekly') exportWeeklyPdf(u, list);
            else exportMonthlyPdf(u, list);
        }
    }
  });

  // Drawer Search
  document.getElementById('drawerSearchInput')?.addEventListener('input', (e) => {
    currentDrawerState.search = e.target.value;
    renderDrawerContent();
  });

  // Top level Date change
  document.getElementById('complianceDateFilter')?.addEventListener('change', (e) => {
    complianceDateFilter = e.target.value;
    renderCompliance(activeUser());
  });
});


window.deleteAdminDarPoint = async function(reportId, pointId) {
    if(!confirm('Are you sure you want to delete this point?')) return;
    const rep = reports().find(r => r.id === reportId);
    if(!rep) return;
    const newPoints = rep.points.filter(p => p.id !== pointId);
    const { error } = await db.from('metro_reports').update({ points: newPoints, updated_at: nowIso() }).eq('id', reportId);
    if(!error) {
        showToast('Point Deleted', 'DAR point deleted successfully.');
        await refreshAllCloudData();
        const activeSection = document.getElementById('complianceDrawerOverlay');
        if(activeSection && activeSection.classList.contains('active')) renderDrawerContent();
    } else {
        alert('Failed to delete point: ' + error.message);
    }
};

window.editAdminDarDate = async function(reportId) {
    const rep = reports().find(r => r.id === reportId);
    if(!rep) return;
    const newDate = prompt('Enter new date (YYYY-MM-DD):', rep.date);
    if(!newDate || newDate === rep.date) return;
    if(!/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
        alert('Invalid date format. Use YYYY-MM-DD');
        return;
    }
    const { error } = await db.from('metro_reports').update({ report_date: newDate, updated_at: nowIso() }).eq('id', reportId);
    if(!error) {
        showToast('Date Updated', 'DAR date updated successfully.');
        await refreshAllCloudData();
        const activeSection = document.getElementById('complianceDrawerOverlay');
        if(activeSection && activeSection.classList.contains('active')) renderDrawerContent();
    } else {
        alert('Failed to change date: ' + error.message);
    }
};


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
        // Find existing user by Employee ID (various casing in sheet)
        const rowEmpId = row["Employee ID"] || row["employee_id"] || row["EmployeeId"];
        if (!rowEmpId) continue;
        
        const existingUser = currentUsers.find(u => u.employeeId.toUpperCase() === String(rowEmpId).toUpperCase());
        if (!existingUser) continue; // "should not create one more new data" -> skip if not found
        
        // Merge new data if provided in the Excel sheet
        const mergedUser = { ...existingUser };
        
        if (row["Role"]) mergedUser.role = row["Role"];
        if (row["Work Location"]) mergedUser.location = row["Work Location"];
        if (row["Official Mobile"]) mergedUser.officialPhone = String(row["Official Mobile"]);
        if (row["Personal Num"]) mergedUser.personalPhone = String(row["Personal Num"]);
        if (row["Work E-Mail"]) mergedUser.email = row["Work E-Mail"];
        if (row["Operational Manager Name"]) mergedUser.managerId = row["Operational Manager Name"];
        if (row["Entity Name"]) mergedUser.entity = row["Entity Name"];
        if (row["Department"]) mergedUser.department = row["Department"];
        if (row["Level"]) mergedUser.level = String(row["Level"]).toLowerCase() === 'admin' ? 'admin' : String(row["Level"]).replace(/\D/g, '') || "3";
        if (row["Name"]) mergedUser.name = row["Name"];
        
        toUpsert.push(mergedUser);
        updatedCount++;
      }
      
      if (toUpsert.length === 0) {
        showToast("No Changes", "No valid existing employees were found in the sheet.");
        event.target.value = '';
        return;
      }
      
      showToast("Syncing...", `Updating ${updatedCount} users in cloud. This may take a few seconds...`);
      
      let successCount = 0;
      for (const u of toUpsert) {
         try {
           await cloudSaveUser(u);
           successCount++;
         } catch(e) {
           console.error("Failed saving user", u.employeeId, e);
         }
      }
      
      showToast("Success", `Successfully updated ${successCount} user(s).`);
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


// =========================================================================
// VERSION CONTROL LOGIC
// =========================================================================
let currentAppVersion = "V1.0.0";
let currentVersionNotes = [];


function loadVersionData() {
  const savedVersion = localStorage.getItem("appVersion");
  if (savedVersion) currentAppVersion = savedVersion;
  
  const savedNotes = localStorage.getItem("appVersionNotes");
  if (savedNotes) {
    try { currentVersionNotes = JSON.parse(savedNotes); } catch(e){}
  }
  
  // Update UI
  const verEls = document.querySelectorAll('.version-number');
  verEls.forEach(el => el.textContent = currentAppVersion);

  // Update live admin display if present
  const liveVer = document.getElementById("liveVersionNumber");
  if (liveVer) liveVer.textContent = currentAppVersion;
  
  const liveNotes = document.getElementById("liveVersionNotesList");
  if (liveNotes) {
     if (currentVersionNotes && currentVersionNotes.length > 0) {
         liveNotes.innerHTML = currentVersionNotes.map(n => "<li>" + escapeHtml(n) + "</li>").join("");
     } else {
         liveNotes.innerHTML = "<li>No release notes provided.</li>";
     }
  }
}

function initVersionControl() {
  loadVersionData();
  
  // Admin save button
  const saveBtn = document.getElementById("saveVersionBtn");
  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      const verInput = document.getElementById("adminVersionInput");
      const notesInput = document.getElementById("adminVersionNotes");
      
      if (!verInput.value.trim()) return alert("Please enter a version number.");
      
      const newVer = verInput.value.trim();
      const newNotes = notesInput.value.split("\n").filter(n => n.trim().length > 0);
      
      localStorage.setItem("appVersion", newVer);
      localStorage.setItem("appVersionNotes", JSON.stringify(newNotes));
      
      loadVersionData();
      showToast("Version details updated successfully!");
      verInput.value = '';
      notesInput.value = '';
    });
  }
  
  // Clicks on version number to show modal
  document.addEventListener("click", (e) => {
    if (e.target.closest(".version-number") || e.target.closest(".whats-new-arrow-label")) {
      const modal = document.getElementById("versionModal");
      const title = document.getElementById("modalVersionTitle");
      const list = document.getElementById("modalVersionList");
      
      if (modal && title && list) {
        title.textContent = currentAppVersion;
        if (currentVersionNotes.length === 0) {
          list.innerHTML = '<li style="margin-bottom: 8px;">No new updated</li>';
        } else {
          list.innerHTML = currentVersionNotes.map(note => `<li style="margin-bottom: 8px;">${escapeHtml(note)}</li>`).join('');
        }
        modal.classList.remove("hidden");
      }
    }
  });
  
  const closeBtn = document.getElementById("closeVersionModal");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      document.getElementById("versionModal").classList.add("hidden");
    });
  }
}

// Attach initVersionControl to DOMContentLoaded
document.addEventListener("DOMContentLoaded", initVersionControl);


// =========================================================================
// ACTIVE LEAVE MANAGEMENT LOGIC
// =========================================================================
function renderLeaveSection(user) {
  const empView = document.getElementById("leaveEmployeeView");
  const mgrView = document.getElementById("leaveManagerView");
  const historyBtn = document.getElementById("btnLeaveHistoryAdmin");
  const exportBtn = document.getElementById("btnLeaveExport");
  const exportMonth = document.getElementById("leaveExportMonth");
  // Set default export month to current month
  if (exportMonth && !exportMonth.value) {
    const today = new Date();
    exportMonth.value = today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, '0');
  }
  
  if (!empView || !mgrView) return;
  
  if (canManageLeaves(user)) {
    // Show Manager Dashboard
    empView.classList.add("hidden");
    mgrView.classList.remove("hidden");
    if (historyBtn) historyBtn.classList.remove("hidden");
    if (exportBtn) exportBtn.classList.remove("hidden");
    if (exportMonth) exportMonth.classList.remove("hidden");
    
    const allLeaves = leaves();
    const getEmpName = (l) => { 
      const u = users().find(u => u.employeeId === l.employeeId);
      return u ? u.name : l.employeeName; 
    };
    const todayStr = dateKey(new Date());
    
    const onLeaveToday = allLeaves.filter(l => {
      if (l.leaveType === "single" || l.leaveType === "half") return (l.startDate || "") === todayStr;
      return todayStr >= (l.startDate || "") && todayStr <= (l.endDate || "");
    });
    
    const futureLeaves = allLeaves.filter(l => {
      return (l.startDate || "") > todayStr;
    }).sort((a,b) => (a.startDate || "").localeCompare(b.startDate || ""));
    
    const todayContainer = document.getElementById("leaveManagerTodayList");
    if (todayContainer) {
      if (onLeaveToday.length === 0) {
        todayContainer.innerHTML = '<div class="empty-state">No one is on leave today.</div>';
      } else {
        todayContainer.innerHTML = onLeaveToday.map(l => `
          <div class="stack-item" style="border-left: 3px solid var(--maroon);">
            <div style="font-weight:bold;">${escapeHtml(getEmpName(l))} (${escapeHtml(l.employeeId)})</div>
            <div style="font-size:0.8rem; color:#666;">${l.leaveType === 'half' ? 'Half Day ('+l.whichHalf+')' : (l.leaveType === 'multi' ? 'Multi-day' : 'Full Day')}</div>
            <div style="font-size:0.85rem; margin-top:4px; font-style:italic;">"${escapeHtml(l.remarks)}"</div>
          </div>
        `).join('');
      }
    }
    
    const futureContainer = document.getElementById("leaveManagerFutureList");
    if (futureContainer) {
      if (futureLeaves.length === 0) {
        futureContainer.innerHTML = '<div class="empty-state">No upcoming leaves scheduled.</div>';
      } else {
        futureContainer.innerHTML = futureLeaves.map(l => `
          <div class="stack-item" style="border-left: 3px solid #2f9e44;">
            <div style="font-weight:bold;">${escapeHtml(getEmpName(l))} (${escapeHtml(l.employeeId)})</div>
            <div style="font-size:0.8rem; color:#666;">${l.startDate} ${l.leaveType==='multi' ? 'to '+l.endDate : ''} (${l.leaveType})</div>
            <div style="font-size:0.85rem; margin-top:4px; font-style:italic;">"${escapeHtml(l.remarks)}"</div>
          </div>
        `).join('');
      }
    }

    const pastLeaves = allLeaves.filter(l => {
      return (l.startDate || "") < todayStr && (l.endDate || l.startDate || "") < todayStr;
    }).sort((a,b) => (b.startDate || "").localeCompare(a.startDate || "")); // Sort descending
    
    const pastContainer = document.getElementById("leaveManagerPastList");
    if (pastContainer) {
      if (pastLeaves.length === 0) {
        pastContainer.innerHTML = '<div class="empty-state">No past leaves found.</div>';
      } else {
        pastContainer.innerHTML = pastLeaves.map(l => `
          <div class="stack-item" style="border-left: 3px solid #888;">
            <div style="font-weight:bold;">${escapeHtml(getEmpName(l))} (${escapeHtml(l.employeeId)})</div>
            <div style="font-size:0.8rem; color:var(--muted);">${l.startDate || "Unknown"} ${l.leaveType==='multi' ? 'to '+(l.endDate || "") : ''} (${l.leaveType})</div>
            <div style="font-size:0.85rem; margin-top:4px; font-style:italic;">"${escapeHtml(l.remarks)}"</div>
          </div>
        `).join('');
      }
    }

    
  } else {
    // Show Employee Form & History
    empView.classList.remove("hidden");
    mgrView.classList.add("hidden");
    if (historyBtn) historyBtn.classList.add("hidden");
    if (exportBtn) exportBtn.classList.add("hidden");
    if (exportMonth) exportMonth.classList.add("hidden");
    
    const myLeaves = leaves().filter(l => l.employeeId === user.employeeId).sort((a,b) => b.timestamp - a.timestamp);
    const histContainer = document.getElementById("leaveHistoryList");
    if (histContainer) {
      if (myLeaves.length === 0) {
        histContainer.innerHTML = '<div class="empty-state">No leave history found.</div>';
      } else {
        histContainer.innerHTML = myLeaves.map(l => `
          <div class="stack-item">
            <div style="display:flex; justify-content:space-between;">
               <strong style="color:var(--maroon);">${(l.leaveType||'').toUpperCase()} LEAVE</strong>
               <span style="font-size:0.75rem; color:#888;">${new Date(l.timestamp || l.submittedAt || Date.now()).toLocaleDateString()}</span>
            </div>
            <div style="font-size:0.85rem; margin-top:4px;">
              Date(s): ${l.startDate || "Unknown"} ${l.leaveType==='multi' ? ' to ' + (l.endDate || "") : ''} ${l.leaveType==='half' ? '('+l.whichHalf+')' : ''}
            </div>
            <div style="font-size:0.85rem; margin-top:4px; font-style:italic; color:#555;">
              Reason: ${escapeHtml(l.remarks)}
            </div>
          </div>
        `).join('');
      }
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // Duration Mode Logic
  const modeSelect = document.getElementById("leaveDurationMode");
  const fromDateGroup = document.getElementById("leaveFromDateGroup");
  const toDateGroup = document.getElementById("leaveToDateGroup");
  const halfGroup = document.getElementById("leaveHalfTypeGroup");
  const toDateInput = document.getElementById("leaveToDate");
  const dateLabel = document.getElementById("leaveDateLabel");
  
  const leaveForm = document.getElementById("leaveForm");
  if (leaveForm) {
    leaveForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const user = activeUser();
      if (!user) {
        window.alert("Your session has expired. Please sign in again before submitting leave.");
        return;
      }
      if (canManageLeaves(user)) return;
      
      // Form validity is handled by native browser submit
      
      const mode = document.getElementById("leaveDurationMode").value;
      const start = document.getElementById("leaveFromDate").value;
      const end = mode === "multi" ? document.getElementById("leaveToDate").value : start;
      const half = mode === "half" ? document.getElementById("leaveHalfType").value : "";
      const remarks = document.getElementById("leaveRemarks").value;
      
      if (mode === "multi" && start > end) {
        return alert("End date cannot be before start date.");
      }
      
      const submitButton = document.getElementById("btnSubmitLeave");
      const newLeave = {
        id: "LV-" + Date.now(),
        employeeId: user.employeeId,
        employeeName: user.name,
        leaveType: mode,
        startDate: start,
        endDate: end,
        halfType: half,
        whichHalf: half,
        remarks: remarks,
        submittedAt: new Date().toISOString(),
        timestamp: Date.now()
      };

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Submitting...";
      }

      try {
        await saveLeave(newLeave);
      } catch (error) {
        window.alert(`Your leave application could not be saved. Please try again.\n\n${error?.message || "Cloud connection error"}`);
        return;
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = "Submit Leave Request";
        }
      }
      
      leaveForm.reset();
      const modeSelect = document.getElementById("leaveDurationMode");
      modeSelect.value = "multi";
      modeSelect.dispatchEvent(new Event("change"));
      
      renderLeaveSection(user);
      showToast("Leave application submitted successfully!");
    });
  }

  
  if (modeSelect) {
    // Remove old listeners to prevent weirdness, but since it's a new element ID, it shouldn't conflict!
    modeSelect.addEventListener("change", (e) => {
      const mode = e.target.value;
      if (mode === "multi") {
        toDateGroup.classList.remove("hidden");
        halfGroup.classList.add("hidden");
        toDateInput.required = true;
        dateLabel.innerHTML = 'From Date <span class="required">*</span>';
      } else if (mode === "single") {
        toDateGroup.classList.add("hidden");
        halfGroup.classList.add("hidden");
        toDateInput.required = false;
        dateLabel.innerHTML = 'Date <span class="required">*</span>';
      } else if (mode === "half") {
        toDateGroup.classList.add("hidden");
        halfGroup.classList.remove("hidden");
        toDateInput.required = false;
        dateLabel.innerHTML = 'Date <span class="required">*</span>';
      }
    });
  }

  // Handle Leave Submission (new form ID prevents old listener conflict)
  
  
  const histBtn = document.getElementById("btnLeaveHistoryAdmin");
  if (histBtn) {
    histBtn.addEventListener("click", () => {
      showSection("historySection");
    });
  }
  
  const mgrDateCheck = document.getElementById("leaveManagerDateCheck");
  if (mgrDateCheck) {
    mgrDateCheck.addEventListener("change", (e) => {
      const targetStr = e.target.value;
      if (!targetStr) return;
      
      const allLeaves = leaves();
    const getEmpName = (l) => { 
      const u = users().find(u => u.employeeId === l.employeeId);
      return u ? u.name : l.employeeName; 
    };
      const onLeaveThatDay = allLeaves.filter(l => {
        if (l.leaveType === "single" || l.leaveType === "half") return (l.startDate || "") === targetStr;
        return targetStr >= (l.startDate || "") && targetStr <= (l.endDate || "");
      });
      
      const resContainer = document.getElementById("leaveManagerDateResult");
      if (onLeaveThatDay.length === 0) {
        resContainer.innerHTML = '<div class="empty-state">No one is on leave on this date.</div>';
      } else {
        resContainer.innerHTML = onLeaveThatDay.map(l => `
          <div class="stack-item" style="border-left: 3px solid #228be6;">
            <div style="font-weight:bold;">${escapeHtml(getEmpName(l))} (${escapeHtml(l.employeeId)})</div>
            <div style="font-size:0.8rem; color:#666;">${l.leaveType === 'half' ? 'Half Day ('+l.whichHalf+')' : (l.leaveType === 'multi' ? 'Multi-day' : 'Full Day')}</div>
            <div style="font-size:0.85rem; margin-top:4px; font-style:italic;">"${escapeHtml(l.remarks)}"</div>
          </div>
        `).join('');
      }
    });
  }
});


// (Master compliance logic defined above)

// Delegated listener for row toggling
document.addEventListener("click", (e) => {
   const toggleBtn = e.target.closest(".toggle-compliance-row");
   if (toggleBtn) {
       const empId = toggleBtn.getAttribute("data-emp-id");
       const expandedRow = document.getElementById(`complianceExpanded-${empId}`);
       if (expandedRow) {
           expandedRow.classList.toggle("hidden");
           const icon = toggleBtn.querySelector("i");
           if (icon) {
               icon.classList.toggle("fa-chevron-down");
               icon.classList.toggle("fa-chevron-up");
           }
       }
   }
});


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
  
  const excelOptions = `<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Leave Report</x:Name><x:WorksheetOptions><x:AutoFilter x:Range="R1C1:R${rows.length}C6"/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->`;
  const html = `<!doctype html><html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8">${excelOptions}<style>body{font-family:Arial,sans-serif}td,th{vertical-align:top;white-space:pre-line;border:1px solid #999;padding:6px}th{background:#f2f2f2;font-weight:700}</style></head><body><table border="1" data-auto-filter="true">${tableRows}</table></body></html>`;
  
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
