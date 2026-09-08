/* ============================================
   ECOFICINA — Main Application Logic
   ============================================ */

import Chart from 'chart.js/auto';
import L from 'leaflet';

// ---- Data ----
const CATALOG_ITEMS = [
  { name: 'Coletor de Admissão', category: 'motor', icon: '⚙️', priceNew: 1200, priceEco: 680, materials: ['Nylon CF', 'ABS Reforçado'] },
  { name: 'Suporte do Alternador', category: 'motor', icon: '🔧', priceNew: 580, priceEco: 280, materials: ['ABS Reforçado', 'PETG'] },
  { name: 'Tampa do Reservatório', category: 'motor', icon: '🔩', priceNew: 210, priceEco: 95, materials: ['PLA+', 'PETG'] },
  { name: 'Guia do Câmbio', category: 'motor', icon: '⚡', priceNew: 950, priceEco: 510, materials: ['Nylon CF'] },
  { name: 'Coxim do Motor', category: 'suspensao', icon: '🛞', priceNew: 780, priceEco: 350, materials: ['Nylon CF', 'TPU'] },
  { name: 'Bucha da Bandeja', category: 'suspensao', icon: '🔄', priceNew: 320, priceEco: 140, materials: ['PETG', 'TPU'] },
  { name: 'Batente do Amortecedor', category: 'suspensao', icon: '🛡️', priceNew: 180, priceEco: 75, materials: ['TPU'] },
  { name: 'Painel do Porta-Luvas', category: 'interior', icon: '📦', priceNew: 650, priceEco: 290, materials: ['ABS Reforçado', 'PLA+'] },
  { name: 'Moldura do Ar Condicionado', category: 'interior', icon: '❄️', priceNew: 420, priceEco: 180, materials: ['ABS Reforçado'] },
  { name: 'Suporte do Retrovisor', category: 'carroceria', icon: '🪞', priceNew: 380, priceEco: 160, materials: ['Nylon CF', 'PETG'] },
  { name: 'Grade Frontal', category: 'carroceria', icon: '🚗', priceNew: 890, priceEco: 420, materials: ['ABS Reforçado'] },
  { name: 'Para-lama Interno', category: 'carroceria', icon: '🛡️', priceNew: 560, priceEco: 245, materials: ['PETG', 'PLA+'] },
];

const WORKSHOPS = [
  { name: 'EcoAuto SP', address: 'Av. Paulista, 1578 — São Paulo', distance: '2.3 km', rating: 4.9, reviews: 127, printers: 3, lat: -23.5615, lng: -46.6559 },
  { name: 'Print3D Garage', address: 'R. Augusta, 2045 — São Paulo', distance: '4.1 km', rating: 4.7, reviews: 89, printers: 2, lat: -23.5540, lng: -46.6620 },
  { name: 'GreenMech', address: 'R. Consolação, 930 — São Paulo', distance: '5.7 km', rating: 4.8, reviews: 156, printers: 4, lat: -23.5480, lng: -46.6530 },
  { name: 'ReNew Parts', address: 'Av. Brigadeiro, 3200 — São Paulo', distance: '8.2 km', rating: 4.6, reviews: 64, printers: 2, lat: -23.5710, lng: -46.6470 },
  { name: 'EcoMec 3D', address: 'R. Vergueiro, 1200 — São Paulo', distance: '6.5 km', rating: 4.5, reviews: 45, printers: 1, lat: -23.5750, lng: -46.6380 },
];

// ---- Navigation ----
window.navigateTo = function(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(`page-${page}`);
  if (target) {
    target.classList.add('active');
    window.scrollTo(0, 0);

    // Initialize maps after page is visible
    if (page === 'dashboard') {
      setTimeout(() => {
        initDashMap();
      }, 200);
    }
  }
};

// ---- Sidebar Navigation ----
function initSidebarNav() {
  // User dashboard sidebar
  document.querySelectorAll('#sidebar-user .sidebar__link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const section = link.dataset.section;
      if (!section) return;

      // Update active link
      document.querySelectorAll('#sidebar-user .sidebar__link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      // Show section
      document.querySelectorAll('#page-dashboard .dash-section').forEach(s => s.classList.remove('active'));
      const target = document.getElementById(section);
      if (target) target.classList.add('active');

      // Update title
      const title = document.getElementById('topbar-title');
      if (title) title.textContent = link.textContent.trim();

      // Initialize section-specific content
      if (section === 'dash-catalog') populateDashCatalog();
      if (section === 'dash-map') setTimeout(initDashMap, 200);
      if (section === 'dash-impact') initImpactEvolutionChart();
    });
  });

  // Oficina sidebar
  document.querySelectorAll('#sidebar-oficina .sidebar__link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const section = link.dataset.section;
      if (!section) return;

      document.querySelectorAll('#sidebar-oficina .sidebar__link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      document.querySelectorAll('#page-oficina .dash-section').forEach(s => s.classList.remove('active'));
      const target = document.getElementById(section);
      if (target) target.classList.add('active');

      const title = document.getElementById('topbar-title-ofc');
      if (title) title.textContent = link.textContent.trim();

      if (section === 'ofc-reports') initReportCharts();
    });
  });

  // Mobile sidebar toggles
  const toggleUser = document.getElementById('toggle-sidebar-user');
  const toggleOfc = document.getElementById('toggle-sidebar-oficina');
  const sidebarUser = document.getElementById('sidebar-user');
  const sidebarOfc = document.getElementById('sidebar-oficina');

  if (toggleUser && sidebarUser) {
    toggleUser.addEventListener('click', () => sidebarUser.classList.toggle('open'));
  }
  if (toggleOfc && sidebarOfc) {
    toggleOfc.addEventListener('click', () => sidebarOfc.classList.toggle('open'));
  }

  // Mobile nav hamburger toggle
  const hamburger = document.getElementById('nav-hamburger');
  const navLinks = document.getElementById('nav-links');
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      navLinks.classList.toggle('open');
    });
    navLinks.querySelectorAll('.nav__link').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
      });
    });
  }
}

// ---- Particles ----
function createParticles() {
  const container = document.getElementById('hero-particles');
  if (!container) return;

  for (let i = 0; i < 40; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.animationDelay = `${Math.random() * 8}s`;
    particle.style.animationDuration = `${6 + Math.random() * 6}s`;
    particle.style.width = `${2 + Math.random() * 4}px`;
    particle.style.height = particle.style.width;
    container.appendChild(particle);
  }
}

// ---- Count Up Animation ----
function animateCountUp(el) {
  const target = parseInt(el.dataset.count);
  const duration = 2000;
  const start = performance.now();

  function update(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.floor(eased * target);

    if (target >= 1000000) {
      el.textContent = (current / 1000000).toFixed(1) + 'M';
    } else if (target >= 1000) {
      el.textContent = (current / 1000).toFixed(1) + 'k';
    } else {
      el.textContent = current.toLocaleString('pt-BR');
    }

    if (progress < 1) requestAnimationFrame(update);
  }

  requestAnimationFrame(update);
}

// ---- Intersection Observer for Animations ----
function initObservers() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // Animate count-ups
        entry.target.querySelectorAll('[data-count]').forEach(el => animateCountUp(el));
        // Animate fill bars
        entry.target.querySelectorAll('.impact-card__fill').forEach(el => el.classList.add('animate'));
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });

  document.querySelectorAll('#impacto, .hero__stats').forEach(el => observer.observe(el));
}

// ---- Scrolled Nav ----
function initScrollNav() {
  const nav = document.getElementById('main-nav');
  if (!nav) return;
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 50);
  });
}

// ---- Populate Catalogs ----
function createCatalogCard(item) {
  const savings = Math.round((1 - item.priceEco / item.priceNew) * 100);
  return `
    <div class="catalog-card" data-category="${item.category}">
      <div class="catalog-card__image">${item.icon}</div>
      <div class="catalog-card__body">
        <span class="catalog-card__category">${item.category}</span>
        <h3 class="catalog-card__name">${item.name}</h3>
        <div class="catalog-card__prices">
          <span class="price-new">R$ ${item.priceNew}</span>
          <span class="price-eco">R$ ${item.priceEco}</span>
          <span class="price-save">-${savings}%</span>
        </div>
        <div class="catalog-card__materials">
          ${item.materials.map(m => `<span class="material-tag">${m}</span>`).join('')}
        </div>
      </div>
    </div>
  `;
}

function populateCatalog() {
  const grid = document.getElementById('catalog-grid');
  if (!grid) return;
  grid.innerHTML = CATALOG_ITEMS.slice(0, 8).map(createCatalogCard).join('');
}

function populateDashCatalog() {
  const grid = document.getElementById('dash-catalog-grid');
  if (!grid) return;
  grid.innerHTML = CATALOG_ITEMS.map(createCatalogCard).join('');
}

// ---- Catalog Filters ----
function initCatalogFilters() {
  document.querySelectorAll('.catalog-filters, .catalog-filters-dash, .filter-group').forEach(container => {
    container.addEventListener('click', (e) => {
      const btn = e.target.closest('.filter-btn');
      if (!btn) return;

      container.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.dataset.filter;
      const grid = container.closest('.section, .dash-section, .dash-panel')?.querySelector('.catalog-grid, .catalog-grid-dash');
      if (!grid) return;

      grid.querySelectorAll('.catalog-card').forEach(card => {
        if (filter === 'all' || card.dataset.category === filter) {
          card.style.display = '';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });
}

// ---- Populate Workshops ----
function populateWorkshops() {
  const list = document.getElementById('workshop-list');
  if (!list) return;

  list.innerHTML = WORKSHOPS.map((w, i) => `
    <div class="workshop-item${i === 0 ? ' active' : ''}" data-lat="${w.lat}" data-lng="${w.lng}">
      <div class="workshop-item__name">${w.name}</div>
      <div class="workshop-item__address">${w.address}</div>
      <div class="workshop-item__meta">
        <span class="workshop-item__rating">⭐ ${w.rating} (${w.reviews})</span>
        <span>📍 ${w.distance}</span>
        <span>🖨️ ${w.printers} impressoras</span>
      </div>
    </div>
  `).join('');
}

// ---- Maps ----
let landingMap = null;
let dashMap = null;

function initLandingMap() {
  const el = document.getElementById('landing-map');
  if (!el || landingMap) return;

  landingMap = L.map('landing-map').setView([-23.5615, -46.6559], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
  }).addTo(landingMap);

  WORKSHOPS.forEach(w => {
    L.marker([w.lat, w.lng]).addTo(landingMap)
      .bindPopup(`<strong>${w.name}</strong><br>${w.address}<br>⭐ ${w.rating}`);
  });
}

function initDashMap() {
  const el = document.getElementById('dash-map-view');
  if (!el || dashMap) return;

  dashMap = L.map('dash-map-view').setView([-23.5615, -46.6559], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
  }).addTo(dashMap);

  WORKSHOPS.forEach(w => {
    L.marker([w.lat, w.lng]).addTo(dashMap)
      .bindPopup(`<strong>${w.name}</strong><br>${w.address}<br>⭐ ${w.rating}<br>🖨️ ${w.printers} impressoras`);
  });
}

// ---- Charts ----
const chartDefaults = {
  color: '#A0A0B0',
  borderColor: 'rgba(255,255,255,0.06)',
  font: { family: 'Inter' }
};

Chart.defaults.color = chartDefaults.color;
Chart.defaults.borderColor = chartDefaults.borderColor;
Chart.defaults.font.family = chartDefaults.font.family;

function initImpactChart() {
  const ctx = document.getElementById('impact-chart');
  if (!ctx) return;

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set'],
      datasets: [
        {
          label: 'CO₂ Evitado (kg)',
          data: [5.2, 7.8, 6.1, 9.4, 8.3, 10.4],
          backgroundColor: 'rgba(0, 230, 118, 0.6)',
          borderRadius: 6,
          barThickness: 20,
        },
        {
          label: 'Economia (R$ x100)',
          data: [2.1, 3.5, 2.8, 4.2, 3.9, 5.1],
          backgroundColor: 'rgba(66, 165, 245, 0.6)',
          borderRadius: 6,
          barThickness: 20,
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'top', labels: { usePointStyle: true, pointStyle: 'circle' } },
      },
      scales: {
        y: { grid: { color: 'rgba(255,255,255,0.04)' } },
        x: { grid: { display: false } },
      }
    }
  });
}

function initRevenueChart() {
  const ctx = document.getElementById('revenue-chart');
  if (!ctx) return;

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set'],
      datasets: [{
        label: 'Faturamento (R$ mil)',
        data: [8.2, 10.5, 12.1, 14.8, 16.3, 18.4],
        borderColor: '#00E676',
        backgroundColor: 'rgba(0, 230, 118, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#00E676',
        pointRadius: 5,
        pointHoverRadius: 8,
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
      },
      scales: {
        y: { grid: { color: 'rgba(255,255,255,0.04)' } },
        x: { grid: { display: false } },
      }
    }
  });
}

function initImpactEvolutionChart() {
  const ctx = document.getElementById('impact-evolution-chart');
  if (!ctx) return;
  if (ctx._chartInstance) return;

  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set'],
      datasets: [
        {
          label: 'CO₂ Evitado (kg)',
          data: [2.1, 3.5, 4.8, 5.2, 7.8, 6.1, 9.4, 8.3, 10.4],
          borderColor: '#00E676',
          backgroundColor: 'rgba(0, 230, 118, 0.08)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
        },
        {
          label: 'Resíduos Evitados (kg)',
          data: [1.2, 2.1, 2.8, 3.1, 4.5, 3.8, 5.2, 4.9, 6.2],
          borderColor: '#42A5F5',
          backgroundColor: 'rgba(66, 165, 245, 0.08)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'top', labels: { usePointStyle: true, pointStyle: 'circle' } },
      },
      scales: {
        y: { grid: { color: 'rgba(255,255,255,0.04)' } },
        x: { grid: { display: false } },
      }
    }
  });
  ctx._chartInstance = chart;
}

function initReportCharts() {
  // Category Chart
  const catCtx = document.getElementById('category-chart');
  if (catCtx && !catCtx._chartInstance) {
    const chart = new Chart(catCtx, {
      type: 'doughnut',
      data: {
        labels: ['Motor', 'Suspensão', 'Interior', 'Carroceria'],
        datasets: [{
          data: [42, 25, 18, 15],
          backgroundColor: ['#00E676', '#42A5F5', '#AB47BC', '#FFA726'],
          borderWidth: 0,
          spacing: 4,
          borderRadius: 6,
        }]
      },
      options: {
        responsive: true,
        cutout: '65%',
        plugins: {
          legend: { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', padding: 20 } },
        }
      }
    });
    catCtx._chartInstance = chart;
  }

  // OFC Impact Chart
  const impCtx = document.getElementById('ofc-impact-chart');
  if (impCtx && !impCtx._chartInstance) {
    const chart = new Chart(impCtx, {
      type: 'bar',
      data: {
        labels: ['Jun', 'Jul', 'Ago', 'Set'],
        datasets: [{
          label: 'CO₂ Evitado (kg)',
          data: [210, 265, 290, 312],
          backgroundColor: 'rgba(0, 230, 118, 0.6)',
          borderRadius: 8,
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { grid: { color: 'rgba(255,255,255,0.04)' } },
          x: { grid: { display: false } },
        }
      }
    });
    impCtx._chartInstance = chart;
  }
}

// ---- Schedule Form ----
function initScheduleForm() {
  const form = document.getElementById('schedule-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    showToast('Agendamento realizado com sucesso! 🎉');

    // Add to list
    const list = document.getElementById('schedule-list');
    if (list) {
      const dateInput = document.getElementById('sched-date');
      const part = document.getElementById('sched-part');
      const workshop = document.getElementById('sched-workshop');
      const time = document.getElementById('sched-time');

      const date = new Date(dateInput.value + 'T12:00:00');
      const day = date.getDate();
      const months = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
      const month = months[date.getMonth()];

      const item = document.createElement('div');
      item.className = 'schedule-item';
      item.style.animation = 'fadeInUp 0.4s var(--ease-out)';
      item.innerHTML = `
        <div class="schedule-item__date">
          <span class="day">${day}</span>
          <span class="month">${month}</span>
        </div>
        <div class="schedule-item__info">
          <span class="schedule-item__title">${part.value}</span>
          <span class="schedule-item__detail">${workshop.value.split('—')[0].trim()} • ${time.value}</span>
        </div>
        <span class="status-badge status--scheduled">Agendado</span>
      `;
      list.prepend(item);
    }
  });
}

// ---- Toast ----
function showToast(message) {
  const toast = document.getElementById('toast');
  const msg = document.getElementById('toast-message');
  if (!toast || !msg) return;

  msg.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3500);
}

// ---- Landing Map Observer ----
function initMapObserver() {
  const mapSection = document.getElementById('oficinas');
  if (!mapSection) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        initLandingMap();
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  observer.observe(mapSection);
}

// ---- Hero Video Sequence Loop ----
function initHeroVideos() {
  const videos = Array.from(document.querySelectorAll('.hero__video'));
  if (videos.length === 0) return;

  let currentIndex = 0;
  let isTransitioning = false;

  videos.forEach(vid => {
    vid.muted = true;
  });

  function switchVideo() {
    if (isTransitioning) return;
    isTransitioning = true;

    const nextIndex = (currentIndex + 1) % videos.length;
    const currentVideo = videos[currentIndex];
    const nextVideo = videos[nextIndex];

    nextVideo.currentTime = 0;
    const playPromise = nextVideo.play();

    const finishSwitch = () => {
      nextVideo.classList.add('active');
      currentVideo.classList.remove('active');
      currentIndex = nextIndex;
      setTimeout(() => {
        isTransitioning = false;
      }, 1200);
    };

    if (playPromise !== undefined) {
      playPromise.then(finishSwitch).catch((err) => {
        console.warn('Playback error:', err);
        finishSwitch();
      });
    } else {
      finishSwitch();
    }
  }

  // End event listener and timeupdate fallback on all videos
  videos.forEach((vid) => {
    vid.addEventListener('ended', switchVideo);
    vid.addEventListener('timeupdate', () => {
      if (vid.duration && vid.currentTime >= vid.duration - 0.4) {
        if (!isTransitioning && vid.classList.contains('active')) {
          switchVideo();
        }
      }
    });
  });

  // Tab visibility handling
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      const activeVideo = videos[currentIndex];
      if (activeVideo && activeVideo.paused) {
        activeVideo.play().catch(() => {});
      }
    }
  });

  // Start playing the first video
  if (videos[0]) {
    videos[0].play().catch((err) => {
      console.log('Video autoplay prevented, will play on user interaction:', err);
      const unlockAutoplay = () => {
        videos[0].play().catch(() => {});
        window.removeEventListener('click', unlockAutoplay);
        window.removeEventListener('touchstart', unlockAutoplay);
      };
      window.addEventListener('click', unlockAutoplay, { once: true });
      window.addEventListener('touchstart', unlockAutoplay, { once: true });
    });
  }
}

// ---- Init ----
function startApp() {
  initHeroVideos();
  initScrollNav();
  initSidebarNav();
  initObservers();
  populateCatalog();
  populateDashCatalog();
  populateWorkshops();
  initCatalogFilters();
  initImpactChart();
  initRevenueChart();
  initScheduleForm();
  initMapObserver();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
}
