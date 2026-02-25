// scripts/seed-db.js
// Seeds the database with sample data for development and testing.
// Run with: node scripts/seed-db.js
//
// Data created:
//   - 2 Templates (Festival, Club Night)
//   - 3 Projects
//   - 5 Maintenance Jobs (some due/overdue for cron simulation)
//   - 2 Events (if not already present)
//   - 2 Light Presets
//   - 2 Setlists with tracks
//   - Sample badges
//   - Sample automations

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Initialise DB (triggers table creation via database.js module)
const db = require('../src/db/database');

console.log('🌱 Seeding database...\n');

// ============================================================
// Helper: insert or skip if exists
// ============================================================
function insertIfNotExists(table, uniqueField, uniqueValue, data) {
  const existing = db.prepare(`SELECT id FROM ${table} WHERE ${uniqueField} = ?`).get(uniqueValue);
  if (existing) {
    console.log(`  [skip] ${table} "${uniqueValue}" already exists`);
    return existing.id;
  }
  const fields = Object.keys(data);
  const placeholders = fields.map(() => '?').join(', ');
  const values = Object.values(data);
  const result = db.prepare(
    `INSERT INTO ${table} (${fields.join(', ')}) VALUES (${placeholders})`
  ).run(...values);
  console.log(`  [+] ${table} "${uniqueValue}" (id: ${result.lastInsertRowid})`);
  return result.lastInsertRowid;
}

// ============================================================
// 1. Templates
// ============================================================
console.log('📋 Templates...');

const festivalChecklist = JSON.stringify([
  'Soundcheck durchführen',
  'Lichtanlage testen',
  'Backline aufbauen',
  'Monitoring prüfen',
  'Set-Time mit Booking bestätigen',
  'Rider überprüfen'
]);

const festivalEquipment = JSON.stringify([
  'Pioneer CDJ-3000 x2',
  'Pioneer DJM-900NXS2',
  'Monitor-Lautsprecher',
  'Laptop + Backup-USB'
]);

const tmplFestivalId = insertIfNotExists('templates', 'name', 'Festival Setup', {
  name: 'Festival Setup',
  category: 'event',
  description: 'Vollständiges Festival-Setup mit Stage-Management',
  checklist: festivalChecklist,
  equipment: festivalEquipment,
  notes: 'Geeignet für 500+ Personen Events'
});

const clubChecklist = JSON.stringify([
  'CDJs konfigurieren',
  'USB-Sticks testen',
  'Booth-Monitor einstellen',
  'Mit Veranstalter Startzeit klären',
  'Setlist vorbereiten'
]);

const clubEquipment = JSON.stringify([
  'Pioneer CDJ-2000NXS2 x2',
  'Pioneer DJM-750MK2',
  'Kopfhörer (Backup)',
  'USB x3'
]);

const tmplClubId = insertIfNotExists('templates', 'name', 'Club Night', {
  name: 'Club Night',
  category: 'event',
  description: 'Standard Club-Set-Setup für 50-300 Personen',
  checklist: clubChecklist,
  equipment: clubEquipment,
  notes: 'Kompaktes Setup, schneller Aufbau'
});

// ============================================================
// 2. Projects
// ============================================================
console.log('\n🏗️  Projects...');

const today = new Date().toISOString().split('T')[0];
const nextMonth = new Date(Date.now() + 30 * 86400 * 1000).toISOString().split('T')[0];
const lastWeek = new Date(Date.now() - 7 * 86400 * 1000).toISOString().split('T')[0];

const proj1Id = insertIfNotExists('projects', 'title', 'Sommerfestival 2025', {
  title: 'Sommerfestival 2025',
  description: 'DJ Set und technische Betreuung für das Sommerfestival',
  project_type: 'event',
  template_id: tmplFestivalId,
  client_name: 'Kulturverein Musterstadt',
  client_contact: 'eva.muster@example.com',
  location: 'Stadtpark Musterstadt',
  start_date: nextMonth,
  status: 'planning',
  price_estimate: 850.00,
  notes: 'Outdoor-Event, Wetterplan notwendig'
});

const proj2Id = insertIfNotExists('projects', 'title', 'Club Night @ Palais', {
  title: 'Club Night @ Palais',
  description: 'Monatlicher Club-Abend im Palais',
  project_type: 'event',
  template_id: tmplClubId,
  client_name: 'Club Palais GmbH',
  client_contact: 'booking@palais-example.de',
  location: 'Club Palais, Hauptstr. 42',
  start_date: today,
  status: 'active',
  price_estimate: 400.00,
  notes: 'Wiederkehrender Auftritt, jeden ersten Freitag'
});

const proj3Id = insertIfNotExists('projects', 'title', 'Netzwerk-Installation Büro Müller', {
  title: 'Netzwerk-Installation Büro Müller',
  description: 'Komplette Netzwerkinstallation für neues Büro (15 Arbeitsplätze)',
  project_type: 'installation',
  template_id: null,
  client_name: 'Müller & Partner GbR',
  client_contact: 'thomas.mueller@example.org',
  location: 'Gewerbepark Nord, Halle 3',
  start_date: lastWeek,
  end_date: today,
  status: 'completed',
  price_estimate: 1200.00,
  notes: 'Inkl. WLAN-AP Konfiguration und Dokumentation'
});

// ============================================================
// 3. Maintenance Jobs
// ============================================================
console.log('\n🔧 Maintenance Jobs...');

const overdueDate = new Date(Date.now() - 14 * 86400 * 1000).toISOString().split('T')[0];
const dueDate = today;
const futureDate = new Date(Date.now() + 60 * 86400 * 1000).toISOString().split('T')[0];
const future2 = new Date(Date.now() + 90 * 86400 * 1000).toISOString().split('T')[0];
const lastMonth = new Date(Date.now() - 90 * 86400 * 1000).toISOString().split('T')[0];

insertIfNotExists('maintenance_jobs', 'asset_name', 'Pioneer CDJ-3000 #1', {
  asset_name: 'Pioneer CDJ-3000 #1',
  description: 'Reinigung der Laser-Lens, Firmware-Update prüfen',
  interval_days: 90,
  last_service: lastMonth,
  next_service: overdueDate,
  status: 'overdue',
  notes: 'Inkl. Firmware-Update auf neueste Version'
});

insertIfNotExists('maintenance_jobs', 'asset_name', 'DJM-900NXS2 Mixer', {
  asset_name: 'DJM-900NXS2 Mixer',
  description: 'Fader-Reinigung, Channel-Fader Smooth-Test',
  interval_days: 180,
  last_service: lastMonth,
  next_service: dueDate,
  status: 'due',
  notes: 'Auf Kratzen und Aussetzer testen'
});

insertIfNotExists('maintenance_jobs', 'asset_name', 'Laptop DJ (MacBook Pro)', {
  asset_name: 'Laptop DJ (MacBook Pro)',
  description: 'System-Update, Rekordbox Cache leeren, SSD-Gesundheit prüfen',
  interval_days: 90,
  last_service: today,
  next_service: futureDate,
  status: 'scheduled',
  notes: 'Backup vor Update erstellen'
});

insertIfNotExists('maintenance_jobs', 'asset_name', 'Yamaha DXR12 Lautsprecher #1', {
  asset_name: 'Yamaha DXR12 Lautsprecher #1',
  description: 'Grill reinigen, Kabel prüfen, Bassreflexöffnungen prüfen',
  interval_days: 365,
  last_service: null,
  next_service: future2,
  status: 'scheduled',
  notes: null
});

insertIfNotExists('maintenance_jobs', 'asset_name', 'Kabelset XLR (50x)', {
  asset_name: 'Kabelset XLR (50x)',
  description: 'Stecker und Verbindungen auf Durchgang testen, defekte ersetzen',
  interval_days: 180,
  last_service: lastMonth,
  next_service: overdueDate,
  status: 'overdue',
  notes: 'Mindestens 5 Ersatz-Kabel bereithalten'
});

// ============================================================
// 4. Events (2 sample events if none exist)
// ============================================================
console.log('\n🎵 Events...');

const eventCount = db.prepare('SELECT COUNT(*) AS c FROM events').get().c;
if (eventCount === 0) {
  const e1 = db.prepare(`
    INSERT INTO events (title, event_type, client_name, location, event_date, status, price_estimate)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run('Opening Night Sommer', 'DJ', 'Club Palais GmbH', 'Club Palais', nextMonth, 'bestätigt', 400);
  console.log(`  [+] Event "Opening Night Sommer" (id: ${e1.lastInsertRowid})`);

  const e2 = db.prepare(`
    INSERT INTO events (title, event_type, client_name, location, event_date, status, price_estimate)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run('Tech-Setup Corporate Event', 'Technik', 'Müller & Partner GbR', 'Gewerbepark Nord', lastWeek, 'abgeschlossen', 1200);
  console.log(`  [+] Event "Tech-Setup Corporate Event" (id: ${e2.lastInsertRowid})`);
} else {
  console.log(`  [skip] ${eventCount} event(s) already exist`);
}

// ============================================================
// 5. Light Presets
// ============================================================
console.log('\n💡 Light Presets...');

const dmxClub = JSON.stringify({
  duration_ms: 8000,
  fps: 20,
  channels: [
    { channel: 1, label: 'Strobe', values: [0,0,0,0,0,255,0,0,0,0,0,255,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] },
    { channel: 2, label: 'Bass',   values: Array.from({length:160},(_,i)=>Math.round(Math.abs(Math.sin(i/10)*255))) },
    { channel: 3, label: 'Red',    values: Array.from({length:160},(_,i)=>Math.round(Math.abs(Math.sin(i/8)*200))) },
    { channel: 4, label: 'Green',  values: Array.from({length:160},(_,i)=>Math.round(Math.abs(Math.sin(i/8+1)*200))) },
    { channel: 5, label: 'Blue',   values: Array.from({length:160},(_,i)=>Math.round(Math.abs(Math.sin(i/8+2)*200))) }
  ]
});

insertIfNotExists('light_presets', 'name', 'Club Energetic', {
  name: 'Club Energetic',
  description: 'Energetisches Club-Preset mit schnellem Strobe und Bass-Reaktion',
  dmx_json: dmxClub
});

const dmxAmbient = JSON.stringify({
  duration_ms: 10000,
  fps: 10,
  channels: [
    { channel: 1, label: 'Strobe', values: Array.from({length:100},()=>0) },
    { channel: 2, label: 'Bass',   values: Array.from({length:100},(_,i)=>Math.round(Math.abs(Math.sin(i/20)*80))) },
    { channel: 3, label: 'Red',    values: Array.from({length:100},(_,i)=>Math.round(100+Math.sin(i/15)*100)) },
    { channel: 4, label: 'Green',  values: Array.from({length:100},(_,i)=>Math.round(80+Math.sin(i/15+2)*80)) },
    { channel: 5, label: 'Blue',   values: Array.from({length:100},(_,i)=>Math.round(150+Math.sin(i/15+4)*100)) }
  ]
});

insertIfNotExists('light_presets', 'name', 'Ambient Chill', {
  name: 'Ambient Chill',
  description: 'Ruhiges Ambient-Preset für Warm-Up und Pausen',
  dmx_json: dmxAmbient
});

// ============================================================
// 6. Setlists
// ============================================================
console.log('\n🎧 Setlists...');

const sl1Existing = db.prepare("SELECT id FROM setlists WHERE name = 'Opening Set 2025'").get();
if (!sl1Existing) {
  const sl1 = db.prepare(
    'INSERT INTO setlists (name, notes) VALUES (?, ?)'
  ).run('Opening Set 2025', 'Opening Set für Sommerfestival');
  const sl1Id = sl1.lastInsertRowid;
  console.log(`  [+] Setlist "Opening Set 2025" (id: ${sl1Id})`);

  const tracks = [
    { position: 1, title: 'Midnight City',   artist: 'M83',           bpm: 128, key_sig: 'Fm',  duration_s: 243 },
    { position: 2, title: 'Around The World', artist: 'Daft Punk',    bpm: 121, key_sig: 'Am',  duration_s: 429 },
    { position: 3, title: 'One More Time',    artist: 'Daft Punk',    bpm: 123, key_sig: 'F#m', duration_s: 320 },
    { position: 4, title: 'Satisfaction',     artist: 'Benny Benassi', bpm: 130, key_sig: 'Bm',  duration_s: 215 },
    { position: 5, title: 'Levels',           artist: 'Avicii',        bpm: 126, key_sig: 'Db',  duration_s: 197 }
  ];

  const insertTrack = db.prepare(`
    INSERT INTO setlist_tracks (setlist_id, position, title, artist, bpm, key_sig, duration_s)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  tracks.forEach(t => {
    insertTrack.run(sl1Id, t.position, t.title, t.artist, t.bpm, t.key_sig, t.duration_s);
  });
  console.log(`     ${tracks.length} tracks added`);
} else {
  console.log('  [skip] Setlist "Opening Set 2025" already exists');
}

const sl2Existing = db.prepare("SELECT id FROM setlists WHERE name = 'Warm-Up Mix'").get();
if (!sl2Existing) {
  const sl2 = db.prepare(
    'INSERT INTO setlists (name, notes) VALUES (?, ?)'
  ).run('Warm-Up Mix', 'Sanfter Einstieg für frühere Stunden');
  const sl2Id = sl2.lastInsertRowid;
  console.log(`  [+] Setlist "Warm-Up Mix" (id: ${sl2Id})`);

  const tracks2 = [
    { position: 1, title: 'Blue (Da Ba Dee)', artist: 'Eiffel 65', bpm: 136, key_sig: 'C',  duration_s: 261 },
    { position: 2, title: 'Mr. Brightside',   artist: 'The Killers', bpm: 150, key_sig: 'G',  duration_s: 222 }
  ];
  const insertTrack2 = db.prepare(`
    INSERT INTO setlist_tracks (setlist_id, position, title, artist, bpm, key_sig, duration_s)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  tracks2.forEach(t => {
    insertTrack2.run(sl2Id, t.position, t.title, t.artist, t.bpm, t.key_sig, t.duration_s);
  });
  console.log(`     ${tracks2.length} tracks added`);
} else {
  console.log('  [skip] Setlist "Warm-Up Mix" already exists');
}

// ============================================================
// 7. Badges
// ============================================================
console.log('\n🏆 Badges...');

const badgeDefs = [
  { name: 'Cable Ninja',   description: '50 Tickets abgeschlossen',     icon: '🥷', criteria: '{"type":"tickets_completed","threshold":50}' },
  { name: 'First Gig',     description: 'Erstes Event durchgeführt',     icon: '🎤', criteria: '{"type":"events_completed","threshold":1}' },
  { name: 'Maintenance Pro', description: '10 Wartungen erledigt',       icon: '🔧', criteria: '{"type":"maintenance_completed","threshold":10}' },
  { name: 'Invoice Master', description: '5 Rechnungen generiert',       icon: '💰', criteria: '{"type":"invoices_generated","threshold":5}' },
  { name: 'DJ Hero',        description: '25 Setlists erstellt',         icon: '🎧', criteria: '{"type":"setlists_created","threshold":25}' }
];

badgeDefs.forEach(b => {
  insertIfNotExists('badges', 'name', b.name, b);
});

// ============================================================
// 8. Automations
// ============================================================
console.log('\n⚙️  Automations...');

insertIfNotExists('automations', 'name', 'Outdoor Rain Warning', {
  name: 'Outdoor Rain Warning',
  trigger_type: 'event_update',
  condition: JSON.stringify({ field: 'event_type', operator: '==', value: 'outdoor' }),
  action: JSON.stringify({ type: 'set_flag', payload: { flag: 'need_shelter', message: 'Outdoor-Event: Regenschutz einplanen!' } }),
  enabled: 1
});

insertIfNotExists('automations', 'name', 'Daily Maintenance Check', {
  name: 'Daily Maintenance Check',
  trigger_type: 'daily_cron',
  condition: JSON.stringify({ field: 'maintenance_due', operator: '<=', value: 'today' }),
  action: JSON.stringify({ type: 'create_ticket', payload: { priority: 'hoch', prefix: '[Wartung]' } }),
  enabled: 1
});

// ============================================================
// Done
// ============================================================
console.log('\n✅ Seed complete!\n');
