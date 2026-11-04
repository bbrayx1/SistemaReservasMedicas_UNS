const AppRouter = {
    rootElement: null,

    init() {
        this.rootElement = document.getElementById('app-root');
        
        // Al arrancar el sistema, verifica si hay sesión activa o muestra el Login
        const sesionGuardada = sessionStorage.getItem('uns_session_user');
        if (sesionGuardada) {
            const userData = JSON.parse(sesionGuardada);
            this.loadDashboardByRole(userData);
        } else {
            this.loadView('login');
        }
    },

    // Carga cualquier vista HTML dentro de #app-root en index.html
    async loadView(viewName) {
        try {
            const response = await fetch(`views/${viewName}.html`);
            if (!response.ok) throw new Error(`No se pudo cargar la vista: ${viewName}`);
            
            const htmlContent = await response.text();
            this.rootElement.innerHTML = htmlContent;

            // Inicializa los eventos específicos de la ventana cargada
            if (viewName === 'login' && typeof LoginController !== 'undefined') {
                LoginController.init();
            }
        } catch (error) {
            console.error(error);
            this.rootElement.innerHTML = `<p style="padding:40px; color:#c8102e;">Error cargando la vista <b>${viewName}</b>. Asegúrate de abrir el proyecto con Live Server o XAMPP.</p>`;
        }
    },

    // Esta función será llamada tras validar el Login para cargar el Dashboard según el Rol
    loadDashboardByRole(userData) {
        sessionStorage.setItem('uns_session_user', JSON.stringify(userData));

        // Por ahora sabemos a qué rol redirigir cuando creemos la vista del Dashboard en el siguiente paso:
        // Roles: 'ESTUDIANTE' | 'MEDICO' | 'RECEPCIONISTA' | 'ADMIN' | 'SUPERADMIN'
        console.log(`Sesión iniciada como [${userData.rol}] - Usuario: ${userData.identificador}`);
    },

    logout() {
        sessionStorage.removeItem('uns_session_user');
        this.loadView('login');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    AppRouter.init();
});