/**
 * Riverside Restaurant — Interactive Scrollytelling & Controls
 *
 * Uses native CSS Scroll-Driven Animations where supported, with feature-detected
 * JS fallbacks for scroll progress, rotating dish transitions, mobile drawer, and dialog light-dismiss.
 */

const DISH_CHAPTERS = [
  { index: '01 / 05', name: 'Ajwain Fish & Tandoori Kebabs' },
  { index: '02 / 05', name: 'Aromatic Royal Biryani' },
  { index: '03 / 05', name: 'Kadai Chicken & Tandoori Roti' },
  { index: '04 / 05', name: 'Kadhai Paneer & Kashmiri Pulao' },
  { index: '05 / 05', name: 'Hong Kong Noodles & Chilli Classics' },
];

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const supportsNativeScrollDriven = CSS.supports(
  '(animation-timeline: scroll()) and (animation-range: 0% 100%)'
);

/* ==========================================================================
   1. STICKY HEADER ELEVATION & ACTIVE CHAPTER OBSERVER
   ========================================================================== */
const headerEl = document.getElementById('site-header');
const plaqueIndexEl = document.getElementById('plaque-index');
const plaqueNameEl = document.getElementById('plaque-name');
const chapterEls = Array.from(document.querySelectorAll('section[data-chapter]'));
const railLinks = Array.from(document.querySelectorAll('[data-chapter-link]'));
const dishLayers = Array.from(document.querySelectorAll('.dish-layer'));
const turntableEl = document.getElementById('plate-turntable');

let activeChapter = 1;

function setActiveChapter(chapterNum) {
  if (chapterNum === activeChapter && plaqueNameEl.textContent) return;
  activeChapter = chapterNum;

  const info = DISH_CHAPTERS[chapterNum - 1];
  if (info) {
    plaqueIndexEl.textContent = info.index;
    plaqueNameEl.textContent = info.name;
  }

  for (let i = 0; i < railLinks.length; i++) {
    const isMatch = Number(railLinks[i].dataset.chapterLink) === chapterNum;
    railLinks[i].classList.toggle('is-active', isMatch);
    if (isMatch) {
      railLinks[i].setAttribute('aria-current', 'location');
    } else {
      railLinks[i].removeAttribute('aria-current');
    }
  }

  if (prefersReducedMotion.matches) {
    for (let i = 0; i < dishLayers.length; i++) {
      dishLayers[i].style.opacity = i === chapterNum - 1 ? '1' : '0';
    }
  }
}

const chapterObserver = new IntersectionObserver(
  (entries) => {
    let bestEntry = null;
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (entry.isIntersecting) {
        if (!bestEntry || entry.intersectionRatio > bestEntry.intersectionRatio) {
          bestEntry = entry;
        }
      }
    }
    if (bestEntry) {
      setActiveChapter(Number(bestEntry.target.dataset.chapter));
    }
  },
  {
    rootMargin: '-25% 0px -35% 0px',
    threshold: [0.1, 0.35, 0.6],
  }
);

chapterEls.forEach((section) => chapterObserver.observe(section));

function updateHeaderState() {
  headerEl.classList.toggle('is-scrolled', window.scrollY > 24);
}
window.addEventListener('scroll', updateHeaderState, { passive: true });
updateHeaderState();

/* ==========================================================================
   2. FEATURE-DETECTED FALLBACK FOR SCROLL-DRIVEN ROTATING DISH & PROGRESS BAR
   ========================================================================== */
if (!CSS.supports('animation-timeline', 'scroll()')) {
  const progressBar = document.getElementById('scroll-progress');
  const updateFallbackProgress = () => {
    if (prefersReducedMotion.matches) return;
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const ratio = Math.min(1, Math.max(0, window.scrollY / maxScroll));
    progressBar.style.transform = `scaleX(${ratio})`;
  };
  window.addEventListener('scroll', updateFallbackProgress, { passive: true });
  updateFallbackProgress();
}

if (!supportsNativeScrollDriven) {
  let rafScheduled = false;

  const updateFallbackStage = () => {
    rafScheduled = false;
    if (prefersReducedMotion.matches) return;

    const vh = window.innerHeight;
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - vh);
    const scrollProgress = Math.min(1, Math.max(0, window.scrollY / maxScroll));

    turntableEl.style.transform = `rotate(${(scrollProgress * 450).toFixed(2)}deg)`;

    for (let i = 0; i < chapterEls.length; i++) {
      const rect = chapterEls[i].getBoundingClientRect();
      const entryP = (vh - rect.top) / vh;
      const exitP = (vh - rect.bottom) / vh;

      let opacity = 0;
      let scale = 1;

      if (i === 0) {
        if (exitP <= 0.5) {
          opacity = 1;
          scale = 1;
        } else if (exitP < 0.8) {
          const t = (exitP - 0.5) / 0.3;
          opacity = 1 - t;
          scale = 1 + t * 0.04;
        }
      } else if (i === chapterEls.length - 1) {
        if (entryP <= 0.15) {
          opacity = 0;
          scale = 0.95;
        } else if (entryP < 0.6) {
          const t = (entryP - 0.15) / 0.45;
          opacity = t;
          scale = 0.95 + t * 0.05;
        } else {
          opacity = 1;
          scale = 1;
        }
      } else {
        if (entryP <= 0.15 || exitP >= 0.8) {
          opacity = 0;
        } else if (entryP < 0.6) {
          const t = (entryP - 0.15) / 0.45;
          opacity = t;
          scale = 0.95 + t * 0.05;
        } else if (exitP <= 0.5) {
          opacity = 1;
          scale = 1;
        } else {
          const t = (exitP - 0.5) / 0.3;
          opacity = 1 - t;
          scale = 1 + t * 0.04;
        }
      }

      dishLayers[i].style.opacity = opacity.toFixed(3);
      dishLayers[i].style.transform = `scale(${scale.toFixed(3)})`;
    }
  };

  window.addEventListener(
    'scroll',
    () => {
      if (!rafScheduled) {
        rafScheduled = true;
        requestAnimationFrame(updateFallbackStage);
      }
    },
    { passive: true }
  );
  window.addEventListener('resize', updateFallbackStage, { passive: true });
  updateFallbackStage();
}

/* ==========================================================================
   3. PROCEDURAL RISING STEAM CANVAS WITH WCAG 2.2.2 PAUSE/PLAY CONTROL
   ========================================================================== */
const steamCanvas = document.getElementById('steam-canvas');
const steamCtx = steamCanvas.getContext('2d');
const steamToggleBtn = document.getElementById('steam-toggle');
const allSteamToggles = Array.from(document.querySelectorAll('[data-steam-toggle]'));
const allSteamLabels = Array.from(document.querySelectorAll('[data-steam-label]'));
const pauseIcon = steamToggleBtn.querySelector('.icon--pause');
const playIcon = steamToggleBtn.querySelector('.icon--play');

let steamPaused = prefersReducedMotion.matches;
let steamRafId = null;

const WISP_COUNT = window.innerWidth < 768 ? 10 : 16;
const wisps = [];
for (let i = 0; i < WISP_COUNT; i++) {
  wisps.push({
    x: 220 + Math.random() * 160,
    y: 260 + Math.random() * 240,
    baseX: 220 + Math.random() * 160,
    vy: 0.36 + Math.random() * 0.42,
    radius: 34 + Math.random() * 54,
    phase: Math.random() * Math.PI * 2,
    swayAmp: 18 + Math.random() * 28,
    swayFreq: 0.008 + Math.random() * 0.008,
    alpha: 0.04 + Math.random() * 0.06,
    age: Math.random(),
  });
}

function resetWisp(w) {
  w.baseX = 215 + Math.random() * 170;
  w.x = w.baseX;
  w.y = 435 + Math.random() * 65;
  w.vy = 0.34 + Math.random() * 0.4;
  w.radius = 30 + Math.random() * 44;
  w.phase = Math.random() * Math.PI * 2;
  w.swayAmp = 20 + Math.random() * 28;
  w.alpha = 0.045 + Math.random() * 0.065;
  w.age = 0;
}

function renderSteamFrame() {
  if (steamPaused || document.hidden) {
    steamRafId = null;
    return;
  }

  const w = steamCanvas.width;
  const h = steamCanvas.height;
  steamCtx.clearRect(0, 0, w, h);

  for (let i = 0; i < WISP_COUNT; i++) {
    const p = wisps[i];
    p.y -= p.vy;
    p.age += 0.0028;
    p.phase += p.swayFreq;
    p.x = p.baseX + Math.sin(p.phase) * p.swayAmp * (0.4 + p.age);

    const currentRadius = p.radius * (0.75 + p.age * 1.65);
    const lifeAlpha = Math.sin(Math.min(1, p.age) * Math.PI) * p.alpha;

    if (p.age >= 1 || p.y < -currentRadius) {
      resetWisp(p);
      continue;
    }

    const grad = steamCtx.createRadialGradient(p.x, p.y, 0, p.x, p.y, currentRadius);
    grad.addColorStop(0, `rgba(255, 240, 222, ${lifeAlpha.toFixed(4)})`);
    grad.addColorStop(0.5, `rgba(250, 222, 188, ${(lifeAlpha * 0.45).toFixed(4)})`);
    grad.addColorStop(1, 'rgba(250, 222, 188, 0)');

    steamCtx.fillStyle = grad;
    steamCtx.beginPath();
    steamCtx.arc(p.x, p.y, currentRadius, 0, Math.PI * 2);
    steamCtx.fill();
  }

  steamRafId = requestAnimationFrame(renderSteamFrame);
}

function syncSteamUI() {
  steamCanvas.classList.toggle('is-paused', steamPaused);
  const labelText = steamPaused ? 'Play Steam' : 'Pause Steam';
  for (let i = 0; i < allSteamLabels.length; i++) {
    allSteamLabels[i].textContent = labelText;
  }
  pauseIcon.hidden = steamPaused;
  playIcon.hidden = !steamPaused;

  if (steamPaused) {
    if (steamRafId !== null) {
      cancelAnimationFrame(steamRafId);
      steamRafId = null;
    }
    steamCtx.clearRect(0, 0, steamCanvas.width, steamCanvas.height);
  } else if (steamRafId === null) {
    steamRafId = requestAnimationFrame(renderSteamFrame);
  }
}

allSteamToggles.forEach((btn) => {
  btn.addEventListener('click', () => {
    steamPaused = !steamPaused;
    syncSteamUI();
  });
});

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && !steamPaused && steamRafId === null) {
    steamRafId = requestAnimationFrame(renderSteamFrame);
  }
});

prefersReducedMotion.addEventListener('change', (e) => {
  steamPaused = e.matches;
  syncSteamUI();
});

syncSteamUI();

/* ==========================================================================
   4. SWIPE-TO-DISMISS MOBILE NAVIGATION DRAWER
   ========================================================================== */
const mobileDrawer = document.getElementById('mobile-drawer');
const drawerOpenBtn = document.getElementById('drawer-open');
const drawerCloseBtn = document.getElementById('drawer-close');
const drawerScroller = mobileDrawer?.querySelector('.mobile-drawer__scroller');
const drawerSheet = mobileDrawer?.querySelector('.mobile-drawer__sheet');

if (mobileDrawer && drawerOpenBtn && drawerCloseBtn && drawerScroller && drawerSheet) {
  let pendingTargetHash = null;

  const openDrawer = async () => {
    if (mobileDrawer.open) return;
    mobileDrawer.showModal();

    if (!CSS.supports('scroll-initial-target', 'nearest')) {
      drawerScroller.scrollTo({ left: drawerScroller.offsetWidth, behavior: 'instant' });
      await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve))
      );
    }

    drawerScroller.scrollTo({ left: 0, behavior: 'auto' });
  };

  const closeDrawer = () => {
    if (!mobileDrawer.open) return;
    drawerScroller.scrollTo({ left: drawerScroller.offsetWidth, behavior: 'auto' });
  };

  const onDrawerOpened = () => {
    drawerOpenBtn.setAttribute('aria-expanded', 'true');
  };

  const onDrawerClosed = () => {
    if (!mobileDrawer.open) return;
    mobileDrawer.close();
    drawerOpenBtn.setAttribute('aria-expanded', 'false');

    if (pendingTargetHash) {
      const target = document.querySelector(pendingTargetHash);
      pendingTargetHash = null;
      if (target) {
        target.scrollIntoView({ behavior: prefersReducedMotion.matches ? 'auto' : 'smooth' });
      }
    }
  };

  const visibleThreshold = 1 / Math.max(1, window.innerWidth);
  const drawerObserver = new IntersectionObserver(
    (entries) => {
      const entry = entries[entries.length - 1];
      if (!entry || !mobileDrawer.open) return;
      if (entry.intersectionRatio < visibleThreshold) onDrawerClosed();
      if (entry.intersectionRatio >= 0.99) onDrawerOpened();
    },
    { root: mobileDrawer, threshold: [visibleThreshold, 0.99] }
  );
  drawerObserver.observe(drawerSheet);

  if (!CSS.supports('animation-timeline: scroll()')) {
    drawerScroller.addEventListener(
      'scroll',
      () => {
        const ratio = Math.max(0, Math.min(1, 1 - drawerScroller.scrollLeft / Math.max(1, drawerSheet.offsetWidth)));
        mobileDrawer.style.setProperty('--drawer-backdrop', ratio.toFixed(3));
      },
      { passive: true }
    );
  }

  drawerOpenBtn.addEventListener('click', openDrawer);
  drawerCloseBtn.addEventListener('click', closeDrawer);

  mobileDrawer.addEventListener('click', (event) => {
    if (!drawerSheet.contains(event.target)) closeDrawer();
  });

  mobileDrawer.addEventListener('cancel', (event) => {
    if (event.cancelable) {
      event.preventDefault();
      closeDrawer();
    }
  });

  mobileDrawer.querySelectorAll('[data-drawer-link]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      pendingTargetHash = link.getAttribute('href');
      closeDrawer();
    });
  });
}

/* ==========================================================================
   5. MENU CATEGORY FILTERING
   ========================================================================== */
const menuTabs = Array.from(document.querySelectorAll('.menu-tab'));
const menuEntries = Array.from(document.querySelectorAll('.menu-entry'));

menuTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    const filter = tab.dataset.filter;

    for (let i = 0; i < menuTabs.length; i++) {
      const active = menuTabs[i] === tab;
      menuTabs[i].classList.toggle('is-active', active);
      menuTabs[i].setAttribute('aria-selected', String(active));
    }

    for (let i = 0; i < menuEntries.length; i++) {
      const cat = menuEntries[i].dataset.category;
      menuEntries[i].hidden = filter !== 'all' && cat !== filter;
    }
  });
});

/* ==========================================================================
   6. NATIVE <dialog> VISIT / CALL MODAL + CLOSED-BY FALLBACK
   ========================================================================== */
const visitDialog = document.getElementById('visit-dialog');
const openVisitButtons = document.querySelectorAll('[data-open-visit]');

openVisitButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    if (visitDialog && !visitDialog.open) {
      visitDialog.showModal();
    }
  });
});

visitDialog?.addEventListener('close', () => {
  visitDialog.returnValue = '';
});

if (visitDialog && !('closedBy' in HTMLDialogElement.prototype)) {
  const isOutsideDialog = (e, dialog) => {
    const r = dialog.getBoundingClientRect();
    return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
  };
  let pressedOutside = false;
  visitDialog.addEventListener('pointerdown', (e) => {
    pressedOutside = isOutsideDialog(e, visitDialog);
  });
  visitDialog.addEventListener('pointerup', (e) => {
    if (pressedOutside && isOutsideDialog(e, visitDialog)) {
      visitDialog.close();
    }
  });
}

/* ==========================================================================
   7. COPY ADDRESS WITH ACCESSIBLE TOAST
   ========================================================================== */
const copyAddressBtn = document.getElementById('copy-address-btn');
const toastEl = document.getElementById('toast');
let toastTimer = null;

function showToast(message) {
  toastEl.textContent = message;
  toastEl.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.hidden = true;
  }, 2600);
}

copyAddressBtn?.addEventListener('click', async () => {
  const addressText = document.getElementById('restaurant-address').textContent.trim();
  try {
    await navigator.clipboard.writeText(addressText);
    showToast('Address copied to clipboard');
  } catch {
    showToast('PRATAPPUR MORE, near MAYURPANKHI GHAT, Chinsurah');
  }
});
