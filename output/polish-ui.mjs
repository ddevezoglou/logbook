import { readFileSync, writeFileSync } from 'node:fs';
const edit = (file, fn) => writeFileSync(file, fn(readFileSync(file, 'utf8')));
for (const file of ['base.css', 'components.css', 'views.css', 'dialogs.css']) {
  edit(file, text => text.replaceAll('"Alegreya Sans"', 'var(--font-ui)'));
}
edit('tokens.css', text => text.replace('  --control-height:46px;', '  --font-ui:"Source Sans 3 Variable",sans-serif;\n  --control-radius:7px;\n  --control-height:46px;').replace('--control-font:.76rem;', '--control-font:.78rem;').replace('--control-tracking:.09em;', '--control-tracking:.055em;').replace('--control-shadow:4px 4px 0 rgba(var(--shadow-rgb),.13);', '--control-shadow:0 2px 4px rgba(var(--shadow-rgb),.12);').replace('--control-shadow-hover:6px 6px 0 rgba(var(--shadow-rgb),.16);', '--control-shadow-hover:0 5px 12px rgba(var(--shadow-rgb),.16);').replace('--control-shadow:4px 4px 0 rgba(0,0,0,.45);', '--control-shadow:0 2px 5px rgba(0,0,0,.3);').replace('--control-shadow-hover:6px 6px 0 rgba(0,0,0,.55);', '--control-shadow-hover:0 5px 14px rgba(0,0,0,.4);'));
const faces = readFileSync('output/source-sans-3.css', 'utf8').split(/(?=\/\* source-sans-3-)/).filter(block => /^\/\* source-sans-3-(greek|latin|latin-ext)-wght/.test(block)).join('\n').replaceAll('./files/', 'assets/fonts/');
edit('fonts.css', text => text + '\n/* UI text — Source Sans 3 Variable, Fontsource 5.2.8; OFL in assets/fonts/. */\n' + faces);
edit('service-worker.js', text => text.replace("  './assets/fonts/alegreya-sans-greek-400-normal.woff2',", "  './assets/fonts/source-sans-3-greek-wght-normal.woff2',\n  './assets/fonts/source-sans-3-latin-wght-normal.woff2',\n  './assets/fonts/source-sans-3-latin-ext-wght-normal.woff2',\n  './assets/fonts/alegreya-sans-greek-400-normal.woff2',"));
edit('components.css', text => text.replace('.primary-button,.secondary-button,.mini-button,.confirm-delete-button,.card-edit,.card-delete,.edit-day,.avatar-upload-copy button {', '.primary-button,.secondary-button,.mini-button,.confirm-delete-button,.card-edit,.card-copy,.card-delete,.history-load-more,.edit-day,.avatar-upload-copy button {').replace('  border-radius:0;\n  font-size:var(--control-font);', '  border-radius:var(--control-radius);\n  font-size:var(--control-font);').replace('  font-weight:800;\n  line-height:1.15;', '  font-weight:650;\n  line-height:1.35;').replaceAll('inset 0 -3px 0 rgba(var(--gold-rgb),.5)', 'inset 0 -2px 0 rgba(var(--gold-rgb),.4)').replaceAll('transform:translate(-1px,-2px);', 'transform:translateY(-1px);').replace('.mini-button,.card-edit,.card-delete,.edit-day,.avatar-upload-copy button {', '.mini-button,.card-edit,.card-copy,.card-delete,.edit-day,.avatar-upload-copy button {'));
edit('index.html', text => text.replace('<span>Οι ασκήσεις μου</span>', '<span><i class="plan-step" aria-hidden="true">01</i>Οι ασκήσεις μου</span>').replace('<span>Τα προγράμματά μου</span>', '<span><i class="plan-step" aria-hidden="true">02</i>Τα προγράμματά μου</span>').replace('<button class="secondary-button" type="submit">Αποθήκευση άσκησης', '<button class="primary-button" type="submit">Αποθήκευση άσκησης'));
edit('app.js', text => {
  const star = '<button class="routine-star"';
  const start = text.indexOf(star, text.indexOf('<div class="routine-card-register"'));
  const end = text.indexOf('</button>', start) + 9;
  const starButton = text.slice(start, end);
  text = text.slice(0, start) + text.slice(end);
  const duplicate = text.indexOf('<button class="routine-duplicate"', start);
  text = text.slice(0, duplicate) + starButton + text.slice(duplicate);
  text = text.replace('r="2.7"/></svg></button><button class="routine-add-workout"', 'r="2.7"/></svg><span>Προβολή πλάνου</span></button><button class="routine-add-workout"');
  text = text.replace('d="M12 5v14M5 12h14"/></svg></button><button class="routine-star"', 'd="M12 5v14M5 12h14"/></svg><span>Προσθήκη προπόνησης</span></button><button class="routine-star"');
  return text;
});
edit('tests/app.test.mjs', text => text.replace("['Ενεργό πρόγραμμα', 'Προβολή πλάνου', 'Προσθήκη προπόνησης',", "['Προβολή πλάνου', 'Προσθήκη προπόνησης', 'Ενεργό πρόγραμμα',"));
