// LocalStorage wrapper with JSON serialization
const PREFIX = 'launchpad_';

export const storage = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch (e) { console.warn('Storage write failed:', e); }
  },
  remove(key) { localStorage.removeItem(PREFIX + key); },
  clear() {
    Object.keys(localStorage).filter(k => k.startsWith(PREFIX)).forEach(k => localStorage.removeItem(k));
  },
  exportAll() {
    const data = {};
    Object.keys(localStorage).filter(k => k.startsWith(PREFIX)).forEach(k => {
      data[k.replace(PREFIX, '')] = JSON.parse(localStorage.getItem(k));
    });
    return data;
  },
  importAll(data) {
    Object.entries(data).forEach(([k, v]) => { localStorage.setItem(PREFIX + k, JSON.stringify(v)); });
  }
};
