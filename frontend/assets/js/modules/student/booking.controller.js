/* Reserva de citas del estudiante: catálogo, disponibilidad y confirmación. */
window.BookingController = {
  state: null,
  services: [],

  async init() {
    this.state = { step: 1, serviceId: null, date: '', slot: null, attachment: null };
    this.$ = id => document.getElementById(id);
    this.bindNavigation();
    this.bindForm();
    this.bindSidebar();
    this.setUser(SessionStore.getUser());
    this.initDate();
    this.irAPaso(1);
    try {
      const response = await ApiClient.get('catalog.services');
      this.services = response.servicios || [];
      this.renderServices();
    } catch (error) {
      this.mostrarError(error.message);
    }
  },

  setUser(user) {
    if (!user) return;
    this.$('ntUserAvatar').textContent = SessionStore.initials(user);
    this.$('ntUserName').textContent = SessionStore.fullName(user);
  },

  bindSidebar() {
    document.querySelectorAll('[data-route]').forEach(link => link.addEventListener('click', event => {
      event.preventDefault();
      AppRouter.loadView(link.dataset.route);
    }));
    this.$('ntLogout')?.addEventListener('click', event => { event.preventDefault(); AppRouter.logout(); });
    document.querySelector('[data-action="logout"]')?.addEventListener('click', event => { event.preventDefault(); AppRouter.logout(); });
  },

  renderServices() {
    const container = this.$('ntServicios');
    container.innerHTML = this.services.map(service => `
      <button type="button" class="nt-servicio" data-id="${Number(service.id)}" aria-pressed="false">
        <span class="nt-servicio-ico"><i class="${AppUtils.escapeHTML(service.icono)}"></i></span>
        <span class="nt-servicio-txt"><strong>${AppUtils.escapeHTML(service.nombre)}</strong><small>${AppUtils.escapeHTML(service.descripcion || '')}</small></span>
        <i class="ri-check-line nt-servicio-check"></i>
      </button>`).join('');

    container.addEventListener('click', event => {
      const button = event.target.closest('.nt-servicio');
      if (!button) return;
      this.state.serviceId = Number(button.dataset.id);
      this.state.slot = null;
      container.querySelectorAll('.nt-servicio').forEach(item => {
        const selected = item === button;
        item.classList.toggle('is-selected', selected);
        item.setAttribute('aria-pressed', String(selected));
      });
      this.mostrarError('');
      this.actualizarBotones();
    });
  },

  initDate() {
    const input = this.$('ntFecha');
    const today = this.localISO(new Date());
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 60);
    input.min = today;
    input.max = this.localISO(maxDate);
    input.addEventListener('change', async () => {
      this.state.date = input.value;
      this.state.slot = null;
      await this.renderSlots();
      this.actualizarBotones();
    });
    this.$('ntSlots').innerHTML = '<p class="nt-empty">Selecciona una especialidad y una fecha para consultar la disponibilidad.</p>';
  },

  localISO(date) {
    const pad = value => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  },

  async renderSlots() {
    const container = this.$('ntSlots');
    const hint = this.$('ntFechaHint');
    const { date, serviceId } = this.state;
    hint.textContent = '';
    hint.className = 'nt-hint';
    if (!date) {
      container.innerHTML = '<p class="nt-empty">Selecciona una fecha para ver los horarios.</p>';
      return;
    }
    if (!serviceId) {
      container.innerHTML = '<p class="nt-empty">Primero selecciona una especialidad en el paso anterior.</p>';
      return;
    }
    const weekday = new Date(`${date}T12:00:00`).getDay();
    if (weekday === 0 || weekday === 6) {
      hint.textContent = 'El servicio médico atiende de lunes a viernes. Elige otro día.';
      hint.classList.add('is-error');
      container.innerHTML = '';
      return;
    }
    container.innerHTML = '<p class="nt-empty"><i class="ri-loader-4-line"></i> Consultando horarios disponibles...</p>';
    try {
      const response = await ApiClient.get('catalog.availability', { id_servicio: serviceId, fecha: date });
      const slots = response.horarios || [];
      if (!slots.length) {
        container.innerHTML = '<p class="nt-empty">No hay horarios disponibles para esta fecha. Prueba con otro día.</p>';
        return;
      }
      container.innerHTML = slots.map(slot => `
        <button type="button" class="nt-slot ${this.state.slot?.id === slot.id ? 'is-selected' : ''}" data-id="${slot.id}">
          <strong>${AppUtils.escapeHTML(slot.hora)}</strong>
          <small>${AppUtils.escapeHTML(slot.medico)}</small>
        </button>`).join('');
    } catch (error) {
      container.innerHTML = '';
      this.mostrarError(error.message);
    }
  },

  bindForm() {
    const reason = this.$('ntMotivo');
    reason.addEventListener('input', () => { this.$('ntMotivoCount').textContent = reason.value.length; });
    const file = this.$('ntAdjunto');
    file.addEventListener('change', () => {
      const selected = file.files?.[0];
      if (!selected) return;
      const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
      if (!allowed.includes(selected.type)) {
        file.value = '';
        this.state.attachment = null;
        this.mostrarError('Formato no permitido. Usa JPG, PNG o PDF.');
        return;
      }
      if (selected.size > 2 * 1024 * 1024) {
        file.value = '';
        this.state.attachment = null;
        this.mostrarError('El archivo supera los 2 MB permitidos.');
        return;
      }
      this.state.attachment = selected;
      this.$('ntAdjuntoTexto').textContent = `${selected.name} (${(selected.size / 1024).toFixed(0)} KB)`;
      this.$('ntAdjuntoQuitar').hidden = false;
      this.mostrarError('');
    });
    this.$('ntAdjuntoQuitar').addEventListener('click', () => this.clearAttachment());
  },

  clearAttachment() {
    this.state.attachment = null;
    this.$('ntAdjunto').value = '';
    this.$('ntAdjuntoTexto').textContent = 'Haz clic para seleccionar un archivo';
    this.$('ntAdjuntoQuitar').hidden = true;
  },

  bindNavigation() {
    this.$('ntBtnPrev').addEventListener('click', () => this.irAPaso(this.state.step - 1));
    this.$('ntBtnNext').addEventListener('click', () => {
      if (!this.stepIsValid()) return;
      this.irAPaso(this.state.step + 1);
    });
    this.$('ntBtnConfirm').addEventListener('click', () => this.confirmar());
    this.$('ntVerReservas').addEventListener('click', () => AppRouter.loadView('mis_reservas'));
    this.$('ntOtraReserva').addEventListener('click', () => this.reset());
    this.$('ntSlots').addEventListener('click', event => {
      const button = event.target.closest('.nt-slot');
      if (!button) return;
      const slotId = Number(button.dataset.id);
      const slot = [...this.$('ntSlots').querySelectorAll('.nt-slot')].find(item => Number(item.dataset.id) === slotId);
      this.state.slot = {
        id: slotId,
        hora: button.querySelector('strong').textContent,
        medico: button.querySelector('small').textContent,
        consultorio: ''
      };
      this.$('ntSlots').querySelectorAll('.nt-slot').forEach(item => item.classList.toggle('is-selected', item === button));
      this.mostrarError('');
      this.actualizarBotones();
    });
  },

  stepIsValid() {
    if (this.state.step === 1) return Boolean(this.state.serviceId);
    if (this.state.step === 2) return Boolean(this.state.date && this.state.slot);
    return true;
  },

  irAPaso(step) {
    this.state.step = step;
    this.mostrarError('');
    const inFlow = typeof step === 'number';
    document.querySelectorAll('.nt-panel').forEach(panel => { panel.hidden = String(panel.dataset.panel) !== String(step); });
    this.$('ntNav').hidden = !inFlow;
    document.querySelectorAll('.nt-step').forEach(item => {
      const number = Number(item.dataset.step);
      const current = inFlow ? step : 4;
      item.classList.toggle('is-active', number === current);
      item.classList.toggle('is-done', number < current);
      item.querySelector('.nt-step-num').innerHTML = number < current ? '<i class="ri-check-line"></i>' : number;
    });
    if (step === 2) this.renderSlots();
    if (step === 3) this.renderSummary();
    this.actualizarBotones();
    document.querySelector('.dash-content-scroll')?.scrollTo({ top: 0, behavior: 'smooth' });
  },

  actualizarBotones() {
    if (typeof this.state.step !== 'number') return;
    const step = this.state.step;
    this.$('ntBtnPrev').style.visibility = step === 1 ? 'hidden' : 'visible';
    this.$('ntBtnNext').hidden = step === 3;
    this.$('ntBtnConfirm').hidden = step !== 3;
    this.$('ntBtnNext').disabled = !this.stepIsValid();
  },

  summaryHTML(extra = '') {
    const service = this.services.find(item => Number(item.id) === this.state.serviceId);
    const slot = this.state.slot;
    const rows = [
      ['ri-stethoscope-line', 'Servicio', service?.nombre || '—'],
      ['ri-calendar-line', 'Fecha', this.state.date ? AppUtils.formatDate(this.state.date) : '—'],
      ['ri-time-line', 'Hora', slot ? AppUtils.formatTime(slot.hora) : '—'],
      ['ri-user-heart-line', 'Profesional', slot?.medico || 'Por asignar'],
    ];
    return `<ul>${rows.map(([icon, label, value]) => `<li><i class="${icon}"></i><span>${label}</span><strong>${AppUtils.escapeHTML(value)}</strong></li>`).join('')}${extra}</ul>`;
  },

  renderSummary() {
    this.$('ntResumen').innerHTML = this.summaryHTML();
  },

  async confirmar() {
    const button = this.$('ntBtnConfirm');
    button.disabled = true;
    this.mostrarError('');
    const formData = new FormData();
    formData.append('id_horario', String(this.state.slot.id));
    formData.append('motivo', this.$('ntMotivo').value.trim());
    if (this.state.attachment) formData.append('adjunto', this.state.attachment);
    try {
      const response = await ApiClient.postForm('student.bookings.create', formData);
      const extra = `<li><i class="ri-hashtag"></i><span>N° de reserva</span><strong>${AppUtils.escapeHTML(response.codigo)}</strong></li>`;
      this.$('ntTicket').innerHTML = this.summaryHTML(extra);
      this.$('ntNav').hidden = true;
      this.irAPaso('ok');
      AppUtils.toast('Reserva registrada correctamente.', 'success');
    } catch (error) {
      this.mostrarError(error.message);
      if (error.status === 409) {
        this.state.slot = null;
        await this.renderSlots();
        this.irAPaso(2);
      }
    } finally {
      button.disabled = false;
    }
  },

  reset() {
    this.state = { step: 1, serviceId: null, date: '', slot: null, attachment: null };
    this.$('ntFecha').value = '';
    this.$('ntMotivo').value = '';
    this.$('ntMotivoCount').textContent = '0';
    this.clearAttachment();
    this.$('ntServicios').querySelectorAll('.nt-servicio').forEach(button => {
      button.classList.remove('is-selected');
      button.setAttribute('aria-pressed', 'false');
    });
    this.$('ntSlots').innerHTML = '<p class="nt-empty">Selecciona una fecha para ver los horarios.</p>';
    this.irAPaso(1);
  },

  mostrarError(message) {
    const element = this.$('ntError');
    element.textContent = message || '';
    element.hidden = !message;
  }
};
