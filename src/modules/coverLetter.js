// Cover letter generator
import { coverLetterTemplates } from '../utils/templates.js';
import { storage } from '../utils/storage.js';
import { getJobById, getAllCachedJobs } from './jobsFetcher.js';
import { getResumeText } from './resumeManager.js';
import { callOpenAI, getOpenAIKey } from '../utils/openai.js';
import { esc } from '../utils/dom.js';

const DRAFTS_KEY = 'coverletter_drafts';

export function initCoverLetterTab() {
  const newBtn = document.getElementById('new-coverletter-btn');
  const saveBtn = document.getElementById('cl-save-btn');
  const copyBtn = document.getElementById('cl-copy-btn');
  const closeBtn = document.getElementById('cl-close-btn');
  const templateSelect = document.getElementById('cl-template-select');
  const jobSelect = document.getElementById('cl-job-select');
  const aiBtn = document.getElementById('cl-ai-btn');

  newBtn.addEventListener('click', openEditor);
  saveBtn.addEventListener('click', saveDraft);
  copyBtn.addEventListener('click', copyToClipboard);
  closeBtn.addEventListener('click', closeEditor);
  templateSelect.addEventListener('change', regenerate);
  jobSelect.addEventListener('change', regenerate);
  aiBtn?.addEventListener('click', generateAICoverLetter);

  renderDrafts();
}

function openEditor(jobId) {
  const editor = document.getElementById('coverletter-editor');
  editor.style.display = 'block';
  populateJobSelect();

  if (typeof jobId === 'string') {
    document.getElementById('cl-job-select').value = jobId;
  }
  regenerate();
}

function closeEditor() {
  document.getElementById('coverletter-editor').style.display = 'none';
}

function populateJobSelect() {
  const select = document.getElementById('cl-job-select');
  const jobs = getAllCachedJobs().filter(j => !j.closed);
  const current = select.value;
  select.innerHTML = '<option value="">Select a job...</option>' +
    jobs.slice(0, 200).map(j => `<option value="${j.id}">${esc(j.company)} — ${esc(j.role)}</option>`).join('');
  if (current) select.value = current;
}

function regenerate() {
  const template = document.getElementById('cl-template-select').value;
  const jobId = document.getElementById('cl-job-select').value;
  const job = jobId ? getJobById(jobId) : null;
  const profile = storage.get('profile', {});
  const resumeText = getResumeText();

  // Extract highlights from resume
  let highlights = '';
  if (resumeText) {
    const skills = resumeText.match(/(?:skills?|technologies|proficient|experienced?)[\s:]+([^\n]+)/i);
    if (skills) highlights = skills[1].substring(0, 150);
  }

  const data = {
    company: job?.company || '[Company Name]',
    role: job?.role || '[Role Title]',
    location: job?.location || '',
    userName: profile.name || '[Your Name]',
    userEmail: profile.email || '[Your Email]',
    userPhone: profile.phone || '',
    userLinkedin: profile.linkedin || '',
    resumeHighlights: highlights,
  };

  const fn = coverLetterTemplates[template];
  if (fn) {
    document.getElementById('coverletter-textarea').value = fn(data);
  }

  document.getElementById('coverletter-editor-title').textContent =
    job ? `Cover Letter — ${job.company}` : 'New Cover Letter';
}

function saveDraft() {
  const text = document.getElementById('coverletter-textarea').value;
  const jobId = document.getElementById('cl-job-select').value;
  const job = jobId ? getJobById(jobId) : null;

  const drafts = storage.get(DRAFTS_KEY, []);
  const draft = {
    id: 'cl_' + Date.now(),
    jobId,
    company: job?.company || 'General',
    role: job?.role || '',
    text,
    createdAt: new Date().toISOString(),
  };
  drafts.unshift(draft);
  storage.set(DRAFTS_KEY, drafts);
  renderDrafts();
  updateCoverLetterCount();
  window.__showToast?.('Cover letter saved!', 'success');
}

function copyToClipboard() {
  const text = document.getElementById('coverletter-textarea').value;
  navigator.clipboard.writeText(text);
  window.__showToast?.('Copied to clipboard!', 'success');
}

function renderDrafts() {
  const container = document.getElementById('coverletter-drafts');
  const drafts = storage.get(DRAFTS_KEY, []);
  updateCoverLetterCount();

  if (drafts.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">✉️</div><h3>No cover letters yet</h3><p>Click "New Cover Letter" to get started</p></div>';
    return;
  }

  container.innerHTML = drafts.map(d => `
    <div class="draft-card" data-id="${d.id}">
      <div class="draft-card-title">${esc(d.company)}${d.role ? ' — ' + esc(d.role) : ''}</div>
      <div class="draft-card-meta">${new Date(d.createdAt).toLocaleDateString()}</div>
      <div class="draft-card-actions">
        <button class="btn btn-ghost btn-sm cl-load-btn" data-id="${d.id}">Open</button>
        <button class="btn btn-ghost btn-sm cl-delete-btn" data-id="${d.id}">🗑️</button>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.cl-load-btn').forEach(btn => {
    btn.addEventListener('click', () => loadDraft(btn.dataset.id));
  });
  container.querySelectorAll('.cl-delete-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteDraft(btn.dataset.id));
  });
}

function loadDraft(id) {
  const drafts = storage.get(DRAFTS_KEY, []);
  const draft = drafts.find(d => d.id === id);
  if (!draft) return;

  openEditor();
  document.getElementById('coverletter-textarea').value = draft.text;
  document.getElementById('coverletter-editor-title').textContent = `Cover Letter — ${draft.company}`;
  if (draft.jobId) document.getElementById('cl-job-select').value = draft.jobId;
}

function deleteDraft(id) {
  let drafts = storage.get(DRAFTS_KEY, []);
  drafts = drafts.filter(d => d.id !== id);
  storage.set(DRAFTS_KEY, drafts);
  renderDrafts();
  window.__showToast?.('Draft deleted', 'info');
}

function updateCoverLetterCount() {
  const drafts = storage.get(DRAFTS_KEY, []);
  const badge = document.getElementById('coverletters-count');
  if (badge) badge.textContent = drafts.length;
}

export function genCoverLetterForJob(jobId) {
  window.__switchTab?.('coverletters');
  setTimeout(() => openEditor(jobId), 100);
}

async function generateAICoverLetter() {
  const apiKey = getOpenAIKey();
  if (!apiKey) {
    window.__showToast?.('Please enter your OpenAI API key in the Settings tab first!', 'error');
    window.__switchTab?.('settings');
    return;
  }

  const jobId = document.getElementById('cl-job-select').value;
  const job = jobId ? getJobById(jobId) : null;
  const resumeText = getResumeText();

  if (!resumeText) {
    window.__showToast?.('Please upload your resume in the Resume tab first!', 'error');
    window.__switchTab?.('resume');
    return;
  }

  const template = document.getElementById('cl-template-select').value;
  const profile = storage.get('profile', {});

  const aiBtn = document.getElementById('cl-ai-btn');
  const textarea = document.getElementById('coverletter-textarea');

  const originalBtnText = aiBtn.textContent;
  aiBtn.textContent = '✨ Generating...';
  aiBtn.disabled = true;

  try {
    const systemPrompt = `You are an expert career advisor and professional resume/cover letter writer.
Your goal is to write a highly compelling, tailored cover letter based on the user's resume and target job details.
The tone should match the requested style: ${template}.
Make sure to keep the length to approximately one page (around 300-400 words).
Ensure there are no brackets or placeholders left in the final text. Use the user's profile details if provided.`;

    const userPrompt = `Target Job Details:
Company: ${job?.company || '[Company Name]'}
Role: ${job?.role || '[Role Name]'}
Location: ${job?.location || ''}

User Profile Details:
Name: ${profile.name || '[Your Name]'}
Email: ${profile.email || '[Your Email]'}
Phone: ${profile.phone || ''}
LinkedIn: ${profile.linkedin || ''}
Portfolio: ${profile.portfolio || ''}

User Resume Text:
---
${resumeText}
---

Please write a custom cover letter tailored to this job and highlighting the most relevant skills/experiences from the resume.`;

    const result = await callOpenAI(systemPrompt, userPrompt);
    textarea.value = result;
    window.__showToast?.('AI Cover Letter generated successfully!', 'success');
  } catch (err) {
    console.error(err);
    window.__showToast?.(err.message || 'Failed to generate cover letter.', 'error');
  } finally {
    aiBtn.textContent = originalBtnText;
    aiBtn.disabled = false;
  }
}


