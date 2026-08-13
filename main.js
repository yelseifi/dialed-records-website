/* =============================================
   DIALED RECORDS — main.js
   ============================================= */

/* Animations degrade gracefully: if the GSAP CDN is blocked (common in
   private browsing / content blockers), .no-anim CSS shows everything. */
const HAS_ANIM = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';
if (HAS_ANIM) {
  gsap.registerPlugin(ScrollTrigger);
} else {
  document.documentElement.classList.add('no-anim');
}

/* ─── DATA ──────────────────────────────────── */

const RELEASES = [
  {
    catalog: 'DRX025',
    title: 'Guess U Know?',
    artist: 'Joe Allen',
    image: 'images/release-drx025.jpg',
    beatport: 'https://ffm.to/guess-u-know',
  },
  {
    catalog: 'DRX024',
    title: 'Radiowave',
    artist: 'Cass Brewster',
    image: 'images/release-drx024.jpg',
    beatport: 'https://ffm.to/radiowave-vhpv',
  },
  {
    catalog: 'DRX023',
    title: 'Disconnected',
    artist: 'Facundo Godoy',
    image: 'images/release-drx023.jpg',
    beatport: 'https://ffm.to/disconnected-single',
  },
  {
    catalog: "DRX MMW '26",
    title: "DRX MMW VA '26",
    artist: 'Various Artists',
    image: 'images/release-drxmmw26.jpg',
    beatport: 'https://ffm.to/drx-mmw-va-26',
  },
  {
    catalog: 'DRX022',
    title: "Let's Get Set",
    artist: 'Overworked',
    image: 'images/release-drx022.jpg',
    beatport: 'https://ffm.to/laq36ex',
  },
  {
    catalog: 'DRX021',
    title: 'Jims Mission',
    artist: 'JIMII',
    image: 'images/release-drx021.jpg',
    beatport: 'https://ffm.to/3jd822n',
  },
  {
    catalog: 'DRXART25',
    title: "DRX Art Basel '25",
    artist: 'Various Artists',
    image: 'images/release-drxart25.jpg',
    beatport: 'https://ffm.to/xaxb9ml',
  },
  {
    catalog: 'DRX020',
    title: 'Casino',
    artist: 'EDEF',
    image: 'images/release-drx020.jpg',
    beatport: 'https://ffm.to/pvqwad9',
  },
  {
    catalog: 'DRX019',
    title: 'This',
    artist: 'Kai Jay',
    image: 'images/release-drx019.jpg',
    beatport: 'https://ffm.to/4ywv6m3',
  },
  {
    catalog: 'DRX018',
    title: 'Addictive',
    artist: 'Nico Cardone',
    image: 'images/release-drx018.jpg',
    beatport: 'https://ffm.to/oqbly3z',
  },
  {
    catalog: 'DRX017',
    title: 'Jump on Tha',
    artist: 'Nico Sonntag',
    image: 'images/release-drx017.jpg',
    beatport: 'https://ffm.to/n4vkyyb',
  },
  {
    catalog: 'DRX016',
    title: 'In the Jungle',
    artist: 'Tamarin, ODJO',
    image: 'images/release-drx016.jpg',
    beatport: 'https://ffm.to/721mb0o',
  },
  {
    catalog: 'DRX015',
    title: 'Feel the Bass',
    artist: 'EDEF',
    image: 'images/release-drx015.jpg',
    beatport: 'https://ffm.to/ao9roa',
  },
  {
    catalog: 'DRXIBZ25',
    title: "DRX Ibiza Sampler '25",
    artist: 'Various Artists',
    image: 'images/release-drxibz25.jpg',
    beatport: 'https://ffm.to/3mxdyva',
  },
  {
    catalog: 'DRX014',
    title: 'To My Beat',
    artist: 'Pods',
    image: 'images/release-drx014.jpg',
    beatport: 'https://ffm.to/64xj32q',
  },
  {
    catalog: 'DRX013',
    title: 'Count It',
    artist: 'Blooma',
    image: 'images/release-drx013.jpg',
    beatport: 'https://ffm.to/m0akwdz',
  },
  {
    catalog: 'DRX012',
    title: 'Air Drums',
    artist: 'Nacho Padilla',
    image: 'images/release-drx012.jpg',
    beatport: 'https://ffm.to/joo9kb4',
  },
  {
    catalog: "DRXMMW25",
    title: "DRX MMW VA '25",
    artist: 'Various Artists',
    image: 'images/release-drxmmw25.jpg',
    beatport: 'https://ffm.to/qeq9g37',
  },
  {
    catalog: 'DRX011',
    title: 'SVP',
    artist: 'Max Mash',
    image: 'images/release-drx011.jpg',
    beatport: 'https://ffm.to/mmgky3p',
  },
  {
    catalog: 'DRX010',
    title: 'What I Want',
    artist: 'LucaG',
    image: 'images/release-drx010.jpg',
    beatport: 'https://ffm.to/w30a8w4',
  },
  {
    catalog: 'DRX009',
    title: 'GO',
    artist: 'JJ Illgen',
    image: 'images/release-drx009.jpg',
    beatport: 'https://ffm.to/emrd84k',
  },
  {
    catalog: 'DRX008',
    title: 'Hype the Funk',
    artist: 'EDEF',
    image: 'images/release-drx008.jpg',
    beatport: 'https://ffm.to/d3xrnqy',
  },
  {
    catalog: 'DRX007',
    title: 'Selfish Ways',
    artist: 'Tony H',
    image: 'images/release-drx007.jpg',
    beatport: 'https://ffm.to/orj0z3q',
  },
  {
    catalog: 'DRX006',
    title: 'This Shit',
    artist: 'Max Mash',
    image: 'images/release-drx006.jpg',
    beatport: 'https://ffm.to/wbyjyj8',
  },
  {
    catalog: 'DRX005',
    title: 'Believe',
    artist: 'Grainge',
    image: 'images/release-drx005.jpg',
    beatport: 'https://soundcloud.com/dialedrecords/drx005-believe-original-mix-grainge',
  },
  {
    catalog: 'DRX004',
    title: 'Acid Machine',
    artist: 'EDEF',
    image: 'images/release-drx004.jpg',
    beatport: 'https://soundcloud.com/dialedrecords/drx004-acid-machine-radio-edit',
  },
  {
    catalog: 'DRXOG',
    title: 'Narratives',
    artist: 'Matt James, Josh Lee',
    image: 'images/release-drxog.jpg',
    beatport: 'https://ffm.to/pnwk0dy',
  },
];

const MERCH = [
  {
    name: 'Dialed x Von Dutch Hat',
    image: 'images/merch-von-dutch.jpg',
    link: 'https://dialedrecords.bandcamp.com/merch/dialed-records-x-von-dutch',
  },
  {
    name: 'Dialed Long Sleeve',
    image: 'images/merch-long-sleeve.png',
    link: 'https://dialedrecords.bandcamp.com/merch/dialed-records-long-sleeve',
  },
  {
    name: 'Rotary Dial Tee',
    image: 'images/merch-rotary-tee.png',
    link: 'https://dialedrecords.bandcamp.com/merch/dialed-records-t-shirt',
  },
  {
    name: 'Dialed Hoodie',
    image: 'images/merch-hoodie.png',
    link: 'https://dialedrecords.bandcamp.com/merch/dialed-records-hoodie',
  },
  {
    name: 'MMW26 Tee',
    image: 'images/merch-dialed-tee.png',
    link: 'https://dialedrecords.bandcamp.com/merch/dialed-records-mmw26-t-shirt',
  },
  {
    name: 'Miami Beach Tee',
    image: 'images/merch-miami-beach-tee.png',
    link: 'https://dialedrecords.bandcamp.com/merch',
  },
];

const EVENTS = [
  {
    date: 'Aug 21\n2026',
    name: 'Sepp',
    subtitle: 'Dialed Records Presents · Utopia Fridays',
    venue: 'Utopia · Los Angeles, CA',
    lineup: 'Sepp · Josh Lee · DJ Monico · Whois86',
    link: 'https://posh.vip/e/utopia-fridays-2026-8-22-12-0',
  },
];

const ALL_EVENTS_URL = 'https://linktr.ee/dialedevents';

/* Posts from @dialedrecords, newest first — each tile links to its post.
   To add one: save the image in images/gallery/ and add {image, url} here. */
const GALLERY = [
  { image: 'images/gallery/ig-01.jpg', url: 'https://www.instagram.com/p/DWCSSeuCTKd/' },
  { image: 'images/gallery/ig-02.jpg', url: 'https://www.instagram.com/p/DVHt48cAWaY/' },
  { image: 'images/gallery/ig-03.jpg', url: 'https://www.instagram.com/p/DURlwy0EoZ5/' },
  { image: 'images/gallery/ig-04.jpg', url: 'https://www.instagram.com/p/DS3XHgFEtTY/' },
  { image: 'images/gallery/ig-05.jpg', url: 'https://www.instagram.com/p/DQ8PWbCERKl/' },
  { image: 'images/gallery/ig-06.jpg', url: 'https://www.instagram.com/p/DOCbLRtXO1K/' },
  { image: 'images/gallery/ig-07.jpg', url: 'https://www.instagram.com/p/DNzB6CNypXx/' },
];

const INSTAGRAM_URL = 'https://www.instagram.com/dialedrecords/';


/* ─── BACKGROUND REMOVAL ENGINE ────────────────
   Flood-fills from image edges, detects studio backdrop color from
   corners, then makes matching pixels transparent. Falls back to
   CSS radial mask if canvas is CORS-blocked.
   ──────────────────────────────────────────── */

function removeStudioBackground(img) {
  if (img.dataset.bgRemoved) return;
  img.dataset.bgRemoved = '1';

  const MAX = 900; // max dimension to process at — balances quality vs speed

  const run = () => {
    const nw = img.naturalWidth, nh = img.naturalHeight;
    if (!nw || !nh) return;

    // Scale down for processing
    const scale = Math.min(1, MAX / Math.max(nw, nh));
    const w = Math.round(nw * scale);
    const h = Math.round(nh * scale);

    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);

    let imgData;
    try {
      imgData = ctx.getImageData(0, 0, w, h);
    } catch (e) {
      return; // CORS blocked — CSS mask fallback already applied
    }

    const d = imgData.data;

    // Sample background color from 4 corners (average)
    const px = (x, y) => (y * w + x) * 4;
    const corners = [px(0,0), px(w-1,0), px(0,h-1), px(w-1,h-1)];
    let bgR = 0, bgG = 0, bgB = 0;
    corners.forEach(i => { bgR += d[i]; bgG += d[i+1]; bgB += d[i+2]; });
    bgR /= 4; bgG /= 4; bgB /= 4;

    // Only strip light/neutral studio backgrounds, not intentional dark ones
    const bgLum = (bgR * 0.299 + bgG * 0.587 + bgB * 0.114);
    if (bgLum < 155) return; // dark background — leave it alone

    const THRESH = 72; // per-channel total tolerance
    const visited = new Uint8Array(w * h);
    const stack = [];

    // Seed: all edge pixels
    for (let x = 0; x < w; x++) { stack.push(x, (h - 1) * w + x); }
    for (let y = 1; y < h - 1; y++) { stack.push(y * w, y * w + w - 1); }

    while (stack.length) {
      const pos = stack.pop();
      if (visited[pos]) continue;
      visited[pos] = 1;

      const i = pos * 4;
      const dist = Math.abs(d[i] - bgR) + Math.abs(d[i+1] - bgG) + Math.abs(d[i+2] - bgB);

      if (dist < THRESH) {
        // Soft alpha: fully transparent near exact match, partial at threshold edge
        d[i + 3] = Math.round((dist / THRESH) * 80); // max 80 alpha at threshold — smooth edge

        const x = pos % w, y = (pos / w) | 0;
        if (x > 0)     stack.push(pos - 1);
        if (x < w - 1) stack.push(pos + 1);
        if (y > 0)     stack.push(pos - w);
        if (y < h - 1) stack.push(pos + w);
      }
    }

    ctx.putImageData(imgData, 0, 0);

    // Replace image src with processed dataURL (same size as original for sharpness)
    // We re-draw at original size from the processed canvas
    const out = document.createElement('canvas');
    out.width = nw; out.height = nh;
    out.getContext('2d').drawImage(canvas, 0, 0, nw, nh);

    img.removeAttribute('crossorigin');
    img.classList.add('bg-removed'); // disables CSS mask fallback
    img.src = out.toDataURL('image/png');
  };

  if (img.complete && img.naturalWidth) run();
  else img.addEventListener('load', run, { once: true });
}


/* ─── AMBILIGHT ENGINE ───────────────────────── */

const colorThief = typeof ColorThief !== 'undefined' ? new ColorThief() : null;

function luminance(r, g, b) {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function saturation(r, g, b) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

function pickGlowColor(palette) {
  // Prefer: mid-luminance, high saturation — not near white, not near black
  const scored = palette.map(([r, g, b]) => {
    const lum = luminance(r, g, b);
    const sat = saturation(r, g, b);
    // Penalize extremes
    const lumPenalty = Math.abs(lum - 0.35) * 2;
    const score = sat - lumPenalty;
    return { color: [r, g, b], score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0].color;
}

function applyAmbilight(card, img, isMerch = false) {
  if (!colorThief) return;
  const run = () => {
    try {
      const palette = colorThief.getPalette(img, 8);
      const [r, g, b] = pickGlowColor(palette);

      if (isMerch) {
        // Stronger glow so it shows through the transparent edges after bg removal
        card.style.background = `radial-gradient(ellipse at 50% 40%, rgba(${r},${g},${b},0.35) 0%, #030303 72%)`;
        card.style.boxShadow = `0 8px 48px rgba(${r},${g},${b},0.18), 0 2px 8px rgba(0,0,0,0.8)`;
      } else {
        // Subtle ambient glow for release artwork cards
        card.style.background = `radial-gradient(ellipse at 50% 45%, rgba(${r},${g},${b},0.18) 0%, #050505 68%)`;
        card.style.boxShadow = `0 8px 48px rgba(${r},${g},${b},0.12), 0 2px 8px rgba(0,0,0,0.6)`;
      }
    } catch (e) {
      // CORS issue or tainted canvas — silent fail, card just stays dark
    }
  };

  if (img.complete && img.naturalWidth > 0) {
    run();
  } else {
    img.addEventListener('load', run);
  }
}


/* ─── RENDER: RELEASES ───────────────────────── */

function renderReleases() {
  const grid = document.querySelector('.releases-grid');

  RELEASES.forEach(release => {
    const card = document.createElement('a');
    card.href = release.beatport;
    card.target = '_blank';
    card.rel = 'noopener noreferrer';
    card.className = 'release-card';

    const wrap = document.createElement('div');
    wrap.className = 'card-img-wrap';

    if (release.image) {
      const img = document.createElement('img');
      img.src = release.image;
      img.alt = `${release.title} — ${release.artist}`;
      img.crossOrigin = 'anonymous';
      img.loading = 'lazy';
      wrap.appendChild(img);
      if (release.darkBg) {
        removeStudioBackground(img);
      } else {
        applyAmbilight(card, img, false);
      }
    } else {
      const noArt = document.createElement('div');
      noArt.className = 'card-no-art';
      noArt.innerHTML = `<span>${release.catalog}</span>`;
      wrap.appendChild(noArt);
    }

    const info = document.createElement('div');
    info.className = 'card-info';
    info.innerHTML = `
      <div class="card-catalog">${release.catalog}</div>
      <div class="card-title">${release.title}</div>
      <div class="card-artist">${release.artist}</div>
      <div class="card-tag${release.preorder ? ' preorder' : ''}">${release.preorder ? 'Pre-Order' : 'Listen'}</div>
    `;

    card.appendChild(wrap);
    card.appendChild(info);
    grid.appendChild(card);
  });
}


/* ─── RENDER: EVENTS ────────────────────────── */

function renderEvents() {
  const list = document.querySelector('.events-list');

  if (!EVENTS.length) {
    list.innerHTML = '<p class="events-empty">No upcoming events. Check back soon.</p>';
  }

  EVENTS.forEach(ev => {
    const item = document.createElement('div');
    item.className = 'event-item';
    item.innerHTML = `
      <div class="event-date">${ev.date.replace('\n', '<br>')}</div>
      <div class="event-body">
        <div class="event-name">${ev.name}</div>
        <div class="event-subtitle">${ev.subtitle}</div>
        <div class="event-venue">${ev.venue}</div>
        <div class="event-lineup">${ev.lineup}</div>
      </div>
      <div class="event-cta">
        <a href="${ev.link}" target="_blank" rel="noopener">Tickets</a>
      </div>
    `;
    list.appendChild(item);
  });

  const cta = document.createElement('div');
  cta.className = 'events-all-cta';
  cta.innerHTML = `<a href="${ALL_EVENTS_URL}" target="_blank" rel="noopener">Tickets + All Events ↗</a>`;
  list.appendChild(cta);
}


/* ─── RENDER: GALLERY ───────────────────────── */

function renderGallery() {
  const track = document.querySelector('.gallery-track');
  if (!track) return;

  // Repeat the set so the loop can wrap seamlessly on any viewport width
  [...GALLERY, ...GALLERY, ...GALLERY, ...GALLERY].forEach(post => {
    const item = document.createElement('a');
    item.href = post.url;
    item.target = '_blank';
    item.rel = 'noopener noreferrer';
    item.className = 'gallery-item';
    item.innerHTML = `<img src="${post.image}" alt="Dialed Records on Instagram" loading="lazy">`;
    track.appendChild(item);
  });

  initGalleryScroll();
}

/* Auto-drifting, swipeable gallery. A real scroll container (works on
   every phone/browser); JS only nudges scrollLeft, pausing whenever the
   user interacts, and wraps past the halfway point for an endless loop. */
function initGalleryScroll() {
  const scroller = document.querySelector('.gallery-marquee');
  const track = document.querySelector('.gallery-track');
  if (!scroller || !track) return;

  const SPEED = 0.04; // px per ms ≈ 40px/s
  let paused = false;
  let resumeTimer = null;
  let pos = 0;
  let last = null;

  const pause = () => {
    paused = true;
    clearTimeout(resumeTimer);
    resumeTimer = setTimeout(() => { paused = false; }, 2500);
  };
  ['touchstart', 'pointerdown', 'wheel'].forEach(ev =>
    scroller.addEventListener(ev, pause, { passive: true })
  );
  scroller.addEventListener('mouseenter', () => { paused = true; clearTimeout(resumeTimer); });
  scroller.addEventListener('mouseleave', () => { paused = false; });

  const autoDrift = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function step(ts) {
    const half = track.scrollWidth / 2;
    if (half > 0) {
      if (paused || !autoDrift) {
        pos = scroller.scrollLeft; // stay in sync with manual swipes
      } else {
        if (last !== null) pos += (ts - last) * SPEED;
        if (pos >= half) pos -= half;
        scroller.scrollLeft = pos;
      }
      if (scroller.scrollLeft >= half) scroller.scrollLeft -= half;
    }
    last = ts;
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}


/* ─── RENDER: MERCH ─────────────────────────── */

function renderMerch() {
  const grid = document.querySelector('.merch-grid');

  MERCH.forEach(item => {
    const card = document.createElement('a');
    card.href = item.link;
    card.target = '_blank';
    card.rel = 'noopener noreferrer';
    card.className = 'merch-card';

    const wrap = document.createElement('div');
    wrap.className = 'card-img-wrap';

    const img = document.createElement('img');
    img.src = item.image;
    img.alt = item.name;
    img.loading = 'lazy';

    wrap.appendChild(img);

    const info = document.createElement('div');
    info.className = 'card-info';
    info.innerHTML = `<div class="card-title">${item.name}</div>`;

    card.appendChild(wrap);
    card.appendChild(info);
    grid.appendChild(card);
  });
}


/* ─── NAV SCROLL BEHAVIOR ───────────────────── */

const nav = document.getElementById('nav');
let lastScroll = 0;

window.addEventListener('scroll', () => {
  const y = window.scrollY;
  nav.classList.toggle('scrolled', y > 60);
  lastScroll = y;
}, { passive: true });


/* ─── BURGER MENU ───────────────────────────── */

const burger = document.getElementById('burger');
const mobileMenu = document.getElementById('mobileMenu');
let menuOpen = false;

function toggleMenu(open) {
  menuOpen = open;
  mobileMenu.classList.toggle('open', open);
  mobileMenu.setAttribute('aria-hidden', String(!open));
  document.body.style.overflow = open ? 'hidden' : '';

  if (!HAS_ANIM) return;
  const spans = burger.querySelectorAll('span');
  if (open) {
    gsap.to(spans[0], { rotate: 45, y: 6, duration: 0.3, ease: 'power2.out' });
    gsap.to(spans[1], { opacity: 0, duration: 0.2 });
    gsap.to(spans[2], { rotate: -45, y: -6, duration: 0.3, ease: 'power2.out' });
  } else {
    gsap.to(spans[0], { rotate: 0, y: 0, duration: 0.3, ease: 'power2.out' });
    gsap.to(spans[1], { opacity: 1, duration: 0.2 });
    gsap.to(spans[2], { rotate: 0, y: 0, duration: 0.3, ease: 'power2.out' });
  }
}

burger.addEventListener('click', () => toggleMenu(!menuOpen));

document.querySelectorAll('.mobile-link').forEach(link => {
  link.addEventListener('click', () => toggleMenu(false));
});


/* ─── HERO ENTRANCE ─────────────────────────── */

/* ─── PAGE LOAD + HERO SEQUENCE ─────────────── */

function startRinging() {
  if (!HAS_ANIM) return;
  gsap.timeline({ repeat: -1, repeatDelay: 2.8 })
    .to('.hero-logo-wrap', { rotate: -6, x: -5, duration: 0.07, ease: 'none' })
    .to('.hero-logo-wrap', { rotate:  6, x:  5, duration: 0.07, ease: 'none' })
    .to('.hero-logo-wrap', { rotate: -6, x: -5, duration: 0.07, ease: 'none' })
    .to('.hero-logo-wrap', { rotate:  6, x:  5, duration: 0.07, ease: 'none' })
    .to('.hero-logo-wrap', { rotate: -4, x: -3, duration: 0.07, ease: 'none' })
    .to('.hero-logo-wrap', { rotate:  4, x:  3, duration: 0.07, ease: 'none' })
    .to('.hero-logo-wrap', { rotate:  0, x:  0, duration: 0.18, ease: 'power3.out' });
}

if (HAS_ANIM) {
  gsap.timeline()
    // 1 — Splash logo fades in
    .to('.pl-logo-wrap', { opacity: 1, duration: 0.7, ease: 'power2.out' })
    // 2 — Hold briefly
    .to({}, { duration: 0.9 })
    // 3 — Entire overlay fades to black, then out
    .to('#page-load', { opacity: 0, duration: 0.8, ease: 'power2.inOut' })
    .set('#page-load', { display: 'none' })
    // 4 — Hero logo rises in
    .to('.hero-logo-wrap', { opacity: 1, y: 0, duration: 1.1, ease: 'power3.out' }, '-=0.2')
    // 5 — Tagline
    .to('.hero-sub', { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, '-=0.5')
    // 6 — Nav fades in
    .from('#nav', { opacity: 0, duration: 0.6, ease: 'power2.out' }, '-=0.4')
    // 7 — Start ring loop
    .add(startRinging);
}


/* ─── SCROLL ANIMATIONS ─────────────────────── */

function initScrollAnims() {
  if (!HAS_ANIM) return;
  // Section headers — slide up + fade, border expands
  gsap.utils.toArray('.section-header').forEach(el => {
    gsap.from(el, {
      opacity: 0, y: 30,
      duration: 0.9, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none none' },
    });
  });

  // Release cards — staggered wave fade-up
  const releaseCards = gsap.utils.toArray('.release-card');
  releaseCards.forEach((card, i) => {
    gsap.from(card, {
      opacity: 0, y: 50, scale: 0.97,
      duration: 0.75, ease: 'power3.out',
      delay: (i % 4) * 0.1,
      scrollTrigger: { trigger: card, start: 'top 92%', toggleActions: 'play none none none' },
    });
  });

  // Scroll-triggered section label lines expand
  gsap.utils.toArray('.section-header').forEach(el => {
    gsap.from(el, {
      scaleX: 0,
      transformOrigin: 'left',
      duration: 1.2, ease: 'power4.out',
      scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none none' },
    });
  });

  // Event items — slide in from left
  gsap.utils.toArray('.event-item').forEach((item, i) => {
    gsap.to(item, {
      opacity: 1, x: 0,
      duration: 0.7, ease: 'power3.out',
      delay: i * 0.12,
      scrollTrigger: { trigger: item, start: 'top 88%', toggleActions: 'play none none none' },
    });
  });

  // Merch cards — stagger + scale
  gsap.utils.toArray('.merch-card').forEach((card, i) => {
    gsap.from(card, {
      opacity: 0, y: 50, scale: 0.97,
      duration: 0.75, ease: 'power3.out',
      delay: (i % 4) * 0.1,
      scrollTrigger: { trigger: card, start: 'top 92%', toggleActions: 'play none none none' },
    });
  });

  // Footer fade in
  gsap.from('footer', {
    opacity: 0, y: 20,
    duration: 0.8, ease: 'power3.out',
    scrollTrigger: { trigger: 'footer', start: 'top 95%', toggleActions: 'play none none none' },
  });

  // Scroll indicator fades out when leaving hero
  ScrollTrigger.create({
    trigger: '#releases',
    start: 'top 80%',
    onEnter: () => gsap.to('.scroll-indicator', { opacity: 0, duration: 0.4 }),
  });
}


/* ─── INIT ──────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  renderReleases();
  renderEvents();
  renderMerch();
  renderGallery();

  // Give DOM a frame to paint before triggering scroll anims
  requestAnimationFrame(() => {
    requestAnimationFrame(initScrollAnims);
  });
});
