const fs = require('fs');
let html = fs.readFileSync('portal.html', 'utf8');

const targetSection = `
          <div class="divider"></div>
          <div class="panel-inline admin-collapsible" data-admin-panel="users">
`;

const entitySection = `
          <div class="divider"></div>
          <div class="panel-inline admin-collapsible" data-admin-panel="entities">
            <button type="button" class="admin-collapsible-header" data-admin-toggle="entities" aria-expanded="false">
              <div>
                <p class="section-tag">Entity Management</p>
                <h2>Create and manage entities</h2>
              </div>
              <span class="admin-collapsible-arrow" aria-hidden="true">⌄</span>
            </button>
            <div class="admin-collapsible-body hidden" id="adminPanel-entities">
              <form id="entityCreateForm" class="form-grid">
                <label>
                  Entity name
                  <input id="entityNameInput" type="text" placeholder="Example: METRO WHOLESALE" required>
                </label>
                <div class="full-span action-row">
                  <button class="button" type="submit">Create Entity</button>
                  <p class="helper-text" id="entityFeedback">Add a new organizational entity.</p>
                </div>
              </form>
              <div id="entityList" class="stack-list empty-state">No entities available.</div>
            </div>
          </div>
`;

html = html.replace(targetSection, entitySection + targetSection);

// Fix version control display
const versionControlRegex = /<div style="background: #fdfaf4; padding: 20px; border-radius: 12px; border: 1px solid #e0e0e0;">[\s\S]*?<div style="margin-bottom: 15px;">\s*<label style="display:block; font-size:0.8rem; font-weight:bold; margin-bottom:5px;">App Version<\/label>/;

const newVersionControl = `
          <div style="background: #fdfaf4; padding: 20px; border-radius: 12px; border: 1px solid #e0e0e0; display: flex; gap: 40px; flex-wrap: wrap;">
            
            <div style="flex: 1; min-width: 250px;">
              <h3 style="margin-top:0; color:var(--maroon); border-bottom: 2px solid var(--maroon); padding-bottom: 8px; font-size: 1.1rem;">Current Live Version</h3>
              <div id="currentVersionDisplay" style="background:#fff; padding:15px; border:1px solid #eee; border-radius:8px; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
                <div style="font-size: 1.4rem; font-weight: 800; color:#111; margin-bottom:10px;" id="liveVersionNumber">Loading...</div>
                <ul id="liveVersionNotesList" style="margin:0; padding-left:20px; color:#555; font-size:0.9rem; line-height: 1.5;"></ul>
              </div>
            </div>

            <div style="flex: 1; min-width: 250px;">
              <h3 style="margin-top:0; color:#444; border-bottom: 2px solid #ccc; padding-bottom: 8px; font-size: 1.1rem;">Update Version</h3>
              <div style="margin-bottom: 15px;">
                <label style="display:block; font-size:0.8rem; font-weight:bold; margin-bottom:5px;">New App Version</label>
`;

html = html.replace(versionControlRegex, newVersionControl);


// Dashboard title clickable
html = html.replace(
  /<h2 style="font-size:2rem; font-weight:700; color:var\(--text\); margin-bottom:5px;">Daily Compliance Dashboard<\/h2>/,
  '<h2 style="font-size:2rem; font-weight:700; color:var(--text); margin-bottom:5px; cursor:pointer;" id="clickableDashboardTitle" title="Click to view detailed employee lists">Daily Compliance Dashboard <i class="fa-solid fa-circle-info" style="font-size:1rem; color:var(--maroon); vertical-align:middle; margin-left:8px;"></i></h2>'
);


fs.writeFileSync('portal.html', html);
console.log("Updated portal.html with entity panel, version control display, and clickable title");
