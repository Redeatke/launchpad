// Application Tracker Module
import { storage } from '../utils/storage.js';
import Papa from 'papaparse';
import { callOpenAI, getOpenAIKey } from '../utils/openai.js';
import { esc } from '../utils/dom.js';

const TRACKER_KEY = 'job_applications';

export async function initTracker() {
  const addAppBtn = document.getElementById('add-app-btn');
  const importBtn = document.getElementById('import-tracker-btn');
  const fileInput = document.getElementById('tracker-file-input');
  const exportBtn = document.getElementById('export-tracker-btn');
  const searchInput = document.getElementById('tracker-search');
  const filterResponse = document.getElementById('filter-tracker-response');
  const filterOffer = document.getElementById('filter-tracker-offer');
  
  const quickImportBtn = document.getElementById('quick-import-btn');
  const quickImportText = document.getElementById('quick-import-text');

  // Load initial data if local storage is empty
  let apps = storage.get(TRACKER_KEY, []);
  if (apps.length === 0) {
    try {
      const resp = await fetch('/src/assets/tracker_init.json');
      if (resp.ok) {
        const initData = await resp.json();
        storage.set(TRACKER_KEY, initData);
      }
    } catch (e) {
      console.warn('Failed to load tracker_init.json:', e);
    }
  }

  // Event Listeners
  addAppBtn.addEventListener('click', () => openAppModal());
  importBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => { if (e.target.files[0]) handleImportFile(e.target.files[0]); });
  exportBtn.addEventListener('click', exportTrackerToCSV);
  searchInput.addEventListener('input', renderTracker);
  filterResponse.addEventListener('change', renderTracker);
  filterOffer.addEventListener('change', renderTracker);
  
  quickImportBtn.addEventListener('click', handleQuickImport);

  // Initial render
  renderTracker();
}

// ===== Rendering =====
export function renderTracker() {
  const tbody = document.getElementById('tracker-table-body');
  const search = document.getElementById('tracker-search').value.toLowerCase();
  const resFilter = document.getElementById('filter-tracker-response').value;
  const offerFilter = document.getElementById('filter-tracker-offer').value;
  
  let apps = storage.get(TRACKER_KEY, []);

  // Filter
  const filtered = apps.filter(app => {
    if (search) {
      const hay = `${app.Company} ${app['Role Title']} ${app.Notes}`.toLowerCase();
      if (!hay.includes(search)) return false;
    }
    if (resFilter && app.Response !== resFilter) return false;
    if (offerFilter && app.Offer !== offerFilter) return false;
    return true;
  });

  // Render stats
  updateStats(apps);

  // Update nav badge count
  const badge = document.getElementById('tracker-count');
  if (badge) badge.textContent = apps.length;

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="12" style="text-align: center; padding: 2rem; color: var(--text-muted);">
          No applications tracked yet. Click "Add Application" or paste details above to get started.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map((app, idx) => {
    const resClass = getResponseClass(app.Response);
    const offerClass = getOfferClass(app.Offer);
    const appLink = app['Link to Job Advert'];
    
    return `
      <tr>
        <td style="font-weight: 700; color: var(--text-primary);">${esc(app.Company)}</td>
        <td style="color: var(--text-accent);">${esc(app['Role Title'])}</td>
        <td>${esc(app.Type || 'Fulltime')}</td>
        <td>${esc(app['Salary / Rate'] || '—')}</td>
        <td>${esc(app['Application Date'] || '—')}</td>
        <td>
          ${appLink ? `<a href="${esc(appLink)}" target="_blank" rel="noopener" class="btn btn-ghost btn-sm" style="padding: 0.2rem 0.4rem;">🔗 Link</a>` : '—'}
        </td>
        <td>
          ${app['Contact Name'] ? `<span title="${esc(app['Contact Email'])} / ${esc(app['Contact Phone'])}">${esc(app['Contact Name'])}</span>` : '—'}
        </td>
        <td>
          <span class="status-pill ${resClass}">${esc(app.Response || 'Nothing Yet')}</span>
        </td>
        <td>
          ${app['Interview Stage'] ? `<span style="font-weight: 500;">${esc(app['Interview Stage'])}</span>` : ''}
          ${app['Interview Date & Interviewer'] ? `<br/><span style="font-size: 0.7rem; color: var(--text-muted);">${esc(app['Interview Date & Interviewer'])}</span>` : (app['Interview Stage'] ? '' : '—')}
        </td>
        <td>
          <span class="status-pill ${offerClass}">${esc(app.Offer || 'No')}</span>
        </td>
        <td style="max-width: 150px; overflow: hidden; text-overflow: ellipsis;" title="${esc(app.Notes)}">
          ${esc(app.Notes) || '—'}
        </td>
        <td style="text-align: center;">
          <button class="btn btn-ghost btn-sm edit-app-btn" data-idx="${idx}" style="padding: 0.2rem 0.4rem;">✏️</button>
          <button class="btn btn-ghost btn-sm delete-app-btn" data-idx="${idx}" style="padding: 0.2rem 0.4rem; color: var(--danger);">🗑️</button>
        </td>
      </tr>
    `;
  }).join('');

  // Attach action listeners
  tbody.querySelectorAll('.edit-app-btn').forEach(btn => {
    btn.addEventListener('click', () => openAppModal(parseInt(btn.dataset.idx)));
  });
  tbody.querySelectorAll('.delete-app-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteApplication(parseInt(btn.dataset.idx)));
  });
}

function updateStats(apps) {
  const container = document.getElementById('tracker-stats-bar');
  const total = apps.length;
  const awaiting = apps.filter(a => a.Response === 'Nothing Yet' || !a.Response).length;
  const interviewing = apps.filter(a => a.Response === 'Interviewing').length;
  const offers = apps.filter(a => a.Offer === 'Yes').length;

  container.innerHTML = `
    <div class="tracker-stat-card">
      <div class="tracker-stat-card-value">${total}</div>
      <div class="tracker-stat-card-label">Total Applications</div>
    </div>
    <div class="tracker-stat-card">
      <div class="tracker-stat-card-value" style="color: var(--info);">${awaiting}</div>
      <div class="tracker-stat-card-label">Awaiting Response</div>
    </div>
    <div class="tracker-stat-card">
      <div class="tracker-stat-card-value" style="color: var(--warning);">${interviewing}</div>
      <div class="tracker-stat-card-label">Interviews</div>
    </div>
    <div class="tracker-stat-card">
      <div class="tracker-stat-card-value" style="color: var(--success);">${offers}</div>
      <div class="tracker-stat-card-label">Offers Received</div>
    </div>
  `;
}

function getResponseClass(res) {
  if (!res || res === 'Nothing Yet') return 'awaiting';
  if (res === 'Interviewing') return 'interviewing';
  if (res === 'Offer') return 'offer';
  if (res === 'Rejected') return 'rejected';
  if (res === 'Ghosted') return 'ghosted';
  return 'awaiting';
}

function getOfferClass(offer) {
  if (offer === 'Yes') return 'offer';
  if (offer === 'No') return 'rejected';
  return 'awaiting';
}

// ===== Edit / Add Modal =====
export function openAppModal(index = null) {
  const overlay = document.getElementById('modal-overlay');
  const title = document.getElementById('modal-title');
  const body = document.getElementById('modal-body');
  const footer = document.getElementById('modal-footer');
  const closeBtn = document.getElementById('modal-close-btn');

  let apps = storage.get(TRACKER_KEY, []);
  const isEdit = index !== null;
  const app = isEdit ? apps[index] : {
    Company: '', 'Role Title': '', Type: 'Internship', 'Salary / Rate': '',
    'Link to Job Advert': '', 'Application Date': new Date().toISOString().split('T')[0],
    'Contact Name': '', 'Contact Email': '', 'Contact Phone': '',
    Response: 'Nothing Yet', 'Interview Stage': '', 'Interview Date & Interviewer': '',
    Offer: 'No', Notes: ''
  };

  title.textContent = isEdit ? 'Edit Application' : 'Add Application';
  
  body.innerHTML = `
    <form id="tracker-form" class="form-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; max-height: 60vh; overflow-y: auto; padding-right: 0.5rem;">
      <div class="field-group" style="grid-column: span 2;">
        <label>Company *</label>
        <input type="text" id="form-company" class="text-input" value="${esc(app.Company)}" required placeholder="e.g. Google" />
      </div>
      <div class="field-group">
        <label>Role Title *</label>
        <input type="text" id="form-role" class="text-input" value="${esc(app['Role Title'])}" required placeholder="e.g. Software Engineer" />
      </div>
      <div class="field-group">
        <label>Type</label>
        <select id="form-type" class="filter-select" style="width:100%;">
          <option value="Internship" ${app.Type === 'Internship' ? 'selected' : ''}>Internship</option>
          <option value="Fulltime" ${app.Type === 'Fulltime' ? 'selected' : ''}>Fulltime</option>
          <option value="Part-time" ${app.Type === 'Part-time' ? 'selected' : ''}>Part-time</option>
          <option value="Contract" ${app.Type === 'Contract' ? 'selected' : ''}>Contract</option>
        </select>
      </div>
      <div class="field-group">
        <label>Salary / Rate</label>
        <input type="text" id="form-salary" class="text-input" value="${esc(app['Salary / Rate'])}" placeholder="e.g. $40/hr or $120k" />
      </div>
      <div class="field-group">
        <label>Application Date</label>
        <input type="date" id="form-date" class="text-input" value="${esc(app['Application Date'])}" />
      </div>
      <div class="field-group" style="grid-column: span 2;">
        <label>Link to Job Advert</label>
        <input type="url" id="form-link" class="text-input" value="${esc(app['Link to Job Advert'])}" placeholder="https://..." />
      </div>
      
      <div style="grid-column: span 2; border-bottom: 1px solid var(--border-color); margin: 0.5rem 0;"></div>
      
      <div class="field-group">
        <label>Contact Name</label>
        <input type="text" id="form-contact-name" class="text-input" value="${esc(app['Contact Name'])}" placeholder="Recruiter Name" />
      </div>
      <div class="field-group">
        <label>Contact Email</label>
        <input type="email" id="form-contact-email" class="text-input" value="${esc(app['Contact Email'])}" placeholder="recruiter@company.com" />
      </div>
      <div class="field-group">
        <label>Contact Phone</label>
        <input type="text" id="form-contact-phone" class="text-input" value="${esc(app['Contact Phone'])}" placeholder="Direct phone number" />
      </div>
      <div class="field-group">
        <label>Response</label>
        <select id="form-response" class="filter-select" style="width:100%;">
          <option value="Nothing Yet" ${app.Response === 'Nothing Yet' ? 'selected' : ''}>Nothing Yet</option>
          <option value="Interviewing" ${app.Response === 'Interviewing' ? 'selected' : ''}>Interviewing</option>
          <option value="Offer" ${app.Response === 'Offer' ? 'selected' : ''}>Offer</option>
          <option value="Rejected" ${app.Response === 'Rejected' ? 'selected' : ''}>Rejected</option>
          <option value="Ghosted" ${app.Response === 'Ghosted' ? 'selected' : ''}>Ghosted</option>
        </select>
      </div>
      
      <div class="field-group">
        <label>Interview Stage</label>
        <input type="text" id="form-interview-stage" class="text-input" value="${esc(app['Interview Stage'])}" placeholder="e.g. Technical Interview" />
      </div>
      <div class="field-group">
        <label>Interview Date & Info</label>
        <input type="text" id="form-interview-info" class="text-input" value="${esc(app['Interview Date & Interviewer'])}" placeholder="e.g. Mon 5th Dec, John Doe" />
      </div>
      <div class="field-group">
        <label>Offer Status</label>
        <select id="form-offer" class="filter-select" style="width:100%;">
          <option value="No" ${app.Offer === 'No' ? 'selected' : ''}>No / Pending</option>
          <option value="Yes" ${app.Offer === 'Yes' ? 'selected' : ''}>Yes (Offer Received)</option>
        </select>
      </div>
      <div class="field-group" style="grid-column: span 2;">
        <label>Notes</label>
        <textarea id="form-notes" class="text-input" style="height: 60px; min-height:60px; resize:vertical; padding:0.5rem;" placeholder="Any extra details, deadlines, action items...">${esc(app.Notes)}</textarea>
      </div>
    </form>
  `;

  footer.innerHTML = `
    <button class="btn btn-secondary cancel-modal-btn">Cancel</button>
    <button class="btn btn-primary save-modal-btn">Save Application</button>
  `;

  overlay.style.display = 'flex';

  const closeModal = () => { overlay.style.display = 'none'; };
  closeBtn.addEventListener('click', closeModal);
  footer.querySelector('.cancel-modal-btn').addEventListener('click', closeModal);
  
  footer.querySelector('.save-modal-btn').addEventListener('click', () => {
    const form = document.getElementById('tracker-form');
    if (!form.reportValidity()) return;

    const updatedApp = {
      Company: document.getElementById('form-company').value.trim(),
      'Role Title': document.getElementById('form-role').value.trim(),
      Type: document.getElementById('form-type').value,
      'Salary / Rate': document.getElementById('form-salary').value.trim(),
      'Application Date': document.getElementById('form-date').value,
      'Link to Job Advert': document.getElementById('form-link').value.trim(),
      'Contact Name': document.getElementById('form-contact-name').value.trim(),
      'Contact Email': document.getElementById('form-contact-email').value.trim(),
      'Contact Phone': document.getElementById('form-contact-phone').value.trim(),
      Response: document.getElementById('form-response').value,
      'Interview Stage': document.getElementById('form-interview-stage').value.trim(),
      'Interview Date & Interviewer': document.getElementById('form-interview-info').value.trim(),
      Offer: document.getElementById('form-offer').value,
      Notes: document.getElementById('form-notes').value.trim()
    };

    if (isEdit) {
      apps[index] = updatedApp;
    } else {
      apps.push(updatedApp);
    }

    storage.set(TRACKER_KEY, apps);
    closeModal();
    renderTracker();
    window.__showToast?.('Application saved!', 'success');
  });
}

function deleteApplication(idx) {
  let apps = storage.get(TRACKER_KEY, []);
  const app = apps[idx];
  if (confirm(`Are you sure you want to remove the application for ${app.Company}?`)) {
    apps.splice(idx, 1);
    storage.set(TRACKER_KEY, apps);
    renderTracker();
    window.__showToast?.('Application removed', 'info');
  }
}

// ===== Quick tracking from Listings tab =====
export function addApplicationFromJob(job) {
  const overlay = document.getElementById('modal-overlay');
  
  // Open the add modal
  openAppModal();

  // Populate prefilled fields
  document.getElementById('form-company').value = job.company || '';
  document.getElementById('form-role').value = job.role || '';
  document.getElementById('form-link').value = job.applyLink || '';
  document.getElementById('form-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('form-notes').value = `Added directly from Job Listings tab. Source: ${job.source || 'GitHub'}`;
}

// ===== Excel/CSV Importing =====
async function handleImportFile(file) {
  const extension = file.name.split('.').pop().toLowerCase();
  
  if (extension === 'csv') {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        importMappedData(results.data);
      },
      error(err) {
        window.__showToast?.('CSV Parse error: ' + err.message, 'error');
      }
    });
  } else if (extension === 'xlsx' || extension === 'xls') {
    // Dynamic import SheetJS from CDN
    window.__showToast?.('Loading Excel parser...', 'info');
    try {
      const XLSX = await loadSheetJS();
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // Convert with headers
        // Since the excel has title/info in rows 1-2 and headers in row 4 (or row 3 in 0-based),
        // we specify range:3 to start converting from row 4 onwards.
        const jsonData = XLSX.utils.sheet_to_json(sheet, { range: 3 });
        
        if (jsonData.length === 0) {
          window.__showToast?.('No rows found in Excel sheet. Check template.', 'error');
          return;
        }
        
        // Excel serial date numbers to string
        const formattedData = jsonData.map(row => {
          const newRow = { ...row };
          
          // Helper to convert Excel serial dates
          const parseExcelDate = (val) => {
            if (typeof val === 'number') {
              const dateVal = new Date((val - (25567 + 2)) * 86400 * 1000);
              return dateVal.toISOString().split('T')[0];
            }
            return String(val || '');
          };

          if (row['Application Date']) newRow['Application Date'] = parseExcelDate(row['Application Date']);
          if (row['Interview Date & Interviewer']) newRow['Interview Date & Interviewer'] = String(row['Interview Date & Interviewer'] || '');
          
          return newRow;
        });

        importMappedData(formattedData);
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      window.__showToast?.('Failed to import Excel: ' + err.message, 'error');
    }
  } else {
    window.__showToast?.('Unsupported file type. Please upload .xlsx or .csv', 'error');
  }

  // Clear file input
  document.getElementById('tracker-file-input').value = '';
}

function loadSheetJS() {
  return new Promise((resolve, reject) => {
    if (window.XLSX) return resolve(window.XLSX);
    const script = document.createElement('script');
    script.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
    script.onload = () => {
      if (window.XLSX) resolve(window.XLSX);
      else reject(new Error('SheetJS script loaded but window.XLSX is missing.'));
    };
    script.onerror = () => reject(new Error('Failed to load SheetJS from CDN.'));
    document.head.appendChild(script);
  });
}

function importMappedData(rows) {
  let existing = storage.get(TRACKER_KEY, []);
  
  let addedCount = 0;
  
  rows.forEach((row, i) => {
    // Normalise column names to map to our schema
    const getVal = (possibleKeys) => {
      for (const k of possibleKeys) {
        if (row[k] !== undefined) return String(row[k]).trim();
        // try lowercase / underscores
        const altKey = k.toLowerCase().replace(/ /g, '_');
        if (row[altKey] !== undefined) return String(row[altKey]).trim();
      }
      return '';
    };

    const company = getVal(['Company', 'Company Name', 'Employer']);
    const role = getVal(['Role Title', 'Role', 'Title', 'Position']);
    
    if (company && role) {
      // Check if duplicate company/role already exists
      const isDup = existing.some(ext => 
        ext.Company.toLowerCase() === company.toLowerCase() && 
        ext['Role Title'].toLowerCase() === role.toLowerCase()
      );
      
      if (!isDup) {
        existing.push({
          Company: company,
          'Role Title': role,
          Type: getVal(['Type', 'Job Type', 'Employment Type']) || 'Internship',
          'Salary / Rate': getVal(['Salary / Rate', 'Salary', 'Rate', 'Compensation']),
          'Link to Job Advert': getVal(['Link to Job Advert', 'Link', 'URL', 'Job Link']),
          'Application Date': getVal(['Application Date', 'Date', 'Applied Date']) || new Date().toISOString().split('T')[0],
          'Contact Name': getVal(['Contact Name', 'Contact', 'Recruiter Name']),
          'Contact Email': getVal(['Contact Email', 'Email']),
          'Contact Phone': getVal(['Contact Phone', 'Phone']),
          Response: getVal(['Response', 'Status']) || 'Nothing Yet',
          'Interview Stage': getVal(['Interview Stage', 'Stage']),
          'Interview Date & Interviewer': getVal(['Interview Date & Interviewer', 'Interview Info']),
          Offer: getVal(['Offer', 'Offer Status']) || 'No',
          Notes: getVal(['Notes', 'Note', 'Comments'])
        });
        addedCount++;
      }
    }
  });

  storage.set(TRACKER_KEY, existing);
  renderTracker();
  window.__showToast?.(`Import complete! Added ${addedCount} new applications.`, 'success');
}

// ===== CSV Exporting =====
function exportTrackerToCSV() {
  const apps = storage.get(TRACKER_KEY, []);
  if (apps.length === 0) {
    window.__showToast?.('No application tracker data to export.', 'info');
    return;
  }

  const csv = Papa.unparse(apps);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `job_applications_tracker_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  window.__showToast?.('Tracker exported as CSV!', 'success');
}

// ===== AI Quick Import / Paste Parser =====
async function handleQuickImport() {
  const textInput = document.getElementById('quick-import-text');
  const text = textInput.value.trim();
  const apiKey = getOpenAIKey();

  if (!text) {
    window.__showToast?.('Please paste some job details first.', 'info');
    return;
  }

  // Set loading state on button
  const btn = document.getElementById('quick-import-btn');
  const originalHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span>⏳</span><span>Parsing...</span>`;

  try {
    let parsedData = {};

    if (apiKey) {
      // AI-powered Parsing
      const systemPrompt = `You are a job application parser. Extract fields from the pasted text/URL. Respond ONLY with a JSON object in this format:
{
  "Company": "Company name",
  "Role Title": "Job title",
  "Type": "Internship" or "Fulltime" or "Contract",
  "Salary / Rate": "Salary if mentioned, else empty",
  "Link to Job Advert": "Url link to job if mentioned, else empty",
  "Application Date": "YYYY-MM-DD (today's date is ${new Date().toISOString().split('T')[0]})",
  "Response": "Nothing Yet",
  "Interview Stage": "",
  "Interview Date & Interviewer": "",
  "Offer": "No",
  "Notes": "Summary of requirements, location, visa sponsorships, or deadlines"
}`;

      const aiResponse = await callOpenAI(systemPrompt, text);
      try {
        parsedData = JSON.parse(aiResponse);
      } catch (err) {
        console.warn('AI returned invalid JSON, falling back to regex:', aiResponse);
        parsedData = parseFallbackRegex(text);
      }
    } else {
      // Fallback local regex parser
      parsedData = parseFallbackRegex(text);
      window.__showToast?.('No API Key. Used fallback parser (AI disabled).', 'warning');
    }

    // Open add modal prefilled
    openAppModal();

    // Prefill form values
    if (parsedData.Company) document.getElementById('form-company').value = parsedData.Company;
    if (parsedData['Role Title']) document.getElementById('form-role').value = parsedData['Role Title'];
    if (parsedData.Type) document.getElementById('form-type').value = parsedData.Type;
    if (parsedData['Salary / Rate']) document.getElementById('form-salary').value = parsedData['Salary / Rate'];
    if (parsedData['Link to Job Advert']) document.getElementById('form-link').value = parsedData['Link to Job Advert'];
    if (parsedData['Application Date']) document.getElementById('form-date').value = parsedData['Application Date'];
    if (parsedData.Notes) document.getElementById('form-notes').value = parsedData.Notes;

    textInput.value = ''; // clear input
  } catch (err) {
    window.__showToast?.('Failed to parse details: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHtml;
  }
}

function parseFallbackRegex(text) {
  const result = {
    Company: '',
    'Role Title': '',
    Type: 'Internship',
    'Salary / Rate': '',
    'Link to Job Advert': '',
    'Application Date': new Date().toISOString().split('T')[0],
    Notes: 'Manually imported raw text'
  };

  // Try to find URLs
  const urlMatch = text.match(/https?:\/\/[^\s]+/);
  if (urlMatch) result['Link to Job Advert'] = urlMatch[0];

  // Simple key-value parsers for common formats
  const lines = text.split('\n');
  lines.forEach(line => {
    const parts = line.split(':');
    if (parts.length >= 2) {
      const key = parts[0].trim().toLowerCase();
      const val = parts.slice(1).join(':').trim();
      
      if (key.includes('company') || key.includes('employer')) {
        result.Company = val;
      } else if (key.includes('role') || key.includes('title') || key.includes('position')) {
        result['Role Title'] = val;
      } else if (key.includes('salary') || key.includes('pay') || key.includes('rate')) {
        result['Salary / Rate'] = val;
      } else if (key.includes('type')) {
        if (val.toLowerCase().includes('intern')) result.Type = 'Internship';
        else if (val.toLowerCase().includes('full')) result.Type = 'Fulltime';
      }
    }
  });

  // If company or role are still empty, try to guess from the first few lines
  if (!result.Company && lines[0]) {
    const guess = lines[0].split(/[|-]/);
    result.Company = guess[0]?.trim();
    if (guess[1]) result['Role Title'] = guess[1]?.trim();
  }

  return result;
}
