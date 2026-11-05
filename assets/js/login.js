const LoginController = {
  init() {
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
    const sections = ['inicio','especialidades','horarios','informacion']
      .map(id => document.getElementById(id)).filter(Boolean);

    const closeMenu = () => {
      menu.classList.remove('is-open');
      toggle.setAttribute('aria-expanded','false');
      toggle.setAttribute('aria-label','Abrir menú');
      toggle.querySelector('i').className = 'ri-menu-3-line';
    };
    toggle.addEventListener('click', () => {
      const opening = !menu.classList.contains('is-open');
      menu.classList.toggle('is-open', opening);
      toggle.setAttribute('aria-expanded', String(opening));
      toggle.setAttribute('aria-label',opening ? 'Cerrar menú' : 'Abrir menú');
      toggle.querySelector('i').className = opening ? 'ri-close-line' : 'ri-menu-3-line';
    });
    document.querySelectorAll('a[href^="#"]').forEach(link => {
      link.addEventListener('click', () => closeMenu());
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
    let scheduled = false;
    const update = () => {
      const y = window.scrollY;
      header.classList.toggle('is-scrolled', y > 40);
      const max = Math.max(1,document.documentElement.scrollHeight - window.innerHeight);
      progress.style.width = `${Math.min(100, y / max * 100)}%`;
      const current = sections.reduce((acc,section) => section.getBoundingClientRect().top <= 165 ? section.id : acc,'inicio');
      links.forEach(link => {
        const match = link.getAttribute('href') === `#${current}`;
        link.classList.toggle('active',match);
        if(match)link.setAttribute('aria-current','location');
        else link.removeAttribute('aria-current');
      });
      scheduled = false;
    };
    window.addEventListener('scroll', () => {
      if (!scheduled) { scheduled = true; window.requestAnimationFrame(update); }
    },{passive:true});
    window.addEventListener('resize', () => {if(window.innerWidth > 920)closeMenu(); update();});
    update();
  },

  initReveals() {
    const elements = [...document.querySelectorAll('.reveal')];
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
      elements.forEach(el => el.classList.add('is-visible')); return;
    }
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target);}
    }),{threshold:0.1,rootMargin:'0px 0px -25px 0px'});
    elements.forEach((el,i)=>{el.style.transitionDelay=`${(i % 3) * 85}ms`;observer.observe(el);});
  },

  initSpecialtySwap() {
    const stage = document.getElementById('specialtyStage');
    const featureSlot = document.getElementById('featuredSlot');
    const miniGrid = document.getElementById('specMiniGrid');
    if(!stage || !featureSlot || !miniGrid) return;
    let busy = false;

    // Los botones NO duplican contenido: se intercambian los nodos originales
    // entre el slot destacado y el módulo pequeño. Las dos piezas se animan
    // desde sus posiciones iniciales hasta sus posiciones finales (FLIP).
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

      // El intercambio es de posiciones reales, no solo de textos o fotos.
      featureSlot.replaceChildren(selected);
      selectedSlot.replaceChildren(previous);
      selected.classList.remove('is-mini'); selected.classList.add('is-feature');
      previous.classList.remove('is-feature'); previous.classList.add('is-mini');
      selected.setAttribute('aria-label',`${selected.querySelector('.spec-title').textContent.trim()}, especialidad destacada`);
      previous.setAttribute('aria-label',`Destacar ${previous.querySelector('.spec-title').textContent.trim()}`);

      const lastSelected = selected.getBoundingClientRect();
      const lastPrevious = previous.getBoundingClientRect();
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const duration = reducedMotion ? 0 : 650;

      if(!duration || !selected.animate || !previous.animate){
        stage.classList.remove('is-switching'); busy = false;
        return;
      }
      const transition = (element,from,to) => {
        const deltaX = from.left-to.left;
        const deltaY = from.top-to.top;
        const scaleX = from.width/to.width;
        const scaleY = from.height/to.height;
        return element.animate([
          {transform:`translate(${deltaX}px,${deltaY}px) scale(${scaleX},${scaleY})`,opacity:.84,filter:'brightness(.92)'},
          {transform:'translate(0px,0px) scale(1,1)',opacity:1,filter:'brightness(1)'}
        ],{duration,easing:'cubic-bezier(.22,1,.36,1)',fill:'none'}).finished;
      };
      Promise.allSettled([transition(selected,firstSelected,lastSelected),transition(previous,firstPrevious,lastPrevious)])
        .finally(()=>{stage.classList.remove('is-switching');busy=false;});
      // Se mantiene el foco en la tarjeta seleccionada tras el intercambio.
      selected.focus({preventScroll:true});
    });
  },

  initForm() {
    const form = document.getElementById('loginForm');
    const code = document.getElementById('identificador');
    const password = document.getElementById('password');
    const toggle = document.getElementById('togglePassword');
    const recovery = document.getElementById('btnRecovery');
    const message = document.getElementById('feedbackMsg');
    if(!form) return;
    const clear = () => {message.textContent='';message.className='feedback-msg';};
    const feedback = (content,kind='info') => {message.textContent=content;message.className=`feedback-msg is-visible ${kind}`;};
    code.addEventListener('input', () => {code.value=code.value.replace(/\D/g,'').slice(0,10);clear();});
    password.addEventListener('input',clear);
    toggle.addEventListener('click',()=>{
      const visible = password.type === 'password';
      password.type=visible?'text':'password';
      toggle.querySelector('i').className=visible?'ri-eye-off-line':'ri-eye-line';
      toggle.setAttribute('aria-pressed',String(visible));
      toggle.setAttribute('aria-label',visible?'Ocultar contraseña':'Mostrar contraseña');
    });
    recovery.addEventListener('click',()=>feedback('Solicita la recuperación de acceso a Bienestar Universitario o Soporte TI de la UNS.'));
    form.addEventListener('submit',event=>{
      event.preventDefault();
      if(!/^(\d{8}|\d{10})$/.test(code.value.trim())){
        feedback('Introduce un DNI de 8 dígitos o un código universitario de 10 dígitos.','error');code.focus();return;
      }
      if(!password.value){feedback('Introduce tu contraseña.','error');password.focus();return;}
      // No se debe simular un login ni guardar una clave en el navegador.
      // Aquí se añadirá POST /api/auth/login una vez creado el servidor.
      feedback('El diseño del login está listo. La validación de identidad se activará cuando integremos el servidor y la base de datos. Aún no se ha iniciado sesión.');
    });
  }
};
