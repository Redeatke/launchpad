// Project suggestion engine
import { storage } from '../utils/storage.js';
import { callAI, getAIKeys } from '../utils/ai.js';
import { esc } from '../utils/dom.js';

let PROJECTS = [];

const DEFAULT_PROJECTS = [
  { title: 'Job Application Tracker', desc: 'Build a full-stack app to track job applications, statuses, follow-ups, and notes. Demonstrates CRUD, auth, and database skills.', category: 'fullstack', difficulty: '1week', tech: ['React', 'Node.js', 'PostgreSQL', 'JWT Auth'] },
  { title: 'Real-Time Chat Application', desc: 'Create a chat app with WebSockets, user auth, and message persistence. Shows real-time systems knowledge.', category: 'fullstack', difficulty: '1week', tech: ['React', 'Socket.io', 'Express', 'MongoDB'] },
  { title: 'Personal Portfolio with CMS', desc: 'A stunning portfolio site with a headless CMS for managing projects and blog posts. Great for showcasing your work.', category: 'frontend', difficulty: 'weekend', tech: ['Next.js', 'MDX', 'Tailwind', 'Vercel'] },
  { title: 'URL Shortener Service', desc: 'Build a URL shortener with analytics tracking, rate limiting, and a clean API. Demonstrates backend design patterns.', category: 'fullstack', difficulty: 'weekend', tech: ['Node.js', 'Redis', 'PostgreSQL', 'REST API'] },
  { title: 'CLI File Sync Tool', desc: 'Build a Dropbox-like file synchronization tool for the command line using file watchers and a simple protocol.', category: 'systems', difficulty: '1week', tech: ['Go', 'TCP/UDP', 'File I/O', 'Concurrency'] },
  { title: 'Custom Load Balancer', desc: 'Implement a Layer 7 load balancer with round-robin, weighted, and health-check routing. Shows systems design skills.', category: 'systems', difficulty: '1week', tech: ['Go/Rust', 'Networking', 'Concurrency', 'Docker'] },
  { title: 'Sentiment Analysis Dashboard', desc: 'Analyze Twitter/Reddit sentiment for stocks or topics. Combines ML, APIs, and data visualization.', category: 'ml', difficulty: '2weeks', tech: ['Python', 'NLP', 'Flask', 'D3.js', 'scikit-learn'] },
  { title: 'Image Classification API', desc: 'Deploy a pre-trained CNN model as a REST API. Demonstrates ML deployment, Docker, and API design.', category: 'ml', difficulty: '1week', tech: ['Python', 'PyTorch', 'FastAPI', 'Docker'] },
  { title: 'Kubernetes Deployment Pipeline', desc: 'Set up a complete CI/CD pipeline deploying a microservice to K8s with monitoring and auto-scaling.', category: 'devops', difficulty: '2weeks', tech: ['Docker', 'Kubernetes', 'GitHub Actions', 'Prometheus'] },
  { title: 'Infrastructure as Code', desc: 'Automate cloud infrastructure (VPC, EC2, RDS, S3) using Terraform with a full GitOps workflow.', category: 'devops', difficulty: '1week', tech: ['Terraform', 'AWS', 'GitHub Actions', 'Linux'] },
  { title: 'React Native Expense Tracker', desc: 'A mobile app for tracking expenses with charts, categories, and cloud sync. Shows cross-platform mobile skills.', category: 'mobile', difficulty: '1week', tech: ['React Native', 'Expo', 'Firebase', 'Chart.js'] },
  { title: 'Key-Value Store from Scratch', desc: 'Implement a persistent KV store with WAL, compaction, and a network protocol. Deep systems fundamentals.', category: 'systems', difficulty: '2weeks', tech: ['C++/Rust', 'B-Trees', 'Memory-mapped I/O', 'Sockets'] },
  { title: 'Component Library', desc: 'Build a reusable React component library with Storybook, tests, and npm publishing. Shows frontend architecture.', category: 'frontend', difficulty: '1week', tech: ['React', 'TypeScript', 'Storybook', 'Vitest'] },
  { title: 'OAuth2 Auth Server', desc: 'Implement a standards-compliant OAuth2 authorization server. Demonstrates security and protocol knowledge.', category: 'fullstack', difficulty: '2weeks', tech: ['Node.js', 'JWT', 'OAuth2', 'PostgreSQL'] },
  { title: 'Web Scraping Pipeline', desc: 'Build an automated scraping pipeline that collects, cleans, and stores structured data with scheduling.', category: 'fullstack', difficulty: 'weekend', tech: ['Python', 'Scrapy', 'PostgreSQL', 'Celery'] },
  { title: 'Interactive Data Viz Dashboard', desc: 'Create a dashboard with interactive charts, filters, and real-time data updates. Great for data-focused roles.', category: 'frontend', difficulty: '1week', tech: ['D3.js', 'React', 'WebSockets', 'REST API'] },
];

const DIFF_LABELS = { weekend: 'Weekend', '1week': '1 Week', '2weeks': '2+ Weeks' };
const CAT_LABELS = { fullstack: 'Full-Stack', systems: 'Systems', ml: 'ML / AI', frontend: 'Frontend', devops: 'DevOps', mobile: 'Mobile' };

export function initProjectsTab() {
  const catFilter = document.getElementById('project-category-filter');
  const diffFilter = document.getElementById('project-difficulty-filter');
  const genBtn = document.getElementById('generate-projects-btn');

  if (catFilter) catFilter.addEventListener('change', renderProjects);
  if (diffFilter) diffFilter.addEventListener('change', renderProjects);
  
  if (genBtn) {
    genBtn.addEventListener('click', handleGenerateProjects);
  }

  window.generateProjectRoadmap = generateProjectRoadmap;

  PROJECTS = storage.get('custom_projects', DEFAULT_PROJECTS);
  renderProjects();
}

function renderProjects() {
  const catFilter = document.getElementById('project-category-filter')?.value;
  const diffFilter = document.getElementById('project-difficulty-filter')?.value;
  const grid = document.getElementById('projects-grid');
  
  if (!grid) return;

  let filtered = PROJECTS;
  if (catFilter) filtered = filtered.filter(p => p.category === catFilter);
  if (diffFilter) filtered = filtered.filter(p => p.difficulty === diffFilter);

  grid.innerHTML = filtered.map(p => `
    <div class="project-card" style="display: flex; flex-direction: column;">
      <span class="project-difficulty ${p.difficulty === '2weeks' ? 'twoweeks' : p.difficulty === '1week' ? 'oneweek' : 'weekend'}">${DIFF_LABELS[p.difficulty] || p.difficulty}</span>
      <div class="project-category">${CAT_LABELS[p.category] || p.category}</div>
      <div class="project-title">${esc(p.title)}</div>
      <div class="project-desc" style="flex: 1;">${esc(p.desc)}</div>
      <div class="project-tech" style="margin-bottom: 1rem;">${(p.tech || []).map(t => `<span class="project-tech-tag">${esc(t)}</span>`).join('')}</div>
      <button class="btn btn-secondary btn-sm" onclick="window.generateProjectRoadmap('${esc(p.title).replace(/'/g, "\\'")}')" style="width: 100%; display: flex; justify-content: center; align-items: center; gap: 0.5rem;">
        <span>🗺️</span> AI Roadmap
      </button>
    </div>
  `).join('');

  grid.classList.add('stagger-enter');
}

async function handleGenerateProjects() {
  const keys = getAIKeys();
  if (!keys.openai && !keys.gemini && !keys.openrouter) {
    window.__showToast?.('Please set an AI API Key in Settings first!', 'error');
    return;
  }

  const btn = document.getElementById('generate-projects-btn');
  const originalText = btn.innerHTML;
  btn.innerHTML = '✨ Generating...';
  btn.disabled = true;

  try {
    const resumeText = storage.get('resume_text', '');
    const apps = storage.get('job_applications', []);
    
    let targetRoles = 'Software Engineering';
    if (apps.length > 0) {
      const roles = apps.map(a => a['Role Title']).slice(0, 5).join(', ');
      targetRoles = roles;
    }

    const systemPrompt = `You are an expert technical recruiter and career coach.
Your goal is to suggest exactly 5 unique, highly personalized portfolio projects that bridge the gap between the user's current skills and their target roles.
Output exactly a JSON array of objects. Do not wrap in markdown or backticks, just raw JSON.
Format of objects:
{
  "title": "Short catchy project name",
  "desc": "2-3 sentences explaining what it is and why it helps for their target roles.",
  "category": "fullstack|systems|ml|frontend|devops|mobile",
  "difficulty": "weekend|1week|2weeks",
  "tech": ["React", "Python", "AWS"] // max 4
}`;

    const userPrompt = `USER RESUME:\n${resumeText || 'No resume provided.'}\n\nTARGET ROLES (Based on job applications):\n${targetRoles}\n\nGenerate 5 personalized projects. Return ONLY the JSON array.`;

    let response = await callAI(systemPrompt, userPrompt);
    
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    let jsonStr = jsonMatch ? jsonMatch[1] : response;
    
    const startIdx = jsonStr.indexOf('[');
    const endIdx = jsonStr.lastIndexOf(']');
    if (startIdx !== -1 && endIdx !== -1 && endIdx >= startIdx) {
      jsonStr = jsonStr.substring(startIdx, endIdx + 1);
    }
    
    const newProjects = JSON.parse(jsonStr);
    if (!Array.isArray(newProjects) || newProjects.length === 0) {
      throw new Error("Invalid response format");
    }

    PROJECTS = newProjects;
    storage.set('custom_projects', PROJECTS);
    renderProjects();
    window.__showToast?.('Generated personalized project suggestions!', 'success');
  } catch (err) {
    console.error(err);
    window.__showToast?.('Failed to generate projects. Check your API key or try again.', 'error');
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}

async function generateProjectRoadmap(projectTitle) {
  const keys = getAIKeys();
  if (!keys.openai && !keys.gemini && !keys.openrouter) {
    window.__showToast?.('Please set an AI API Key in Settings first!', 'error');
    return;
  }

  const overlay = document.getElementById('modal-overlay');
  const title = document.getElementById('modal-title');
  const body = document.getElementById('modal-body');
  const footer = document.getElementById('modal-footer');
  const closeBtn = document.getElementById('modal-close-btn');

  const project = PROJECTS.find(p => p.title === projectTitle) || { title: projectTitle, desc: '', tech: [] };

  title.textContent = `AI Roadmap: ${project.title}`;
  document.getElementById('modal').style.maxWidth = '800px';

  body.innerHTML = `
    <div style="text-align: center; padding: 2rem;">
      <div class="loader" style="border: 3px solid var(--border-color); border-top: 3px solid var(--primary); border-radius: 50%; width: 24px; height: 24px; animation: spin 1s linear infinite; margin: 0 auto 1rem;"></div>
      <p style="color: var(--text-muted);">Generating step-by-step roadmap for ${esc(project.title)}...</p>
    </div>
  `;

  footer.innerHTML = `<button class="btn btn-secondary cancel-modal-btn">Close</button>`;
  
  overlay.style.display = 'flex';

  const closeModal = () => { 
    overlay.style.display = 'none'; 
    document.getElementById('modal').style.maxWidth = ''; 
  };
  closeBtn.onclick = closeModal;
  footer.querySelector('.cancel-modal-btn').onclick = closeModal;

  try {
    const systemPrompt = `You are an expert senior software engineer mentoring a junior developer.
Provide a step-by-step, actionable implementation roadmap for the requested project.
Format the output in clean HTML (do not include <html> or <body> tags).
Use tags like <h3>, <h4>, <ul>, <li>, <p>, and <strong>.
Include:
1. Core Tech Stack
2. Prerequisites
3. Step-by-step implementation plan (e.g., Phase 1, Phase 2)
4. Tips for success`;

    const userPrompt = `Project Title: ${project.title}\nDescription: ${project.desc}\nTech Stack: ${project.tech.join(', ')}`;
    
    let roadmapHTML = await callAI(systemPrompt, userPrompt);
    
    body.innerHTML = `
      <div class="roadmap-content" style="color: var(--text-secondary); line-height: 1.6; font-size: 0.9rem;">
        ${roadmapHTML}
      </div>
    `;
  } catch (err) {
    console.error(err);
    body.innerHTML = `<div style="color: var(--danger); padding: 1rem;">Failed to generate roadmap: ${esc(err.message)}</div>`;
  }
}
