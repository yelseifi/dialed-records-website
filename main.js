/* =============================================
   DIALED RECORDS — main.js
   ============================================= */

gsap.registerPlugin(ScrollTrigger);

/* ─── DATA ──────────────────────────────────── */

const RELEASES = [
  {
    catalog: "DRX MMW '26",
    title: "DRX MMW VA '26",
    artist: 'Various Artists',
    image: 'images/release-drxmmw26.jpg',
    beatport: 'https://www.beatport.com/release/drx-mmw-va-26/6482929',
    preorder: true,
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
    title: 'Narratives',
    artist: 'Matt James, Josh Lee',
    image: 'images/release-drx007.jpg',
    beatport: 'https://ffm.to/pnwk0dy',
  },
  {
    catalog: 'DRX006',
    title: 'Selfish Ways',
    artist: 'Tony H',
    image: 'images/release-drx006.jpg',
    beatport: 'https://ffm.to/orj0z3q',
  },
  {
    catalog: 'DRX005',
    title: 'This Shit',
    artist: 'Max Mash',
    image: 'images/release-drx004b.jpg',
    beatport: 'https://ffm.to/wbyjyj8',
  },
  {
    catalog: 'DRX004',
    title: 'Believe',
    artist: 'Grainge',
    image: 'images/release-drx004.jpg',
    beatport: 'https://ffm.to/p0j2jro',
  },
  {
    catalog: 'DRX003',
    title: 'Acid Machine',
    artist: 'EDEF',
    image: 'images/release-drx005.jpg',
    beatport: 'https://ffm.to/woyjara',
  },
];

const MERCH = [
  {
    name: 'Dialed Long Sleeve',
    image: 'images/merch-long-sleeve.jpg',
    link: 'https://linktr.ee/dialedrecords',
  },
  {
    name: 'Rotary Dial Tee',
    image: 'images/merch-rotary-tee.jpg',
    link: 'https://linktr.ee/dialedrecords',
  },
  {
    name: 'Dialed Hoodie',
    image: 'images/merch-hoodie.jpg',
    link: 'https://linktr.ee/dialedrecords',
  },
  {
    name: 'Dialed Long Sleeve II',
    image: 'images/merch-long-sleeve-2.jpg',
    link: 'https://linktr.ee/dialedrecords',
  },
  {
    name: 'Miami Tee',
    image: 'images/merch-miami-tee.jpg',
    link: 'https://linktr.ee/dialedrecords',
  },
  {
    name: 'Dialed Tee',
    image: 'images/merch-dialed-tee.jpg',
    link: 'https://linktr.ee/dialedrecords',
  },
  {
    name: 'Miami Beach Tee',
    image: 'images/merch-miami-beach-tee.jpg',
    link: 'https://linktr.ee/dialedrecords',
  },
];

const EVENTS = [
  {
    date: 'Mar 26\n2026',
    name: 'Beatport Live — The Block',
    subtitle: 'Dialed Records Takeover',
    venue: 'Toe Jam · Miami, FL',
    lineup: 'Dan Ghenacia b2b m.O.N.R.O.E. · Richy Ahmed · Josh Lee b2b Shane Kwon · Whois86 b2b SIMMI',
    link: 'https://linktr.ee/dialedevents',
  },
];


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

const colorThief = new ColorThief();

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
      <div class="card-tag${release.preorder ? ' preorder' : ''}">${release.preorder ? 'Pre-Order' : 'Beatport'}</div>
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
    return;
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
    img.crossOrigin = 'anonymous';
    img.loading = 'lazy';

    wrap.appendChild(img);

    const info = document.createElement('div');
    info.className = 'card-info';
    info.innerHTML = `<div class="card-title">${item.name}</div>`;

    card.appendChild(wrap);
    card.appendChild(info);
    grid.appendChild(card);

    applyAmbilight(card, img, true);
    removeStudioBackground(img);
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
  gsap.timeline({ repeat: -1, repeatDelay: 2.8 })
    .to('.hero-logo-wrap', { rotate: -6, x: -5, duration: 0.07, ease: 'none' })
    .to('.hero-logo-wrap', { rotate:  6, x:  5, duration: 0.07, ease: 'none' })
    .to('.hero-logo-wrap', { rotate: -6, x: -5, duration: 0.07, ease: 'none' })
    .to('.hero-logo-wrap', { rotate:  6, x:  5, duration: 0.07, ease: 'none' })
    .to('.hero-logo-wrap', { rotate: -4, x: -3, duration: 0.07, ease: 'none' })
    .to('.hero-logo-wrap', { rotate:  4, x:  3, duration: 0.07, ease: 'none' })
    .to('.hero-logo-wrap', { rotate:  0, x:  0, duration: 0.18, ease: 'power3.out' });
}

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


/* ─── SCROLL ANIMATIONS ─────────────────────── */

function initScrollAnims() {
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

  // Give DOM a frame to paint before triggering scroll anims
  requestAnimationFrame(() => {
    requestAnimationFrame(initScrollAnims);
  });
});
