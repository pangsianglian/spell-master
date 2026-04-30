function getQueryParam(name) { return new URLSearchParams(window.location.search).get(name); }
function isRandomMode() { return getQueryParam('random') === '1'; }
function getSelectedListNameFromUrl() { return getQueryParam('list') || getLastList() || Object.keys(getAllLists())[0]; }
function shuffleList(list) {
  const shuffled = [...list];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
function escapeRegExp(text) { return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes} min ${seconds} sec`;
}
function createSessionRecord({ listName, mode, random, total, attempts, startedAt, endedAt }) {
  const weakWords = attempts.filter(a => a.attempts > 1 || !a.firstAttemptCorrect).map(a => a.word);
  const correctFirstTry = attempts.filter(a => a.firstAttemptCorrect).length;
  return {
    id: `session_${Date.now()}`,
    listName,
    mode,
    random,
    total,
    correctFirstTry,
    weakWords,
    attempts,
    startedAt,
    endedAt,
    durationMs: new Date(endedAt) - new Date(startedAt)
  };
}
function renderVersion() {
  const el = document.getElementById('app-version');
  if (el) el.textContent = `SpellMaster ${APP_VERSION}`;
}
