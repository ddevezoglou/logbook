import {readFileSync,writeFileSync,unlinkSync} from 'node:fs';
let css=readFileSync('fonts.css','utf8');
css=css.replace(/\/\* source-sans-3-latin-ext-wght-normal \*\/[\s\S]*?\}\s*/, '');
css=css.replace(/url\((assets\/fonts\/[^)]+)\)/g,'url("$1")');
writeFileSync('fonts.css',css);
writeFileSync('service-worker.js',readFileSync('service-worker.js','utf8').replace(/  '\.\/assets\/fonts\/source-sans-3-latin-ext-wght-normal.woff2',\r?\n/,''));
unlinkSync('assets/fonts/source-sans-3-latin-ext-wght-normal.woff2');
