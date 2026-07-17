import { storage } from '../utils/storage.js';
import { callAI, getAIKeys } from '../utils/ai.js';
import { getResumeText } from './resumeManager.js';
import { getAllCachedJobs, getJobById } from './jobsFetcher.js';
import { esc } from '../utils/dom.js';

const CHAT_HISTORY_KEY = 'advisor_chat_history';

export function initChatbotTab() {
  const fab = document.getElementById('advisor-fab');
  const drawer = document.getElementById('advisor-drawer');
  const closeBtn = document.getElementById('advisor-close-btn');
  const jobSelect = document.getElementById('advisor-job-select');
  const input = document.getElementById('advisor-input');
  const sendBtn = document.getElementById('advisor-send-btn');
  const clearBtn = document.getElementById('advisor-clear-btn');

  // Drawer Toggle Logic
  fab.addEventListener('click', () => {
    drawer.classList.add('open');
    onDrawerOpened();
  });
  
  closeBtn.addEventListener('click', () => {
    drawer.classList.remove('open');
  });

  // Chat Logic
  sendBtn.addEventListener('click', sendMessage);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  jobSelect.addEventListener('change', updateContextStatus);
  clearBtn.addEventListener('click', clearChat);

  renderHistory();
}

function onDrawerOpened() {
  populateJobSelect();
  updateContextStatus();
}

function populateJobSelect() {
  const select = document.getElementById('advisor-job-select');
  const trackedApps = storage.get('job_applications', []);
  const current = select.value;
  select.innerHTML = '<option value="">No job selected (General Advice)</option>' +
    trackedApps.map((app, idx) => `<option value="tracker_${idx}">${esc(app.Company)} — ${esc(app['Role Title'])}</option>`).join('');
  if (current) select.value = current;
}

function updateContextStatus() {
  const resumeStatus = document.getElementById('advisor-resume-status');
  const jobStatus = document.getElementById('advisor-job-status');
  const jobSelect = document.getElementById('advisor-job-select');

  const hasResume = !!getResumeText();
  if (hasResume) {
    resumeStatus.innerHTML = '<span class="status-icon" style="color: var(--success);">✓</span> Resume found';
  } else {
    resumeStatus.innerHTML = '<span class="status-icon" style="color: var(--danger);">❌</span> Resume not found';
  }

  if (jobSelect.value) {
    jobStatus.innerHTML = '<span class="status-icon" style="color: var(--success);">✓</span> Job selected';
  } else {
    jobStatus.innerHTML = '<span class="status-icon" style="color: var(--warning);">ℹ️</span> General advice mode';
  }
}

function renderHistory() {
  const messagesDiv = document.getElementById('advisor-messages');
  const history = storage.get(CHAT_HISTORY_KEY, []);
  
  if (history.length === 0) {
    messagesDiv.innerHTML = `
      <div class="chat-message ai">
        <div class="message-content">Hi! I'm your AI Career Advisor. Select a target job on the left, or just ask me for general career advice!</div>
      </div>
    `;
    return;
  }

  messagesDiv.innerHTML = history.map(msg => `
    <div class="chat-message ${msg.role === 'user' ? 'user' : 'ai'}">
      <div class="message-content">${formatMessageContent(msg.content)}</div>
    </div>
  `).join('');

  scrollToBottom();
}

function formatMessageContent(text) {
  // Simple markdown-like formatting for chat
  return esc(text)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
}

function scrollToBottom() {
  const messagesDiv = document.getElementById('advisor-messages');
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function clearChat() {
  storage.set(CHAT_HISTORY_KEY, []);
  renderHistory();
}

async function sendMessage() {
  const keys = getAIKeys();
  const provider = keys.provider || 'openai';
  if (!keys[provider]) {
    window.__showToast?.(`Please enter your ${provider.toUpperCase()} API key in the Settings tab first!`, 'error');
    window.__switchTab?.('settings');
    return;
  }

  const input = document.getElementById('advisor-input');
  const text = input.value.trim();
  if (!text) return;

  // Add user message to UI immediately
  const history = storage.get(CHAT_HISTORY_KEY, []);
  history.push({ role: 'user', content: text });
  storage.set(CHAT_HISTORY_KEY, history);
  input.value = '';
  renderHistory();

  // Add loading indicator
  const messagesDiv = document.getElementById('advisor-messages');
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'chat-message ai loading-msg';
  loadingDiv.innerHTML = '<div class="message-content">Thinking...</div>';
  messagesDiv.appendChild(loadingDiv);
  scrollToBottom();

  const sendBtn = document.getElementById('advisor-send-btn');
  sendBtn.disabled = true;

  try {
    const resumeText = getResumeText();
    const jobSelectVal = document.getElementById('advisor-job-select').value;
    let job = null;
    
    if (jobSelectVal.startsWith('tracker_')) {
      const idx = parseInt(jobSelectVal.replace('tracker_', ''));
      const apps = storage.get('job_applications', []);
      const app = apps[idx];
      if (app) {
        job = { company: app.Company, role: app['Role Title'], location: 'Tracked Application' };
      }
    } else if (jobSelectVal) {
      job = getJobById(jobSelectVal);
    }

    let systemPrompt = `You are LaunchPad AI, an expert career advisor and job search assistant.
Your goal is to provide highly actionable, direct, and supportive advice to the user based on their context.
Always be concise, formatting answers into small digestible paragraphs or bullet points.`;

    let contextData = '';
    if (resumeText) {
      contextData += `\n\nUSER'S RESUME:\n---\n${resumeText}\n---`;
    } else {
      contextData += `\n\nNote: The user has NOT uploaded a resume yet. Suggest they upload one in the Resume tab for better advice.`;
    }

    if (job) {
      contextData += `\n\nTARGET JOB DETAILS:\nCompany: ${job.company}\nRole: ${job.role}\nLocation: ${job.location || 'N/A'}`;
    }

    systemPrompt += contextData;

    // We pass the last 10 messages as context to the AI (since our simple callAI only takes system/user prompt, we bundle history into user prompt for now)
    const recentHistory = history.slice(-10);
    let userPrompt = "CHAT HISTORY:\n";
    recentHistory.forEach(msg => {
      userPrompt += `${msg.role.toUpperCase()}: ${msg.content}\n\n`;
    });
    userPrompt += `USER: ${text}`;

    const reply = await callAI(systemPrompt, userPrompt);
    
    // Add AI message to history
    history.push({ role: 'assistant', content: reply });
    storage.set(CHAT_HISTORY_KEY, history);

  } catch (err) {
    console.error(err);
    window.__showToast?.(err.message || 'Failed to get response.', 'error');
    history.push({ role: 'assistant', content: `*Error:* ${err.message}` });
    storage.set(CHAT_HISTORY_KEY, history);
  } finally {
    loadingDiv.remove();
    sendBtn.disabled = false;
    renderHistory();
  }
}
