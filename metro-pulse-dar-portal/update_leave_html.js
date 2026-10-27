const fs = require('fs');
let html = fs.readFileSync('portal.html', 'utf8');

const leaveSectionRegex = /<section class="panel hidden" id="leaveSection">[\s\S]*?<\/section>/;

const newLeaveSection = `
<section class="panel hidden" id="leaveSection" style="background:var(--bg); border:none; box-shadow:none;">
  <div class="panel-header" style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 24px;">
    <div>
      <h2 style="font-size:1.8rem; font-weight:800; color:#111; margin:0 0 5px 0;">Leave</h2>
      <p style="color:#666; font-size:0.95rem; margin:0;">Manage and track leave requests efficiently.</p>
    </div>
    <div style="display:flex; gap:10px; align-items:center;">
      <input type="month" id="leaveExportMonth" class="input hidden" style="padding:8px 12px; border-radius:8px; border:1px solid #ccc;">
      <button id="btnLeaveExport" class="btn hidden" style="background:#111; color:white; border:none; padding:8px 16px; border-radius:8px; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:8px;">
        <i class="fa-solid fa-download"></i> Export
      </button>
    </div>
  </div>

  <div class="panel-content" style="padding:0;">
    <!-- Employee View (Unchanged logically, but styled to fit) -->
    <div id="leaveEmployeeView" class="hidden">
      <!-- Leave Form -->
      <form id="leaveForm" class="form-grid" style="background:#fff; padding:24px; border-radius:12px; border:1px solid #eaeaea; margin-bottom:24px;">
        <label>Duration Mode
          <select id="leaveDurationMode" class="input" required>
            <option value="multi" selected>Multiple day leave</option>
            <option value="single">Single day leave</option>
            <option value="half">Half day</option>
          </select>
        </label>
        
        <div id="leaveMultiFields" class="form-grid" style="grid-column: 1 / -1; display:grid; gap:20px;">
          <label>From Date<input id="leaveStartDateMulti" type="date" class="input"></label>
          <label>To Date<input id="leaveEndDateMulti" type="date" class="input"></label>
        </div>
        
        <div id="leaveSingleFields" class="form-grid hidden" style="grid-column: 1 / -1;">
          <label>Date<input id="leaveDateSingle" type="date" class="input"></label>
        </div>
        
        <div id="leaveHalfFields" class="form-grid hidden" style="grid-column: 1 / -1; display:grid; gap:20px;">
          <label>Date<input id="leaveDateHalf" type="date" class="input"></label>
          <label>Which Half?
            <select id="leaveHalfSelect" class="input">
              <option value="first">First Half</option>
              <option value="second">Second Half</option>
            </select>
          </label>
        </div>

        <label style="grid-column: 1 / -1;">
          Reason
          <textarea id="leaveRemarks" class="input" placeholder="Enter reason for leave..." rows="3" required></textarea>
        </label>
        <button type="submit" class="button" style="grid-column: 1 / -1; width: max-content; background:var(--maroon); color:white; border-radius:8px;">Submit Leave Request</button>
      </form>
      
      <!-- Personal Leave History -->
      <div style="background:#fff; padding:24px; border-radius:12px; border:1px solid #eaeaea;">
        <h3 style="margin-top:0; font-family:'Barlow', sans-serif; color:var(--maroon); font-size:1.1rem; margin-bottom:15px;">My Leave History</h3>
        <div id="leaveHistoryList" class="stack-list"></div>
      </div>
    </div>

    <!-- Manager View -->
    <div id="leaveManagerView" class="hidden" style="display:flex; flex-direction:column; gap:24px;">
      
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap:24px;">
        <!-- Today's Leave Card -->
        <div style="background:#fffcfc; border:1px solid #ffe3e3; border-radius:12px; padding:24px; position:relative; overflow:hidden; min-height: 250px;">
          <!-- Watermark -->
          <i class="fa-solid fa-calendar-day" style="position:absolute; right:-20px; bottom:-20px; font-size:120px; color:rgba(224,49,49,0.04); z-index:0;"></i>
          
          <div style="display:flex; align-items:center; gap:10px; border-bottom:2px solid #e03131; padding-bottom:12px; margin-bottom:20px; position:relative; z-index:1;">
            <div style="background:#ffe3e3; color:#e03131; width:32px; height:32px; border-radius:8px; display:flex; align-items:center; justify-content:center;">
              <i class="fa-solid fa-user-group"></i>
            </div>
            <h3 style="margin:0; font-family:'Barlow', sans-serif; color:#e03131; font-size:1.1rem; font-weight:700;">Who is on leave today</h3>
          </div>
          <div id="leaveManagerTodayList" class="stack-list" style="position:relative; z-index:1; max-height:300px; overflow-y:auto; padding-right:10px;"></div>
        </div>

        <!-- Upcoming Leaves Card -->
        <div style="background:#f6fbf7; border:1px solid #d3f9d8; border-radius:12px; padding:24px; position:relative; overflow:hidden; min-height: 250px;">
          <!-- Watermark -->
          <i class="fa-regular fa-calendar-check" style="position:absolute; right:-20px; bottom:-20px; font-size:120px; color:rgba(47,158,68,0.04); z-index:0;"></i>
          
          <div style="display:flex; align-items:center; gap:10px; border-bottom:2px solid #2f9e44; padding-bottom:12px; margin-bottom:20px; position:relative; z-index:1;">
            <div style="background:#d3f9d8; color:#2f9e44; width:32px; height:32px; border-radius:8px; display:flex; align-items:center; justify-content:center;">
              <i class="fa-regular fa-calendar"></i>
            </div>
            <h3 style="margin:0; font-family:'Barlow', sans-serif; color:#2f9e44; font-size:1.1rem; font-weight:700;">Upcoming leaves</h3>
          </div>
          <div id="leaveManagerFutureList" class="stack-list" style="position:relative; z-index:1; max-height:300px; overflow-y:auto; padding-right:10px;"></div>
        </div>
      </div>
      
      <!-- Check Specific Date Card -->
      <div style="background:#fff; border:1px solid #eaeaea; border-radius:12px; padding:24px; display:flex; flex-direction:column;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:20px;">
          <div style="display:flex; align-items:center; gap:16px;">
            <div style="background:#fff0f0; color:#e03131; width:48px; height:48px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:1.2rem;">
              <i class="fa-regular fa-calendar-days"></i>
            </div>
            <div>
              <h3 style="margin:0 0 4px 0; font-family:'Barlow', sans-serif; color:#111; font-size:1.1rem; font-weight:700;">Check specific date</h3>
              <p style="margin:0; color:#666; font-size:0.9rem;">Select a date to see who is on leave</p>
            </div>
          </div>
          <div style="flex-grow:1; max-width:300px;">
            <input type="date" id="leaveManagerDateCheck" class="input" style="width:100%; padding:10px 14px; border-radius:8px; border:1px solid #ddd; background:#f9f9f9; color:#333;">
          </div>
        </div>
        <div id="leaveManagerDateResult" class="stack-list" style="margin-top:20px; padding-top:20px; border-top:1px dashed #eee;"></div>
      </div>
      
      <!-- Tip Banner -->
      <div style="background:#fff5f5; border-radius:8px; padding:16px 20px; display:flex; align-items:center; gap:12px;">
        <i class="fa-solid fa-circle-info" style="color:#e03131;"></i>
        <span style="color:#495057; font-size:0.9rem;">Tip: Use the Export button at the top right to download monthly leave summary reports.</span>
      </div>

    </div>
  </div>
</section>
`;

html = html.replace(leaveSectionRegex, newLeaveSection);
fs.writeFileSync('portal.html', html);
console.log("Updated leaveSection in portal.html");
