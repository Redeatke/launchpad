// Project suggestion engine
export function initProjectsTab() {
  const catFilter = document.getElementById('project-category-filter');
  const diffFilter = document.getElementById('project-difficulty-filter');
  catFilter.addEventListener('change', renderProjects);
  diffFilter.addEventListener('change', renderProjects);
  renderProjects();
}

const PROJECTS = [
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

function renderProjects() {
  const catFilter = document.getElementById('project-category-filter').value;
  const diffFilter = document.getElementById('project-difficulty-filter').value;
  const grid = document.getElementById('projects-grid');

  let filtered = PROJECTS;
  if (catFilter) filtered = filtered.filter(p => p.category === catFilter);
  if (diffFilter) filtered = filtered.filter(p => p.difficulty === diffFilter);

  grid.innerHTML = filtered.map(p => `
    <div class="project-card">
      <span class="project-difficulty ${p.difficulty === '2weeks' ? 'twoweeks' : p.difficulty === '1week' ? 'oneweek' : 'weekend'}">${DIFF_LABELS[p.difficulty]}</span>
      <div class="project-category">${CAT_LABELS[p.category] || p.category}</div>
      <div class="project-title">${p.title}</div>
      <div class="project-desc">${p.desc}</div>
      <div class="project-tech">${p.tech.map(t => `<span class="project-tech-tag">${t}</span>`).join('')}</div>
    </div>
  `).join('');

  grid.classList.add('stagger-enter');
}
