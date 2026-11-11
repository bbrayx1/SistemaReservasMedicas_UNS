/* Agenda del médico: consultas del día, creación de citas y registro de atenciones. */
(() => {
  const $ = id => document.getElementById(id);
  const state = {
    appointments: [],
    lastSignature: '',
    selectedPatient: null,
    selectedSlot: null,
    searchResults: [],
    services: [],
    appointmentToComplete: null,
    searchTimer: null,
    refreshTimer: null
  };

  const esc = AppUtils.escapeHTML;
  const todayISO = () => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };
  const minutesOf = time => { const [hour, minute] = time.split(':').map(Number); return hour * 60 + minute; };
  const waitText = appointment => {
    const now = new Date();
    const difference = now.getHours() * 60 + now.getMinutes() - minutesOf(appointment.hora);
    return difference >= 0 ? `Esperando hace ${difference} min` : `Cita en ${-difference} min`;
  };
  const countUp = (element, finalValue) => {
    const initial = Number(element.textContent) || 0;
    if (initial === finalValue) return;
    const start = performance.now();
    const animate = timestamp => {
      const progress = Math.min((timestamp - start) / 700, 1);
      element.textContent = Math.round(initial + (finalValue - initial) * progress);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  };
  const showToast = message => {
    const toast = $('toast');
    toast.textContent = message;
    toast.hidden = false;
    toast.classList.remove('show');
    void toast.offsetWidth;
    toast.classList.add('show');
    window.setTimeout(() => { toast.classList.remove('show'); toast.hidden = true; }, 3500);
  };
  const setError = (id, message = '') => { $(id).textContent = message; $(id).hidden = !message; };

  function avatar(appointment, small = false) {
    const cls = small ? 'avatar sm' : 'avatar';
    if (appointment.foto) {
      const src = `../../backend/public/${String(appointment.foto).replace(/^\//, '')}`;
      return `<div class="${cls}"><img src="${esc(src)}" alt="${esc(appointment.paciente)}"></div>`;
    }
    const initials = String(appointment.paciente || 'P').split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
    return `<div class="${cls} avatar-initials" aria-label="${esc(appointment.paciente)}">${esc(initials)}</div>`;
  }

  function stateClass(status) {
    return status === 'ATENDIDA' ? 'atendida' : status === 'CANCELADA' ? 'cancelada' : 'pendiente';
  }

  async function loadAgenda(force = false) {
    try {
      const response = await ApiClient.get('medical.agenda');
      $('nombreMedico').textContent = response.medico;
      const signature = JSON.stringify(response.citas || []);
      if (!force && signature === state.lastSignature) return;
      state.lastSignature = signature;
      state.appointments = response.citas || [];
      renderAgenda();
    } catch (error) {
      $('sinCitas').textContent = error.message;
      $('sinCitas').hidden = false;
      if (error.status === 401 || error.status === 403) window.location.href = '../index.html';
    }
  }

  function renderAgenda() {
    const query = $('buscarPaciente').value.trim().toLowerCase();
    const visible = state.appointments.filter(item => `${item.paciente} ${item.dni}`.toLowerCase().includes(query));
    countUp($('totalCitas'), state.appointments.length);
    countUp($('totalPendientes'), state.appointments.filter(item => ['PENDIENTE', 'EN_ESPERA'].includes(item.estado)).length);
    countUp($('totalAtendidas'), state.appointments.filter(item => item.estado === 'ATENDIDA').length);

    $('tablaAgenda').innerHTML = visible.map((item, index) => {
      const status = item.estado === 'ATENDIDA' ? 'Atendida' : item.estado === 'EN_ESPERA' ? 'En espera' : item.estado === 'EN_ATENCION' ? 'En atención' : item.estado === 'CANCELADA' ? 'Cancelada' : 'Pendiente';
      const action = item.estado === 'EN_ATENCION'
        ? `<button type="button" class="btn btn-primary btn-atender" data-action="complete" data-id="${item.id}">Registrar atención</button>`
        : ['PENDIENTE', 'EN_ESPERA'].includes(item.estado)
          ? `<button type="button" class="btn btn-primary btn-atender" data-action="start" data-id="${item.id}">Iniciar atención</button>`
          : `<button type="button" class="btn btn-disabled" disabled>${status}</button>`;
      return `<tr style="animation-delay:${index * 60}ms">
        <td class="hour">${esc(item.hora)}</td>
        <td><div class="who">${avatar(item, true)}<strong>${esc(item.paciente)}</strong></div></td>
        <td>${esc(item.dni)}</td><td>${esc(item.especialidad)}</td>
        <td><span class="badge ${stateClass(item.estado)}">${status}</span></td><td>${action}</td>
      </tr>`;
    }).join('');
    $('sinCitas').textContent = visible.length ? '' : 'No hay citas para mostrar.';
    $('sinCitas').hidden = visible.length > 0;

    const waiting = state.appointments.filter(item => item.estado === 'EN_ESPERA');
    $('listaEspera').innerHTML = waiting.length ? waiting.map((item, index) => `
      <article class="pcard ${index === 0 ? 'next' : ''}" style="animation-delay:${index * 90}ms">
        ${index === 0 ? '<span class="tag">SIGUIENTE</span>' : ''}
        ${avatar(item)}<strong>${esc(item.paciente)}</strong>
        <span class="wait">${esc(item.hora)} · ${esc(item.especialidad)}</span>
        <span class="wait">${waitText(item)} <span class="dots"><i></i><i></i><i></i></span></span>
        <button type="button" class="btn btn-primary btn-atender" data-action="start" data-id="${item.id}">Iniciar atención</button>
      </article>`).join('') : '<p class="sin-espera">No hay pacientes en espera.</p>';
  }

  async function openNewBooking() {
    state.selectedPatient = null;
    state.selectedSlot = null;
    state.searchResults = [];
    setError('citaError');
    $('citaBuscar').value = '';
    $('citaResultados').innerHTML = '';
    $('citaHoras').innerHTML = '';
    $('citaFecha').min = todayISO();
    $('citaFecha').value = todayISO();
    $('citaResumen').textContent = 'Elige paciente, servicio, fecha y hora.';
    $('citaGuardar').disabled = true;
    $('formPacienteRapido').hidden = true;
    $('modalCita').hidden = false;
    $('citaBuscar').focus();
    try {
      const response = await ApiClient.get('medical.services');
      state.services = response.servicios || [];
      $('citaServicio').innerHTML = state.services.length
        ? '<option value="">Selecciona un servicio...</option>' + state.services.map(service => `<option value="${service.id}">${esc(service.nombre)}</option>`).join('')
        : '<option value="">No tienes servicios asignados</option>';
    } catch (error) { setError('citaError', error.message); }
  }

  async function loadDoctorSlots() {
    state.selectedSlot = null;
    updateBookingSummary();
    setError('citaError');
    const serviceId = $('citaServicio').value;
    const date = $('citaFecha').value;
    if (!serviceId || !date) { $('citaHoras').innerHTML = ''; return; }
    $('citaHoras').innerHTML = '<p class="empty">Consultando horarios...</p>';
    try {
      const response = await ApiClient.get('medical.slots', { id_servicio: serviceId, fecha: date });
      const slots = response.horarios || [];
      $('citaHoras').innerHTML = slots.length
        ? slots.map(slot => `<button type="button" class="hora" data-id="${slot.id}" data-hora="${esc(slot.hora)}">${esc(slot.hora)}</button>`).join('')
        : '<p class="empty">No hay horarios disponibles para ese día.</p>';
    } catch (error) {
      $('citaHoras').innerHTML = '';
      setError('citaError', error.message);
    }
  }

  function updateBookingSummary() {
    const valid = state.selectedPatient && state.selectedSlot;
    const serviceName = $('citaServicio').selectedOptions[0]?.textContent || 'Servicio';
    const date = $('citaFecha').value;
    $('citaResumen').textContent = valid
      ? `${state.selectedPatient.nombre} · ${serviceName} · ${date.split('-').reverse().join('/')} a las ${state.selectedSlot.hora}`
      : 'Elige paciente, servicio, fecha y hora.';
    $('citaGuardar').disabled = !valid;
  }

  async function searchPatients() {
    const query = $('citaBuscar').value.trim();
    state.selectedPatient = null;
    updateBookingSummary();
    if (query.length < 3) { $('citaResultados').innerHTML = ''; return; }
    try {
      const response = await ApiClient.get('medical.students.search', { q: query });
      state.searchResults = response.estudiantes || [];
      $('citaResultados').innerHTML = state.searchResults.length ? state.searchResults.map(patient => `
        <button type="button" class="res" data-estudiante="${patient.id}">
          ${avatar({ paciente: patient.nombre, foto: patient.foto }, true)}
          <span><strong>${esc(patient.nombre)}</strong><small>DNI ${esc(patient.dni)}${patient.codigo ? ` · ${esc(patient.codigo)}` : ''}</small></span>
        </button>`).join('') : '<p class="empty">No se encontraron pacientes.</p>';
    } catch (error) { setError('citaError', error.message); }
  }

  async function createQuickPatient(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    try {
      const response = await ApiClient.post('medical.students.create', data);
      state.selectedPatient = {
        id: response.id_estudiante,
        nombre: `${data.nombres} ${data.apellidos}`.trim(),
        dni: data.dni,
        codigo: data.codigo_universitario
      };
      $('citaBuscar').value = data.dni;
      $('citaResultados').innerHTML = `<div class="res sel">${esc(state.selectedPatient.nombre)} · DNI ${esc(data.dni)} <b>Paciente recién registrado</b></div>`;
      form.reset();
      form.hidden = true;
      updateBookingSummary();
      showToast(`Paciente creado. Clave temporal: ${response.clave_temporal}. Comunícala por un canal seguro.`);
    } catch (error) { setError('citaError', error.message); }
  }

  async function saveNewBooking() {
    if (!state.selectedPatient || !state.selectedSlot) return;
    $('citaGuardar').disabled = true;
    setError('citaError');
    try {
      await ApiClient.post('medical.bookings.create', {
        id_estudiante: state.selectedPatient.id,
        id_horario: state.selectedSlot.id
      });
      $('modalCita').hidden = true;
      showToast(`Cita creada para ${state.selectedPatient.nombre}.`);
      state.lastSignature = '';
      await loadAgenda(true);
    } catch (error) {
      setError('citaError', error.message);
      await loadDoctorSlots();
    } finally {
      updateBookingSummary();
    }
  }

  async function startAppointment(id, button) {
    if (button) button.disabled = true;
    try {
      await ApiClient.post('medical.bookings.start', { id_cita: Number(id) });
      showToast('Atención iniciada. Registra los datos clínicos al finalizar.');
      state.lastSignature = '';
      await loadAgenda(true);
    } catch (error) {
      showToast(error.message || 'No se pudo iniciar la atención.');
      if (button) button.disabled = false;
    }
  }

  function openComplete(id) {
    const appointment = state.appointments.find(item => Number(item.id) === Number(id));
    if (!appointment) return;
    state.appointmentToComplete = Number(id);
    $('pacienteAtencion').textContent = `${appointment.paciente} · ${appointment.especialidad} · ${appointment.hora}`;
    $('atencionSintomas').value = appointment.motivo || '';
    $('atencionDiagnostico').value = '';
    $('atencionReceta').value = '';
    setError('atencionError');
    $('modalAtencion').hidden = false;
  }

  async function saveClinicalAttention() {
    const symptoms = $('atencionSintomas').value.trim();
    const diagnosis = $('atencionDiagnostico').value.trim();
    if (!symptoms || !diagnosis) return setError('atencionError', 'Completa los síntomas y el diagnóstico.');
    const button = $('guardarAtencion');
    button.disabled = true;
    try {
      await ApiClient.post('medical.bookings.complete', {
        id_cita: state.appointmentToComplete,
        sintomas: symptoms,
        diagnostico: diagnosis,
        receta_medica: $('atencionReceta').value.trim()
      });
      $('modalAtencion').hidden = true;
      showToast('Atención guardada y cita finalizada.');
      state.lastSignature = '';
      await loadAgenda(true);
    } catch (error) {
      setError('atencionError', error.message);
    } finally {
      button.disabled = false;
    }
  }

  async function init() {
    $('fechaHoy').textContent = new Date().toLocaleDateString('es-PE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    const updateClock = () => { $('reloj').textContent = new Date().toLocaleTimeString('es-PE', { hour12: false }); };
    updateClock();
    state.clockTimer = window.setInterval(updateClock, 1000);

    try {
      const session = await ApiClient.get('auth.me');
      SessionStore.setUser(session.user);
      if (session.user.rol !== 'Médico') { window.location.href = '../index.html'; return; }
    } catch (error) {
      window.location.href = '../index.html';
      return;
    }

    $('buscarPaciente').addEventListener('input', renderAgenda);
    $('tablaAgenda').addEventListener('click', event => {
      const button = event.target.closest('[data-action]');
      if (!button) return;
      if (button.dataset.action === 'start') startAppointment(button.dataset.id, button);
      if (button.dataset.action === 'complete') openComplete(button.dataset.id);
    });
    $('listaEspera').addEventListener('click', event => {
      const button = event.target.closest('[data-action]');
      if (!button) return;
      if (button.dataset.action === 'start') startAppointment(button.dataset.id, button);
      if (button.dataset.action === 'complete') openComplete(button.dataset.id);
    });
    $('btnCerrarSesion').addEventListener('click', async () => {
      try { await ApiClient.post('auth.logout', {}); } catch (error) { /* se redirige igualmente */ }
      SessionStore.clear();
      window.location.href = '../index.html';
    });

    $('btnNuevaCita').addEventListener('click', openNewBooking);
    $('cerrarCita').addEventListener('click', () => { $('modalCita').hidden = true; });
    $('citaCancelar').addEventListener('click', () => { $('modalCita').hidden = true; });
    $('modalCita').addEventListener('click', event => { if (event.target === $('modalCita')) $('modalCita').hidden = true; });
    $('citaServicio').addEventListener('change', loadDoctorSlots);
    $('citaFecha').addEventListener('change', loadDoctorSlots);
    $('citaBuscar').addEventListener('input', () => {
      window.clearTimeout(state.searchTimer);
      state.searchTimer = window.setTimeout(searchPatients, 300);
    });
    $('citaResultados').addEventListener('click', event => {
      const button = event.target.closest('[data-estudiante]');
      if (!button) return;
      state.selectedPatient = state.searchResults.find(patient => Number(patient.id) === Number(button.dataset.estudiante));
      $('citaResultados').querySelectorAll('.res').forEach(item => item.classList.toggle('sel', item === button));
      updateBookingSummary();
    });
    $('btnMostrarPaciente').addEventListener('click', () => { $('formPacienteRapido').hidden = !$('formPacienteRapido').hidden; });
    $('formPacienteRapido').addEventListener('submit', createQuickPatient);
    $('citaHoras').addEventListener('click', event => {
      const button = event.target.closest('[data-id]');
      if (!button) return;
      state.selectedSlot = { id: Number(button.dataset.id), hora: button.dataset.hora };
      $('citaHoras').querySelectorAll('.hora').forEach(item => item.classList.toggle('sel', item === button));
      updateBookingSummary();
    });
    $('citaGuardar').addEventListener('click', saveNewBooking);

    $('cerrarAtencion').addEventListener('click', () => { $('modalAtencion').hidden = true; });
    $('cancelarAtencion').addEventListener('click', () => { $('modalAtencion').hidden = true; });
    $('modalAtencion').addEventListener('click', event => { if (event.target === $('modalAtencion')) $('modalAtencion').hidden = true; });
    $('guardarAtencion').addEventListener('click', saveClinicalAttention);
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') { $('modalCita').hidden = true; $('modalAtencion').hidden = true; }
    });

    await loadAgenda(true);
    state.refreshTimer = window.setInterval(() => loadAgenda(), 30000);
    window.addEventListener('beforeunload', () => {
      window.clearInterval(state.refreshTimer);
      window.clearInterval(state.clockTimer);
    }, { once: true });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
