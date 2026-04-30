function safeJsonParse(value, fallback) {
  try { return value ? JSON.parse(value) : fallback; } catch { return fallback; }
}
function getCustomLists() { return safeJsonParse(localStorage.getItem(STORAGE_KEYS.customLists), {}); }
function saveCustomLists(lists) { localStorage.setItem(STORAGE_KEYS.customLists, JSON.stringify(lists)); }
function getAllLists() { return { ...defaultData, ...getCustomLists() }; }
function getListByName(name) { return getAllLists()[name] || []; }
function saveLastList(name) { localStorage.setItem(STORAGE_KEYS.lastList, name); }
function getLastList() { return localStorage.getItem(STORAGE_KEYS.lastList); }
function getHistory() { return safeJsonParse(localStorage.getItem(STORAGE_KEYS.history), []); }
function saveHistory(history) { localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(history)); }
function addHistoryRecord(record) {
  const history = getHistory();
  history.unshift(record);
  saveHistory(history.slice(0, 100));
}
function getSettings() {
  return { voiceRateWord: 0.6, voiceRateSentence: 0.75, ...safeJsonParse(localStorage.getItem(STORAGE_KEYS.settings), {}) };
}
function saveSettings(settings) { localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings)); }
