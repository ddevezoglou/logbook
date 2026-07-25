/* Ημέρα ή νύχτα. Φορτώνεται σύγχρονα μέσα στο <head>, πριν από οποιοδήποτε
   markup, ώστε η αποθηκευμένη επιλογή να ισχύει ήδη στο πρώτο paint: αλλιώς
   όποιος έχει τη νύχτα ανοιχτή θα έβλεπε μια λευκή αναλαμπή σε κάθε εκκίνηση.
   Δεν μπορεί να γίνει inline script — το Content-Security-Policy της σελίδας
   επιτρέπει scripts μόνο από 'self'.

   Η επιλογή μένει σκόπιμα τοπική στη συσκευή και δεν συγχρονίζεται στο cloud:
   το ίδιο πρόσωπο θέλει νύχτα στο κινητό του γυμναστηρίου και ημέρα στο γραφείο. */
(() => {
  const STORAGE_KEY = 'logbookTheme';
  const THEMES = ['day', 'night'];
  const DEFAULT_THEME = 'day';
  // Το χρώμα του browser chrome. Δεν εκφράζεται σε CSS, άρα ενημερώνεται εδώ.
  const BROWSER_CHROME = { day:'#15130d', night:'#17140e' };

  const read = () => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  };

  let theme = THEMES.includes(read()) ? read() : DEFAULT_THEME;

  function paint() {
    document.documentElement.dataset.theme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', BROWSER_CHROME[theme]);
    document.querySelectorAll('[data-theme-choice]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.themeChoice === theme));
    });
  }

  function setTheme(next) {
    if (!THEMES.includes(next) || next === theme) return;
    theme = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* Χωρίς αποθήκευση η επιλογή ισχύει μόνο για αυτή τη συνεδρία. */
    }
    paint();
    document.dispatchEvent(new CustomEvent('logbook:themechange', { detail:{ theme:next } }));
  }

  paint();
  document.addEventListener('DOMContentLoaded', paint);
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-theme-choice]');
    if (button) setTheme(button.dataset.themeChoice);
  });

  window.LogbookTheme = {
    setTheme,
    getTheme:() => theme,
    themes:() => [...THEMES],
  };
})();
