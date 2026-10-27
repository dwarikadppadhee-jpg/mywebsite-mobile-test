const fs = require('fs');
let html = fs.readFileSync('portal.html', 'utf8');

const regex = /<section class="panel hidden" id="leaveSection">[\s\S]*?<\/section>\s*<section class="panel hidden" id="historySection">/;

const newLeaveHtml = `<section class="panel hidden" id="leaveSection">
  <div class="panel-header" style="display:flex; justify-content:space-between; align-items:center;">
    <h2>Leave</h2>
    <button id="btnLeaveHistoryAdmin" class="btn hidden" style="background:var(--maroon); color:white; border:none; padding:8px 16px; border-radius:6px; cursor:pointer;">History</button>
  </div>
  <div class="panel-content" style="padding: 24px;">
    
    <div id="leaveEmployeeView" class="hidden">
      <form id="leaveApplicationForm" class="global-task-form">
        <div class="form-group" style="margin-bottom: 20px;">
          <label>Duration Mode <span class="required">*</span></label>
          <select id="leaveDurationMode" class="input" style="margin-top: 8px;" required>
            <option value="multi">Multiple day leave</option>
            <option value="single">Single day leave</option>
            <option value="half">Half day</option>
          </select>
        </div>

        <div class="form-grid" id="leaveDateGrid">
          <div class="form-group" id="leaveFromDateGroup">
            <label for="leaveFromDate" id="leaveDateLabel">From Date <span class="required">*</span></label>
            <input type="date" id="leaveFromDate" class="input" required>
          </div>
          <div class="form-group" id="leaveToDateGroup">
            <label for="leaveToDate">To Date <span class="required">*</span></label>
            <input type="date" id="leaveToDate" class="input" required>
          </div>
          <div class="form-group hidden" id="leaveHalfTypeGroup">
            <label for="leaveHalfType">Which Half? <span class="required">*</span></label>
            <select id="leaveHalfType" class="input">
              <option value="first">First Half</option>
              <option value="second">Second Half</option>
            </select>
          </div>
        </div>
        
        <div class="form-group" style="margin-top:15px;">
          <label for="leaveRemarks">Reason / Remarks <span class="required">*</span></label>
          <textarea id="leaveRemarks" class="textarea" rows="4" placeholder="Enter the reason for your leave..." required></textarea>
        </div>
        
        <div class="form-actions" style="margin-top:20px;">
          <button type="submit" class="button button-primary" style="background:var(--maroon);">Submit Leave Application</button>
        </div>
      </form>
      
      <h3 style="margin-top: 40px; margin-bottom: 16px; font-family: 'Barlow', sans-serif; color:var(--maroon); border-bottom:2px solid #eee; padding-bottom:8px;">Your Leave History</h3>
      <div id="leaveHistoryList" class="stack-list"></div>
    </div>

    <div id="leaveManagerView" class="hidden">
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; align-items: start;">
        <div style="background: #fdfdfd; border: 1px solid var(--border-light); border-radius: 8px; padding: 20px;">
          <h3 style="margin-top: 0; margin-bottom: 16px; font-family: 'Barlow', sans-serif; color: var(--maroon); font-size: 16px; border-bottom: 2px solid var(--maroon); padding-bottom: 8px;">Who is on leave today</h3>
          <div id="leaveManagerTodayList" class="stack-list"></div>
        </div>
        <div style="background: #fdfdfd; border: 1px solid var(--border-light); border-radius: 8px; padding: 20px;">
          <h3 style="margin-top: 0; margin-bottom: 16px; font-family: 'Barlow', sans-serif; color: #2f9e44; font-size: 16px; border-bottom: 2px solid #2f9e44; padding-bottom: 8px;">Upcoming leaves</h3>
          <div id="leaveManagerFutureList" class="stack-list"></div>
        </div>
      </div>
      
      <div style="margin-top:30px;">
         <label style="font-weight:bold; font-size:0.9rem;">Check specific date:</label>
         <input type="date" id="leaveManagerDateCheck" class="input" style="width:200px; display:inline-block; margin-left:10px;">
         <div id="leaveManagerDateResult" class="stack-list" style="margin-top:15px;"></div>
      </div>
    </div>

  </div>
</section>
<section class="panel hidden" id="historySection">`;

if (html.match(regex)) {
  html = html.replace(regex, newLeaveHtml);
  fs.writeFileSync('portal.html', html);
  console.log("Replaced leaveSection in portal.html");
} else {
  console.log("Could not match leaveSection regex!");
}
