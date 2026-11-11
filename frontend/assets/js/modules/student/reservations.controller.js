/* Historial de reservas del estudiante: filtros, detalle y cancelación. */
window.ReservationsController = {
  filter: 'TODAS',
  search: '',
  selectedBooking: null,
  bookings: [],
  labels: {
    PENDIENTE: { text: 'Pendiente', className: 'pendiente', icon: 'ri-hourglass-line' },
    EN_ESPERA: { text: 'En espera', className: 'en-espera', icon: 'ri-user-voice-line' },
    EN_ATENCION: { text: 'En atención', className: 'en-atencion', icon: 'ri-stethoscope-line' },
    ATENDIDA: { text: 'Atendida', className: 'atendida', icon: 'ri-check-line' },
    CANCELADA: { text: 'Cancelada', className: 'cancelada', icon: 'ri-close-line' }
  },

  async init() {
    this.filter = 'TODAS';
    this.search = '';
    this.selectedBooking = null;
    this.$ = id => document.getElementById(id);
    this.bindNavigation();
    this.bindEvents();
    try {
      const response = await ApiClient.get('student.bookings');
      this.bookings = response.reservas || [];
      this.render();
    } catch (error) {
      AppUtils.toast(error.message, 'error');
    }
    const user = SessionStore.getUser();
    if (user) {
      this.$('mrUserAvatar').textContent = SessionStore.initials(user);
      this.$('mrUserName').textContent = SessionStore.fullName(user);
    }
  },

  bindNavigation() {
    document.querySelectorAll('[data-route]').forEach(link => link.addEventListener('click', event => {
      event.preventDefault();
      AppRouter.loadView(link.dataset.route);
    }));
    document.querySelector('[data-action="logout"]')?.addEventListener('click', event => {
      event.preventDefault(); AppRouter.logout();
    });
  },

  bindEvents() {
    this.$('mrBtnNuevo').addEventListener('click', () => AppRouter.loadView('nuevo_turno'));
    this.$('mrFiltros').addEventListener('click', event => {
      const chip = event.target.closest('.mr-chip');
      if (!chip) return;
      this.filter = chip.dataset.estado;
      this.$('mrFiltros').querySelectorAll('.mr-chip').forEach(item => item.classList.toggle('is-active', item === chip));
      this.render();
    });
    this.$('mrBuscar').addEventListener('input', event => {
      this.search = event.target.value.trim().toLowerCase();
      this.render();
    });
    this.$('mrTbody').addEventListener('click', event => {
      const button = event.target.closest('button[data-accion]');
      if (!button) return;
      const id = Number(button.dataset.id);
      if (button.dataset.accion === 'detalle') this.openDetails(id);
      if (button.dataset.accion === 'cancelar') this.openCancel(id);
    });
    document.querySelectorAll('.mr-modal').forEach(modal => modal.addEventListener('click', event => {
      if (event.target === modal || event.target.closest('[data-cerrar]')) modal.hidden = true;
    }));
    if (this.keyListener) document.removeEventListener('keydown', this.keyListener);
    this.keyListener = event => {
      if (event.key === 'Escape') document.querySelectorAll('.mr-modal').forEach(modal => { modal.hidden = true; });
    };
    document.addEventListener('keydown', this.keyListener);
    this.$('mrConfirmarCancelar').addEventListener('click', () => this.confirmCancel());
  },

  render() {
    const all = this.bookings;
    this.$('mrStatTotal').textContent = all.length;
    this.$('mrStatPend').textContent = all.filter(item => ['PENDIENTE', 'EN_ESPERA', 'EN_ATENCION'].includes(item.estado)).length;
    this.$('mrStatAten').textContent = all.filter(item => item.estado === 'ATENDIDA').length;
    this.$('mrStatCanc').textContent = all.filter(item => item.estado === 'CANCELADA').length;

    const visible = all.filter(item => {
      if (this.filter !== 'TODAS') {
        const pendingStates = ['PENDIENTE', 'EN_ESPERA', 'EN_ATENCION'];
        if (this.filter === 'PENDIENTE' ? !pendingStates.includes(item.estado) : item.estado !== this.filter) return false;
      }
      if (!this.search) return true;
      return `${item.servicio.nombre} ${item.codigo}`.toLowerCase().includes(this.search);
    });
    this.$('mrVacio').hidden = visible.length > 0;
    this.$('mrTbody').closest('.mr-table-wrap').hidden = visible.length === 0;
    if (!visible.length) {
      this.$('mrVacioTxt').textContent = all.length ? 'No hay reservas que coincidan con el filtro.' : 'Aún no tienes reservas. ¡Agenda tu primer turno!';
      this.$('mrTbody').innerHTML = '';
      return;
    }

    this.$('mrTbody').innerHTML = visible.map(booking => {
      const label = this.labels[booking.estado] || this.labels.PENDIENTE;
      const canCancel = ['PENDIENTE', 'EN_ESPERA'].includes(booking.estado);
      return `
        <tr>
          <td><span class="mr-code">${AppUtils.escapeHTML(booking.codigo)}</span></td>
          <td><div class="mr-serv"><span class="mr-serv-ico"><i class="ri-heart-pulse-line"></i></span>${AppUtils.escapeHTML(booking.servicio.nombre)}</div></td>
          <td>${AppUtils.formatShortDate(booking.fecha)}</td>
          <td class="mr-hour">${AppUtils.formatTime(booking.hora_inicio)}</td>
          <td>${AppUtils.escapeHTML(booking.medico?.nombre || '—')}</td>
          <td><span class="mr-badge ${label.className}"><i class="${label.icon}"></i> ${label.text}</span></td>
          <td class="mr-acc">
            <button type="button" class="mr-btn-ghost" data-accion="detalle" data-id="${booking.id_cita}" title="Ver detalle"><i class="ri-eye-line"></i></button>
            ${canCancel ? `<button type="button" class="mr-btn-cancel" data-accion="cancelar" data-id="${booking.id_cita}"><i class="ri-close-circle-line"></i> Cancelar cita</button>` : '<span class="mr-btn-na">—</span>'}
          </td>
        </tr>`;
    }).join('');
  },

  openDetails(id) {
    const booking = this.bookings.find(item => item.id_cita === id);
    if (!booking) return;
    const label = this.labels[booking.estado] || this.labels.PENDIENTE;
    const row = (icon, name, value) => `<li><i class="${icon}"></i><span>${name}</span><strong>${value}</strong></li>`;
    const attachment = booking.adjunto
      ? `<a href="${AppUtils.escapeHTML(booking.adjunto.url)}" class="mr-adj"><i class="ri-attachment-2"></i><span>Descargar archivo adjunto</span></a>`
      : '<em>Sin archivos adjuntos</em>';
    this.$('mrDetalleBody').innerHTML = `
      <ul class="mr-detalle">
        ${row('ri-hashtag', 'N° de reserva', AppUtils.escapeHTML(booking.codigo))}
        ${row('ri-stethoscope-line', 'Servicio', AppUtils.escapeHTML(booking.servicio.nombre))}
        ${row('ri-calendar-line', 'Fecha', AppUtils.formatDate(booking.fecha))}
        ${row('ri-time-line', 'Hora', AppUtils.formatTime(booking.hora_inicio))}
        ${row('ri-user-heart-line', 'Profesional', AppUtils.escapeHTML(booking.medico?.nombre || 'Por asignar'))}
        ${row('ri-map-pin-line', 'Lugar', AppUtils.escapeHTML(booking.medico?.consultorio || 'Centro Médico UNS'))}
        ${row('ri-flag-line', 'Estado', `<span class="mr-badge ${label.className}"><i class="${label.icon}"></i> ${label.text}</span>`)}
        ${row('ri-chat-1-line', 'Motivo', booking.motivo ? AppUtils.escapeHTML(booking.motivo) : '<em>No indicado</em>')}
        ${row('ri-attachment-2', 'Adjunto', attachment)}
        ${booking.cancelada_en ? row('ri-close-circle-line', 'Cancelada el', new Date(booking.cancelada_en).toLocaleString('es-PE')) : ''}
      </ul>`;
    this.$('mrModalDetalle').hidden = false;
  },

  openCancel(id) {
    const booking = this.bookings.find(item => item.id_cita === id);
    if (!booking) return;
    this.selectedBooking = id;
    this.$('mrCancelarTxt').textContent = `${booking.servicio.nombre} · ${AppUtils.formatShortDate(booking.fecha)} a las ${AppUtils.formatTime(booking.hora_inicio)}. Esta acción no se puede deshacer.`;
    this.$('mrModalCancelar').hidden = false;
  },

  async confirmCancel() {
    if (!this.selectedBooking) return;
    const button = this.$('mrConfirmarCancelar');
    button.disabled = true;
    try {
      await ApiClient.post('student.bookings.cancel', { id_cita: this.selectedBooking });
      this.$('mrModalCancelar').hidden = true;
      this.selectedBooking = null;
      const response = await ApiClient.get('student.bookings');
      this.bookings = response.reservas || [];
      this.render();
      AppUtils.toast('La reserva fue cancelada.', 'success');
    } catch (error) {
      AppUtils.toast(error.message, 'error');
    } finally {
      button.disabled = false;
    }
  }
};
