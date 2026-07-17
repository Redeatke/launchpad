// Parse markdown tables from GitHub README files into structured job data
export function parseMarkdownTable(markdown, source) {
  const jobs = [];
  const lines = markdown.split('\n');
  let inTable = false;
  let headers = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.startsWith('|')) { inTable = false; continue; }

    const cells = line.split('|').map(c => c.trim()).filter(c => c !== '');

    // Detect separator row
    if (cells.every(c => /^[-:]+$/.test(c))) { inTable = true; continue; }

    // Header row
    if (!inTable && cells.length >= 3) {
      headers = cells.map(h => h.toLowerCase().replace(/[^a-z ]/g, '').trim());
      continue;
    }

    if (!inTable || headers.length === 0) continue;

    const job = { source, raw: {} };
    cells.forEach((cell, idx) => {
      if (idx < headers.length) job.raw[headers[idx]] = cell;
    });

    // Normalize fields
    job.company = extractText(job.raw.company || job.raw.name || '');
    job.role = extractText(job.raw.role || job.raw.title || job.raw.position || '');
    job.location = extractText(job.raw.location || job.raw.locations || '');
    job.datePosted = extractText(job.raw['date posted'] || job.raw.date || job.raw['date added'] || '');
    job.link = extractLink(job.raw.company || job.raw.role || job.raw.link || job.raw.application || job.raw.apply || '');
    job.applyLink = extractLink(job.raw.application || job.raw.apply || job.raw.link || '');

    // Status flags
    const rawLine = lines[i];
    job.closed = rawLine.includes('🔒') || rawLine.toLowerCase().includes('closed');
    job.noSponsorship = rawLine.includes('🛂');
    job.usOnly = rawLine.includes('🇺🇸');

    // Generate unique ID
    job.id = hashCode(`${job.company}-${job.role}-${job.location}-${source}`);

    if (job.company && job.role) jobs.push(job);
  }

  return jobs;
}

function extractText(mdCell) {
  // Remove markdown links, keeping text: [text](url) -> text
  return mdCell.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1') // bold
    .replace(/\*([^*]+)\*/g, '$1') // italic
    .replace(/[🔒🛂🇺🇸]/g, '').replace(/<[^>]+>/g, '').trim();
}

function extractLink(mdCell) {
  const match = mdCell.match(/\[([^\]]*)\]\(([^)]*)\)/);
  return match ? match[2] : '';
}

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return 'job_' + Math.abs(hash).toString(36);
}
