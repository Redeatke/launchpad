// Resume upload, storage, and tailoring
import { storage } from '../utils/storage.js';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import { esc } from '../utils/dom.js';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

const RESUME_KEY = 'resume_text';
const RESUME_FILE_KEY = 'resume_filename';

export function initResumeTab() {
  const dropzone = document.getElementById('resume-dropzone');
  const fileInput = document.getElementById('resume-file-input');
  const browseBtn = document.getElementById('browse-resume-btn');
  const reuploadBtn = document.getElementById('resume-reupload-btn');
  const clearBtn = document.getElementById('resume-clear-btn');

  browseBtn.addEventListener('click', () => fileInput.click());
  reuploadBtn?.addEventListener('click', () => fileInput.click());
  clearBtn?.addEventListener('click', clearResume);

  fileInput.addEventListener('change', (e) => {
    if (e.target.files[0]) handleFile(e.target.files[0]);
  });

  // Drag & drop
  dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });
  dropzone.addEventListener('click', () => fileInput.click());

  // Load existing resume
  loadSavedResume();
}

async function handleFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  let text = '';

  try {
    if (ext === 'pdf') {
      text = await extractPdfText(file);
    } else if (ext === 'docx' || ext === 'doc') {
      text = await extractDocxText(file);
    } else if (ext === 'txt') {
      text = await file.text();
    } else {
      window.__showToast?.('Unsupported file type. Use PDF, DOCX, or TXT.', 'error');
      return;
    }

    storage.set(RESUME_KEY, text);
    storage.set(RESUME_FILE_KEY, file.name);
    showResumePreview(text, file.name);
    window.__showToast?.(`Resume uploaded: ${file.name}`, 'success');
  } catch (e) {
    console.error('Resume parse error:', e);
    window.__showToast?.('Failed to parse file. Try a different format.', 'error');
  }
}

async function extractPdfText(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map(item => item.str);
    fullText += strings.join(' ') + '\n\n';
  }
  return fullText.trim();
}

async function extractDocxText(file) {
  const arrayBuffer = await file.arrayBuffer();
  try {
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value.trim();
  } catch (e) {
    console.error('Mammoth extraction failed:', e);
    return `[DOCX file: ${file.name}] — Could not extract text. Please upload a PDF version for full text extraction.`;
  }
}

function showResumePreview(text, filename) {
  document.getElementById('resume-upload-zone').style.display = 'none';
  const preview = document.getElementById('resume-preview-area');
  preview.style.display = 'block';
  document.getElementById('resume-content').textContent = text;

  // Show tailor panel
  const tailorPanel = document.getElementById('resume-tailor-panel');
  tailorPanel.style.display = 'block';
}

function loadSavedResume() {
  const text = storage.get(RESUME_KEY);
  const filename = storage.get(RESUME_FILE_KEY);
  if (text) {
    showResumePreview(text, filename || 'resume');
  }
}

function clearResume() {
  storage.remove(RESUME_KEY);
  storage.remove(RESUME_FILE_KEY);
  document.getElementById('resume-upload-zone').style.display = 'block';
  document.getElementById('resume-preview-area').style.display = 'none';
  document.getElementById('resume-tailor-panel').style.display = 'none';
  window.__showToast?.('Resume cleared', 'info');
}

export function getResumeText() {
  return storage.get(RESUME_KEY, '');
}

export function tailorResumeForJob(job) {
  const resumeText = getResumeText();
  if (!resumeText) {
    window.__showToast?.('Upload your resume first!', 'error');
    return;
  }

  const panel = document.getElementById('resume-tailor-panel');
  panel.style.display = 'block';

  // Job info
  document.getElementById('tailor-job-info').innerHTML = `
    <div class="glass-card" style="padding: 1rem; margin: 1rem 0;">
      <strong>${esc(job.company)}</strong> — ${esc(job.role)}
      <br><span style="color: var(--text-secondary); font-size: 0.8rem;">${esc(job.location)}</span>
    </div>
  `;

  // Extract keywords from role
  const keywords = extractKeywords(job.role);
  const resumeLower = resumeText.toLowerCase();
  const matching = keywords.filter(k => resumeLower.includes(k.toLowerCase()));
  const missing = keywords.filter(k => !resumeLower.includes(k.toLowerCase()));

  document.getElementById('tailor-keywords').innerHTML = `
    <h4 style="margin: 1rem 0 0.5rem;">🔑 Keywords Analysis</h4>
    <div>
      ${matching.map(k => `<span class="keyword-tag match">✓ ${k}</span>`).join('')}
      ${missing.map(k => `<span class="keyword-tag missing">✗ ${k}</span>`).join('')}
    </div>
  `;

  // Generate suggestions
  document.getElementById('tailor-suggestions').innerHTML = `
    <h4 style="margin: 1rem 0 0.5rem;">💡 Suggestions</h4>
    <ul style="font-size: 0.8rem; color: var(--text-secondary); padding-left: 1.25rem;">
      ${missing.length > 0 ? `<li>Consider adding experience with: <strong>${missing.join(', ')}</strong></li>` : '<li>Great — your resume covers the key role keywords!</li>'}
      <li>Tailor your summary/objective to mention "${esc(job.company)}" and the specific role</li>
      <li>Quantify achievements where possible (e.g., "improved performance by 40%")</li>
      <li>Place most relevant projects and experience first</li>
    </ul>
  `;

  // AI prompt
  const profile = storage.get('profile', {});
  document.getElementById('tailor-prompt-output').innerHTML = `
    <div class="prompt-box-header">
      <h4>🤖 AI Polish Prompt</h4>
      <button class="btn btn-ghost btn-sm" id="copy-tailor-prompt">📋 Copy</button>
    </div>
    <div class="prompt-box" id="tailor-prompt-text">You are a resume writing expert. Please help me tailor my resume for the following position:

Company: ${job.company}
Role: ${job.role}
Location: ${job.location}

Here is my current resume:
---
${resumeText.substring(0, 2000)}
---

Please:
1. Rewrite my summary/objective to target this specific role at ${job.company}
2. Reorder my experience to highlight the most relevant items first
3. Add relevant keywords: ${keywords.join(', ')}
4. Suggest any improvements to make my resume stronger for this application
5. Keep it to one page</div>
  `;

  document.getElementById('copy-tailor-prompt')?.addEventListener('click', () => {
    navigator.clipboard.writeText(document.getElementById('tailor-prompt-text').textContent);
    window.__showToast?.('Prompt copied to clipboard!', 'success');
  });

  // Switch to resume tab
  window.__switchTab?.('resume');
}

function extractKeywords(roleTitle) {
  const common = [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Go', 'Rust', 'Ruby',
    'React', 'Angular', 'Vue', 'Node.js', 'Express', 'Django', 'Flask', 'Spring',
    'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'CI/CD',
    'SQL', 'NoSQL', 'MongoDB', 'PostgreSQL', 'Redis',
    'REST', 'GraphQL', 'Microservices', 'API',
    'Machine Learning', 'Deep Learning', 'NLP', 'Computer Vision',
    'Git', 'Linux', 'Agile', 'Scrum',
    'Data Structures', 'Algorithms', 'System Design',
    'Full Stack', 'Frontend', 'Backend', 'DevOps', 'SRE',
    'Software Engineer', 'Product Manager', 'Quantitative',
  ];

  const roleLower = roleTitle.toLowerCase();
  const relevant = common.filter(k => {
    const kl = k.toLowerCase();
    return roleLower.includes(kl) || isRelated(roleLower, kl);
  });

  // Always include some base keywords
  const base = ['Data Structures', 'Algorithms', 'Git'];
  const merged = [...new Set([...relevant, ...base])];
  return merged.slice(0, 12);
}

function isRelated(role, keyword) {
  const relations = {
    'software engineer': ['JavaScript', 'Python', 'Java', 'React', 'Node.js', 'SQL', 'REST', 'System Design'],
    'frontend': ['JavaScript', 'React', 'TypeScript', 'CSS', 'HTML'],
    'backend': ['Python', 'Java', 'Node.js', 'SQL', 'REST', 'Microservices'],
    'full stack': ['JavaScript', 'React', 'Node.js', 'SQL', 'REST'],
    'devops': ['Docker', 'Kubernetes', 'AWS', 'CI/CD', 'Linux'],
    'ml': ['Python', 'Machine Learning', 'Deep Learning'],
    'data': ['Python', 'SQL', 'Machine Learning'],
    'quant': ['Python', 'C++', 'Algorithms', 'Math'],
  };
  for (const [r, keys] of Object.entries(relations)) {
    if (role.includes(r) && keys.map(k => k.toLowerCase()).includes(keyword)) return true;
  }
  return false;
}


