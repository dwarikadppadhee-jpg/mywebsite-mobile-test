const fs = require('fs');
let html = fs.readFileSync('portal.html', 'utf8');

// 1. Rename search label
html = html.replace(
  /<label class="reminder-search-field">\s*Search pending employees/g,
  '<label class="reminder-search-field">\n                  Search employees'
);

// 2. Add filter tabs and update loading messages
const oldSummary = /<div class="full-span reminder-summary-strip" id="emailReminderSummary">\s*<span>Loading pending DAR employees...<\/span>\s*<\/div>/;

const newSummary = `
              <div class="full-span reminder-tabs" id="emailReminderTabs" style="display:flex; gap:10px; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 10px;">
                <button type="button" class="tab-btn active" data-filter="pending">Pending</button>
                <button type="button" class="tab-btn" data-filter="submitted">Submitted</button>
                <button type="button" class="tab-btn" data-filter="all">All</button>
              </div>
              <div class="full-span reminder-summary-strip" id="emailReminderSummary">
                <span>Loading employees...</span>
              </div>
`;
html = html.replace(oldSummary, newSummary);

// 3. Update loading message for recipient panel
html = html.replace(
  /<div class="full-span reminder-recipient-panel" id="emailReminderRecipients">\s*Loading pending DAR employees...\s*<\/div>/,
  '<div class="full-span reminder-recipient-panel" id="emailReminderRecipients">\n                Loading employees...\n              </div>'
);

// 4. Update note
html = html.replace(
  /<span class="helper-text">Selected pending employees will be added to BCC with a professional DAR reminder\.<\/span>/,
  '<span class="helper-text">Selected employees will be added to BCC with the drafted message.</span>'
);

// 5. Update feedback label
html = html.replace(
  /<p class="helper-text" id="emailReminderFeedback">Choose a recipient or bulk mode to prepare the reminder email\.<\/p>/,
  '<p class="helper-text" id="emailReminderFeedback">Select employees to prepare the email.</p>'
);


fs.writeFileSync('portal.html', html);
console.log("Updated HTML for Email Reminders");
