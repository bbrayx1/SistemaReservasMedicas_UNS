/* Inicio de sesión público y navegación de la página institucional. */
window.LoginController = {
  init() {
    document.querySelector('[data-route="login_staff"]')?.addEventListener('click', event => { event.preventDefault(); AppRouter.loadView('login_staff'); });
    this.initNavigation();
    this.initReveals();
    this.initSpecialtySwap();
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
    const sections = ['inicio', 'especialidades', 'horarios', 'informacion']
      .map(id => document.getElementById(id)).filter(Boolean);
    if (!header || !progress || !toggle || !menu) return;

    const closeMenu = () => {
      menu.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Abrir menú');
      const icon = toggle.querySelector('i');
      if (icon) icon.className = 'ri-menu-3-line';
    };

    toggle.addEventListener('click', () => {
      const opening = !menu.classList.contains('is-open');
      menu.classList.toggle('is-open', opening);
      toggle.setAttribute('aria-expanded', String(opening));
      toggle.setAttribute('aria-label', opening ? 'Cerrar menú' : 'Abrir menú');
      const icon = toggle.querySelector('i');
      if (icon) icon.className = opening ? 'ri-close-line' : 'ri-menu-3-line';
    });

    document.querySelectorAll('a[href^="#"]').forEach(link => link.addEventListener('click', closeMenu));
    document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });

    let scheduled = false;
    const update = () => {
      const y = window.scrollY;
      header.classList.toggle('is-scrolled', y > 40);
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      progress.style.width = `${Math.min(100, y / max * 100)}%`;
      const current = sections.reduce((active, section) => section.getBoundingClientRect().top <= 165 ? section.id : active, 'inicio');
      links.forEach(link => {
        const match = link.getAttribute('href') === `#${current}`;
        link.classList.toggle('active', match);
        if (match) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
      scheduled = false;
    };
    window.addEventListener('scroll', () => {
      if (!scheduled) { scheduled = true; window.requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener('resize', () => { if (window.innerWidth > 920) closeMenu(); update(); });
    update();
  },

  initReveals() {
    const elements = [...document.querySelectorAll('.reveal')];
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
      elements.forEach(element => element.classList.add('is-visible'));
      return;
    }
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
    }), { threshold: 0.1, rootMargin: '0px 0px -25px 0px' });
    elements.forEach((element, index) => {
      element.style.transitionDelay = `${(index % 3) * 85}ms`;
      observer.observe(element);
    });
  },

  initSpecialtySwap() {
    const stage = document.getElementById('specialtyStage');
    const featureSlot = document.getElementById('featuredSlot');
    const miniGrid = document.getElementById('specMiniGrid');
    if (!stage || !featureSlot || !miniGrid) return;
    let busy = false;

    miniGrid.addEventListener('click', event => {
      const selected = event.target.closest('.specialty-card.is-mini');
      if (!selected || busy) return;
      const previous = featureSlot.querySelector('.specialty-card.is-feature');
      if (!previous) return;
      const selectedSlot = selected.parentElement;
      const firstSelected = selected.getBoundingClientRect();
      const firstPrevious = previous.getBoundingClientRect();
      busy = true;
      stage.classList.add('is-switching');
      featureSlot.replaceChildren(selected);
      selectedSlot.replaceChildren(previous);
      selected.classList.replace('is-mini', 'is-feature');
      previous.classList.replace('is-feature', 'is-mini');
      selected.setAttribute('aria-label', `${selected.querySelector('.spec-title').textContent.trim()}, especialidad destacada`);
      previous.setAttribute('aria-label', `Destacar ${previous.querySelector('.spec-title').textContent.trim()}`);

      const lastSelected = selected.getBoundingClientRect();
      const lastPrevious = previous.getBoundingClientRect();
      const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 650;
      if (!duration || !selected.animate || !previous.animate) {
        stage.classList.remove('is-switching'); busy = false; return;
      }
      const transition = (element, from, to) => element.animate([
        { transform: `translate(${from.left - to.left}px,${from.top - to.top}px) scale(${from.width / to.width},${from.height / to.height})`, opacity: .84 },
        { transform: 'translate(0,0) scale(1,1)', opacity: 1 }
      ], { duration, easing: 'cubic-bezier(.22,1,.36,1)' }).finished;
      Promise.allSettled([transition(selected, firstSelected, lastSelected), transition(previous, firstPrevious, lastPrevious)])
        .finally(() => { stage.classList.remove('is-switching'); busy = false; });
      selected.focus({ preventScroll: true });
    });
  },

  initForm() {
    const form = document.getElementById('loginForm');
    if (!form) return;
    const code = document.getElementById('codigoUniversitario');
    const dni = document.getElementById('dni');
    const password = document.getElementById('password');
    const toggle = document.getElementById('togglePassword');
    const recovery = document.getElementById('btnRecovery');
    const message = document.getElementById('feedbackMsg');
    const submit = document.getElementById('btnSubmit');

    const clear = () => { message.textContent = ''; message.className = 'feedback-msg'; };
    const feedback = (text, type = 'info') => {
      message.textContent = text;
      message.className = `feedback-msg is-visible ${type}`;
    };

    code.addEventListener('input', () => { code.value = code.value.replace(/\D/g, '').slice(0, 10); clear(); });
    dni.addEventListener('input', () => { dni.value = dni.value.replace(/\D/g, '').slice(0, 8); clear(); });
    password.addEventListener('input', clear);
    toggle.addEventListener('click', () => {
      const visible = password.type === 'password';
      password.type = visible ? 'text' : 'password';
      toggle.querySelector('i').className = visible ? 'ri-eye-off-line' : 'ri-eye-line';
      toggle.setAttribute('aria-pressed', String(visible));
      toggle.setAttribute('aria-label', visible ? 'Ocultar contraseña' : 'Mostrar contraseña');
    });
    recovery.addEventListener('click', () => feedback('Comunícate con Bienestar Universitario o Soporte TI de la UNS para recuperar el acceso.'));

    form.addEventListener('submit', async event => {
      event.preventDefault();
      clear();
      if (!/^\d{10}$/.test(code.value.trim())) { feedback('El código universitario debe tener 10 dígitos.', 'error'); code.focus(); return; }
      if (!/^\d{8}$/.test(dni.value.trim())) { feedback('El DNI debe tener exactamente 8 dígitos.', 'error'); dni.focus(); return; }
      if (!password.value) { feedback('Ingresa tu contraseña.', 'error'); password.focus(); return; }

      submit.disabled = true;
      feedback('Verificando credenciales institucionales...', 'info');
      try {
        const response = await ApiClient.post('auth.login', {
          codigo_universitario: code.value.trim(),
          dni: dni.value.trim(),
          password: password.value
        });
        SessionStore.setUser(response.user);
        feedback('Acceso validado. Ingresando al sistema...', 'success');
        window.setTimeout(() => AppRouter.goToRoleHome(response.user), 450);
      } catch (error) {
        feedback(error.message || 'No fue posible iniciar sesión.', 'error');
        submit.disabled = false;
      }
    });
  }
};
