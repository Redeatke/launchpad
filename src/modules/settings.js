// Settings module
import { storage } from '../utils/storage.js';

export function initSettings() {
  const saveProfileBtn = document.getElementById('save-profile-btn');
  const saveApiBtn = document.getElementById('save-api-keys-btn');
  const exportBtn = document.getElementById('export-data-btn');
  const importBtn = document.getElementById('import-data-btn');
  const importInput = document.getElementById('import-data-input');
  const clearAllBtn = document.getElementById('clear-all-data-btn');

  saveProfileBtn.addEventListener('click', saveProfile);
  saveApiBtn.addEventListener('click', saveApiKeys);
  exportBtn.addEventListener('click', exportData);
  importBtn.addEventListener('click', () => importInput.click());
  importInput.addEventListener('change', (e) => { if (e.target.files[0]) importData(e.target.files[0]); });
  clearAllBtn.addEventListener('click', clearAll);

  loadProfile();
  loadApiKeys();
}

function saveProfile() {
  const profile = {
    name: document.getElementById('settings-name').value,
    email: document.getElementById('settings-email').value,
    phone: document.getElementById('settings-phone').value,
    linkedin: document.getElementById('settings-linkedin').value,
    github: document.getElementById('settings-github').value,
    portfolio: document.getElementById('settings-portfolio').value,
  };
  storage.set('profile', profile);
  updateUserDisplay(profile);
  window.__showToast?.('Profile saved!', 'success');
}

function loadProfile() {
  const profile = storage.get('profile', {});
  document.getElementById('settings-name').value = profile.name || '';
  document.getElementById('settings-email').value = profile.email || '';
  document.getElementById('settings-phone').value = profile.phone || '';
  document.getElementById('settings-linkedin').value = profile.linkedin || '';
  document.getElementById('settings-github').value = profile.github || '';
  document.getElementById('settings-portfolio').value = profile.portfolio || '';
  updateUserDisplay(profile);
}

function updateUserDisplay(profile) {
  const nameEl = document.getElementById('user-name');
  const emailEl = document.getElementById('user-email');
  if (profile.name) { nameEl.textContent = profile.name; emailEl.textContent = profile.email || ''; }
}

function saveApiKeys() {
  const keys = {
    provider: document.getElementById('settings-ai-provider').value,
    openai: document.getElementById('settings-openai-key').value,
    gemini: document.getElementById('settings-gemini-key').value,
    openrouter: document.getElementById('settings-openrouter-key').value
  };
  storage.set('api_keys', keys);
  window.__showToast?.('AI Settings saved!', 'success');
}

function loadApiKeys() {
  const keys = storage.get('api_keys', {});
  document.getElementById('settings-ai-provider').value = keys.provider || 'openai';
  document.getElementById('settings-openai-key').value = keys.openai || '';
  document.getElementById('settings-gemini-key').value = keys.gemini || '';
  document.getElementById('settings-openrouter-key').value = keys.openrouter || '';
}

function exportData() {
  const data = storage.exportAll();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `launchpad_backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click(); URL.revokeObjectURL(url);
  window.__showToast?.('Data exported!', 'success');
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      storage.importAll(data);
      window.__showToast?.('Data imported! Refreshing...', 'success');
      setTimeout(() => location.reload(), 1000);
    } catch { window.__showToast?.('Invalid JSON file', 'error'); }
  };
  reader.readAsText(file);
}

function clearAll() {
  if (confirm('Are you sure? This will delete ALL saved data including resume, drafts, and contacts.')) {
    storage.clear();
    window.__showToast?.('All data cleared. Refreshing...', 'info');
    setTimeout(() => location.reload(), 1000);
  }
}
