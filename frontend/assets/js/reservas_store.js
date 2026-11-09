/* =========================================================================
   reservas_store.js  ·  Módulo Estudiante (Michael V.)
   RESPONSABILIDAD: capa de DATOS (simula la BD con localStorage).
   Cuando se integre PHP, SOLO este archivo cambia: cada método pasa a hacer
   fetch('api/....php') y devuelve lo mismo. Las vistas/controladores no se tocan.

   Mapeo a la BD (reservas_medicas_uns.sql):
     servicios -> tabla `servicios`        citas -> tabla `citas`
     medicos   -> `medicos` + `usuarios`   horarios -> `horarios_medicos`
   ========================================================================= */
const ReservasStore = {
  KEYS: { citas: 'uns_citas', seq: 'uns_citas_seq', sesion: 'uns_sesion' },

  /* Horario de atención (aviso del dashboard: L-V, 8:00 a.m. - 1:00 p.m.) */
  HORA_INICIO: '08:00',
  HORA_FIN: '13:00',
  DURACION_MIN: 30,
  DIAS_MAX_ANTICIPACION: 30,
  ADJUNTO_MAX_BYTES: 2 * 1024 * 1024, // 2 MB (localStorage es limitado; en BD irá a /uploads)
  ADJUNTO_TIPOS: ['image/jpeg', 'image/png', 'application/pdf'],

  /* ---- Catálogos (equivalen a las tablas servicios / medicos) ---- */
  SERVICIOS: [
    { id_servicio: 1, nombre: 'Medicina General', descripcion: 'Consulta médica general y control', icono: 'ri-stethoscope-line' },
    { id_servicio: 2, nombre: 'Odontología',      descripcion: 'Evaluación y tratamiento dental',  icono: 'ri-tooth-line' },
    { id_servicio: 3, nombre: 'Psicología',       descripcion: 'Orientación y soporte emocional',  icono: 'ri-mental-health-line' },
    { id_servicio: 4, nombre: 'Oftalmología',     descripcion: 'Examen de la vista',               icono: 'ri-eye-line' },
    { id_servicio: 5, nombre: 'Vacunación',       descripcion: 'Inmunizaciones y campañas',        icono: 'ri-syringe-line' },
    { id_servicio: 6, nombre: 'Laboratorio Clínico', descripcion: 'Análisis y exámenes de laboratorio', icono: 'ri-flask-line' }
  ],

  MEDICOS: [
    { id_medico: 1, nombre: 'Dr. Juan Pérez',    servicios: [1], consultorio: 'Consultorio N° 1' },
    { id_medico: 7, nombre: 'Dra. Marta Salas',  servicios: [1], consultorio: 'Consultorio N° 2' },
    { id_medico: 2, nombre: 'Dra. Ana Torres',   servicios: [2], consultorio: 'Consultorio N° 3' },
    { id_medico: 3, nombre: 'Lic. Luis Mendoza', servicios: [3], consultorio: 'Consultorio N° 4' },
    { id_medico: 4, nombre: 'Dra. Rosa Quispe',  servicios: [4], consultorio: 'Consultorio N° 5' },
    { id_medico: 5, nombre: 'Lic. Carmen Díaz',  servicios: [5], consultorio: 'Tópico de Vacunación' },
    { id_medico: 6, nombre: 'Lic. Pedro Ramos',  servicios: [6], consultorio: 'Laboratorio Clínico' }
  ],

  /* ---- Utilidades de fecha (siempre en hora LOCAL, evita el bug de UTC) ---- */
  hoyISO() { return this.toISO(new Date()); },
  toISO(d) {
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  },
  parseISO(iso) { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); },
  esDiaHabil(iso) { const w = this.parseISO(iso).getDay(); return w >= 1 && w <= 5; },
  fechaMaxISO() { const d = new Date(); d.setDate(d.getDate() + this.DIAS_MAX_ANTICIPACION); return this.toISO(d); },
  /** Primer día hábil desde hoy (si hoy es fin de semana, el lunes). */
  primerDiaHabilISO() {
    const d = new Date();
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
    return this.toISO(d);
  },
  formatoFecha(iso) {
    return this.parseISO(iso).toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  },
  formatoFechaCorta(iso) {
    return this.parseISO(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
  },
  formatoHora(hhmm) {
    const [h, m] = hhmm.split(':').map(Number);
    return `${String((h % 12) || 12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${h >= 12 ? 'p.m.' : 'a.m.'}`;
  },
  _aMin(hhmm) { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; },
  _deMin(min) { return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`; },
  codigoCita(id) { return `CIT-${String(id).padStart(4, '0')}`; },

  /* ---- Sesión (cuando login use la BD, guardará aquí al usuario real) ---- */
  getUsuario() {
    try {
      const s = JSON.parse(localStorage.getItem(this.KEYS.sesion));
      if (s && s.id_usuario) return s;
    } catch (e) { /* ignorar */ }
    return { id_usuario: 1, id_rol: 1, nombres: 'Estudiante', apellidos: 'Demo', dni: '00000000', codigo_universitario: '0000000000' };
  },
  iniciales(u) { return ((u.nombres || 'E')[0] + (u.apellidos || 'S')[0]).toUpperCase(); },

  /* ---- Catálogo ---- */
  getServicios() { return this.SERVICIOS.slice(); },
  getServicio(id) { return this.SERVICIOS.find(s => s.id_servicio === Number(id)) || null; },
  getMedico(id) { return this.MEDICOS.find(m => m.id_medico === Number(id)) || null; },

  /* ---- Persistencia de citas ---- */
  _leer() {
    let lista = null;
    try { lista = JSON.parse(localStorage.getItem(this.KEYS.citas)); } catch (e) { /* ignorar */ }
    if (!Array.isArray(lista)) { lista = this._semilla(); this._guardar(lista, 6); }
    return lista;
  },
  _guardar(lista, seq) {
    try {
      localStorage.setItem(this.KEYS.citas, JSON.stringify(lista));
      if (seq) localStorage.setItem(this.KEYS.seq, String(seq));
      return true;
    } catch (e) { return false; } // cuota excedida
  },
  _siguienteId() {
    const n = Number(localStorage.getItem(this.KEYS.seq) || 0) + 1;
    localStorage.setItem(this.KEYS.seq, String(n));
    return n;
  },
  _semilla() {
    const base = { id_estudiante: 1, id_horario: null, cancelada_en: null, motivo: '', adjunto: null };
    return [
      { ...base, id_cita: 1, id_servicio: 1, id_medico: 1, fecha: '2026-11-10', hora_inicio: '09:30', estado: 'PENDIENTE', creada_en: '2026-11-03T10:15:00', motivo: 'Control por malestar general.' },
      { ...base, id_cita: 2, id_servicio: 2, id_medico: 2, fecha: '2026-11-12', hora_inicio: '10:00', estado: 'PENDIENTE', creada_en: '2026-11-05T16:40:00', motivo: 'Dolor en una muela.' },
      { ...base, id_cita: 3, id_servicio: 3, id_medico: 3, fecha: '2026-10-20', hora_inicio: '08:30', estado: 'ATENDIDA',  creada_en: '2026-10-15T09:00:00' },
      { ...base, id_cita: 4, id_servicio: 1, id_medico: 1, fecha: '2026-10-05', hora_inicio: '09:00', estado: 'CANCELADA', creada_en: '2026-10-01T11:20:00', cancelada_en: '2026-10-03T08:10:00' },
      { ...base, id_cita: 5, id_servicio: 4, id_medico: 4, fecha: '2026-09-18', hora_inicio: '11:00', estado: 'ATENDIDA',  creada_en: '2026-09-10T12:00:00' }
    ];
  },

  /* ---- Disponibilidad (equivale a consultar `horarios_medicos` libres) ---- */
  /** Devuelve [{hora_inicio, disponible, id_medico}] para un servicio y fecha. */
  getHorariosDisponibles(idServicio, fechaISO) {
    if (!this.esDiaHabil(fechaISO)) return [];
    const medicos = this.MEDICOS.filter(m => m.servicios.includes(Number(idServicio)));
    const ocupadas = this._leer().filter(c => c.fecha === fechaISO && c.estado !== 'CANCELADA' && Number(c.id_servicio) === Number(idServicio));
    const ahora = new Date();
    const minAhora = ahora.getHours() * 60 + ahora.getMinutes();
    const esHoy = fechaISO === this.hoyISO();
    const slots = [];
    for (let t = this._aMin(this.HORA_INICIO); t + this.DURACION_MIN <= this._aMin(this.HORA_FIN); t += this.DURACION_MIN) {
      const hora = this._deMin(t);
      const libre = medicos.find(m => !ocupadas.some(c => c.hora_inicio === hora && c.id_medico === m.id_medico));
      const pasado = esHoy && t <= minAhora;
      slots.push({ hora_inicio: hora, disponible: !!libre && !pasado, id_medico: libre ? libre.id_medico : null });
    }
    return slots;
  },

  /** ¿El estudiante ya tiene una cita activa ese día en ese servicio? */
  _tieneDuplicado(idEstudiante, idServicio, fecha) {
    return this._leer().some(c => c.id_estudiante === idEstudiante && Number(c.id_servicio) === Number(idServicio) && c.fecha === fecha && c.estado === 'PENDIENTE');
  },

  /* ---- Operaciones ---- */
  /** data: {id_servicio, fecha, hora_inicio, motivo, adjunto} -> {ok, cita} | {ok:false, error} */
  crearCita(data) {
    const usuario = this.getUsuario();
    if (!this.getServicio(data.id_servicio)) return { ok: false, error: 'Servicio no válido.' };
    if (!this.esDiaHabil(data.fecha)) return { ok: false, error: 'Solo se atiende de lunes a viernes.' };
    if (this._tieneDuplicado(usuario.id_usuario, data.id_servicio, data.fecha)) {
      return { ok: false, error: 'Ya tienes una cita pendiente en este servicio para ese día.' };
    }
    const slot = this.getHorariosDisponibles(data.id_servicio, data.fecha).find(s => s.hora_inicio === data.hora_inicio);
    if (!slot || !slot.disponible) return { ok: false, error: 'Ese horario ya no está disponible. Elige otro.' };

    const lista = this._leer();
    const cita = {
      id_cita: this._siguienteId(),
      id_estudiante: usuario.id_usuario,
      id_servicio: Number(data.id_servicio),
      id_medico: slot.id_medico,
      id_horario: null,
      fecha: data.fecha,
      hora_inicio: data.hora_inicio,
      estado: 'PENDIENTE',
      creada_en: new Date().toISOString(),
      cancelada_en: null,
      motivo: (data.motivo || '').trim(),
      adjunto: data.adjunto || null
    };
    lista.push(cita);
    if (!this._guardar(lista)) return { ok: false, error: 'No hay espacio para guardar el adjunto. Usa un archivo más pequeño.' };
    return { ok: true, cita };
  },

  getCitasEstudiante() {
    const uid = this.getUsuario().id_usuario;
    return this._leer()
      .filter(c => c.id_estudiante === uid)
      .map(c => ({
        ...c,
        servicio: this.getServicio(c.id_servicio),
        medico: this.getMedico(c.id_medico),
        codigo: this.codigoCita(c.id_cita)
      }))
      .sort((a, b) => (b.fecha + b.hora_inicio).localeCompare(a.fecha + a.hora_inicio));
  },

  cancelarCita(idCita) {
    const lista = this._leer();
    const cita = lista.find(c => c.id_cita === Number(idCita) && c.id_estudiante === this.getUsuario().id_usuario);
    if (!cita) return { ok: false, error: 'La cita no existe.' };
    if (cita.estado !== 'PENDIENTE') return { ok: false, error: 'Solo se pueden cancelar citas pendientes.' };
    cita.estado = 'CANCELADA';
    cita.cancelada_en = new Date().toISOString();
    this._guardar(lista);
    return { ok: true, cita };
  },

  /** Utilidad de desarrollo: restablece los datos de ejemplo (consola: ReservasStore.reset()). */
  reset() {
    localStorage.removeItem(this.KEYS.citas);
    localStorage.removeItem(this.KEYS.seq);
    return this._leer().length;
  }
};
