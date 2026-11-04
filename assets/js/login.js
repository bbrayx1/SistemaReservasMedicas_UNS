const LoginController = {
    init() {
        const navbar = document.getElementById('mainNavbar');
        const btnFocusLogin = document.getElementById('btnFocusLogin');
        const loginForm = document.getElementById('loginForm');
        const identificadorInput = document.getElementById('identificador');
        const passwordInput = document.getElementById('password');
        const togglePasswordBtn = document.getElementById('togglePassword');
        const btnRecovery = document.getElementById('btnRecovery');
        const feedbackMsg = document.getElementById('feedbackMsg');
        const btnSubmit = document.getElementById('btnSubmit');

        if (!loginForm) return;

        // 1. Efecto del Menú Superior que se encoge al hacer Scroll (Estilo ContentAI)
        const handleScroll = () => {
            if (window.scrollY > 40) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        };
        window.addEventListener('scroll', handleScroll);
        handleScroll();

        // 2. Botón "Acceso UNS" del menú: sube suavemente y enfoca el input de Código/DNI
        if (btnFocusLogin) {
            btnFocusLogin.addEventListener('click', () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                setTimeout(() => identificadorInput.focus(), 400);
            });
        }

        // 3. Mostrar / Ocultar contraseña
        togglePasswordBtn.addEventListener('click', () => {
            const isPassword = passwordInput.getAttribute('type') === 'password';
            passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
            const icon = togglePasswordBtn.querySelector('i');
            icon.className = isPassword ? 'ri-eye-line' : 'ri-eye-off-line';
        });

        // 4. Validar solo números en Código UNS / DNI
        identificadorInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
        });

        // 5. Recuperación de contraseña
        btnRecovery.addEventListener('click', () => {
            this.mostrarMensaje(
                feedbackMsg,
                'Para recuperar tu clave, comunícate con Bienestar Universitario o Soporte TI - UNS.',
                'error'
            );
        });

        // 6. Envío del Login (Listo para conectar a SQL Server y cargar Dashboard por Rol)
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const identificador = identificadorInput.value.trim();

            if (identificador.length < 8) {
                this.mostrarMensaje(
                    feedbackMsg,
                    'Ingresa un DNI (8 dígitos) o Código UNS válido (10 dígitos).',
                    'error'
                );
                identificadorInput.focus();
                return;
            }

            btnSubmit.disabled = true;
            btnSubmit.innerHTML = `<span>Verificando...</span>`;

            setTimeout(() => {
                this.mostrarMensaje(
                    feedbackMsg,
                    `Acceso verificado (${identificador}). Listo para cargar el Dashboard según tu rol.`,
                    'success'
                );

                btnSubmit.disabled = false;
                btnSubmit.innerHTML = `<span>Ingresar al Sistema</span>`;
            }, 800);
        });
    },

    mostrarMensaje(elemento, texto, tipo) {
        elemento.textContent = texto;
        elemento.className = `feedback-msg ${tipo}`;
    }
};