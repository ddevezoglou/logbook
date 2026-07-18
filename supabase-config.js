(() => {
  const pageUrl = new URL(window.location.href);
  pageUrl.search = '';
  pageUrl.hash = '';

  window.LogbookSupabaseConfig = Object.freeze({
    url: 'https://hixnqtjsjcndeatxhpgd.supabase.co',
    publishableKey: 'sb_publishable_3yrEj684vR_UrMDMWbZBWw_otue0QlY',
    // Auth callbacks must return to the page that actually launched the flow.
    // A file:// URL is not a safe web callback, so redirect-based actions are
    // disabled by auth.js until the app is opened through a local web server.
    siteUrl: ['http:', 'https:'].includes(pageUrl.protocol) ? pageUrl.href : null,
  });
})();
