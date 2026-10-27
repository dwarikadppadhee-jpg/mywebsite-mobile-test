const fs = require('fs');
let appJs = fs.readFileSync('app.js', 'utf8');

// 1. Inject cloudDeleteEntity
const deleteEntityLogic = `
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
`;

appJs = appJs.replace(/async function cloudUpdateEntity/, deleteEntityLogic + "\nasync function cloudUpdateEntity");


// 2. Add Delete button to renderEntities
// Find: <button type="button" class="compact-button" data-edit-entity="${escapeHtml(e.id)}">Edit</button>
appJs = appJs.replace(
  /<button type="button" class="compact-button" data-edit-entity="\$\{escapeHtml\(e\.id\)\}">Edit<\/button>/g,
  `<button type="button" class="compact-button" data-edit-entity="\${escapeHtml(e.id)}">Edit</button>
   <button type="button" class="compact-button" style="color:var(--maroon);" data-delete-entity="\${escapeHtml(e.id)}" data-entity-name="\${escapeHtml(e.name)}"><i class="fa-solid fa-trash"></i></button>`
);

// 3. Add event listener for delete
const deleteListener = `
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
`;

appJs = appJs.replace(
  /list\.querySelectorAll\("\[data-edit-entity\]"\)\.forEach/g,
  deleteListener + "\n    list.querySelectorAll(\"[data-edit-entity]\").forEach"
);

fs.writeFileSync('app.js', appJs);
console.log("Updated Entity Management with Delete functionality");
