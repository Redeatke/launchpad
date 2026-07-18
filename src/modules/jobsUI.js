// Jobs tab UI: rendering, filtering, searching
import { fetchAllJobs, getAllCachedJobs, getJobById } from './jobsFetcher.js';
import { callAI, getAIKeys } from '../utils/ai.js';
import { storage } from '../utils/storage.js';
import { esc } from '../utils/dom.js';

let allJobs = [];
let filteredJobs = [];

export async function initJobsTab() {
  const grid = document.getElementById('jobs-grid');
  const refreshBtn = document.getElementById('refresh-jobs-btn');
  const searchInput = document.getElementById('jobs-search');
  const filterRole = document.getElementById('filter-role');
  const filterStatus = document.getElementById('filter-status');
  const filterSource = document.getElementById('filter-source');
  const filterUsOnly = document.getElementById('filter-us-only');

  // Show loading
  grid.innerHTML = '<div class="loading-overlay"><div class="loading-spinner"></div> Loading jobs from GitHub...</div>';

  refreshBtn.addEventListener('click', () => loadJobs(true));
  searchInput.addEventListener('input', applyFilters);
  filterRole.addEventListener('change', applyFilters);
  filterStatus.addEventListener('change', applyFilters);
  filterSource.addEventListener('change', applyFilters);
  filterUsOnly.addEventListener('change', applyFilters);

  await loadJobs(false);
}

async function loadJobs(forceRefresh) {
  const grid = document.getElementById('jobs-grid');
  grid.innerHTML = '<div class="loading-overlay"><div class="loading-spinner"></div> Fetching latest jobs...</div>';

  try {
    allJobs = await fetchAllJobs(forceRefresh);
    updateJobsCount(allJobs.length);
    applyFilters();
    if (forceRefresh) window.__showToast?.('Jobs refreshed!', 'success');
  } catch (e) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><h3>Failed to load jobs</h3><p>${e.message}</p></div>`;
  }
}

function applyFilters() {
  const search = document.getElementById('jobs-search').value.toLowerCase();
  const roleFilter = document.getElementById('filter-role').value.toLowerCase();
  const statusFilter = document.getElementById('filter-status').value;
  const sourceFilter = document.getElementById('filter-source').value;
  const usOnlyFilter = document.getElementById('filter-us-only').checked;

  filteredJobs = allJobs.filter(job => {
    if (search) {
      const haystack = `${job.company} ${job.role} ${job.location}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    if (roleFilter && !job.role.toLowerCase().includes(roleFilter)) return false;
    if (statusFilter === 'open' && job.closed) return false;
    if (statusFilter === 'closed' && !job.closed) return false;
    if (sourceFilter && job.source !== sourceFilter) return false;
    if (usOnlyFilter && !job.usOnly) return false;
    return true;
  });

  renderJobs(filteredJobs);
  document.getElementById('jobs-result-count').textContent = `Showing ${filteredJobs.length} of ${allJobs.length} jobs`;
}

function renderJobs(jobs) {
  const grid = document.getElementById('jobs-grid');

  if (jobs.length === 0) {
    grid.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔍</div><h3>No jobs found</h3><p>Try adjusting your filters or refresh to fetch latest listings.</p></div>';
    return;
  }

  grid.innerHTML = jobs.slice(0, 100).map(job => `
    <div class="job-card ${job.closed ? 'closed' : ''}" data-id="${job.id}">
      <div class="job-card-header">
        <span class="job-company">${esc(job.company)}</span>
        <span class="job-source">${esc(job.source)}</span>
      </div>
      <div class="job-role">${esc(job.role)}</div>
      <div class="job-meta">
        ${job.location ? `<span class="job-meta-item">📍 ${esc(job.location)}</span>` : ''}
        ${job.datePosted ? `<span class="job-meta-item">📅 ${esc(job.datePosted)}</span>` : ''}
      </div>
      <div class="job-tags">
        ${job.noSponsorship ? '<span class="job-tag warning">🛂 No Sponsorship</span>' : ''}
        ${job.usOnly ? '<span class="job-tag us">🇺🇸 US Only</span>' : ''}
      </div>
      <div class="job-actions">
        ${job.applyLink && !job.closed ? `<a href="${esc(job.applyLink)}" target="_blank" rel="noopener" class="btn btn-primary btn-sm">Apply →</a>` : ''}
        <button class="btn btn-secondary btn-sm tailor-btn" data-id="${job.id}">✨ Tailor Resume</button>
        <button class="btn btn-ghost btn-sm draft-email-btn" data-id="${job.id}">📧 Draft Email</button>
        <button class="btn btn-ghost btn-sm gen-cl-btn" data-id="${job.id}">✉️ Cover Letter</button>
      </div>
    </div>
  `).join('');

  grid.classList.add('stagger-enter');

  // Attach action listeners
  grid.querySelectorAll('.tailor-btn').forEach(btn => {
    btn.addEventListener('click', () => window.__tailorResume?.(btn.dataset.id));
  });
  grid.querySelectorAll('.draft-email-btn').forEach(btn => {
    btn.addEventListener('click', () => window.__draftEmailForJob?.(btn.dataset.id));
  });
  grid.querySelectorAll('.gen-cl-btn').forEach(btn => {
    btn.addEventListener('click', () => window.__genCoverLetterForJob?.(btn.dataset.id));
  });

  // Attach card click listener (excluding button clicks)
  grid.querySelectorAll('.job-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.btn') || e.target.closest('a')) return;
      openJobDetailsModal(card.dataset.id);
    });
  });
}

async function openJobDetailsModal(jobId) {
  const job = getJobById(jobId);
  if (!job) return;

  const overlay = document.getElementById('modal-overlay');
  const title = document.getElementById('modal-title');
  const body = document.getElementById('modal-body');
  const footer = document.getElementById('modal-footer');
  const closeBtn = document.getElementById('modal-close-btn');

  title.textContent = `${job.company} — ${job.role}`;
  body.innerHTML = `
    <div class="loading-overlay" style="padding: 2rem;">
      <div class="loading-spinner"></div>
      Generating job details...
    </div>
  `;

  footer.innerHTML = `
    <button class="btn btn-secondary close-modal-btn">Close</button>
    <button class="btn btn-secondary track-job-btn" style="border-color: var(--accent-primary); color: var(--text-accent);">📅 Track Job</button>
    ${job.applyLink && !job.closed ? `<a href="${esc(job.applyLink)}" target="_blank" rel="noopener" class="btn btn-primary">Apply Now →</a>` : ''}
  `;

  overlay.style.display = 'flex';

  const closeModal = () => { overlay.style.display = 'none'; };
  closeBtn.onclick = closeModal;
  footer.querySelector('.close-modal-btn').onclick = closeModal;
  
  const trackBtn = footer.querySelector('.track-job-btn');
  if (trackBtn) {
    trackBtn.onclick = () => {
      closeModal();
      window.__trackJob?.(jobId);
    };
  }

  // Load Description
  const keys = getAIKeys();
  const hasKey = keys.openai || keys.gemini || keys.openrouter;
  try {
    let descriptionHTML = '';
    
    if (hasKey) {
      const systemPrompt = `You are a professional technical recruiter. Write a highly realistic, concise, and structured job description for the given company and role. Format the output in clean, readable HTML (do not include body, html, or markdown backticks, just raw HTML tags like <h4>, <p>, <ul>, <li>). Include three sections: "About the Role", "Key Responsibilities", and "Requirements".`;
      const userPrompt = `Company: ${job.company}\nRole: ${job.role}\nLocation: ${job.location || 'Remote'}\nSource: ${job.source}\nSponsorship: ${job.noSponsorship ? 'No sponsorship supported' : 'Standard sponsorship info'}`;
      
      const responseText = await callAI(systemPrompt, userPrompt);
      descriptionHTML = responseText;
    } else {
      // Fallback description template
      const guessSkill = job.role.toLowerCase().includes('data') ? 'Python, SQL, and data analytics tools' : 'modern frontend frameworks, APIs, and clean engineering practices';
      descriptionHTML = `
        <div style="background: rgba(245,158,11,0.08); border: 1px dashed var(--warning); padding: 0.75rem; border-radius: var(--radius-md); font-size: 0.75rem; margin-bottom: 1.25rem; color: var(--warning); display: flex; align-items: center; gap: 0.5rem;">
          <span>💡</span>
          <span>Tip: Add your AI API Key in settings to get customized, AI-generated job requirements!</span>
        </div>
        <div class="job-desc-content">
          <div class="job-desc-section">
            <h4 class="job-desc-section-title">About the Role</h4>
            <p>We are seeking a talented and motivated ${esc(job.role)} to join our engineering organization at ${esc(job.company)}. In this role, you will collaborate with product managers, designers, and other engineers to deliver high-quality, user-friendly experiences. This is a great opportunity to make a meaningful impact and grow your technical career.</p>
          </div>
          <div class="job-desc-section">
            <h4 class="job-desc-section-title">Key Responsibilities</h4>
            <ul class="job-desc-list">
              <li>Design, develop, and deploy clean, maintainable, and efficient code.</li>
              <li>Collaborate with cross-functional teams to define, design, and ship new capabilities.</li>
              <li>Identify and resolve bottlenecks, bugs, and optimize application performance.</li>
              <li>Write comprehensive unit tests and participate in design reviews.</li>
            </ul>
          </div>
          <div class="job-desc-section">
            <h4 class="job-desc-section-title">Requirements</h4>
            <ul class="job-desc-list">
              <li>Strong problem-solving skills and computer science fundamentals.</li>
              <li>Familiarity with ${guessSkill}.</li>
              <li>Strong communication skills and a collaborative mindset.</li>
              <li>Previous projects, internships, or academic coursework demonstrating technical expertise.</li>
            </ul>
          </div>
        </div>
      `;
    }

    // Append metadata section to description HTML
    body.innerHTML = `
      <div class="job-desc-meta-grid">
        <div class="job-desc-meta-item">
          <span class="job-desc-meta-label">Location</span>
          <span class="job-desc-meta-value">📍 ${esc(job.location || 'Remote / Not specified')}</span>
        </div>
        <div class="job-desc-meta-item">
          <span class="job-desc-meta-label">Source Feed</span>
          <span class="job-desc-meta-value">📁 ${esc(job.source)}</span>
        </div>
        <div class="job-desc-meta-item">
          <span class="job-desc-meta-label">Posted Date</span>
          <span class="job-desc-meta-value">📅 ${esc(job.datePosted || 'Recent')}</span>
        </div>
        <div class="job-desc-meta-item">
          <span class="job-desc-meta-label">Sponsorship</span>
          <span class="job-desc-meta-value">${job.noSponsorship ? '🛂 No Sponsorship' : '✅ Standard Support'}</span>
        </div>
      </div>
      <div>
        ${descriptionHTML}
      </div>
    `;

  } catch (err) {
    body.innerHTML = `
      <div class="empty-state" style="padding: 1.5rem 0;">
        <div class="empty-state-icon">⚠️</div>
        <h3>Failed to generate description</h3>
        <p>${esc(err.message)}</p>
      </div>
    `;
  }
}

function updateJobsCount(count) {
  const badge = document.getElementById('jobs-count');
  if (badge) badge.textContent = count;
}



export function getFilteredJobs() { return filteredJobs; }
