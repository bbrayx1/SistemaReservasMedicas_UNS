/* Registro independiente de estudiantes/pacientes para personal autorizado. */
(() => {
  document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('formPaciente');
    const message = document.getElementById('mensajePaciente');
    if (!form || !message) return;
    try {
      const session = await ApiClient.get('auth.me');
      SessionStore.setUser(session.user);
      if (!['Médico', 'Secretaria'].includes(session.user.rol)) throw new Error('No tienes permisos para registrar pacientes.');
    } catch (error) {
      message.className = 'message error';
      message.textContent = error.message;
      message.hidden = false;
      form.querySelector('button[type="submit"]').disabled = true;
      return;
    }
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const submit = form.querySelector('button[type="submit"]');
      submit.disabled = true;
      const data = Object.fromEntries(new FormData(form));
      try {
        const response = await ApiClient.post('medical.students.create', data);
        message.className = 'message ok';
        message.textContent = `Paciente creado correctamente (ID ${response.id_estudiante}). Clave temporal: ${response.clave_temporal}. Comunícala por un canal seguro.`;
        message.hidden = false;
        form.reset();
      } catch (error) {
        message.className = 'message error';
        message.textContent = error.message;
        message.hidden = false;
      } finally {
        submit.disabled = false;
      }
    });
  });
})();
