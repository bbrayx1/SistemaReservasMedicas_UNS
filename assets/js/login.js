const LoginController = {
  init() {
    this.initNavigation();
    this.initScrollAnimations();
    this.initForm();

    const year = document.getElementById('currentYear');
    if (year) year.textContent = new Date().getFullYear();
  },

  initNavigation() {
    const header = document.getElementById('siteHeader');
    const progress = document.getElementById('scrollProgress');
    const toggle = document.getElementById('navToggle');
    const menu = document.getElementById('navMenu');
    const links = [...document.querySelectorAll('.nav-link')];
    const sections = ['inicio', 'especialidades', 'proceso', 'horarios']
      .map(id => document.getElementById(id))
      .filter(Boolean);

    const closeMenu = () => {
      menu.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Abrir menú');
      toggle.querySelector('i').className = 'ri-menu-3-line';
    };

    toggle.addEventListener('click', () => {
      const opening = !menu.classList.contains('is-open');
      menu.classList.toggle('is-open', opening);
      toggle.setAttribute('aria-expanded', String(opening));
      toggle.setAttribute('aria-label', opening ? 'Cerrar menú' : 'Abrir menú');
      toggle.querySelector('i').className = opening ? 'ri-close-line' : 'ri-menu-3-line';
    });

    document.querySelectorAll('a[href^="#"]').forEach(link => {
      link.addEventListener('click', () => {
        closeMenu();
      });
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') closeMenu();
    });

    let scheduled = false;
    const updateScroll = () => {
      const scrollY = window.scrollY;
      header.classList.toggle('is-scrolled', scrollY > 35);

      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      progress.style.width = `${Math.min(100, scrollY / maxScroll * 100)}%`;

      const activeSection = sections.reduce((current, section) => {
        return section.getBoundingClientRect().top <= 155 ? section.id : current;
      }, 'inicio');

      links.forEach(link => {
        const active = link.getAttribute('href') === `#${activeSection}`;
        link.classList.toggle('active', active);
        if (active) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
      scheduled = false;
    };

    window.addEventListener('scroll', () => {
      if (!scheduled) {
        scheduled = true;
        requestAnimationFrame(updateScroll);
      }
    }, { passive: true });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 920) closeMenu();
      updateScroll();
    });

    updateScroll();
  },

  initScrollAnimations() {
    const elements = document.querySelectorAll('.reveal');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reducedMotion || !('IntersectionObserver' in window)) {
      elements.forEach(el => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -25px 0px' });

    elements.forEach((el, index) => {
      el.style.transitionDelay = `${(index % 3) * 75}ms`;
      observer.observe(el);
    });
  },

  initForm() {
    const form = document.getElementById('loginForm');
    const identificador = document.getElementById('identificador');
    const password = document.getElementById('password');
    const togglePassword = document.getElementById('togglePassword');
    const recovery = document.getElementById('btnRecovery');
    const feedback = document.getElementById('feedbackMsg');

    identificador.addEventListener('input', () => {
      // El código/DNI solo admite dígitos; la validación real deberá repetirse en el backend.
      identificador.value = identificador.value.replace(/\D/g, '').slice(0, 10);
      this.clearMessage(feedback);
    });

    password.addEventListener('input', () => this.clearMessage(feedback));

    togglePassword.addEventListener('click', () => {
      const show = password.type === 'password';
      password.type = show ? 'text' : 'password';
      togglePassword.setAttribute('aria-label', show ? 'Ocultar contraseña' : 'Mostrar contraseña');
      togglePassword.setAttribute('aria-pressed', String(show));
      togglePassword.querySelector('i').className = show ? 'ri-eye-off-line' : 'ri-eye-line';
    });

    recovery.addEventListener('click', () => {
      this.showMessage(feedback, 'Por el momento, la recuperación de acceso debe solicitarse a Bienestar Universitario o Soporte TI de la UNS.', 'info');
    });

    form.addEventListener('submit', event => {
      event.preventDefault();
      const code = identificador.value.trim();
      const pwd = password.value;

      if (!/^(\d{8}|\d{10})$/.test(code)) {
        this.showMessage(feedback, 'Ingresa un DNI de 8 dígitos o un código universitario de 10 dígitos.', 'error');
        identificador.focus();
        return;
      }
      if (!pwd) {
        this.showMessage(feedback, 'Ingresa tu contraseña para continuar.', 'error');
        password.focus();
        return;
      }

      // IMPORTANTE: No existe autenticación real en este repositorio.
      // En la siguiente etapa, este bloque se reemplaza con una petición segura a la API.
      // Nunca guardes la contraseña en localStorage, sessionStorage o en el HTML.
      this.showMessage(feedback, 'El diseño del acceso está listo. Falta conectar el servidor y la base de datos para validar tus credenciales. No se ha iniciado ninguna sesión.', 'info');
    });
  },

  showMessage(element, text, type) {
    element.textContent = text;
    element.className = `feedback-msg is-visible ${type}`;
  },

  clearMessage(element) {
    element.textContent = '';
    element.className = 'feedback-msg';
  }
};
