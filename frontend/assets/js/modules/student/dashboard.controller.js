/* Dashboard del estudiante: muestra datos de sesión y próxima reserva. */
window.StudentDashboardController = {
  async init() {
    this.bindNavigation();
    this.bindWidgets();
    const user = SessionStore.getUser();
    if (user) this.paintUser(user);
    try {
      const response = await ApiClient.get('student.dashboard');
      SessionStore.setUser(response.user);
      this.paintUser(response.user);
      this.paintNextAppointment(response.proxima_cita);
    } catch (error) {
      if (error.status === 401) AppRouter.logout(false);
      else AppUtils.toast(error.message, 'error');
    }
  },

  paintUser(user) {
    const fullName = SessionStore.fullName(user);
    const firstName = user.nombres || 'Estudiante';
    const name = document.getElementById('dashUserName');
    const initials = document.getElementById('dashUserAvatar');
    const role = document.getElementById('dashUserRole');
    const welcome = document.getElementById('dashWelcomeTitle');
    if (name) name.innerHTML = `${AppUtils.escapeHTML(fullName)}<i class="ri-arrow-down-s-line"></i>`;
    if (initials) initials.textContent = SessionStore.initials(user);
    if (role) role.textContent = user.rol || 'Estudiante';
    if (welcome) welcome.textContent = `¡Hola, ${firstName}!`;
  },

  paintNextAppointment(appointment) {
    const service = document.getElementById('nextService');
    const date = document.getElementById('nextDate');
    const time = document.getElementById('nextTime');
    const office = document.getElementById('nextOffice');
    if (!appointment) {
      if (service) service.textContent = 'Aún no tienes una cita próxima';
      if (date) date.textContent = 'Sin reserva';
      if (time) time.textContent = '—';
      if (office) office.textContent = 'Reserva un turno para ver sus detalles.';
      return;
    }
    if (service) service.textContent = appointment.servicio;
    if (date) date.textContent = AppUtils.formatDate(appointment.fecha);
    if (time) time.textContent = AppUtils.formatTime(appointment.hora_inicio);
    if (office) office.textContent = `${appointment.consultorio} · ${appointment.medico || 'Personal médico UNS'}`;
  },

  bindNavigation() {
    document.querySelectorAll('[data-route]').forEach(element => {
      element.addEventListener('click', event => {
        event.preventDefault();
        const route = element.dataset.route;
        if (route) AppRouter.loadView(route);
      });
    });
    document.querySelector('[data-action="logout"]')?.addEventListener('click', event => {
      event.preventDefault();
      AppRouter.logout();
    });
  },

  bindWidgets() {
    document.querySelector('.topbar-btn.notifications')?.addEventListener('click', () => {
      AppUtils.toast('Aquí se mostrarán los avisos y recordatorios de tus reservas.', 'info');
    });
    document.querySelector('.search-wrapper input')?.addEventListener('keydown', event => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      const query = event.currentTarget.value.trim();
      if (query) {
        AppRouter.loadView('nuevo_turno');
      }
    });
    document.querySelector('[data-action="faq"]')?.addEventListener('click', () => {
      AppUtils.toast('Para consultas sobre citas, contacta con Bienestar Universitario de la UNS.', 'info');
    });
  }
};
