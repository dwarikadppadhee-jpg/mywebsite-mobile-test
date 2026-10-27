const fs = require('fs');
let html = fs.readFileSync('portal.html', 'utf8');

const versionSectionHtml = `
          <div class="panel-header" style="margin-top: 40px; border-top: 1px solid #eee; padding-top: 30px;">
            <div>
              <p class="section-tag">System Settings</p>
              <h2>Version Control</h2>
            </div>
          </div>
          <div style="background: #fdfaf4; padding: 20px; border-radius: 12px; border: 1px solid #e0e0e0;">
            <div style="margin-bottom: 15px;">
              <label style="display:block; font-size:0.8rem; font-weight:bold; margin-bottom:5px;">App Version</label>
              <input id="adminVersionInput" type="text" placeholder="e.g. V1.0.0" style="padding: 8px; width: 200px; border: 1px solid #ccc; border-radius: 4px;">
            </div>
            <div style="margin-bottom: 15px;">
              <label style="display:block; font-size:0.8rem; font-weight:bold; margin-bottom:5px;">Release Notes (One point per line)</label>
              <textarea id="adminVersionNotes" rows="5" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; resize: vertical;" placeholder="Added new feature...&#10;Fixed bug..."></textarea>
            </div>
            <button id="saveVersionBtn" class="btn" style="background: #8b1e32; color: white;">Save Version & Notes</button>
          </div>
`;

// Insert the version section before the end of userManagementSection
html = html.replace(
  /(\s*)(<\/section>\s*<section class="panel hidden" id="globalTaskSection">)/,
  `$1${versionSectionHtml}$2`
);

const versionModalHtml = `
    <!-- Version Details Modal -->
    <div id="versionModal" class="modal hidden">
      <div class="modal-content" style="max-width: 500px;">
        <div class="modal-header">
          <h3 style="margin: 0;">Release Notes: <span id="modalVersionTitle"></span></h3>
          <button class="modal-close" id="closeVersionModal">&times;</button>
        </div>
        <div class="modal-body" style="padding: 20px;">
          <ul id="modalVersionList" style="padding-left: 20px; line-height: 1.6;">
            <!-- Fetched from DB -->
          </ul>
        </div>
      </div>
    </div>
`;

// Insert the modal before closing body
html = html.replace(
  /(\s*)(<\/body>)/,
  `$1${versionModalHtml}$2`
);

fs.writeFileSync('portal.html', html);
console.log("Version control HTML injected.");
