/* Acciones por rol, en módulos independientes del dashboard y siempre mediante API. */
window.StaffOperationsController = {
  role: '', schedules: [], services: [], doctors: [],
  el(id) { return document.getElementById(id); },
  esc(v) { return AppUtils.escapeHTML(String(v ?? '')); },
  async init(role) {
    this.role = role;
    this.el('staffQueueRefresh').addEventListener('click', () => this.loadQueue());
    this.el('staffPatientDirectorySearch').addEventListener('click', () => this.searchPatients());
    this.el('staffPatientDirectoryQuery').addEventListener('keydown', e => {if(e.key==='Enter') {e.preventDefault();this.searchPatients();}});
    this.el('staffPatientDirectory').addEventListener('click', e => this.openHistory(e));
    this.el('staffNewUser').addEventListener('click', () => {this.el('staffUserManagement').hidden=false;this.el('staffUserManagement').scrollIntoView({behavior:'smooth'});this.loadSpecialties();});
    this.el('staffUserRole').addEventListener('change', () => this.syncUserFields());
    this.el('staffUserForm').addEventListener('submit', e => {e.preventDefault();this.createUser(e);});
    this.el('staffUsersBody').addEventListener('click', e => this.userAction(e));
    this.el('staffUserEditForm').addEventListener('submit',e=>{e.preventDefault();this.editUser(e);});
    this.el('staffUserEditClose').addEventListener('click',()=>this.el('staffUserEditor').hidden=true);
    this.el('staffAssignmentForm').addEventListener('submit',e=>{e.preventDefault();this.assignSpecialty();});
    this.el('staffServiceForm').addEventListener('submit', e => {e.preventDefault();this.saveService();});
    this.el('staffServiceForm').addEventListener('reset', () => {this.el('staffServiceId').value='';});
    this.el('staffServicesList').addEventListener('click', e => this.editService(e));
    this.el('staffScheduleForm').addEventListener('submit', e => {e.preventDefault();this.saveSchedule();});
    this.el('staffSchedulesBody').addEventListener('click', e => this.toggleSchedule(e));
    this.el('staffShowNewPatient').hidden=role==='Administrador';
    this.el('staffShowNewPatient').addEventListener('click',()=>this.el('staffNewPatientForm').hidden=!this.el('staffNewPatientForm').hidden);
    this.el('staffNewPatientForm').addEventListener('submit', e=>{e.preventDefault();this.createPatient(e);});
    this.el('staffQueueCards').addEventListener('click', e => {const b=e.target.closest('[data-arrival]');if(b)this.arrival(Number(b.dataset.arrival));});
    this.el('staffScheduleForm').hidden=role!=='Administrador';
    this.el('staffNewUser').hidden=role!=='Administrador';
    this.syncUserFields();
  },
  syncUserFields() {
    const role=this.el('staffUserRole').value;
    this.el('staffStudentCodeWrap').hidden=role!=='1';
    this.el('staffConsultorioWrap').hidden=role!=='2';
    this.el('staffColegiaturaWrap').hidden=role!=='2';
    this.el('staffUserSpecialtiesWrap').hidden=role!=='2';
    this.el('staffUserForm').elements.codigo_universitario.required=role==='1';
  },
  async loadQueue() {
    const box=this.el('staffQueueCards'), status=this.el('staffNextDetails');
    box.textContent='Consultando citas…';
    try {
      const res=await ApiClient.get('staff.bookings',{fecha:StaffDashboardController.today()});
      const rows=(res.citas||[]).filter(x=>['PENDIENTE','EN_ESPERA','EN_ATENCION'].includes(x.estado)).sort((a,b)=>a.hora.localeCompare(b.hora));
      const next=rows.find(x=>x.estado==='EN_ESPERA')||rows.find(x=>x.estado==='PENDIENTE');
      this.el('staffNextCode').textContent=next?'A-'+String(next.id).padStart(3,'0'):'---';
      status.textContent=next?`SIGUIENTE: ${next.paciente} · ${next.hora} · ${next.especialidad} (${next.estado.replaceAll('_',' ')})`:'No hay pacientes pendientes para hoy.';
      box.innerHTML=rows.length?rows.map(r=>`<article class="staff-patient-card ${next?.id===r.id?'next':''}"><strong>${this.esc(r.paciente)}</strong><small>${this.esc(r.hora)} · ${this.esc(r.especialidad)} · ${this.esc(r.estado.replaceAll('_',' '))}</small><small>Profesional: ${this.esc(r.medico)}</small>${['Secretaria','Administrador'].includes(this.role)&&r.estado==='PENDIENTE'?`<button class="staff-btn staff-primary" data-arrival="${Number(r.id)}">Registrar llegada</button>`:''}</article>`).join(''):'<p>No hay pacientes en espera hoy.</p>';
    } catch(e){box.textContent=e.message;status.textContent='No se pudo cargar la sala de espera.';}
  },
  async arrival(id) {
    if(!confirm(`¿Registrar llegada de la cita #${id}?`))return;
    try{await ApiClient.post('reception.call',{id_cita:id});await this.loadQueue();}
    catch(e){alert(e.message);}
  },
  async searchPatients() {
    const q=this.el('staffPatientDirectoryQuery').value.trim(),box=this.el('staffPatientDirectory');
    if(q.length<3){box.textContent='Escribe al menos tres caracteres.';return;}
    try{const res=await ApiClient.get('medical.students.search',{q});box.innerHTML=(res.estudiantes||[]).map(u=>`<article class="staff-patient-card"><strong>${this.esc(u.nombre)}</strong><small>DNI ${this.esc(u.dni)} · Código ${this.esc(u.codigo||'—')}</small>${this.role==='Médico'?`<button type="button" class="staff-btn" data-history="${Number(u.id)}">Ver antecedentes</button>`:''}</article>`).join('')||'<p>No se encontraron estudiantes.</p>';}
    catch(e){box.textContent=e.message;}
  },
  async openHistory(e) {
    const b=e.target.closest('[data-history]');if(!b)return;
    const box=this.el('staffHistory');box.textContent='Consultando…';
    try{const res=await ApiClient.get('staff.patient.history',{id_estudiante:b.dataset.history});box.innerHTML='<h3>Antecedentes de atención registrados</h3>'+(res.historial||[]).map(x=>`<article><strong>${this.esc(x.fecha)} · ${this.esc(x.servicio)}</strong><p><b>Profesional:</b> ${this.esc(x.profesional)}</p><p><b>Síntomas:</b> ${this.esc(x.sintomas)}</p><p><b>Diagnóstico:</b> ${this.esc(x.diagnostico)}</p><p><b>Indicaciones:</b> ${this.esc(x.receta_medica||'Sin indicaciones')}</p></article>`).join('')||'Sin antecedentes registrados.';}
    catch(e){box.textContent=e.message;}
  },
  async createPatient(e) {
    const form=e.currentTarget, data=Object.fromEntries(new FormData(form));
    try{const res=await ApiClient.post('medical.students.create',data);this.el('staffCreateResult').textContent=`Paciente creado. Clave temporal: ${res.clave_temporal}. Entrégala exclusivamente al titular.`;form.reset();form.hidden=true;this.el('staffPatientQuery').value=data.dni;await StaffDashboardController.findPatients();this.el('staffPatient').value=String(res.id_estudiante);}
    catch(err){this.el('staffCreateResult').textContent=err.message;}
  },
  async loadSpecialties() {
    try{const res=await ApiClient.get('staff.services');this.services=res.servicios||[];this.el('staffUserSpecialties').innerHTML=this.services.filter(s=>Number(s.activo)===1).map(s=>`<option value="${Number(s.id)}">${this.esc(s.nombre)}</option>`).join('');}
    catch(e){this.el('staffUserMessage').textContent=e.message;}
  },
  async createUser(e) {
    const form=e.currentTarget, button=form.querySelector('[type=submit]');const data=Object.fromEntries(new FormData(form));
    data.id_rol=Number(data.id_rol);data.servicios=[...this.el('staffUserSpecialties').selectedOptions].map(o=>Number(o.value));
    button.disabled=true;
    try{const res=await ApiClient.post('staff.users.create',data);this.el('staffUserMessage').textContent=`Usuario #${res.id_usuario} creado. Comparte las credenciales mediante un canal privado.`;form.reset();this.syncUserFields();await StaffDashboardController.loadUsers();}
    catch(err){this.el('staffUserMessage').textContent=err.message;}
    finally{button.disabled=false;}
  },
  async userAction(e){
    const edit=e.target.closest('[data-edit-user]');
    if(edit){const id=Number(edit.dataset.editUser);try{const res=await ApiClient.get('staff.users');const u=(res.usuarios||[]).find(v=>Number(v.id_usuario)===id);if(!u)return;const f=this.el('staffUserEditForm');['id_usuario','nombres','apellidos','correo'].forEach(k=>f.elements[k].value=u[k]);this.el('staffUserEditor').hidden=false;this.el('staffUserEditor').scrollIntoView({behavior:'smooth'});}catch(err){alert(err.message);}return;}
    this.toggleUser(e);
  },
  async editUser(e){const form=e.currentTarget,data=Object.fromEntries(new FormData(form));try{await ApiClient.post('staff.users.edit',data);this.el('staffUserEditMessage').textContent='Datos actualizados.';await StaffDashboardController.loadUsers();}catch(err){this.el('staffUserEditMessage').textContent=err.message;}},
  async loadAssignments(){try{const [catalog,schedules]=await Promise.all([ApiClient.get('staff.services'),ApiClient.get('staff.schedules')]);this.services=catalog.servicios||[];this.doctors=schedules.profesionales||[];
    const unique=[...new Map(this.doctors.map(d=>[Number(d.id),d])).values()];
    this.el('staffAssignmentDoctor').innerHTML=unique.map(d=>`<option value="${Number(d.id)}">${this.esc(d.nombre)}</option>`).join('');
    this.el('staffAssignmentService').innerHTML=this.services.filter(s=>Number(s.activo)).map(s=>`<option value="${Number(s.id)}">${this.esc(s.nombre)}</option>`).join('');
  }catch(e){this.el('staffAssignmentMessage').textContent=e.message;}},
  async assignSpecialty(){const id_medico=Number(this.el('staffAssignmentDoctor').value),id_servicio=Number(this.el('staffAssignmentService').value);try{await ApiClient.post('staff.doctors.assign',{id_medico,id_servicio,asignar:1});this.el('staffAssignmentMessage').textContent='Especialidad asignada al profesional.';}catch(e){this.el('staffAssignmentMessage').textContent=e.message;}},
  async toggleUser(e) {
    const b=e.target.closest('[data-toggle-user]');if(!b)return;
    const id=Number(b.dataset.toggleUser),active=Number(b.dataset.userActive)?0:1;
    if(!confirm(`${active?'Activar':'Desactivar'} al usuario #${id}?`))return;
    try{await ApiClient.post('staff.users.update',{id_usuario:id,activo:active});await StaffDashboardController.loadUsers();}
    catch(err){alert(err.message);}
  },
  async loadServices() {
    const box=this.el('staffServicesList');box.textContent='Cargando servicios…';
    try{const res=await ApiClient.get('staff.services');this.services=res.servicios||[];box.innerHTML=this.services.map(s=>`<article class="staff-patient-card"><strong>${this.esc(s.nombre)}</strong><small>${this.esc(s.descripcion||'Sin descripción')} · ${Number(s.activo)?'Activo':'Inactivo'}</small><button class="staff-btn" type="button" data-edit-service="${Number(s.id)}">Editar</button><button class="staff-btn" type="button" data-toggle-service="${Number(s.id)}">${Number(s.activo)?'Desactivar':'Activar'}</button></article>`).join('');}
    catch(err){box.textContent=err.message;}
  },
  async editService(e){const toggle=e.target.closest('[data-toggle-service]');if(toggle){const service=this.services.find(x=>Number(x.id)===Number(toggle.dataset.toggleService));if(!service)return;try{await ApiClient.post('staff.services.save',{id_servicio:Number(service.id),nombre:service.nombre,descripcion:service.descripcion||'',activo:Number(service.activo)?0:1});await this.loadServices();}catch(err){this.el('staffServiceMessage').textContent=err.message;}return;}const b=e.target.closest('[data-edit-service]');if(!b)return;const s=this.services.find(x=>Number(x.id)===Number(b.dataset.editService));if(!s)return;this.el('staffServiceId').value=s.id;this.el('staffServiceName').value=s.nombre;this.el('staffServiceDescription').value=s.descripcion||'';this.el('staffServiceName').focus();},
  async saveService() {
    const d={id_servicio:Number(this.el('staffServiceId').value),nombre:this.el('staffServiceName').value.trim(),descripcion:this.el('staffServiceDescription').value.trim(),activo:1};
    try{await ApiClient.post('staff.services.save',d);this.el('staffServiceMessage').textContent='Servicio guardado correctamente.';this.el('staffServiceForm').reset();this.el('staffServiceId').value='';await this.loadServices();}
    catch(err){this.el('staffServiceMessage').textContent=err.message;}
  },
  async loadSchedules() {
    const body=this.el('staffSchedulesBody');body.innerHTML='<tr><td colspan="6">Consultando horarios…</td></tr>';
    try{if(!this.services.length){const cats=await ApiClient.get('staff.services');this.services=cats.servicios||[];}const res=await ApiClient.get('staff.schedules');this.schedules=res.horarios||[];this.doctors=res.profesionales||[];this.el('staffScheduleDate').min=StaffDashboardController.today();if(!this.el('staffScheduleDate').value)this.el('staffScheduleDate').value=StaffDashboardController.today();
      this.el('staffScheduleDoctor').innerHTML=this.doctors.map(x=>`<option value="${Number(x.id)}:${Number(x.id_servicio)}">${this.esc(x.nombre)} · ${this.esc(this.services.find(s=>Number(s.id)===Number(x.id_servicio))?.nombre||'Servicio #'+x.id_servicio)}</option>`).join('');
      body.innerHTML=this.schedules.map(h=>`<tr><td>${this.esc(h.fecha)}</td><td>${this.esc(h.inicio)}–${this.esc(h.fin)}</td><td>${this.esc(h.profesional)}</td><td>${this.esc(h.servicio)}</td><td>${Number(h.activo)?'Disponible':'Inactivo'}</td><td>${this.role==='Administrador'?`<button type="button" class="staff-btn" data-slot-toggle="${Number(h.id)}" data-slot-active="${Number(h.activo)}">${Number(h.activo)?'Desactivar':'Activar'}</button>`:'Solo lectura'}</td></tr>`).join('')||'<tr><td colspan="6">No hay horarios en los próximos 60 días.</td></tr>';
    }catch(e){body.innerHTML=`<tr><td colspan="6">${this.esc(e.message)}</td></tr>`;}
  },
  async saveSchedule() {
    const selected=this.el('staffScheduleDoctor').value.split(':').map(Number);
    if(selected.length!==2||!selected[0]||!selected[1])return this.el('staffScheduleMessage').textContent='Selecciona un profesional y servicio.';
    try{await ApiClient.post('staff.schedules.save',{id_medico:selected[0],id_servicio:selected[1],fecha:this.el('staffScheduleDate').value,hora_inicio:this.el('staffScheduleHour').value});this.el('staffScheduleMessage').textContent='Horario registrado.';await this.loadSchedules();}
    catch(e){this.el('staffScheduleMessage').textContent=e.message;}
  },
  async toggleSchedule(e) {
    const b=e.target.closest('[data-slot-toggle]');if(!b)return;
    try{await ApiClient.post('staff.schedules.toggle',{id_horario:Number(b.dataset.slotToggle),activo:Number(b.dataset.slotActive)?0:1});await this.loadSchedules();}
    catch(err){this.el('staffScheduleMessage').textContent=err.message;}
  }
};
