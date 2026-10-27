const fs = require('fs');
let html = fs.readFileSync('portal.html', 'utf8');

// 1. Remove hidden from complianceExportDropdown
html = html.replace('<div class="export-dropdown hidden" id="complianceExportDropdown">', '<div class="export-dropdown" id="complianceExportDropdown">');

// 2. Rewrite complianceSearchForm
const searchFormRegex = /<form id="complianceSearchForm" class="form-grid compliance-filter-form">[\s\S]*?<\/form>/;

const newSearchForm = `<form id="complianceSearchForm" class="form-grid compliance-filter-form">
  <label class="compliance-date-field">
    DAR date
    <select id="complianceDateFilter"></select>
    <input type="date" id="complianceCustomDateFilter" class="hidden" style="margin-top: 8px;">
  </label>
  <label class="compliance-month-field">
    Export month
    <input id="complianceMonthFilter" type="month">
  </label>
  <label class="compliance-entity-field">
    Entity Filter
    <select id="complianceEntityFilter"><option value="">All Entities</option></select>
  </label>
  <label class="compliance-dept-field">
    Department Filter
    <select id="complianceDeptFilter"><option value="">All Departments</option></select>
  </label>
  <label class="compliance-search-field">
    Search by employee name or ID
    <input id="complianceSearchInput" type="text" placeholder="Type a name or Employee ID for urgent lookup">
  </label>
  <button class="compact-button compliance-clear-button" id="clearComplianceFiltersButton" type="button" style="margin-top:auto; height: 38px;">
    <i class="fa-solid fa-rotate-left" aria-hidden="true"></i>
    <span>Clear Filters</span>
  </button>
</form>`;

html = html.replace(searchFormRegex, newSearchForm);
fs.writeFileSync('portal.html', html);
console.log("Fixed compliance filters in portal.html");
