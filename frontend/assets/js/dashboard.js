const DashboardController = {
    init() {
        this.initToastSystem();
        this.bindSidebar();
        this.bindTopbar();
        this.bindQuickActions();
        this.bindWidgets();
    },

    // 1. Barra Lateral (Sidebar)
    bindSidebar() {
        const navItems = document.querySelectorAll('.dash-nav .nav-item:not(.logout)');
        
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Actualizar estado visual
                document.querySelector('.dash-nav .nav-item.active')?.classList.remove('active');
                e.currentTarget.classList.add('active');
                
                // Extraer el nombre de la sección
                const sectionName = e.currentTarget.querySelector('span').textContent.trim();
                this.showToast(`Cargando módulo: ${sectionName}...`, 'info');
                
                // Aquí en el futuro llamaremos a: AppRouter.loadDashboardView(sectionName)
            });
        });
    },

    // 2. Barra Superior (Topbar)
    bindTopbar() {
        const searchInput = document.querySelector('.search-wrapper input');
        searchInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const query = e.target.value.trim();
                if (query) {
                    this.showToast(`Buscando resultados para: "${query}"`, 'success');
                    e.target.value = ''; // Limpiar buscador
                }
            }
        });

        const notifBtn = document.querySelector('.topbar-btn.notifications');
        notifBtn?.addEventListener('click', () => {
            this.showToast('Tienes 2 notificaciones nuevas de Bienestar Universitario.', 'info');
        });

        const profileMenu = document.querySelector('.user-profile-menu');
        profileMenu?.addEventListener('click', () => {
            this.showToast('Abriendo menú de configuración de perfil...', 'info');
        });
    },

    // 3. Tarjetas de Acciones Rápidas
    bindQuickActions() {
        const actionCards = document.querySelectorAll('.action-card');
        actionCards.forEach(card => {
            card.addEventListener('click', (e) => {
                const actionName = e.currentTarget.querySelector('strong').textContent.trim();
                
                // Si hace clic en "Nuevo Turno", simular clic en el menú lateral correspondiente
                this.syncSidebar(actionName);
                this.showToast(`Iniciando flujo: ${actionName}`, 'success');
            });
        });
    },

    // 4. Widgets, Enlaces y Botones menores
    bindWidgets() {
        // Enlaces "Ver todas", "Ver más"
        document.querySelectorAll('.view-all-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.showToast('Redirigiendo a la vista expandida...', 'info');
            });
        });

        // Botón "Ver Detalles" de Próxima Cita
        document.querySelector('.btn-outline-red')?.addEventListener('click', () => {
            this.showToast('Generando ticket de cita en PDF...', 'success');
        });

        // Píldoras del Carrusel de Servicios Médicos
        document.querySelectorAll('.service-pill').forEach(pill => {
            pill.addEventListener('click', (e) => {
                const service = e.currentTarget.querySelector('span').textContent.trim();
                this.showToast(`Consultando disponibilidad para ${service}...`, 'info');
            });
        });

        // Botón "Conocer más" del banner inferior
        document.querySelector('.btn-solid-red')?.addEventListener('click', () => {
            this.showToast('Abriendo portal de campañas de la UNS...', 'info');
        });
    },

    // Sincronizar clics de las tarjetas con la barra lateral
    syncSidebar(targetName) {
        const navItems = document.querySelectorAll('.dash-nav .nav-item:not(.logout)');
        navItems.forEach(item => {
            const span = item.querySelector('span');
            if (span && span.textContent.trim() === targetName) {
                document.querySelector('.dash-nav .nav-item.active')?.classList.remove('active');
                item.classList.add('active');
            }
        });
    },

    // =========================================================================
    // SISTEMA DE NOTIFICACIONES TOAST (UI/UX)
    // =========================================================================
    initToastSystem() {
        // Crear el contenedor de toasts si no existe
        if (!document.getElementById('toast-container')) {
            const container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }
    },

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `custom-toast toast-${type}`;
        
        const icons = {
            'success': 'ri-checkbox-circle-fill',
            'info': 'ri-information-fill',
            'error': 'ri-error-warning-fill'
        };

        toast.innerHTML = `
            <i class="${icons[type]}"></i>
            <span>${message}</span>
        `;
        
        container.appendChild(toast);

        // Animar entrada
        setTimeout(() => toast.classList.add('show'), 10);

        // Remover después de 3 segundos
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
};