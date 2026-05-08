const APP_VERSION = 'v2.3.0-kids';
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
// Without this ID, the app still keeps privacy-friendly local analytics on the visitor's device only.
window.SPELLMASTER_ANALYTICS = {
  enabled: true,
  googleMeasurementId: '',
  anonymizeIp: true
};

function renderVersion() {
  const versionEl = document.getElementById('app-version');
  if (versionEl) versionEl.textContent = APP_VERSION;
}
