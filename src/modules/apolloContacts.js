// Apollo.io CSV contact import and management
import { storage } from '../utils/storage.js';
import Papa from 'papaparse';
import { esc } from '../utils/dom.js';

const CONTACTS_KEY = 'contacts';

export function initContactsTab() {
  const importBtn = document.getElementById('import-contacts-btn');
  const csvInput = document.getElementById('contacts-csv-input');
  const clearBtn = document.getElementById('clear-contacts-btn');
  const searchInput = document.getElementById('contacts-search');

  importBtn.addEventListener('click', () => csvInput.click());
  csvInput.addEventListener('change', (e) => { if (e.target.files[0]) importCSV(e.target.files[0]); });
  clearBtn.addEventListener('click', clearContacts);
  searchInput.addEventListener('input', renderContacts);

  renderContacts();
}

function importCSV(file) {
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete(results) {
      const contacts = results.data.map((row, i) => normalizeContact(row, i)).filter(c => c.name);
      const existing = storage.get(CONTACTS_KEY, []);
      const merged = [...existing, ...contacts];
      storage.set(CONTACTS_KEY, merged);
      renderContacts();
      updateContactsCount();
      window.__showToast?.(`Imported ${contacts.length} contacts!`, 'success');
    },
    error(err) {
      window.__showToast?.('Failed to parse CSV: ' + err.message, 'error');
    }
  });
}

function normalizeContact(row, idx) {
  // Apollo CSV headers vary, so we try multiple field names
  const get = (...keys) => {
    for (const k of keys) {
      const val = row[k] || row[k.toLowerCase()] || row[k.replace(/ /g, '_')];
      if (val) return val.trim();
    }
    return '';
  };

  return {
    id: 'contact_' + Date.now() + '_' + idx,
    name: get('First Name', 'first_name', 'Name') + ' ' + get('Last Name', 'last_name'),
    firstName: get('First Name', 'first_name', 'Name'),
    lastName: get('Last Name', 'last_name'),
    title: get('Title', 'Job Title', 'Position', 'title'),
    company: get('Company', 'Organization', 'company', 'Company Name'),
    email: get('Email', 'Work Email', 'email', 'Email Address', 'Corporate Email'),
    phone: get('Phone', 'Work Phone', 'Mobile Phone', 'Direct Phone', 'phone'),
    linkedin: get('LinkedIn', 'LinkedIn URL', 'LinkedIn Url', 'Person Linkedin Url', 'linkedin'),
    location: get('City', 'Location', 'State') + (get('State') ? ', ' + get('State') : ''),
  };
}

function clearContacts() {
  storage.set(CONTACTS_KEY, []);
  renderContacts();
  updateContactsCount();
  window.__showToast?.('All contacts cleared', 'info');
}

function renderContacts() {
  const grid = document.getElementById('contacts-grid');
  const search = document.getElementById('contacts-search')?.value?.toLowerCase() || '';
  let contacts = storage.get(CONTACTS_KEY, []);

  updateContactsCount();

  if (search) {
    contacts = contacts.filter(c => {
      const hay = `${c.name} ${c.company} ${c.title} ${c.email}`.toLowerCase();
      return hay.includes(search);
    });
  }

  if (contacts.length === 0) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-state-icon">👤</div><h3>No contacts yet</h3><p>Import a CSV from Apollo.io to get started</p></div>`;
    return;
  }

  grid.innerHTML = contacts.map(c => `
    <div class="contact-card">
      <div class="contact-header">
        <div class="contact-avatar">${(c.firstName?.[0] || '?').toUpperCase()}</div>
        <div>
          <div class="contact-name">${esc(c.name)}</div>
          <div class="contact-title">${esc(c.title)}</div>
          <div class="contact-company">${esc(c.company)}</div>
        </div>
      </div>
      <div class="contact-info">
        ${c.email ? `<div class="contact-info-item">📧 ${esc(c.email)}</div>` : ''}
        ${c.phone ? `<div class="contact-info-item">📞 ${esc(c.phone)}</div>` : ''}
        ${c.location ? `<div class="contact-info-item">📍 ${esc(c.location)}</div>` : ''}
      </div>
      <div class="contact-actions">
        <button class="btn btn-primary btn-sm draft-contact-email" data-id="${c.id}">📧 Draft Email</button>
        ${c.linkedin ? `<a href="${esc(c.linkedin)}" target="_blank" class="btn btn-secondary btn-sm">🔗 LinkedIn</a>` : ''}
        <button class="btn btn-ghost btn-sm delete-contact-btn" data-id="${c.id}">🗑️</button>
      </div>
    </div>
  `).join('');

  grid.classList.add('stagger-enter');

  grid.querySelectorAll('.draft-contact-email').forEach(btn => {
    btn.addEventListener('click', () => window.__draftEmailForContact?.(btn.dataset.id));
  });
  grid.querySelectorAll('.delete-contact-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      let contacts = storage.get(CONTACTS_KEY, []);
      contacts = contacts.filter(c => c.id !== btn.dataset.id);
      storage.set(CONTACTS_KEY, contacts);
      renderContacts();
      window.__showToast?.('Contact removed', 'info');
    });
  });
}

function updateContactsCount() {
  const contacts = storage.get(CONTACTS_KEY, []);
  const badge = document.getElementById('contacts-count');
  if (badge) badge.textContent = contacts.length;
}

export function getContacts() { return storage.get(CONTACTS_KEY, []); }
export function getContactById(id) { return getContacts().find(c => c.id === id) || null; }


