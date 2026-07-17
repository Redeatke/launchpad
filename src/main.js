// LaunchPad — Main entry point
import { initJobsTab } from './modules/jobsUI.js';
import { initResumeTab, tailorResumeForJob } from './modules/resumeManager.js';
import { initCoverLetterTab, genCoverLetterForJob } from './modules/coverLetter.js';
import { initProjectsTab } from './modules/projectSuggester.js';
import { initContactsTab } from './modules/apolloContacts.js';
import { initEmailTab, draftEmailForJob, draftEmailForContact } from './modules/emailDrafter.js';
import { initSettings } from './modules/settings.js';
import { getJobById, getAllCachedJobs } from './modules/jobsFetcher.js';
import { storage } from './utils/storage.js';
import { initTracker, addApplicationFromJob, renderTracker } from './modules/tracker.js';

// ===== Tab Navigation =====
function initTabs() {
  const navItems = document.querySelectorAll('.nav-item[data-tab]');
  navItems.forEach(item => {
    item.addEventListener('click', () => switchTab(item.dataset.tab));
  });
}

function switchTab(tabId) {
  // Update nav
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const navItem = document.querySelector(`[data-tab="${tabId}"]`);
  if (navItem) navItem.classList.add('active');

  // Update content
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  const tabContent = document.getElementById(`tab-${tabId}`);
  if (tabContent) tabContent.classList.add('active');

  // Close mobile sidebar
  document.getElementById('sidebar').classList.remove('open');
}

// ===== Dashboard =====
function renderDashboard() {
  const grid = document.getElementById('dashboard-grid');
  const jobs = getAllCachedJobs();
  const openJobs = jobs.filter(j => !j.closed).length;
  const coverLetters = storage.get('coverletter_drafts', []).length;
  const emailDrafts = storage.get('email_drafts', []).length;
  const contacts = storage.get('contacts', []).length;
  const hasResume = !!storage.get('resume_text');
  const profile = storage.get('profile', {});
  const trackedApps = storage.get('job_applications', []).length;

  grid.innerHTML = `
    <div class="dash-card" data-goto="jobs">
      <div class="dash-card-icon">💼</div>
      <div class="dash-card-value">${openJobs}</div>
      <div class="dash-card-label">Open Positions</div>
      <div class="dash-card-sub">${jobs.length} total across all sources</div>
    </div>
    <div class="dash-card" data-goto="tracker">
      <div class="dash-card-icon">📅</div>
      <div class="dash-card-value">${trackedApps}</div>
      <div class="dash-card-label">Tracked Applications</div>
      <div class="dash-card-sub">Manage job search</div>
    </div>
    <div class="dash-card" data-goto="resume">
      <div class="dash-card-icon">📄</div>
      <div class="dash-card-value">${hasResume ? '✓' : '—'}</div>
      <div class="dash-card-label">Resume</div>
      <div class="dash-card-sub">${hasResume ? 'Uploaded & ready' : 'Upload to get started'}</div>
    </div>
    <div class="dash-card" data-goto="coverletters">
      <div class="dash-card-icon">✉️</div>
      <div class="dash-card-value">${coverLetters}</div>
      <div class="dash-card-label">Cover Letters</div>
      <div class="dash-card-sub">Saved drafts</div>
    </div>
    <div class="dash-card" data-goto="contacts">
      <div class="dash-card-icon">👤</div>
      <div class="dash-card-value">${contacts}</div>
      <div class="dash-card-label">Contacts</div>
      <div class="dash-card-sub">From Apollo.io imports</div>
    </div>
    <div class="dash-card" data-goto="emails">
      <div class="dash-card-icon">📧</div>
      <div class="dash-card-value">${emailDrafts}</div>
      <div class="dash-card-label">Email Drafts</div>
      <div class="dash-card-sub">Ready to send</div>
    </div>
    <div class="dash-card" data-goto="projects">
      <div class="dash-card-icon">💡</div>
      <div class="dash-card-value">16</div>
      <div class="dash-card-label">Project Ideas</div>
      <div class="dash-card-sub">To strengthen your resume</div>
    </div>
    ${!profile.name ? `
    <div class="dash-card" data-goto="settings" style="border-color: var(--warning); border-style: dashed;">
      <div class="dash-card-icon">⚙️</div>
      <div class="dash-card-value">!</div>
      <div class="dash-card-label">Setup Profile</div>
      <div class="dash-card-sub">Add your info for auto-fill</div>
    </div>` : ''}
  `;

  grid.classList.add('stagger-enter');
  grid.querySelectorAll('.dash-card[data-goto]').forEach(card => {
    card.addEventListener('click', () => switchTab(card.dataset.goto));
  });
}

// ===== Toast Notifications =====
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// ===== Mobile Sidebar =====
function initMobile() {
  const hamburger = document.getElementById('hamburger-btn');
  const sidebar = document.getElementById('sidebar');
  hamburger.addEventListener('click', () => sidebar.classList.toggle('open'));

  // Close on outside click
  document.getElementById('main-content').addEventListener('click', () => {
    sidebar.classList.remove('open');
  });
}

// ===== Global Action Bridges =====
window.__showToast = showToast;
window.__switchTab = switchTab;
window.__tailorResume = (jobId) => {
  const job = getJobById(jobId);
  if (job) tailorResumeForJob(job);
};
window.__draftEmailForJob = (jobId) => draftEmailForJob(jobId);
window.__draftEmailForContact = (contactId) => draftEmailForContact(contactId);
window.__genCoverLetterForJob = (jobId) => genCoverLetterForJob(jobId);
window.__trackJob = (jobId) => {
  const job = getJobById(jobId);
  if (job) {
    switchTab('tracker');
    addApplicationFromJob(job);
  }
};

// ===== Init =====
document.addEventListener('DOMContentLoaded', async () => {
  initTabs();
  initMobile();
  initSettings();
  initResumeTab();
  initCoverLetterTab();
  initProjectsTab();
  initContactsTab();
  initEmailTab();
  
  // Load tracker
  await initTracker();
  
  renderDashboard();

  // Load jobs (async, updates dashboard when done)
  await initJobsTab();
  renderDashboard();
  renderTracker();
});
