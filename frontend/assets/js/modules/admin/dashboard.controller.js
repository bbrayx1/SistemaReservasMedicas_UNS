/* Panel de administración: indicadores y gráficos consultados a MySQL. */
window.AdminDashboardController = {
  charts: [],
  async init() {
    document.querySelector('[data-action="logout"]')?.addEventListener('click', event => {
      event.preventDefault(); AppRouter.logout();
    });
    const user = SessionStore.getUser();
    const name = document.getElementById('adminUserName');
    if (name && user) name.textContent = SessionStore.fullName(user);
    document.querySelectorAll('[data-admin-section]').forEach(link => link.addEventListener('click', event => {
      event.preventDefault();
      const section = link.dataset.adminSection;
      if (section !== 'general') AppUtils.toast('Este apartado está preparado en la navegación, pero su módulo aún no está implementado.', 'info');
    }));

    try {
      const response = await ApiClient.get('admin.metrics');
      this.renderCharts(response.metricas);
    } catch (error) {
      AppUtils.toast(error.message, 'error');
    }
  },

  renderCharts(metrics) {
    if (!window.Chart) return;
    this.charts.forEach(chart => chart.destroy());
    this.charts = [];
    const monthly = metrics.mensual || [];
    const services = metrics.servicios || [];
    const monthCanvas = document.getElementById('citasMesChart');
    const serviceCanvas = document.getElementById('especialidadesChart');
    if (monthCanvas) {
      this.charts.push(new Chart(monthCanvas, {
        type: 'bar',
        data: {
          labels: monthly.map(item => item.periodo),
          datasets: [{ label: 'Reservas registradas', data: monthly.map(item => Number(item.total)), backgroundColor: '#a90d32', borderRadius: 6 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
      }));
    }
    if (serviceCanvas) {
      this.charts.push(new Chart(serviceCanvas, {
        type: 'doughnut',
        data: {
          labels: services.map(item => item.nombre),
          datasets: [{ data: services.map(item => Number(item.total)), backgroundColor: ['#a90d32', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'], borderWidth: 0 }]
        },
        options: { responsive: true, maintainAspectRatio: false }
      }));
    }
  }
};
