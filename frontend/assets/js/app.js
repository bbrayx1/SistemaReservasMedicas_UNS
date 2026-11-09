const AppRouter = {
    rootElement: null,

    init() {
        this.rootElement = document.getElementById('app-root');
        this.loadView('login');
    },

    async loadView(viewName) {
        /*1. Validar qué vistas están permitidas cargar

        version anterior---------------------
        const allowedViews = ['login', 'login_staff', 'dashboard', 'perfil_usuario', 'personal/dashboard_admin', 'personal/dashboard_recepcion'];
        */

        //nueva version (8/11 10pm)-------------
        const allowedViews = ['login', 'login_staff', 'dashboard', 'perfil_usuario', 'nuevo_turno', 'mis_reservas', 'personal/dashboard_admin', 'personal/dashboard_recepcion'];

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

            //AGREGADOS (8/11 10pm)---------------------
            if (viewName === 'nuevo_turno' && typeof NuevoTurnoController !== 'undefined') {
                NuevoTurnoController.init();
            }
            if (viewName === 'mis_reservas' && typeof MisReservasController !== 'undefined') {
                MisReservasController.init();
            }
            //-------------------------------

            // 3. Inicializar gráficos si la vista es el dashboard del admin
            if (viewName === 'personal/dashboard_admin') {
                // Pequeño retardo para asegurar que el DOM ya inyectó los canvas
                setTimeout(() => {
                    const ctxMes = document.getElementById('citasMesChart');
                    const ctxEsp = document.getElementById('especialidadesChart');

                    if (ctxMes) {
                        new Chart(ctxMes, {
                            type: 'bar',
                            data: {
                                labels: ['Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
                                datasets: [{
                                    label: 'Pacientes Atendidos',
                                    data: [420, 510, 480, 600, 750, 680],
                                    backgroundColor: '#a90d32',
                                    borderRadius: 5
                                }]
                            },
                            options: { responsive: true, maintainAspectRatio: false }
                        });
                    }

                    if (ctxEsp) {
                        new Chart(ctxEsp, {
                            type: 'doughnut',
                            data: {
                                labels: ['Med. General', 'Odontología', 'Psicología', 'Nutrición'],
                                datasets: [{
                                    data: [45, 25, 20, 10],
                                    backgroundColor: ['#a90d32', '#36A2EB', '#FFCE56', '#4BC0C0'],
                                    borderWidth: 0
                                }]
                            },
                            options: { responsive: true, maintainAspectRatio: false }
                        });
                    }
                }, 100);
            }

        } catch (error) {
            console.error('Error cargando la vista:', error);
            this.rootElement.innerHTML = `<p style="padding:40px;text-align:center;color:#a90d32;">Error cargando la vista. Usa Live Server o XAMPP.</p>`;
        }
    },

    // Función para cerrar sesión
    logout() {
        if (confirm('¿Estás seguro que deseas cerrar tu sesión?')) {
            console.log("Sesión cerrada.");
            this.loadView('login');
        }
    }
};

document.addEventListener('DOMContentLoaded', () => AppRouter.init());

// Validar login del personal e inyectar vistas dinámicamente
document.addEventListener('submit', (e) => {
    if (e.target && e.target.id === 'staffLoginForm') {
        e.preventDefault();

        const usuario = document.getElementById('staffId').value.toLowerCase().trim();
        const feedbackMsg = document.getElementById('staffFeedbackMsg');
        const btnSubmit = document.getElementById('btnStaffSubmit');

        feedbackMsg.textContent = '';

        if (usuario === 'admin') {
            feedbackMsg.textContent = 'Credenciales validadas. Ingresando...';
            feedbackMsg.style.color = '#28a745';
            btnSubmit.disabled = true;

            setTimeout(() => {
                // Usamos el enrutador en lugar de recargar la página
                AppRouter.loadView('personal/dashboard_admin');
            }, 1000);

        } else if (usuario === 'recepcion' || usuario === 'recepción') {
            feedbackMsg.textContent = 'Credenciales validadas. Ingresando...';
            feedbackMsg.style.color = '#28a745';
            btnSubmit.disabled = true;

            setTimeout(() => {
                AppRouter.loadView('personal/dashboard_recepcion');
            }, 1000);

        } else {
            feedbackMsg.textContent = 'Usuario no válido. Prueba escribiendo "admin" o "recepcion".';
            feedbackMsg.style.color = '#ff4d4f';

            // Rehabilitar el botón si hubo error para que pueda volver a intentar
            btnSubmit.disabled = false;
        }
    }
});