/* =========================================================================
   mis_reservas.js  ·  Módulo Estudiante (Michael V.)
   RESPONSABILIDAD: pintar el historial de citas del alumno, filtros,
   detalle y cancelación. Los DATOS los pide a ReservasStore.
   ========================================================================= */
const MisReservasController = {
  filtro: 'TODAS',
  busqueda: '',
  citaACancelar: null,

  ETIQUETAS: {
    PENDIENTE: { texto: 'Pendiente', clase: 'pendiente', icono: 'ri-hourglass-line' },
    ATENDIDA:  { texto: 'Atendida',  clase: 'atendida',  icono: 'ri-check-line' },
    CANCELADA: { texto: 'Cancelada', clase: 'cancelada', icono: 'ri-close-line' }
  },

  init() {
    this.filtro = 'TODAS';
    this.busqueda = '';
    this.citaACancelar = null;
    this.$ = id => document.getElementById(id);

    const u = ReservasStore.getUsuario();
    this.$('mrUserAvatar').textContent = ReservasStore.iniciales(u);
    this.$('mrUserName').textContent = `${u.nombres} ${u.apellidos}`.trim();

    this.bindEventos();
    this.render();
  },

  esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },

  bindEventos() {
    this.$('mrBtnNuevo').addEventListener('click', () => AppRouter.loadView('nuevo_turno'));

    this.$('mrFiltros').addEventListener('click', e => {
      const chip = e.target.closest('.mr-chip');
      if (!chip) return;
      this.filtro = chip.dataset.estado;
      document.querySelectorAll('.mr-chip').forEach(c => c.classList.toggle('is-active', c === chip));
      this.render();
    });

    this.$('mrBuscar').addEventListener('input', e => {
      this.busqueda = e.target.value.trim().toLowerCase();
      this.render();
    });

    // acciones de cada fila (delegación)
    this.$('mrTbody').addEventListener('click', e => {
      const btn = e.target.closest('button[data-accion]');
      if (!btn) return;
      const id = Number(btn.dataset.id);
      if (btn.dataset.accion === 'detalle') this.abrirDetalle(id);
      if (btn.dataset.accion === 'cancelar') this.abrirCancelar(id);
    });

    // cierre de modales
    document.querySelectorAll('.mr-modal').forEach(m => {
      m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-cerrar]')) m.hidden = true; });
    });
    if (this.escListener) document.removeEventListener('keydown', this.escListener); // evita duplicar al re-entrar a la vista
    this.escListener = e => { if (e.key === 'Escape') document.querySelectorAll('.mr-modal').forEach(m => { m.hidden = true; }); };
    document.addEventListener('keydown', this.escListener);

    this.$('mrConfirmarCancelar').addEventListener('click', () => this.confirmarCancelacion());
  },

  /* ---------- Render ---------- */
  render() {
    const todas = ReservasStore.getCitasEstudiante();

    // contadores (siempre sobre el total)
    this.$('mrStatTotal').textContent = todas.length;
    this.$('mrStatPend').textContent = todas.filter(c => c.estado === 'PENDIENTE').length;
    this.$('mrStatAten').textContent = todas.filter(c => c.estado === 'ATENDIDA').length;
    this.$('mrStatCanc').textContent = todas.filter(c => c.estado === 'CANCELADA').length;

    const lista = todas.filter(c => {
      if (this.filtro !== 'TODAS' && c.estado !== this.filtro) return false;
      if (!this.busqueda) return true;
      return `${c.servicio.nombre} ${c.codigo}`.toLowerCase().includes(this.busqueda);
    });

    const tbody = this.$('mrTbody');
    const vacio = this.$('mrVacio');
    vacio.hidden = lista.length > 0;
    this.$('mrTbody').closest('.mr-table-wrap').hidden = lista.length === 0;

    if (!lista.length) {
      this.$('mrVacioTxt').textContent = todas.length
        ? 'No hay reservas que coincidan con el filtro.'
        : 'Aún no tienes reservas. ¡Agenda tu primer turno!';
      return;
    }

    tbody.innerHTML = lista.map(c => {
      const et = this.ETIQUETAS[c.estado];
      const puedeCancelar = c.estado === 'PENDIENTE';
      return `
        <tr>
          <td><span class="mr-code">${c.codigo}</span></td>
          <td>
            <div class="mr-serv"><span class="mr-serv-ico"><i class="${c.servicio.icono}"></i></span>${this.esc(c.servicio.nombre)}</div>
          </td>
          <td>${ReservasStore.formatoFechaCorta(c.fecha)}</td>
          <td class="mr-hour">${ReservasStore.formatoHora(c.hora_inicio)}</td>
          <td>${c.medico ? this.esc(c.medico.nombre) : '—'}</td>
          <td><span class="mr-badge ${et.clase}"><i class="${et.icono}"></i> ${et.texto}</span></td>
          <td class="mr-acc">
            <button type="button" class="mr-btn-ghost" data-accion="detalle" data-id="${c.id_cita}" title="Ver detalle"><i class="ri-eye-line"></i></button>
            ${puedeCancelar
              ? `<button type="button" class="mr-btn-cancel" data-accion="cancelar" data-id="${c.id_cita}"><i class="ri-close-circle-line"></i> Cancelar cita</button>`
              : `<span class="mr-btn-na">—</span>`}
          </td>
        </tr>`;
    }).join('');
  },

  /* ---------- Detalle ---------- */
  abrirDetalle(id) {
    const c = ReservasStore.getCitasEstudiante().find(x => x.id_cita === id);
    if (!c) return;
    const et = this.ETIQUETAS[c.estado];
    const fila = (ico, k, v) => `<li><i class="${ico}"></i><span>${k}</span><strong>${v}</strong></li>`;

    let adjunto = '<em>Sin archivos adjuntos</em>';
    if (c.adjunto && c.adjunto.data) {
      adjunto = c.adjunto.tipo.startsWith('image/')
        ? `<a href="${c.adjunto.data}" download="${this.esc(c.adjunto.nombre)}" class="mr-adj"><img src="${c.adjunto.data}" alt="Adjunto"><span>${this.esc(c.adjunto.nombre)}</span></a>`
        : `<a href="${c.adjunto.data}" download="${this.esc(c.adjunto.nombre)}" class="mr-adj"><i class="ri-file-pdf-2-line"></i><span>${this.esc(c.adjunto.nombre)}</span></a>`;
    }

    this.$('mrDetalleBody').innerHTML = `
      <ul class="mr-detalle">
        ${fila('ri-hashtag', 'N° de reserva', c.codigo)}
        ${fila('ri-stethoscope-line', 'Servicio', this.esc(c.servicio.nombre))}
        ${fila('ri-calendar-line', 'Fecha', ReservasStore.formatoFecha(c.fecha))}
        ${fila('ri-time-line', 'Hora', ReservasStore.formatoHora(c.hora_inicio))}
        ${fila('ri-user-heart-line', 'Profesional', c.medico ? this.esc(c.medico.nombre) : '—')}
        ${fila('ri-map-pin-line', 'Lugar', c.medico ? this.esc(c.medico.consultorio) : 'Centro Médico UNS')}
        ${fila('ri-flag-line', 'Estado', `<span class="mr-badge ${et.clase}"><i class="${et.icono}"></i> ${et.texto}</span>`)}
        ${fila('ri-chat-1-line', 'Motivo', c.motivo ? this.esc(c.motivo) : '<em>No indicado</em>')}
        ${fila('ri-attachment-2', 'Adjunto', adjunto)}
        ${c.cancelada_en ? fila('ri-close-circle-line', 'Cancelada el', new Date(c.cancelada_en).toLocaleString('es-PE')) : ''}
      </ul>`;
    this.$('mrModalDetalle').hidden = false;
  },

  /* ---------- Cancelar ---------- */
  abrirCancelar(id) {
    const c = ReservasStore.getCitasEstudiante().find(x => x.id_cita === id);
    if (!c) return;
    this.citaACancelar = id;
    this.$('mrCancelarTxt').textContent =
      `${c.servicio.nombre} · ${ReservasStore.formatoFechaCorta(c.fecha)} a las ${ReservasStore.formatoHora(c.hora_inicio)}. Esta acción no se puede deshacer.`;
    this.$('mrModalCancelar').hidden = false;
  },

  confirmarCancelacion() {
    const res = ReservasStore.cancelarCita(this.citaACancelar);
    this.$('mrModalCancelar').hidden = true;
    this.citaACancelar = null;
    if (!res.ok) return this.mostrarToast(res.error, 'error');
    this.mostrarToast('La cita fue cancelada.', 'success');
    this.render();
  },

  /* ---------- Toast ---------- */
  mostrarToast(msg, tipo = 'info') {
    let cont = document.getElementById('toast-container');
    if (!cont) { cont = document.createElement('div'); cont.id = 'toast-container'; document.body.appendChild(cont); }
    const icons = { success: 'ri-checkbox-circle-fill', info: 'ri-information-fill', error: 'ri-error-warning-fill' };
    const t = document.createElement('div');
    t.className = `custom-toast toast-${tipo}`;
    t.innerHTML = `<i class="${icons[tipo]}"></i><span>${this.esc(msg)}</span>`;
    cont.appendChild(t);
    setTimeout(() => t.classList.add('show'), 10);
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3000);
  }
};
