export function esc(str) {
  const cleaned = (str || '').replace(/\*\*([^*]*)\*\*/g, '$1').replace(/\*([^*]*)\*/g, '$1');
  const d = document.createElement('div');
  d.textContent = cleaned;
  return d.innerHTML;
}
