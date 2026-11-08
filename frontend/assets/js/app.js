const AppRouter = {
  rootElement: null,

  init() {
    this.rootElement = document.getElementById('app-root');
    this.loadView('login');
  },

 async loadView(viewName) {
        // 1. Validar qué vistas están permitidas cargar
        const allowedViews = ['login', 'login_staff', 'dashboard', 'perfil_usuario'];
        if (!allowedViews.includes(viewName)) return;

        try {
            const response = await fetch(`views/${viewName}.html`, { cache: 'no-cache' });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            // Inyectar el HTML en el contenedor principal
            this.rootElement.innerHTML = await response.text();

            // 2. Inicializar el controlador correspondiente según la vista cargada
            if (viewName === 'login' && typeof LoginController !== 'undefined') {
                LoginController.init();
            }
            if (viewName === 'login_staff' && typeof StaffLoginController !== 'undefined') {
                StaffLoginController.init();
            }
            if (viewName === 'dashboard' && typeof DashboardController !== 'undefined') {
                DashboardController.init();
            }
            if (viewName === 'perfil_usuario' && typeof PerfilUsuarioController !== 'undefined') {
                PerfilUsuarioController.init();
            }

        } catch (error) {
            console.error('Error cargando la vista:', error);
            this.rootElement.innerHTML = `<p style="padding:40px;text-align:center;color:#a90d32;">Error cargando la vista. Usa Live Server o XAMPP.</p>`;
        }
    },

    // Agregar función para cerrar sesión
    // Agregar esta función dentro del objeto AppRouter en app.js
    logout() {
        if(confirm('¿Estás seguro que deseas cerrar tu sesión?')) {
            // Aquí en el futuro se limpiará el sessionStorage o cookies
            console.log("Sesión cerrada.");
            this.loadView('login');
        }
    }
};

document.addEventListener('DOMContentLoaded', () => AppRouter.init());
