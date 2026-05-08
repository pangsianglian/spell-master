(function () {
  const CONFIG = window.SPELLMASTER_ANALYTICS || {};
  const STORAGE_KEY = (window.STORAGE_KEYS && window.STORAGE_KEYS.analytics) || 'spellmaster-analytics';
  const VISITOR_KEY = (window.STORAGE_KEYS && window.STORAGE_KEYS.visitorId) || 'spellmaster-visitor-id';
  const MAX_EVENTS = 300;

  function safeJsonParse(value, fallback) {
    try { return value ? JSON.parse(value) : fallback; } catch { return fallback; }
  }

  function getVisitorId() {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = 'v_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  }

  function getStore() {
    const now = new Date().toISOString();
    return {
      createdAt: now,
      updatedAt: now,
      visitorId: getVisitorId(),
      visitCount: 0,
      pageViews: {},
      featureCounts: {},
      events: [],
      ...safeJsonParse(localStorage.getItem(STORAGE_KEY), {})
    };
  }

  function saveStore(store) {
    store.updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }

  function sendToGoogleAnalytics(eventName, metadata) {
    if (typeof window.gtag === 'function' && CONFIG.googleMeasurementId) {
      window.gtag('event', eventName, {
        app_name: 'SpellMaster Kids',
        app_version: window.APP_VERSION || 'unknown',
        ...metadata
      });
    }
  }

  function trackEvent(eventName, metadata = {}) {
    if (!eventName || CONFIG.enabled === false) return;
    const store = getStore();
    const cleanMetadata = {};
    Object.entries(metadata || {}).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      if (['string', 'number', 'boolean'].includes(typeof value)) cleanMetadata[key] = value;
    });

    store.featureCounts[eventName] = (store.featureCounts[eventName] || 0) + 1;
    store.events.unshift({
      eventName,
      page: location.pathname.split('/').pop() || 'index.html',
      metadata: cleanMetadata,
      at: new Date().toISOString()
    });
    store.events = store.events.slice(0, MAX_EVENTS);
    saveStore(store);
    sendToGoogleAnalytics(eventName, cleanMetadata);
  }

  function trackPageView() {
    if (CONFIG.enabled === false) return;
    const store = getStore();
    const page = location.pathname.split('/').pop() || 'index.html';
    store.visitCount = (store.visitCount || 0) + 1;
    store.pageViews[page] = (store.pageViews[page] || 0) + 1;
    store.events.unshift({
      eventName: 'page_view',
      page,
      metadata: { title: document.title || page },
      at: new Date().toISOString()
    });
    store.events = store.events.slice(0, MAX_EVENTS);
    saveStore(store);
    sendToGoogleAnalytics('page_view', { page_title: document.title || page, page_path: location.pathname });
  }

  function loadGoogleAnalytics() {
    if (!CONFIG.googleMeasurementId) return;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', CONFIG.googleMeasurementId, {
      anonymize_ip: true,
      send_page_view: false
    });

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(CONFIG.googleMeasurementId);
    document.head.appendChild(script);
  }

  function injectBrandingFooter() {
    if (document.querySelector('.brand-footer')) return;
    const footer = document.createElement('footer');
    footer.className = 'brand-footer';
    footer.innerHTML = `
      <div class="brand-footer-mark">🐊 SpellMaster Kids by Angel Pang</div>
      <div class="brand-footer-line">Built to make spelling practice easier, calmer and happier.</div>
      <div class="privacy-note">
        Privacy note: spelling lists and practice history are stored locally on this device. Please avoid uploading personal or sensitive information. Basic anonymous usage statistics may be used to improve the app.
      </div>
      <a class="analytics-link" href="analytics.html" data-track="open_local_analytics">📊 Local usage stats</a>
    `;
    document.body.appendChild(footer);
  }

  function attachClickTracking() {
    document.addEventListener('click', event => {
      const target = event.target.closest('[data-track]');
      if (!target) return;
      trackEvent(target.getAttribute('data-track'), {
        label: target.getAttribute('data-track-label') || target.textContent.trim().slice(0, 80)
      });
    });
  }

  function renderAnalyticsPage() {
    const root = document.getElementById('analytics-dashboard');
    if (!root) return;
    const store = getStore();
    const pageRows = Object.entries(store.pageViews || {})
      .sort((a, b) => b[1] - a[1])
      .map(([page, count]) => `<tr><td>${escapeHtml(page)}</td><td>${count}</td></tr>`)
      .join('') || '<tr><td colspan="2">No page views yet.</td></tr>';
    const featureRows = Object.entries(store.featureCounts || {})
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => `<tr><td>${escapeHtml(name)}</td><td>${count}</td></tr>`)
      .join('') || '<tr><td colspan="2">No feature events yet.</td></tr>';
    const recentEvents = (store.events || []).slice(0, 20).map(event => `
      <li><strong>${escapeHtml(event.eventName)}</strong> · ${escapeHtml(event.page)} · ${new Date(event.at).toLocaleString()}</li>
    `).join('') || '<li>No events yet.</li>';

    root.innerHTML = `
      <section class="card">
        <h3>📊 Local usage summary</h3>
        <p><strong>Total visits on this device:</strong> ${store.visitCount || 0}</p>
        <p><strong>First tracked:</strong> ${store.createdAt ? new Date(store.createdAt).toLocaleString() : '-'}</p>
        <p><strong>Last tracked:</strong> ${store.updatedAt ? new Date(store.updatedAt).toLocaleString() : '-'}</p>
        <p class="small-note">This page shows local anonymous analytics stored in this browser. For all-visitor website analytics, set a Google Analytics 4 Measurement ID in <code>js/app-config.js</code>.</p>
      </section>
      <section class="card"><h3>Page views</h3><table class="stats-table"><tbody>${pageRows}</tbody></table></section>
      <section class="card"><h3>Feature usage</h3><table class="stats-table"><tbody>${featureRows}</tbody></table></section>
      <section class="card"><h3>Recent events</h3><ul>${recentEvents}</ul><button id="clear-analytics-btn" class="danger">Clear local analytics</button></section>
    `;
    const clearButton = document.getElementById('clear-analytics-btn');
    if (clearButton) {
      clearButton.addEventListener('click', () => {
        if (!confirm('Clear local usage analytics on this device?')) return;
        localStorage.removeItem(STORAGE_KEY);
        trackEvent('analytics_cleared');
        renderAnalyticsPage();
      });
    }
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[char]));
  }

  window.trackFeature = trackEvent;
  window.getSpellMasterAnalytics = getStore;

  document.addEventListener('DOMContentLoaded', () => {
    loadGoogleAnalytics();
    injectBrandingFooter();
    attachClickTracking();
    trackPageView();
    renderAnalyticsPage();
  });
})();
