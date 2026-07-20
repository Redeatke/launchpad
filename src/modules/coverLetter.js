// Cover letter generator
import { coverLetterTemplates } from '../utils/templates.js';
import { storage } from '../utils/storage.js';
import { getJobById, getAllCachedJobs } from './jobsFetcher.js';
import { getResumeText } from './resumeManager.js';
import { callAI, getAIKeys } from '../utils/ai.js';
import { esc } from '../utils/dom.js';

const DRAFTS_KEY = 'coverletter_drafts';

export function initCoverLetterTab() {
  const newBtn = document.getElementById('new-coverletter-btn');
  const saveBtn = document.getElementById('cl-save-btn');
  const copyBtn = document.getElementById('cl-copy-btn');
  const wordBtn = document.getElementById('cl-word-btn');
  const pdfBtn = document.getElementById('cl-pdf-btn');
  const closeBtn = document.getElementById('cl-close-btn');
  const templateSelect = document.getElementById('cl-template-select');
  const jobSelect = document.getElementById('cl-job-select');
  const aiBtn = document.getElementById('cl-ai-btn');

  newBtn.addEventListener('click', openEditor);
  saveBtn.addEventListener('click', saveDraft);
  copyBtn.addEventListener('click', copyToClipboard);
  wordBtn?.addEventListener('click', exportToWord);
  pdfBtn?.addEventListener('click', exportToPDF);
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

export function renderDrafts() {
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
        <button class="btn btn-ghost btn-sm cl-delete-btn" data-id="${d.id}">🗑️</button>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.draft-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (!e.target.closest('.cl-delete-btn')) {
        loadDraft(card.dataset.id);
      }
    });
  });
  container.querySelectorAll('.cl-delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteDraft(btn.dataset.id);
    });
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

export function updateCoverLetterCount() {
  const drafts = storage.get(DRAFTS_KEY, []);
  const badge = document.getElementById('coverletters-count');
  if (badge) badge.textContent = drafts.length;
}

export function genCoverLetterForJob(jobId) {
  window.__switchTab?.('coverletters');
  setTimeout(() => openEditor(jobId), 100);
}

async function generateAICoverLetter() {
  const keys = getAIKeys();
  if (keys.provider === 'openai' && !keys.openai) {
    window.__showToast?.('Please enter your OpenAI API key in the Settings tab first!', 'error');
    window.__switchTab?.('settings');
    return;
  }
  if (keys.provider === 'gemini' && !keys.gemini) {
    window.__showToast?.('Please enter your Gemini API key in the Settings tab first!', 'error');
    window.__switchTab?.('settings');
    return;
  }
  if (keys.provider === 'openrouter' && !keys.openrouter) {
    window.__showToast?.('Please enter your OpenRouter API key in the Settings tab first!', 'error');
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

    const result = await callAI(systemPrompt, userPrompt);
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

function exportToWord() {
  const text = document.getElementById('coverletter-textarea').value;
  if (!text) return window.__showToast?.('Nothing to export!', 'error');

  const preHtml = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Cover Letter</title></head><body>";
  const postHtml = "</body></html>";
  const html = preHtml + text.replace(/\n/g, '<br>') + postHtml;

  const blob = new Blob(['\\ufeff', html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  
  const jobId = document.getElementById('cl-job-select').value;
  const job = jobId ? getJobById(jobId) : null;
  const company = job?.company || 'General';
  
  a.download = `Cover_Letter_${company.replace(/\\s+/g, '_')}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  window.__showToast?.('Exported to Word!', 'success');
}

function exportToPDF() {
  const text = document.getElementById('coverletter-textarea').value;
  if (!text) return window.__showToast?.('Nothing to export!', 'error');

  const printWindow = window.open('', '', 'height=800,width=800');
  printWindow.document.write('<html><head><title>Cover Letter</title>');
  printWindow.document.write('<style>body { font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.5; padding: 40px; white-space: pre-wrap; }</style>');
  printWindow.document.write('</head><body>');
  printWindow.document.write(text.replace(/</g, '&lt;').replace(/>/g, '&gt;'));
  printWindow.document.write('</body></html>');
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
}

