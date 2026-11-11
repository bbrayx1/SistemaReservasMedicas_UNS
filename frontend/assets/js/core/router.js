/* Router de vistas: carga fragmentos y delega la lógica al controlador de cada módulo. */
(() => {
  const routes = {
    login: () => window.LoginController?.init(),
    login_staff: () => window.StaffLoginController?.init(),
    dashboard: () => window.StudentDashboardController?.init(),
    nuevo_turno: () => window.BookingController?.init(),
    mis_reservas: () => window.ReservationsController?.init(),
    perfil_usuario: () => window.ProfileController?.init(),
    'personal/dashboard_staff': () => window.StaffDashboardController?.init(),
    'personal/dashboard_admin': () => window.AdminDashboardController?.init(),
    'personal/dashboard_recepcion': () => window.ReceptionDashboardController?.init()
  };

  const AppRouter = {
    root: null,
    activeView: null,
    async init() {
      this.root = document.getElementById('app-root');
      try {
        const response = await ApiClient.get('auth.me');
        SessionStore.setUser(response.user);
        await this.goToRoleHome(response.user);
      } catch (error) {
        SessionStore.clear();
        await this.loadView('login');
      }
    },
    async goToRoleHome(user) {
      if (user.rol === 'Médico') {
        return this.loadView('personal/dashboard_staff');
      }
      if (user.rol === 'Administrador') return this.loadView('personal/dashboard_staff');
      if (user.rol === 'Secretaria') return this.loadView('personal/dashboard_staff');
      return this.loadView('dashboard');
    },
    async loadView(viewName) {
      if (!Object.prototype.hasOwnProperty.call(routes, viewName)) return;
      try {
        const response = await fetch(`views/${viewName}.html`, { cache: 'no-store', credentials: 'same-origin' });
        if (!response.ok) throw new Error(`No se pudo cargar la vista (${response.status}).`);
        this.root.innerHTML = await response.text();
        this.activeView = viewName;
        window.scrollTo(0, 0);
        routes[viewName]();
      } catch (error) {
        console.error(error);
        this.root.innerHTML = '<section class="app-error"><h2>No se pudo cargar el módulo</h2><p>Comprueba que estás abriendo el proyecto desde Apache/XAMPP y vuelve a intentarlo.</p></section>';
      }
    },
    async logout(ask = true) {
      if (ask && !window.confirm('¿Estás seguro de que deseas cerrar tu sesión?')) return;
      try { await ApiClient.post('auth.logout', {}); } catch (error) { console.warn(error); }
      SessionStore.clear();
      ApiClient.clearCsrf();
      if (window.location.pathname.includes('/views/')) {
        window.location.href = '../index.html';
      } else {
        await this.loadView('login');
      }
    }
  };

  window.AppRouter = AppRouter;
  document.addEventListener('DOMContentLoaded', () => AppRouter.init());
})();
