/* Recepción: consulta la fila del día y marca la llegada de pacientes. */
window.ReceptionDashboardController = {
  queue: [],
  async init() {
    const user = SessionStore.getUser();
    const name = document.getElementById('receptionUserName');
    if (name && user) name.textContent = SessionStore.fullName(user);
    document.querySelector('[data-action="logout"]')?.addEventListener('click', event => {
      event.preventDefault(); AppRouter.logout();
    });
    document.querySelectorAll('[data-reception-section]').forEach(link => link.addEventListener('click', event => {
      event.preventDefault();
      AppUtils.toast('Este apartado aún no forma parte de la versión funcional.', 'info');
    }));
    document.getElementById('receptionSearch')?.addEventListener('input', () => this.render());
    document.getElementById('receptionQueueBody')?.addEventListener('click', event => this.handleAction(event));
    await this.loadQueue();
  },

  async loadQueue() {
    try {
      const response = await ApiClient.get('reception.queue');
      this.queue = response.citas || [];
      this.render();
    } catch (error) {
      AppUtils.toast(error.message, 'error');
      const body = document.getElementById('receptionQueueBody');
      if (body) body.innerHTML = `<tr><td colspan="5">${AppUtils.escapeHTML(error.message)}</td></tr>`;
    }
  },

  render() {
    const body = document.getElementById('receptionQueueBody');
    if (!body) return;
    const query = (document.getElementById('receptionSearch')?.value || '').trim().toLowerCase();
    const visible = this.queue.filter(item => `${item.paciente} ${item.dni}`.toLowerCase().includes(query));
    if (!visible.length) {
      body.innerHTML = '<tr><td colspan="5">No hay pacientes que coincidan con la búsqueda.</td></tr>';
      return;
    }
    body.innerHTML = visible.map(item => {
      const state = item.estado === 'EN_ESPERA' ? 'En sala de espera' : item.estado === 'EN_ATENCION' ? 'En consultorio' : 'Pendiente';
      const action = item.estado === 'PENDIENTE'
        ? `<button type="button" class="btn-success btn-sm" data-action="call" data-id="${item.id}">Registrar llegada</button>`
        : `<span class="status-badge ${item.estado === 'EN_ATENCION' ? 'in-progress' : 'waiting'}">${state}</span>`;
      return `<tr>
        <td><strong>${AppUtils.escapeHTML(item.hora)}</strong></td>
        <td>${AppUtils.escapeHTML(item.paciente)}<br><small style="color:#888">DNI: ${AppUtils.escapeHTML(item.dni)}</small></td>
        <td>${AppUtils.escapeHTML(item.especialidad)}</td>
        <td><span class="status-badge ${item.estado === 'PENDIENTE' ? 'waiting' : 'in-progress'}">${state}</span></td>
        <td>${action}</td>
      </tr>`;
    }).join('');
  },

  async handleAction(event) {
    const button = event.target.closest('[data-action="call"]');
    if (!button) return;
    button.disabled = true;
    try {
      await ApiClient.post('reception.call', { id_cita: Number(button.dataset.id) });
      AppUtils.toast('Paciente agregado a la sala de espera.', 'success');
      await this.loadQueue();
    } catch (error) {
      AppUtils.toast(error.message, 'error');
      button.disabled = false;
    }
  }
};
