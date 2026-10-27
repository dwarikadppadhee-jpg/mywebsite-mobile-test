const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf8');

const updateEntityCode = `
let editingEntityId = "";

async function cloudUpdateEntity(id, newName) {
  try {
    const {error} = await adminDb.from("metro_entities").update({ name: newName }).eq("id", id);
    if(error) console.error("cloudUpdateEntity error:", error.message);
  } catch(e) { console.error("cloudUpdateEntity failed:", e.message); }
}
`;

if (!code.includes("editingEntityId")) {
    code = code.replace('async function cloudEntities() {', updateEntityCode + '\nasync function cloudEntities() {');
}

// Find renderEntities block
const oldRenderBody = /list\.innerHTML = all\.map\([\s\S]*?join\(""\);\r?\n\s*\}/m;

const newRenderBody = `list.className = "stack-list";
    list.innerHTML = all.map(e => {
      const isEditing = editingEntityId === e.id;
      if (isEditing) {
        return \`<article class="assignment-card" data-editing-entity="\${escapeHtml(e.id)}">
          <div style="display:flex; gap:8px; align-items:center;">
             <input type="text" class="admin-inline-input" data-edit-entity-name value="\${escapeHtml(e.name)}" style="flex:1;">
             <button type="button" class="compact-button action-approve" data-save-entity="\${escapeHtml(e.id)}">Save</button>
             <button type="button" class="compact-button" data-cancel-entity>Cancel</button>
          </div>
        </article>\`;
      }
      return \`<article class="assignment-card">
        <header style="display:flex; justify-content:space-between; align-items:center; width:100%;">
           <strong>\${escapeHtml(e.name)}</strong>
           <button type="button" class="compact-button" data-edit-entity="\${escapeHtml(e.id)}">Edit</button>
        </header>
      </article>\`;
    }).join("");
    
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
       const row = list.querySelector(\`[data-editing-entity="\${id}"]\`);
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
  }`;

code = code.replace(oldRenderBody, newRenderBody);

fs.writeFileSync('app.js', code);
