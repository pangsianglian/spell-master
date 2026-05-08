const APP_VERSION = 'v2.3.2-kids';
window.APP_VERSION = APP_VERSION;
const STORAGE_KEYS = {
  customLists: 'spellmaster-custom',
  history: 'spellmaster-history',
  lastList: 'spellmaster-last-list',
  settings: 'spellmaster-settings',
  analytics: 'spellmaster-analytics',
  visitorId: 'spellmaster-visitor-id'
};

// Optional: add your Google Analytics 4 Measurement ID here later, e.g. 'G-XXXXXXXXXX'.
// Without this ID, the app keeps lightweight local anonymous analytics in the background only; no stats dashboard is shown to parents or children.
window.SPELLMASTER_ANALYTICS = {
  enabled: true,
  googleMeasurementId: '',
  anonymizeIp: true
};

function renderVersion() {
  const versionEl = document.getElementById('app-version');
  if (versionEl) versionEl.textContent = APP_VERSION;
}
