const fs = require('fs');
let html = fs.readFileSync('portal.html', 'utf8');

const newLeaveForm = `
      <form id="leaveForm" class="form-grid" style="background:#fff; padding:24px; border-radius:12px; border:1px solid #eaeaea; margin-bottom:24px;">
        <label>Duration Mode
          <select id="leaveDurationMode" class="input" required>
            <option value="multi" selected>Multiple day leave</option>
            <option value="single">Single day leave</option>
            <option value="half">Half day</option>
          </select>
        </label>
        
        <div id="leaveFromDateGroup" style="grid-column: 1 / -1;">
          <label id="leaveDateLabel">From Date <span class="required">*</span></label>
          <input id="leaveFromDate" type="date" class="input" required>
        </div>
        
        <div id="leaveToDateGroup" style="grid-column: 1 / -1;">
          <label>To Date <span class="required">*</span></label>
          <input id="leaveToDate" type="date" class="input" required>
        </div>
        
        <div id="leaveHalfTypeGroup" class="hidden" style="grid-column: 1 / -1;">
          <label>Which Half? <span class="required">*</span></label>
          <select id="leaveHalfType" class="input">
            <option value="first">First Half</option>
            <option value="second">Second Half</option>
          </select>
        </div>

        <label style="grid-column: 1 / -1;">
          Reason <span class="required">*</span>
          <textarea id="leaveRemarks" class="input" placeholder="Enter reason for leave..." rows="3" required></textarea>
        </label>
        <button type="submit" class="button" style="grid-column: 1 / -1; width: max-content; background:var(--maroon); color:white; border-radius:8px;">Submit Leave Request</button>
      </form>
`;

html = html.replace(/<form id="leaveForm" class="form-grid"[\s\S]*?<\/form>/, newLeaveForm.trim());

fs.writeFileSync('portal.html', html);
console.log("Restored Leave Form IDs to fix Javascript toggle logic.");
