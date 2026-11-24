(() => {
  'use strict';

  const TRIP = window.TRIP;
  const $ = (sel, el = document) => el.querySelector(sel);
  const root = document.documentElement;
  const daysEl = $('#days');

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtDur = (s) => `${Math.floor(s / 60)}:${String(Math.round(s) % 60).padStart(2, '0')}`;
  const media = {
    thumb: (it) => it.type === 'video' ? `media/posters/${it.src}.webp` : `media/thumbs/${it.src}.webp`,
    full: (it) => it.type === 'video' ? `media/videos/${it.src}.mp4` : `media/photos/${it.src}.webp`,
  };

  const PLAY_ICON = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 2.8v10.4a.6.6 0 0 0 .9.5l8.2-5.2a.6.6 0 0 0 0-1L5.4 2.3a.6.6 0 0 0-.9.5z" fill="currentColor"/></svg>';

  /* ---------- Build the page from trip.js ---------- */
  const entries = []; // every tile, in page order
  const days = [];
  let nPhotos = 0, nVideos = 0;

  TRIP.days.forEach((day) => {
    const sec = document.createElement('section');
    sec.className = 'day';
    sec.id = day.key;
    sec.setAttribute('aria-labelledby', `${day.key}-h`);
    sec.innerHTML = `
      <svg class="road" aria-hidden="true" focusable="false">
        <path class="track"></path><path class="drive"></path><circle class="tip" r="6" cx="-20" cy="-20"></circle>
      </svg>
      <header class="day-head">
        <h2 id="${day.key}-h">${esc(day.label)}</h2>
        <p><span class="date">${esc(day.date)}.</span> ${esc(day.summary)}</p>
      </header>`;

    day.moments.forEach((m) => {
      if (m.travelBefore) {
        const t = document.createElement('div');
        t.className = 'travel';
        t.innerHTML = `<p>${esc(m.travelBefore)}</p>`;
        sec.append(t);
      }

      const art = document.createElement('article');
      art.className = 'moment';
      art.id = m.id;
      art.setAttribute('aria-labelledby', `${m.id}-h`);
      const photosHere = m.items.filter((i) => i.type === 'photo').length;
      if (photosHere) art.classList.add('has-photo');
      if (photosHere < m.items.length) art.classList.add('has-video');
      art.innerHTML = `
        <span class="stop" aria-hidden="true"></span>
        <div class="moment-head">
          <div class="moment-title"><time>${esc(m.time)}</time><h3 id="${m.id}-h">${esc(m.title)}</h3></div>
          ${m.caption ? `<p>${esc(m.caption)}</p>` : ''}
        </div>`;

      const grid = document.createElement('div');
      grid.className = 'grid';
      let p = 0;
      m.items.forEach((it) => {
        const a = document.createElement('a');
        a.className = 'tile' + (it.type === 'video' ? ' is-video' : '');
        a.dataset.type = it.type;
        a.href = media.full(it);
        a.style.setProperty('--r', (it.w / it.h).toFixed(4));

        const img = document.createElement('img');
        img.loading = 'lazy'; // must be set before src, or the browser fetches it straight away
        img.decoding = 'async';
        img.width = it.w; img.height = it.h;
        img.dataset.loading = '';
        img.addEventListener('load', () => img.removeAttribute('data-loading'), { once: true });
        img.addEventListener('error', () => img.removeAttribute('data-loading'), { once: true });
        img.src = media.thumb(it);

        if (it.type === 'video') {
          nVideos++;
          img.alt = '';
          a.setAttribute('aria-label', `Play video, ${fmtDur(it.duration)}: ${m.title}`);
          a.append(img);
          a.insertAdjacentHTML('beforeend', `<span class="play">${PLAY_ICON}${fmtDur(it.duration)}</span>`);
        } else {
          nPhotos++; p++;
          img.alt = `${m.title}, photo ${p} of ${photosHere}`;
          a.append(img);
        }

        const entry = { it, m, day, el: a };
        a.addEventListener('click', (ev) => {
          if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button !== 0) return;
          ev.preventDefault();
          openViewer(entry);
        });
        entries.push(entry);
        grid.append(a);
      });

      art.append(grid);
      sec.append(art);
    });

    daysEl.append(sec);
    days.push({ el: sec, svg: $('.road', sec), track: $('.track', sec), drive: $('.drive', sec), tip: $('.tip', sec), samples: [], stops: [] });
  });

  $('#count').textContent = `${nPhotos} photos and ${nVideos} videos`;

  /* ---------- The road: hairpin bends between stops, drawn as you scroll ---------- */
  const px = (name) => parseFloat(getComputedStyle(root).getPropertyValue(name)) || 0;

  function hairpins(x, y0, y1, bulge, step) {
    const h = y1 - y0;
    if (h <= 2) return '';
    const n = Math.max(2, Math.round(h / step));
    const s = h / n;
    let d = '';
    for (let i = 0; i < n; i++) {
      const ya = y0 + i * s, yb = ya + s;
      const side = i % 2 ? -1 : 1;
      const bx = x + side * bulge;
      // each turn runs across the centre line and swings back (a hairpin);
      // the first and last turns ease in and out of the straight sections
      const c1 = i === 0 ? `${x} ${ya + s * 0.55}` : `${bx} ${ya}`;
      const c2 = i === n - 1 ? `${x} ${yb - s * 0.55}` : `${bx} ${yb}`;
      d += ` C${c1} ${c2} ${x} ${yb}`;
    }
    return d;
  }

  function layoutRoad(day) {
    const box = day.el.getBoundingClientRect();
    const spine = px('--spine');
    const x = spine / 2;
    const wide = spine >= 60;
    const bulge = wide ? 15 : 10;
    const step = wide ? 26 : 22;
    const top = (el) => el.getBoundingClientRect().top - box.top;
    const bottom = (el) => el.getBoundingClientRect().bottom - box.top;

    const blocks = [...day.el.querySelectorAll('.moment, .travel')].filter((el) => el.offsetParent !== null);
    const moments = blocks.filter((el) => el.classList.contains('moment'));
    day.stops = moments.map((el) => {
      const s = $('.stop', el).getBoundingClientRect();
      return { el, y: s.top + s.height / 2 - box.top };
    });

    day.svg.setAttribute('viewBox', `0 0 ${spine} ${Math.max(1, box.height)}`);
    if (!day.stops.length) {
      day.track.setAttribute('d', ''); day.drive.setAttribute('d', ''); day.samples = [];
      return;
    }

    const h2 = $('.day-head h2', day.el).getBoundingClientRect();
    let y = h2.top + h2.height / 2 - box.top;
    let d = `M${x} ${y}`;
    let si = 0;
    blocks.forEach((el, i) => {
      if (el.classList.contains('moment')) {
        const stopY = day.stops[si++].y;
        // hairpins down into this stop from wherever the road is
        d += hairpins(x, y, stopY - 2, bulge, step) + ` L${x} ${stopY}`;
        y = stopY;
        // straight alongside the photos, ending at the bottom of this moment
        const end = i === blocks.length - 1 ? bottom(el) : bottom(el) - 4;
        d += ` L${x} ${end}`;
        y = end;
      }
      // .travel blocks contribute only distance: the next hairpin run covers them
    });

    day.track.setAttribute('d', d);
    day.drive.setAttribute('d', d);
    const len = day.drive.getTotalLength();
    day.drive.style.strokeDasharray = `${len} ${len}`;

    // sample the path once so scrolling never touches the SVG geometry API
    const samples = [];
    const n = Math.ceil(len / 3);
    for (let i = 0; i <= n; i++) {
      const l = Math.min(len, i * 3);
      const pt = day.drive.getPointAtLength(l);
      samples.push([l, pt.x, pt.y]);
    }
    day.samples = samples;
    day.len = len;
  }

  function driveTo(day) {
    const S = day.samples;
    if (!S.length) return;
    const box = day.el.getBoundingClientRect();
    const target = window.innerHeight * 0.62 - box.top;

    // samples are monotonic in y: binary search for the last point above the target line
    let lo = 0, hi = S.length - 1;
    if (target <= S[0][2]) hi = 0;
    else if (target >= S[hi][2]) lo = hi;
    else {
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (S[mid][2] <= target) lo = mid; else hi = mid;
      }
    }
    const k = target <= S[0][2] ? 0 : lo;
    const [l, tx, ty] = S[k];
    day.drive.style.strokeDashoffset = String(day.len - l);
    const visible = target > S[0][2];
    day.tip.setAttribute('cx', visible ? tx : -20);
    day.tip.setAttribute('cy', visible ? ty : -20);
    day.stops.forEach((s) => s.el.classList.toggle('is-reached', s.y <= ty + 1 && visible));
  }

  let frame = 0;
  const drive = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => { frame = 0; days.forEach(driveTo); });
  };
  const relayout = () => { days.forEach(layoutRoad); days.forEach(driveTo); };

  const bar = $('#bar');
  window.addEventListener('scroll', () => {
    bar.classList.toggle('is-scrolled', window.scrollY > 8);
    drive();
  }, { passive: true });

  let resizeTimer = 0;
  new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(relayout, 60);
  }).observe(daysEl);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);
  relayout();

  /* ---------- Filter ---------- */
  const filterBtns = document.querySelectorAll('.filter button');
  filterBtns.forEach((btn) => btn.addEventListener('click', () => {
    document.body.dataset.filter = btn.dataset.filter;
    filterBtns.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    relayout();
  }));

  /* ---------- Theme ---------- */
  const themeBtn = $('#theme-toggle');
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const isDark = () => (root.dataset.theme ? root.dataset.theme === 'dark' : mq.matches);
  const syncTheme = () => themeBtn.setAttribute('aria-label', isDark() ? 'Use light theme' : 'Use dark theme');
  themeBtn.addEventListener('click', () => {
    const next = isDark() ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch (e) { /* private mode */ }
    syncTheme();
  });
  mq.addEventListener('change', syncTheme);
  syncTheme();

  /* ---------- Viewer ---------- */
  const viewer = $('#viewer');
  const stage = $('#v-stage');
  const vCount = $('#v-count'), vTitle = $('#v-title'), vMeta = $('#v-meta');
  const vPrev = $('#v-prev'), vNext = $('#v-next'), vDownload = $('#v-download');
  let list = [], idx = 0, returnFocus = null;

  function openViewer(entry) {
    list = entries.filter((e) => e.el.offsetParent !== null);
    idx = Math.max(0, list.indexOf(entry));
    returnFocus = entry.el;
    show();
    viewer.showModal();
  }

  function show() {
    const e = list[idx];
    if (!e) return;
    stage.replaceChildren();

    if (e.it.type === 'video') {
      const v = document.createElement('video');
      v.src = media.full(e.it);
      v.poster = media.thumb(e.it);
      v.controls = true;
      v.playsInline = true;
      v.autoplay = true;
      v.preload = 'auto';
      v.setAttribute('aria-label', e.m.title);
      stage.append(v);
    } else {
      const img = document.createElement('img');
      img.src = media.thumb(e.it); // already cached: shows instantly, sharpens when the full size arrives
      img.alt = e.el.querySelector('img').alt;
      img.draggable = false;
      stage.append(img);
      const full = new Image();
      full.onload = () => { if (list[idx] === e) img.src = full.src; };
      full.src = media.full(e.it);
    }

    vCount.textContent = `${idx + 1} of ${list.length}`;
    vTitle.textContent = e.m.title;
    vMeta.textContent = `${e.day.date} at ${e.m.time}`;
    vDownload.href = media.full(e.it);
    vDownload.setAttribute('download', media.full(e.it).split('/').pop());
    vPrev.disabled = idx === 0;
    vNext.disabled = idx === list.length - 1;

    // warm up the neighbours
    [list[idx + 1], list[idx - 1]].forEach((n) => {
      if (n && n.it.type === 'photo') new Image().src = media.full(n.it);
    });
  }

  const go = (delta) => {
    const next = idx + delta;
    if (next < 0 || next >= list.length) return;
    idx = next;
    show();
  };

  vPrev.addEventListener('click', () => go(-1));
  vNext.addEventListener('click', () => go(1));
  $('#v-close').addEventListener('click', () => viewer.close());
  viewer.addEventListener('close', () => {
    stage.replaceChildren(); // stops any playing video
    if (returnFocus) {
      returnFocus.focus({ preventScroll: true });
      returnFocus.scrollIntoView({ block: 'nearest' });
    }
  });
  viewer.addEventListener('keydown', (ev) => {
    if (ev.target.tagName === 'VIDEO' && (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight')) return; // let video seek
    if (ev.key === 'ArrowLeft') { ev.preventDefault(); go(-1); }
    if (ev.key === 'ArrowRight') { ev.preventDefault(); go(1); }
  });
  stage.addEventListener('click', (ev) => { if (ev.target === stage) viewer.close(); });

  // swipe left/right on touch screens
  let sx = 0, sy = 0, swiping = false;
  stage.addEventListener('pointerdown', (ev) => {
    if (ev.pointerType === 'mouse' || ev.target.tagName === 'VIDEO') return;
    swiping = true; sx = ev.clientX; sy = ev.clientY;
  });
  stage.addEventListener('pointerup', (ev) => {
    if (!swiping) return;
    swiping = false;
    const dx = ev.clientX - sx, dy = ev.clientY - sy;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) go(dx < 0 ? 1 : -1);
  });
  stage.addEventListener('pointercancel', () => { swiping = false; });
})();
