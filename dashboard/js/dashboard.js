/* ============================================================
   1688→쿠팡 소싱 트래커 대시보드 JS
   ============================================================ */

document.addEventListener('DOMContentLoaded', function() {
  initSidebar();
  initPeriodTabs();
  initCategoryCards();
  initTableFilters();
  initCharts();
  updateLastUpdated();
});

/* ----------------------------------------------------------
   Sidebar
   ---------------------------------------------------------- */
function initSidebar() {
  var menuBtn = document.getElementById('mobileMenuBtn');
  var sidebar = document.getElementById('sidebar');
  var overlay = document.getElementById('sidebarOverlay');

  if (menuBtn) {
    menuBtn.addEventListener('click', function() {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('active');
    });
  }
  if (overlay) {
    overlay.addEventListener('click', function() {
      sidebar.classList.remove('open');
      overlay.classList.remove('active');
    });
  }

  var navLinks = document.querySelectorAll('.sidebar-link');
  navLinks.forEach(function(link) {
    link.addEventListener('click', function(e) {
      navLinks.forEach(function(l) { l.classList.remove('active'); });
      this.classList.add('active');
      if (window.innerWidth <= 1024) {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
      }
    });
  });
}

/* ----------------------------------------------------------
   Period Tabs (시간별/일별/주별/월별)
   ---------------------------------------------------------- */
function initPeriodTabs() {
  var tabs = document.querySelectorAll('.period-tab');
  tabs.forEach(function(tab) {
    tab.addEventListener('click', function() {
      tabs.forEach(function(t) { t.classList.remove('active'); });
      this.classList.add('active');
      var period = this.getAttribute('data-period');
      updateDashboardPeriod(period);
    });
  });
}

function updateDashboardPeriod(period) {
  var periodLabel = document.getElementById('periodLabel');
  var labels = { hourly:'시간별', daily:'일별', weekly:'주별', monthly:'월별' };
  if (periodLabel) periodLabel.textContent = labels[period] || period;

  if (window.mainTrendChart) {
    var data;
    if (period === 'hourly') {
      data = { labels: SAMPLE_DATA.hourlyData.labels, datasets: [
        { label:'검색량', data: SAMPLE_DATA.hourlyData.searches, borderColor:'#2563EB', backgroundColor:'rgba(37,99,235,0.08)', fill:true, tension:0.4 },
        { label:'판매량', data: SAMPLE_DATA.hourlyData.sales, borderColor:'#10B981', backgroundColor:'rgba(16,185,129,0.08)', fill:true, tension:0.4 }
      ]};
    } else if (period === 'monthly') {
      data = { labels: SAMPLE_DATA.monthlyData.labels, datasets: [
        { label:'수집 상품수', data: SAMPLE_DATA.monthlyData.totalProducts, borderColor:'#2563EB', backgroundColor:'rgba(37,99,235,0.08)', fill:true, tension:0.4 },
        { label:'평균 마진(%)', data: SAMPLE_DATA.monthlyData.avgMargin, borderColor:'#10B981', backgroundColor:'rgba(16,185,129,0.08)', fill:true, tension:0.4, yAxisID:'y1' }
      ]};
    } else {
      data = { labels: SAMPLE_DATA.trendHistory.labels, datasets: [
        { label:'수집 상품', data: SAMPLE_DATA.trendHistory.products, borderColor:'#2563EB', backgroundColor:'rgba(37,99,235,0.08)', fill:true, tension:0.4 },
        { label:'추천 상품', data: SAMPLE_DATA.trendHistory.recommended, borderColor:'#10B981', backgroundColor:'rgba(16,185,129,0.08)', fill:true, tension:0.4 }
      ]};
    }
    window.mainTrendChart.data = data;
    window.mainTrendChart.update();
  }
}

/* ----------------------------------------------------------
   Category Cards
   ---------------------------------------------------------- */
function initCategoryCards() {
  var cards = document.querySelectorAll('.category-card');
  cards.forEach(function(card) {
    card.addEventListener('click', function() {
      cards.forEach(function(c) { c.classList.remove('selected'); });
      this.classList.add('selected');
    });
  });
}

/* ----------------------------------------------------------
   Table Filters
   ---------------------------------------------------------- */
function initTableFilters() {
  var filterBtns = document.querySelectorAll('.table-filter-btn');
  filterBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      var group = this.closest('.table-filters');
      if (group) {
        group.querySelectorAll('.table-filter-btn').forEach(function(b) { b.classList.remove('active'); });
      }
      this.classList.add('active');
    });
  });

  var sortHeaders = document.querySelectorAll('.data-table thead th[data-sort]');
  sortHeaders.forEach(function(th) {
    th.addEventListener('click', function() {
      sortHeaders.forEach(function(h) { h.classList.remove('sorted'); });
      this.classList.add('sorted');
    });
  });
}

/* ----------------------------------------------------------
   Charts (Chart.js)
   ---------------------------------------------------------- */
function initCharts() {
  if (typeof Chart === 'undefined') return;

  Chart.defaults.font.family = "'Inter', sans-serif";
  Chart.defaults.font.size = 11;
  Chart.defaults.color = '#94A3B8';

  createMainTrendChart();
  createMarginChart();
  createCategoryMarginChart();
  createSalesChart();
  createSearchVolumeChart();
  createPriceCompareChart();
}

function createMainTrendChart() {
  var ctx = document.getElementById('mainTrendChart');
  if (!ctx) return;
  window.mainTrendChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: SAMPLE_DATA.trendHistory.labels,
      datasets: [
        { label:'수집 상품', data: SAMPLE_DATA.trendHistory.products, borderColor:'#2563EB', backgroundColor:'rgba(37,99,235,0.08)', fill:true, tension:0.4, borderWidth:2.5, pointRadius:4, pointBackgroundColor:'#2563EB' },
        { label:'추천 상품', data: SAMPLE_DATA.trendHistory.recommended, borderColor:'#10B981', backgroundColor:'rgba(16,185,129,0.08)', fill:true, tension:0.4, borderWidth:2.5, pointRadius:4, pointBackgroundColor:'#10B981' }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position:'top', align:'end', labels: { usePointStyle:true, pointStyle:'circle', padding:20, font:{size:11,weight:500} } } },
      scales: { x: { grid: { display:false } }, y: { grid: { color:'rgba(0,0,0,0.04)' }, beginAtZero:false } },
      interaction: { mode:'index', intersect:false }
    }
  });
}

function createMarginChart() {
  var ctx = document.getElementById('marginTrendChart');
  if (!ctx) return;
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: SAMPLE_DATA.trendHistory.labels,
      datasets: [{ label:'평균 마진율(%)', data: SAMPLE_DATA.trendHistory.margin, borderColor:'#06B6D4', backgroundColor:'rgba(6,182,212,0.1)', fill:true, tension:0.4, borderWidth:2.5, pointRadius:4, pointBackgroundColor:'#06B6D4' }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display:false } },
      scales: { x: { grid: { display:false } }, y: { grid: { color:'rgba(0,0,0,0.04)' }, min:30, max:50 } }
    }
  });
}

function createCategoryMarginChart() {
  var ctx = document.getElementById('categoryMarginChart');
  if (!ctx) return;
  var cats = SAMPLE_DATA.categories.sort(function(a,b) { return b.avgMargin - a.avgMargin; });
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: cats.map(function(c){return c.emoji+' '+c.name;}),
      datasets: [{
        label:'평균 마진율(%)',
        data: cats.map(function(c){return c.avgMargin;}),
        backgroundColor: cats.map(function(c){
          return c.avgMargin >= 45 ? 'rgba(16,185,129,0.7)' :
                 c.avgMargin >= 38 ? 'rgba(37,99,235,0.7)' :
                 'rgba(245,158,11,0.7)';
        }),
        borderRadius: 6,
        barThickness: 28
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, indexAxis:'y',
      plugins: { legend: { display:false } },
      scales: { x: { grid: { color:'rgba(0,0,0,0.04)' }, min:20, max:60 }, y: { grid: { display:false } } }
    }
  });
}

function createSalesChart() {
  var ctx = document.getElementById('salesRankChart');
  if (!ctx) return;
  var top5 = SAMPLE_DATA.topProducts.slice(0, 7);
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: top5.map(function(p){ return p.name.length > 12 ? p.name.substring(0,12)+'...' : p.name; }),
      datasets: [
        { label:'리뷰수', data: top5.map(function(p){return p.reviews;}), backgroundColor:'rgba(37,99,235,0.7)', borderRadius:6, barThickness:20 },
        { label:'7일 증가', data: top5.map(function(p){return parseInt(p.reviewTrend);}), backgroundColor:'rgba(16,185,129,0.7)', borderRadius:6, barThickness:20 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position:'top', align:'end', labels: { usePointStyle:true, pointStyle:'circle', padding:16, font:{size:11} } } },
      scales: { x: { grid: { display:false }, ticks: { font: { size:10 } } }, y: { grid: { color:'rgba(0,0,0,0.04)' } } }
    }
  });
}

function createSearchVolumeChart() {
  var ctx = document.getElementById('searchVolumeChart');
  if (!ctx) return;
  var top7 = SAMPLE_DATA.searchKeywords.slice(0, 7);
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: top7.map(function(k){return k.keyword;}),
      datasets: [{
        data: top7.map(function(k){return k.volume;}),
        backgroundColor: ['#2563EB','#06B6D4','#10B981','#F59E0B','#EC4899','#8B5CF6','#F97316'],
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      cutout: '60%',
      plugins: { legend: { position:'right', labels: { usePointStyle:true, pointStyle:'circle', padding:10, font:{size:11} } } }
    }
  });
}

function createPriceCompareChart() {
  var ctx = document.getElementById('priceCompareChart');
  if (!ctx) return;
  var items = SAMPLE_DATA.priceComparison;
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: items.map(function(i){return i.product;}),
      datasets: [
        { label:'1688 원가(원)', data: items.map(function(i){return i.price1688;}), backgroundColor:'rgba(255,106,0,0.7)', borderRadius:4, barThickness:16 },
        { label:'총 원가', data: items.map(function(i){return i.totalCost;}), backgroundColor:'rgba(245,158,11,0.7)', borderRadius:4, barThickness:16 },
        { label:'쿠팡 판매가', data: items.map(function(i){return i.coupangPrice;}), backgroundColor:'rgba(228,37,40,0.7)', borderRadius:4, barThickness:16 },
        { label:'순 마진', data: items.map(function(i){return i.margin;}), backgroundColor:'rgba(16,185,129,0.7)', borderRadius:4, barThickness:16 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position:'top', align:'end', labels: { usePointStyle:true, pointStyle:'circle', padding:12, font:{size:10} } } },
      scales: { x: { grid: { display:false } }, y: { grid: { color:'rgba(0,0,0,0.04)' }, ticks: { callback: function(v){return v.toLocaleString()+'원';} } } }
    }
  });
}

/* ----------------------------------------------------------
   Utilities
   ---------------------------------------------------------- */
function updateLastUpdated() {
  var el = document.getElementById('lastUpdated');
  if (el) {
    var d = new Date(SAMPLE_DATA.lastUpdated);
    el.textContent = d.getFullYear() + '-' +
      String(d.getMonth()+1).padStart(2,'0') + '-' +
      String(d.getDate()).padStart(2,'0') + ' ' +
      String(d.getHours()).padStart(2,'0') + ':' +
      String(d.getMinutes()).padStart(2,'0');
  }
}
