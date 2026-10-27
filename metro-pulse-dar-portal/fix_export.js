const fs = require('fs');
let c = fs.readFileSync('app.js','utf8');

const targetStr = 'const title=`Metro Group Weekly DAR Submission Details - ${formatDate(range.start)} to ${formatDate(range.end)}`;\n}';
const replacementStr = `const title=\`Metro Group Weekly DAR Submission Details - \${formatDate(range.start)} to \${formatDate(range.end)}\`;
  const tableRows=rows.map((row,index)=>\`<tr>\${row.map(cell=>exportCellHtml(cell,index===0?"th":"td")).join("")}</tr>\`).join("");
  const printable=window.open("","_blank","width=1100,height=800");
  if(!printable){window.alert("Allow pop-ups to export the PDF.");return;}
  printable.document.write(\`<!doctype html><html><head><meta charset="utf-8"><title>\${escapeHtml(title)}</title><style>
    @page{size:A4 landscape;margin:14mm}
    body{font-family:Arial,sans-serif;color:#111;margin:0}
    h1{font-size:20px;margin:0 0 6px}
    p{margin:0 0 14px;color:#555;font-size:12px}
    table{width:100%;border-collapse:collapse;font-size:10px}
    th,td{border:1px solid #ccc;padding:6px;vertical-align:top;text-align:left}
    td{white-space:pre-line}
    th{background:#f2f2f2;font-weight:700}
    tr{break-inside:avoid}
  </style></head><body><h1>\${escapeHtml(title)}</h1><p>Filter: \${escapeHtml(complianceFilter)} | Exported: \${escapeHtml(formatDateTime(nowIso()))}</p><table>\${tableRows}</table><script>window.onload=function(){setTimeout(function(){window.print();},150);};</script></body></html>\`);
  printable.document.close();
}`;

c = c.replace(targetStr, replacementStr);
fs.writeFileSync('app.js', c, 'utf8');
console.log("Restored exportWeeklyPdf");
