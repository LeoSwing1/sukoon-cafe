const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
function read(relative) {
  const file = path.join(root, relative);
  if (!fs.existsSync(file)) throw new Error(`Required file not found: ${relative}`);
  return { file, content: fs.readFileSync(file, 'utf8') };
}
function replaceExactlyOnce(relative, marker, replacement) {
  const target = read(relative);
  const count = target.content.split(marker).length - 1;
  if (count !== 1) throw new Error(`${relative}: expected one occurrence of marker, found ${count}. No changes were made to this file.`);
  fs.writeFileSync(target.file, target.content.replace(marker, replacement), 'utf8');
  console.log(`Patched ${relative}`);
}

const serverPath = 'apps/api/src/server.ts';
const server = read(serverPath);
if (server.content.includes('tableReservationsRouter')) {
  console.log('API reservation route already registered; leaving server.ts unchanged.');
} else {
  replaceExactlyOnce(serverPath,
    'import { authRouter } from "./routes/auth.js";',
    'import { authRouter } from "./routes/auth.js";\nimport { tableReservationsRouter } from "./routes/reservations.js";');
  replaceExactlyOnce(serverPath,
    'app.use("/api/v1/auth",authRouter);',
    'app.use("/api/v1/auth",authRouter);\napp.use("/api/v1/table-reservations",tableReservationsRouter);');
}

const layoutPath = 'apps/web/src/app/admin/layout.tsx';
let layout = read(layoutPath);
if (!layout.content.includes('"/admin/reservations"')) {
  const oldLink = '["Event bookings","/admin/bookings",CalendarDays],';
  const newLink = '["Table reservations","/admin/reservations",CalendarDays],["Event bookings","/admin/bookings",CalendarDays],';
  replaceExactlyOnce(layoutPath, oldLink, newLink);
  replaceExactlyOnce(layoutPath,
    '"/admin/marketing","/admin/bookings"',
    '"/admin/marketing","/admin/reservations","/admin/bookings"');
  replaceExactlyOnce(layoutPath,
    '["/admin/orders","/admin/inventory"]',
    '["/admin/orders","/admin/inventory","/admin/reservations"]');
} else {
  console.log('Admin navigation already includes Table reservations; leaving layout unchanged.');
}

const journalPath = 'apps/api/drizzle/meta/_journal.json';
const journal = read(journalPath);
const parsed = JSON.parse(journal.content);
if (!parsed.entries.some(entry => entry.tag === '0007_table_reservations')) {
  const maxIdx = parsed.entries.reduce((max, entry) => Math.max(max, Number(entry.idx)), -1);
  parsed.entries.push({ idx: maxIdx + 1, version: parsed.version || '7', when: Date.now(), tag: '0007_table_reservations', breakpoints: true });
  fs.writeFileSync(journal.file, JSON.stringify(parsed, null, 2) + '\n', 'utf8');
  console.log('Updated Drizzle migration journal with 0007_table_reservations.');
} else {
  console.log('Drizzle journal already contains 0007_table_reservations; no change needed.');
}

console.log('\nPublic site integration patch applied. Review git diff before committing.');
