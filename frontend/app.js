
// Front End team — main logic
// Handle the date picker submit button click
// Call the Flask API at /api/positions and /api/events
// Render the event cards in the right panel
// API base URL: http://localhost:5000 (change to Render URL when deployed)
// ── app.js ────────────────────────────────────────────────────────────
// This is the main controller — connects the UI to the backend API
// and makes everything talk to each other

const API_BASE = 'http://localhost:5000';

const inputYear    = document.getElementById('inputYear');
const inputMonth   = document.getElementById('inputMonth');
const inputDay     = document.getElementById('inputDay');
const btnCompute   = document.getElementById('btnCompute');
const quickEvents  = document.querySelectorAll('.quick-event');
const filterItems  = document.querySelectorAll('.filter-item');
const searchInput  = document.getElementById('searchInput');
const eventList    = document.getElementById('eventList');
const eventDetail  = document.getElementById('eventDetail');
const detailType   = document.getElementById('detailType');
const detailTitle  = document.getElementById('detailTitle');
const detailDesc   = document.getElementById('detailDesc');
const detailDate   = document.getElementById('detailDate');
const detailTypeVal= document.getElementById('detailTypeVal');
const detailBodies = document.getElementById('detailBodies');
const topbarStatus = document.getElementById('topbarStatus');
const topbarDate   = document.getElementById('topbarDate');

let allEvents     = [];
let activeFilters = new Set(['eclipse', 'conjunction', 'alignment']);
let activeEventEl = null;
let activeQuickEl = null;

// ── Quick event clicks ────────────────────────────────────────────────
quickEvents.forEach(el => {
  el.addEventListener('click', () => {
    const date = el.dataset.date;
    const [y, m, d] = date.split('-');
    inputYear.value  = y;
    inputMonth.value = m;
    inputDay.value   = d;
    if (activeQuickEl) activeQuickEl.classList.remove('active');
    activeQuickEl = el;
    el.classList.add('active');
    computeAndLoad(date);
  });
});

// ── Compute button ────────────────────────────────────────────────────
btnCompute.addEventListener('click', () => {
  const y = String(inputYear.value).padStart(4, '0');
  const m = String(inputMonth.value).padStart(2, '0');
  const d = String(inputDay.value).padStart(2, '0');
  if (!inputYear.value || !inputMonth.value || !inputDay.value) return;
  computeAndLoad(`${y}-${m}-${d}`);
});

// ── Filter toggles ────────────────────────────────────────────────────
filterItems.forEach(el => {
  el.addEventListener('click', () => {
    const f = el.dataset.filter;
    if (activeFilters.has(f)) {
      activeFilters.delete(f);
      el.classList.remove('active');
    } else {
      activeFilters.add(f);
      el.classList.add('active');
    }
    renderEventList(filterAndSearch());
  });
});

// ── Search ────────────────────────────────────────────────────────────
searchInput.addEventListener('input', () => {
  renderEventList(filterAndSearch());
});

// ── Core ──────────────────────────────────────────────────────────────
async function computeAndLoad(date) {
  setStatus('COMPUTING…');
  fetchPositions(date);
  await loadEvents();
}

async function fetchPositions(date) {
  try {
    const res  = await fetch(`${API_BASE}/api/positions?date=${date}`);
    const data = await res.json();
    if (res.ok) DiagramController.setPositions(data);
  } catch {
    const parts = date.split('-');
    const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    topbarDate.textContent = `${parts[0]} · ${months[parseInt(parts[1])-1]} · ${parts[2]}`;
    document.getElementById('statDate').textContent = date;
  }
}

async function loadEvents() {
  try {
    const res  = await fetch(`${API_BASE}/api/events?start=1950-01-01&end=2030-12-31`);
    const data = await res.json();
    allEvents = res.ok ? (data.events || []) : getMockEvents();
  } catch {
    allEvents = getMockEvents();
  }
  updateCounts();
  renderEventList(filterAndSearch());
  setStatus(`✓ ${allEvents.length} EVENTS LOADED`);
  topbarStatus.classList.add('calibrated');
}

function filterAndSearch() {
  const q = searchInput.value.toLowerCase().trim();
  return allEvents.filter(e => {
    const matchFilter = activeFilters.has(e.event_type);
    const matchSearch = !q ||
      e.description.toLowerCase().includes(q) ||
      e.date.includes(q) ||
      (e.planet_1 || '').toLowerCase().includes(q) ||
      (e.planet_2 || '').toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });
}

function renderEventList(events) {
  eventList.innerHTML = '';
  if (!events.length) {
    eventList.innerHTML = '<p class="event-list__empty">No events match your search.</p>';
    return;
  }
  events.forEach(event => {
    const el = document.createElement('div');
    el.className = `event-item ${event.event_type}`;
    const bodies = [event.planet_1, event.planet_2].filter(Boolean);
    el.innerHTML = `
      <p class="event-item__date">${event.date}</p>
      <p class="event-item__name">${event.description}</p>
      <div class="event-item__tags">
        ${bodies.map(b => `<span class="tag">${b.charAt(0).toUpperCase() + b.slice(1)}</span>`).join('')}
        <span class="tag tag-verified">✓ VER</span>
      </div>
    `;
    el.addEventListener('click', () => selectEvent(event, el));
    eventList.appendChild(el);
  });
}

function selectEvent(event, el) {
  if (activeEventEl) activeEventEl.classList.remove('active');
  activeEventEl = el;
  el.classList.add('active');
  const planets = [event.planet_1, event.planet_2].filter(Boolean);
  DiagramController.highlightEvent(planets, event.event_type, event.event_type);
  fetchPositions(event.date);
  detailType.textContent    = event.event_type.toUpperCase();
  detailType.className      = `event-detail__type ${event.event_type}`;
  detailTitle.textContent   = event.description;
  detailDesc.textContent    = event.notes || '';
  detailDate.textContent    = event.date;
  detailTypeVal.textContent = event.event_type.charAt(0).toUpperCase() + event.event_type.slice(1);
  detailBodies.textContent  = planets.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' · ') || '—';
  eventDetail.classList.remove('hidden');
}

function updateCounts() {
  const counts = { eclipse: 0, conjunction: 0, alignment: 0 };
  allEvents.forEach(e => { if (counts[e.event_type] !== undefined) counts[e.event_type]++; });
  document.getElementById('countEclipse').textContent     = counts.eclipse;
  document.getElementById('countConjunction').textContent = counts.conjunction;
  document.getElementById('countAlignment').textContent   = counts.alignment;
}

function setStatus(text) { topbarStatus.textContent = text; }

function getMockEvents() {
  return [
    { id:1,  event_type:'eclipse',     date:'1954-06-30', description:'Total Solar Eclipse — Europe and Asia',           planet_1:'sun',     planet_2:'moon',    notes:'Totality visible across parts of Europe and the Middle East.' },
    { id:2,  event_type:'eclipse',     date:'1959-10-02', description:'Partial Solar Eclipse — Americas',                planet_1:'sun',     planet_2:'moon',    notes:'Partial eclipse visible across North and South America.' },
    { id:3,  event_type:'conjunction', date:'1961-11-17', description:'Jupiter–Saturn Conjunction',                      planet_1:'jupiter', planet_2:'saturn',  notes:'Rare close approach of the two largest planets.' },
    { id:4,  event_type:'eclipse',     date:'1966-11-12', description:'Total Solar Eclipse — South America',             planet_1:'sun',     planet_2:'moon',    notes:'Path of totality across Bolivia and Brazil.' },
    { id:5,  event_type:'alignment',   date:'1982-03-10', description:'Grand Planetary Alignment',                       planet_1:'mars',    planet_2:'jupiter', notes:'All major planets aligned on the same side of the Sun.' },
    { id:6,  event_type:'eclipse',     date:'1991-07-11', description:'Total Solar Eclipse — Hawaii and Mexico',         planet_1:'sun',     planet_2:'moon',    notes:'One of the longest totalities of the 20th century at 6m 54s.' },
    { id:7,  event_type:'conjunction', date:'2000-05-05', description:'Planetary Alignment — Mercury to Saturn',         planet_1:'venus',   planet_2:'jupiter', notes:'Five planets clustered within 26 degrees of sky.' },
    { id:8,  event_type:'conjunction', date:'2002-04-23', description:'Venus–Jupiter Conjunction',                       planet_1:'venus',   planet_2:'jupiter', notes:'Appeared as a bright double star to the naked eye.' },
    { id:9,  event_type:'eclipse',     date:'2006-03-29', description:'Total Solar Eclipse — Africa and Turkey',         planet_1:'sun',     planet_2:'moon',    notes:'Totality visible across Libya, Egypt, Turkey and into Asia.' },
    { id:10, event_type:'alignment',   date:'2010-08-06', description:'Planetary Parade — 4 Planets',                   planet_1:'mars',    planet_2:'saturn',  notes:'Mars, Saturn, Venus and Mercury visible in close grouping.' },
    { id:11, event_type:'eclipse',     date:'2012-05-20', description:'Annular Solar Eclipse — Western US',              planet_1:'sun',     planet_2:'moon',    notes:'Ring of fire eclipse visible across Nevada and New Mexico.' },
    { id:12, event_type:'conjunction', date:'2015-07-01', description:'Venus–Jupiter Conjunction',                       planet_1:'venus',   planet_2:'jupiter', notes:'Closest Venus–Jupiter approach in over 2000 years.' },
    { id:13, event_type:'eclipse',     date:'2017-08-21', description:'Total Solar Eclipse — Continental United States', planet_1:'sun',     planet_2:'moon',    notes:'Path of totality from Oregon to South Carolina.' },
    { id:14, event_type:'alignment',   date:'2020-07-04', description:'Planetary Alignment — 5 Planets',                planet_1:'mars',    planet_2:'jupiter', notes:'Mercury, Venus, Earth, Mars and Jupiter formed a line.' },
    { id:15, event_type:'conjunction', date:'2020-12-21', description:'Jupiter–Saturn Great Conjunction',                planet_1:'jupiter', planet_2:'saturn',  notes:'Closest Jupiter–Saturn conjunction since 1623.' },
    { id:16, event_type:'eclipse',     date:'2021-12-04', description:'Total Solar Eclipse — Antarctica',                planet_1:'sun',     planet_2:'moon',    notes:'Totality visible only from Antarctica.' },
    { id:17, event_type:'conjunction', date:'2022-04-30', description:'Venus–Jupiter Conjunction',                       planet_1:'venus',   planet_2:'jupiter', notes:'Very close approach visible just before sunrise.' },
    { id:18, event_type:'alignment',   date:'2022-06-24', description:'Planetary Alignment — 5 Planets in Order',       planet_1:'mars',    planet_2:'saturn',  notes:'Mercury through Saturn aligned in solar system order.' },
    { id:19, event_type:'eclipse',     date:'2023-04-20', description:'Hybrid Solar Eclipse — Australia and SE Asia',    planet_1:'sun',     planet_2:'moon',    notes:'Rare hybrid eclipse changing from annular to total.' },
    { id:20, event_type:'eclipse',     date:'2024-04-08', description:'Total Solar Eclipse — North America',             planet_1:'sun',     planet_2:'moon',    notes:'Path of totality from Mexico through Texas up to Maine.' },
    { id:21, event_type:'conjunction', date:'2025-08-12', description:'Venus–Jupiter Conjunction',                       planet_1:'venus',   planet_2:'jupiter', notes:'Very close approach — 0.1 degrees separation.' },
    { id:22, event_type:'alignment',   date:'2025-01-18', description:'Planetary Parade — 6 Planets',                   planet_1:'venus',   planet_2:'saturn',  notes:'Venus, Mars, Jupiter, Saturn, Uranus and Neptune visible simultaneously.' },
    { id:23, event_type:'eclipse',     date:'2026-08-12', description:'Total Solar Eclipse — Spain and Iceland',         planet_1:'sun',     planet_2:'moon',    notes:'Totality crosses Greenland, Iceland, Spain and North Africa.' },
    { id:24, event_type:'conjunction', date:'2027-10-31', description:'Mars–Jupiter Conjunction',                        planet_1:'mars',    planet_2:'jupiter', notes:'Close approach of Mars and Jupiter in the autumn sky.' },
    { id:25, event_type:'eclipse',     date:'2028-07-22', description:'Total Solar Eclipse — Australia',                 planet_1:'sun',     planet_2:'moon',    notes:'Totality visible across southern Australia including Sydney.' },
    { id:26, event_type:'alignment',   date:'2028-09-08', description:'Mercury–Venus Conjunction',                       planet_1:'mercury', planet_2:'venus',   notes:'Very close conjunction visible low on the western horizon.' },
    { id:27, event_type:'conjunction', date:'2030-03-25', description:'Mars–Saturn Conjunction',                         planet_1:'mars',    planet_2:'saturn',  notes:'Close approach visible in the early morning sky.' },
    { id:28, event_type:'eclipse',     date:'2030-06-01', description:'Annular Solar Eclipse — Europe and Asia',         planet_1:'sun',     planet_2:'moon',    notes:'Ring of fire eclipse crossing North Africa and the Middle East.' },
  ];
}

