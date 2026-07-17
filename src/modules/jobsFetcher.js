// Fetch and parse job listings from multiple GitHub repos
import { parseMarkdownTable } from '../utils/markdownParser.js';
import { storage } from '../utils/storage.js';

const REPOS = [
  { owner: 'vanshb03', repo: 'New-Grad-2027', branch: 'dev', label: 'New-Grad-2027' },
  { owner: 'SimplifyJobs', repo: 'New-Grad-Positions', branch: 'dev', label: 'SimplifyJobs' },
  { owner: 'SimplifyJobs', repo: 'Summer2025-Internships', branch: 'dev', label: 'Summer2025' },
  { owner: 'bsovs', repo: 'Fall2025-Internships', branch: 'main', label: 'Fall2025' },
];

const CACHE_KEY = 'jobs_cache_v2';
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export async function fetchAllJobs(forceRefresh = false) {
  if (!forceRefresh) {
    const cached = storage.get(CACHE_KEY);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.jobs;
    }
  }

  const allJobs = [];
  const errors = [];

  for (const repo of REPOS) {
    try {
      const url = `https://raw.githubusercontent.com/${repo.owner}/${repo.repo}/${repo.branch}/README.md`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const md = await resp.text();
      const jobs = parseMarkdownTable(md, repo.label);
      allJobs.push(...jobs);
    } catch (e) {
      console.warn(`Failed to fetch ${repo.label}:`, e);
      errors.push({ repo: repo.label, error: e.message });
    }
  }

  // Deduplicate by company+role
  const seen = new Set();
  const deduped = allJobs.filter(job => {
    const key = `${job.company.toLowerCase()}-${job.role.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Sort by date (newest first), then by company
  deduped.sort((a, b) => {
    if (b.datePosted && a.datePosted) return b.datePosted.localeCompare(a.datePosted);
    if (b.datePosted) return 1;
    if (a.datePosted) return -1;
    return a.company.localeCompare(b.company);
  });

  storage.set(CACHE_KEY, { jobs: deduped, timestamp: Date.now() });
  return deduped;
}

export function getJobById(id) {
  const cached = storage.get(CACHE_KEY);
  if (!cached) return null;
  return cached.jobs.find(j => j.id === id) || null;
}

export function getAllCachedJobs() {
  const cached = storage.get(CACHE_KEY);
  return cached ? cached.jobs : [];
}
