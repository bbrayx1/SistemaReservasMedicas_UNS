/* Inicio de sesión de médicos, recepción y administración. */
window.StaffLoginController = {
  init() {
    document.querySelector('[data-route="login"]')?.addEventListener('click', event => { event.preventDefault(); AppRouter.loadView('login'); });
    const form = document.getElementById('staffLoginForm');
    if (!form) return;
    const identifier = document.getElementById('staffId');
    const password = document.getElementById('staffPwd');
    const feedback = document.getElementById('staffFeedbackMsg');
    const submit = document.getElementById('btnStaffSubmit');
    const toggle = document.getElementById('toggleStaffPwd');

    toggle?.addEventListener('click', () => {
      const visible = password.type === 'password';
      password.type = visible ? 'text' : 'password';
      toggle.querySelector('i').className = visible ? 'ri-eye-off-line' : 'ri-eye-line';
      toggle.setAttribute('aria-label', visible ? 'Ocultar contraseña' : 'Mostrar contraseña');
    });

    form.addEventListener('submit', async event => {
      event.preventDefault();
      feedback.textContent = '';
      if (!identifier.value.trim() || !password.value) {
        feedback.textContent = 'Ingresa tu DNI o correo y tu contraseña.';
        feedback.style.color = '#ff4d4f';
        return;
      }
      submit.disabled = true;
      feedback.textContent = 'Verificando acceso...';
      feedback.style.color = '#785269';
      try {
        const response = await ApiClient.post('auth.login', {
          identificador: identifier.value.trim(),
          password: password.value
        });
        SessionStore.setUser(response.user);
        feedback.textContent = 'Acceso validado. Ingresando...';
        feedback.style.color = '#28a745';
        window.setTimeout(() => AppRouter.goToRoleHome(response.user), 400);
      } catch (error) {
        feedback.textContent = error.message || 'No fue posible iniciar sesión.';
        feedback.style.color = '#ff4d4f';
        submit.disabled = false;
      }
    });
  }
};
