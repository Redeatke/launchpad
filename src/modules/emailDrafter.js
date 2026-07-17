// Email draft generator
import { emailTemplates } from '../utils/templates.js';
import { storage } from '../utils/storage.js';
import { getJobById, getAllCachedJobs } from './jobsFetcher.js';
import { getContacts, getContactById } from './apolloContacts.js';
import { getResumeText } from './resumeManager.js';
import { callAI, getAIKeys } from '../utils/ai.js';
import { esc } from '../utils/dom.js';

const DRAFTS_KEY = 'email_drafts';

export function initEmailTab() {
  const newBtn = document.getElementById('new-email-btn');
  const saveBtn = document.getElementById('email-save-btn');
  const copyBtn = document.getElementById('email-copy-btn');
  const mailtoBtn = document.getElementById('email-mailto-btn');
  const closeBtn = document.getElementById('email-close-btn');
  const templateSelect = document.getElementById('email-template-select');
  const contactSelect = document.getElementById('email-contact-select');
  const jobSelect = document.getElementById('email-job-select');
  const aiBtn = document.getElementById('email-ai-btn');

  newBtn.addEventListener('click', () => openEditor());
  saveBtn.addEventListener('click', saveDraft);
  copyBtn.addEventListener('click', copyDraft);
  mailtoBtn.addEventListener('click', openMailto);
  closeBtn.addEventListener('click', closeEditor);
  templateSelect.addEventListener('change', regenerate);
  contactSelect.addEventListener('change', regenerate);
  jobSelect.addEventListener('change', regenerate);
  aiBtn?.addEventListener('click', generateAIEmail);

  renderDrafts();
}

function openEditor(contactId, jobId) {
  const editor = document.getElementById('email-editor');
  editor.style.display = 'block';
  populateSelects();
  if (contactId) document.getElementById('email-contact-select').value = contactId;
  if (jobId) document.getElementById('email-job-select').value = jobId;
  regenerate();
}

function closeEditor() {
  document.getElementById('email-editor').style.display = 'none';
}

function populateSelects() {
  const contactSelect = document.getElementById('email-contact-select');
  const jobSelect = document.getElementById('email-job-select');
  const contacts = getContacts();
  const jobs = getAllCachedJobs().filter(j => !j.closed);

  contactSelect.innerHTML = '<option value="">Select a contact...</option>' +
    contacts.map(c => `<option value="${c.id}">${esc(c.name)} — ${esc(c.company)}</option>`).join('');

  jobSelect.innerHTML = '<option value="">Select a job...</option>' +
    jobs.slice(0, 200).map(j => `<option value="${j.id}">${esc(j.company)} — ${esc(j.role)}</option>`).join('');
}

function regenerate() {
  const template = document.getElementById('email-template-select').value;
  const contactId = document.getElementById('email-contact-select').value;
  const jobId = document.getElementById('email-job-select').value;

  const contact = contactId ? getContactById(contactId) : null;
  const job = jobId ? getJobById(jobId) : null;
  const profile = storage.get('profile', {});
  const resumeText = getResumeText();

  let highlights = '';
  if (resumeText) {
    const skills = resumeText.match(/(?:skills?|technologies)[\s:]+([^\n]+)/i);
    if (skills) highlights = skills[1].substring(0, 120);
  }

  const data = {
    contactName: contact?.firstName || contact?.name?.split(' ')[0] || '[Name]',
    company: job?.company || contact?.company || '[Company]',
    role: job?.role || '[Role Title]',
    userName: profile.name || '[Your Name]',
    userEmail: profile.email || '[Your Email]',
    userLinkedin: profile.linkedin || '',
    resumeHighlights: highlights,
  };

  const fn = emailTemplates[template];
  if (fn) {
    const result = fn(data);
    document.getElementById('email-subject').value = result.subject;
    document.getElementById('email-textarea').value = result.body;
    document.getElementById('email-to').value = contact?.email || '';
  }

  document.getElementById('email-editor-title').textContent =
    contact ? `Email to ${contact.name}` : 'New Email Draft';
}

function saveDraft() {
  const drafts = storage.get(DRAFTS_KEY, []);
  const draft = {
    id: 'email_' + Date.now(),
    to: document.getElementById('email-to').value,
    subject: document.getElementById('email-subject').value,
    body: document.getElementById('email-textarea').value,
    contactId: document.getElementById('email-contact-select').value,
    jobId: document.getElementById('email-job-select').value,
    createdAt: new Date().toISOString(),
  };
  drafts.unshift(draft);
  storage.set(DRAFTS_KEY, drafts);
  renderDrafts();
  updateEmailCount();
  window.__showToast?.('Email draft saved!', 'success');
}

function copyDraft() {
  const subject = document.getElementById('email-subject').value;
  const body = document.getElementById('email-textarea').value;
  navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
  window.__showToast?.('Copied to clipboard!', 'success');
}

function openMailto() {
  const to = document.getElementById('email-to').value;
  const subject = encodeURIComponent(document.getElementById('email-subject').value);
  const body = encodeURIComponent(document.getElementById('email-textarea').value);
  window.open(`mailto:${to}?subject=${subject}&body=${body}`, '_blank');
}

function renderDrafts() {
  const container = document.getElementById('email-drafts');
  const drafts = storage.get(DRAFTS_KEY, []);
  updateEmailCount();

  if (drafts.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📧</div><h3>No email drafts</h3><p>Click "New Draft" to compose</p></div>';
    return;
  }

  container.innerHTML = drafts.map(d => `
    <div class="draft-card" data-id="${d.id}">
      <div class="draft-card-title">${esc(d.subject || 'Untitled')}</div>
      <div class="draft-card-meta">To: ${esc(d.to || 'N/A')} · ${new Date(d.createdAt).toLocaleDateString()}</div>
      <div class="draft-card-actions">
        <button class="btn btn-ghost btn-sm email-load-btn" data-id="${d.id}">Open</button>
        <button class="btn btn-ghost btn-sm email-delete-btn" data-id="${d.id}">🗑️</button>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.email-load-btn').forEach(btn => {
    btn.addEventListener('click', () => loadDraft(btn.dataset.id));
  });
  container.querySelectorAll('.email-delete-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteDraft(btn.dataset.id));
  });
}

function loadDraft(id) {
  const drafts = storage.get(DRAFTS_KEY, []);
  const draft = drafts.find(d => d.id === id);
  if (!draft) return;
  openEditor(draft.contactId, draft.jobId);
  document.getElementById('email-to').value = draft.to || '';
  document.getElementById('email-subject').value = draft.subject || '';
  document.getElementById('email-textarea').value = draft.body || '';
}

function deleteDraft(id) {
  let drafts = storage.get(DRAFTS_KEY, []);
  drafts = drafts.filter(d => d.id !== id);
  storage.set(DRAFTS_KEY, drafts);
  renderDrafts();
  window.__showToast?.('Draft deleted', 'info');
}

function updateEmailCount() {
  const drafts = storage.get(DRAFTS_KEY, []);
  const badge = document.getElementById('emails-count');
  if (badge) badge.textContent = drafts.length;
}

export function draftEmailForJob(jobId) {
  window.__switchTab?.('emails');
  setTimeout(() => openEditor(null, jobId), 100);
}

export function draftEmailForContact(contactId) {
  window.__switchTab?.('emails');
  setTimeout(() => openEditor(contactId, null), 100);
}

async function generateAIEmail() {
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

  const contactId = document.getElementById('email-contact-select').value;
  const jobId = document.getElementById('email-job-select').value;
  const contact = contactId ? getContactById(contactId) : null;
  const job = jobId ? getJobById(jobId) : null;
  const resumeText = getResumeText();

  if (!resumeText) {
    window.__showToast?.('Please upload your resume in the Resume tab first!', 'error');
    window.__switchTab?.('resume');
    return;
  }

  const template = document.getElementById('email-template-select').value;
  const profile = storage.get('profile', {});

  const aiBtn = document.getElementById('email-ai-btn');
  const subjectInput = document.getElementById('email-subject');
  const bodyTextarea = document.getElementById('email-textarea');

  const originalBtnText = aiBtn.textContent;
  aiBtn.textContent = '✨ Generating...';
  aiBtn.disabled = true;

  try {
    const systemPrompt = `You are a professional outreach expert.
Your goal is to draft a highly effective, personalized outreach email based on the user's resume, the target job, and the target contact.
The type of email is: ${template}.
You MUST format your output exactly like this with "Subject:" and "Body:" markers:
Subject: [Outreach Email Subject]
Body:
[Outreach Email Body]

Ensure there are no brackets or placeholders left in the final text. Keep the body short, concise, and professional (under 200 words).`;

    const userPrompt = `Target Contact Details:
Name: ${contact?.name || '[Contact Name]'}
Title: ${contact?.title || '[Contact Title]'}
Company: ${contact?.company || '[Company Name]'}

Target Job Details:
Company: ${job?.company || contact?.company || '[Company Name]'}
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

Please draft the outreach email tailored to this scenario.`;

    const result = await callAI(systemPrompt, userPrompt);
    
    // Parse the Subject and Body from the response
    const subjectMatch = result.match(/^Subject:\s*(.+)$/m);
    const bodyMatch = result.split(/^Body:\s*/m);

    if (subjectMatch) {
      subjectInput.value = subjectMatch[1].trim();
    }
    
    if (bodyMatch && bodyMatch.length > 1) {
      bodyTextarea.value = bodyMatch[1].trim();
    } else {
      const cleanResult = result.replace(/^Subject:\s*.+$/m, '').replace(/^Body:\s*/m, '').trim();
      bodyTextarea.value = cleanResult;
    }
    
    window.__showToast?.('AI Email draft generated successfully!', 'success');
  } catch (err) {
    console.error(err);
    window.__showToast?.(err.message || 'Failed to generate email.', 'error');
  } finally {
    aiBtn.textContent = originalBtnText;
    aiBtn.disabled = false;
  }
}


