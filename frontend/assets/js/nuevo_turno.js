/* =========================================================================
   nuevo_turno.js  ·  Módulo Estudiante (Michael V.)
   RESPONSABILIDAD: lógica del formulario paso a paso (especialidad ->
   fecha/hora -> confirmar). Los DATOS los pide a ReservasStore.
   ========================================================================= */
const NuevoTurnoController = {
  state: null,

  init() {
    this.state = { paso: 1, idServicio: null, fecha: null, hora: null, adjunto: null };
    this.$ = id => document.getElementById(id);

    const u = ReservasStore.getUsuario();
    this.$('ntUserAvatar').textContent = ReservasStore.iniciales(u);
    this.$('ntUserName').textContent = `${u.nombres} ${u.apellidos}`.trim();

    this.renderServicios();
    this.initFecha();
    this.bindConfirmacion();
    this.bindNavegacion();
    this.irAPaso(1);
  },

  /* ---------- PASO 1 ---------- */
  renderServicios() {
    const cont = this.$('ntServicios');
    cont.innerHTML = ReservasStore.getServicios().map(s => `
      <button type="button" class="nt-servicio" data-id="${s.id_servicio}" aria-pressed="false">
        <span class="nt-servicio-ico"><i class="${s.icono}"></i></span>
        <span class="nt-servicio-txt"><strong>${s.nombre}</strong><small>${s.descripcion}</small></span>
        <i class="ri-check-line nt-servicio-check"></i>
      </button>`).join('');

    cont.addEventListener('click', e => {
      const btn = e.target.closest('.nt-servicio');
      if (!btn) return;
      this.state.idServicio = Number(btn.dataset.id);
      this.state.hora = null; // al cambiar de servicio se reinicia la hora
      cont.querySelectorAll('.nt-servicio').forEach(b => {
        const on = b === btn;
        b.classList.toggle('is-selected', on);
        b.setAttribute('aria-pressed', String(on));
      });
      this.mostrarError('');
      this.actualizarBotones();
    });
  },

  /* ---------- PASO 2 ---------- */
  initFecha() {
    const input = this.$('ntFecha');
    input.min = ReservasStore.primerDiaHabilISO();
    input.max = ReservasStore.fechaMaxISO();
    input.value = '';
    input.addEventListener('change', () => {
      this.state.fecha = input.value || null;
      this.state.hora = null;
      this.renderSlots();
      this.actualizarBotones();
    });
    this.renderSlots();
  },

  renderSlots() {
    const cont = this.$('ntSlots');
    const hint = this.$('ntFechaHint');
    const { fecha, idServicio } = this.state;
    hint.textContent = '';
    hint.className = 'nt-hint';

    if (!fecha) {
      cont.innerHTML = '<p class="nt-empty">Selecciona una fecha para ver los horarios.</p>';
      return;
    }
    if (!ReservasStore.esDiaHabil(fecha)) {
      hint.textContent = 'Solo se atiende de lunes a viernes. Elige otro día.';
      hint.classList.add('is-error');
      cont.innerHTML = '';
      return;
    }
    const slots = ReservasStore.getHorariosDisponibles(idServicio, fecha);
    if (!slots.some(s => s.disponible)) {
      cont.innerHTML = '<p class="nt-empty">No hay horarios disponibles para esta fecha. Prueba con otro día.</p>';
      return;
    }
    cont.innerHTML = slots.map(s => `
      <button type="button" class="nt-slot ${this.state.hora === s.hora_inicio ? 'is-selected' : ''}"
              data-hora="${s.hora_inicio}" ${s.disponible ? '' : 'disabled'}>
        ${ReservasStore.formatoHora(s.hora_inicio)}
      </button>`).join('');

    cont.onclick = e => {
      const b = e.target.closest('.nt-slot:not([disabled])');
      if (!b) return;
      this.state.hora = b.dataset.hora;
      cont.querySelectorAll('.nt-slot').forEach(x => x.classList.toggle('is-selected', x === b));
      this.mostrarError('');
      this.actualizarBotones();
    };
  },

  /* ---------- PASO 3 ---------- */
  bindConfirmacion() {
    const motivo = this.$('ntMotivo');
    motivo.addEventListener('input', () => { this.$('ntMotivoCount').textContent = motivo.value.length; });

    const file = this.$('ntAdjunto');
    file.addEventListener('change', () => this.procesarArchivo(file.files[0]));
    this.$('ntAdjuntoQuitar').addEventListener('click', () => this.limpiarArchivo());
  },

  procesarArchivo(f) {
    if (!f) return;
    if (!ReservasStore.ADJUNTO_TIPOS.includes(f.type)) {
      this.limpiarArchivo();
      return this.mostrarError('Formato no permitido. Usa JPG, PNG o PDF.');
    }
    if (f.size > ReservasStore.ADJUNTO_MAX_BYTES) {
      this.limpiarArchivo();
      return this.mostrarError('El archivo supera los 2 MB permitidos.');
    }
    const reader = new FileReader();
    reader.onload = () => {
      this.state.adjunto = { nombre: f.name, tipo: f.type, tamano: f.size, data: reader.result };
      this.$('ntAdjuntoTexto').textContent = `${f.name} (${(f.size / 1024).toFixed(0)} KB)`;
      this.$('ntAdjuntoQuitar').hidden = false;
      this.mostrarError('');
    };
    reader.onerror = () => this.mostrarError('No se pudo leer el archivo.');
    reader.readAsDataURL(f);
  },

  limpiarArchivo() {
    this.state.adjunto = null;
    this.$('ntAdjunto').value = '';
    this.$('ntAdjuntoTexto').textContent = 'Haz clic para seleccionar un archivo';
    this.$('ntAdjuntoQuitar').hidden = true;
  },

  resumenHTML(servicio, medico, fecha, hora, extra = '') {
    return `
      <ul>
        <li><i class="ri-stethoscope-line"></i><span>Servicio</span><strong>${servicio.nombre}</strong></li>
        <li><i class="ri-calendar-line"></i><span>Fecha</span><strong>${ReservasStore.formatoFecha(fecha)}</strong></li>
        <li><i class="ri-time-line"></i><span>Hora</span><strong>${ReservasStore.formatoHora(hora)}</strong></li>
        <li><i class="ri-user-heart-line"></i><span>Profesional</span><strong>${medico ? medico.nombre : 'Por asignar'}</strong></li>
        <li><i class="ri-map-pin-line"></i><span>Lugar</span><strong>${medico ? medico.consultorio : 'Centro Médico UNS'}</strong></li>
        ${extra}
      </ul>`;
  },

  renderResumen() {
    const { idServicio, fecha, hora } = this.state;
    const servicio = ReservasStore.getServicio(idServicio);
    const slot = ReservasStore.getHorariosDisponibles(idServicio, fecha).find(s => s.hora_inicio === hora);
    const medico = slot ? ReservasStore.getMedico(slot.id_medico) : null;
    this.$('ntResumen').innerHTML = this.resumenHTML(servicio, medico, fecha, hora);
  },

  confirmar() {
    const btn = this.$('ntBtnConfirm');
    btn.disabled = true;
    const res = ReservasStore.crearCita({
      id_servicio: this.state.idServicio,
      fecha: this.state.fecha,
      hora_inicio: this.state.hora,
      motivo: this.$('ntMotivo').value,
      adjunto: this.state.adjunto
    });
    btn.disabled = false;

    if (!res.ok) {
      this.mostrarError(res.error);
      // si el horario se ocupó, volver al paso 2 con slots actualizados
      if (/horario/i.test(res.error)) { this.state.hora = null; this.irAPaso(2); }
      return;
    }
    const c = res.cita;
    const extra = `<li><i class="ri-hashtag"></i><span>N° de reserva</span><strong>${ReservasStore.codigoCita(c.id_cita)}</strong></li>`;
    this.$('ntTicket').innerHTML = this.resumenHTML(ReservasStore.getServicio(c.id_servicio), ReservasStore.getMedico(c.id_medico), c.fecha, c.hora_inicio, extra);
    this.mostrarToast('Reserva registrada correctamente', 'success');
    this.irAPaso('ok');
  },

  /* ---------- Navegación ---------- */
  bindNavegacion() {
    this.$('ntBtnPrev').addEventListener('click', () => this.irAPaso(this.state.paso - 1));
    this.$('ntBtnNext').addEventListener('click', () => {
      if (!this.pasoValido()) return;
      this.irAPaso(this.state.paso + 1);
    });
    this.$('ntBtnConfirm').addEventListener('click', () => this.confirmar());
    this.$('ntVerReservas').addEventListener('click', () => AppRouter.loadView('mis_reservas'));
    this.$('ntOtraReserva').addEventListener('click', () => AppRouter.loadView('nuevo_turno'));
  },

  pasoValido() {
    const s = this.state;
    if (s.paso === 1) return !!s.idServicio;
    if (s.paso === 2) return !!(s.fecha && s.hora);
    return true;
  },

  irAPaso(paso) {
    this.state.paso = paso;
    this.mostrarError('');
    const enFlujo = typeof paso === 'number';

    document.querySelectorAll('.nt-panel').forEach(p => { p.hidden = String(p.dataset.panel) !== String(paso); });
    this.$('ntNav').hidden = !enFlujo;

    // stepper
    document.querySelectorAll('.nt-step').forEach(li => {
      const n = Number(li.dataset.step);
      const actual = enFlujo ? paso : 4;
      li.classList.toggle('is-active', n === actual);
      li.classList.toggle('is-done', n < actual);
      li.querySelector('.nt-step-num').innerHTML = n < actual ? '<i class="ri-check-line"></i>' : n;
    });

    if (paso === 2) this.renderSlots();
    if (paso === 3) this.renderResumen();
    this.actualizarBotones();
    document.querySelector('.dash-content-scroll')?.scrollTo({ top: 0, behavior: 'smooth' });
  },

  actualizarBotones() {
    const { paso } = this.state;
    if (typeof paso !== 'number') return;
    this.$('ntBtnPrev').style.visibility = paso === 1 ? 'hidden' : 'visible';
    this.$('ntBtnNext').hidden = paso === 3;
    this.$('ntBtnConfirm').hidden = paso !== 3;
    this.$('ntBtnNext').disabled = !this.pasoValido();
  },

  /* ---------- Mensajes ---------- */
  mostrarError(msg) {
    const el = this.$('ntError');
    if (!el) return;
    el.textContent = msg;
    el.hidden = !msg;
  },

  mostrarToast(msg, tipo = 'info') {
    let cont = document.getElementById('toast-container');
    if (!cont) { cont = document.createElement('div'); cont.id = 'toast-container'; document.body.appendChild(cont); }
    const icons = { success: 'ri-checkbox-circle-fill', info: 'ri-information-fill', error: 'ri-error-warning-fill' };
    const t = document.createElement('div');
    t.className = `custom-toast toast-${tipo}`;
    t.innerHTML = `<i class="${icons[tipo]}"></i><span>${msg}</span>`;
    cont.appendChild(t);
    setTimeout(() => t.classList.add('show'), 10);
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3000);
  }
};
