/* Única fuente de información: API PHP -> MySQL. Acciones restringidas por rol en el servidor. */
window.StaffDashboardController = {
  rows: [], role: '', tab: 'overview', charts: [],
  async init() {
    const user = SessionStore.getUser();
    this.role = user?.rol || '';
    if (!['Médico', 'Secretaria', 'Administrador'].includes(this.role)) return AppRouter.goToRoleHome(user || {});
    const $ = id => document.getElementById(id);
    $('staffName').textContent = SessionStore.fullName(user);
    $('staffAvatar').textContent = SessionStore.initials(user);
    $('staffRole').textContent = this.role === 'Secretaria' ? 'Recepción' : this.role;
    $('staffWelcome').textContent = `¡Hola, ${user.nombres || 'Personal'}!`;
    $('staffSubtitle').textContent = this.role === 'Médico' ? 'Consulta tus pacientes, inicia la consulta y registra la atención.' : this.role === 'Secretaria' ? 'Gestiona la llegada de los estudiantes y revisa todas sus reservas.' : 'Supervisa las reservas, consulta los usuarios y revisa indicadores reales.';
    $('staffCreateLink').hidden = false;
    $('staffServicesLink').hidden = this.role !== 'Administrador';
    $('staffAssignmentsLink').hidden = this.role !== 'Administrador';
    $('staffPatientsLink').hidden = this.role === 'Administrador';
    $('staffUsersLink').hidden = this.role !== 'Administrador';
    $('staffReportsLink').hidden = this.role !== 'Administrador';
    document.querySelectorAll('[data-staff-tab]').forEach(link => link.addEventListener('click', e => {e.preventDefault();this.showTab(link.dataset.staffTab);}));
    document.querySelector('[data-action="logout"]')?.addEventListener('click', e => {e.preventDefault();AppRouter.logout();});
    $('staffGlobalSearch').addEventListener('input', () => this.reload());
    $('staffDate').addEventListener('change', () => this.reload());
    $('staffClearDate').addEventListener('click', () => { $('staffDate').value=''; this.reload(); });
    $('staffReload').addEventListener('click', () => this.reload());
    $('staffBookingsBody').addEventListener('click', e => this.act(e));
    $('staffAttendClose').addEventListener('click', () => $('staffAttendDialog').close());
    $('staffAttendForm').addEventListener('submit', e => {e.preventDefault();this.finish();});
    if (['Médico','Secretaria','Administrador'].includes(this.role)) {
      $('staffPatientQuery').addEventListener('input', () => this.findPatients());
      $('staffService').addEventListener('change', () => this.loadSlots());
      $('staffSlotDate').addEventListener('change', () => this.loadSlots());
      $('staffCreateBooking').addEventListener('click', () => this.createBooking());
      $('staffSlotDate').min=this.today();
      $('staffSlotDate').value=this.today();
      await this.loadDoctorServices();
    }
    StaffOperationsController.init(this.role);
    await this.reload();
  },
  async showTab(tab) {
    if (['users','reports'].includes(tab) && this.role !== 'Administrador') return;
    if (['services','assignments'].includes(tab) && this.role !== 'Administrador') return;
    this.tab=tab;
    const $=id=>document.getElementById(id);
    document.querySelectorAll('#staffNavigation [data-staff-tab]').forEach(el=>el.classList.toggle('active',el.dataset.staffTab===tab));
    $('staffBookingsSection').hidden = !['overview','bookings','today'].includes(tab);
    $('staffDoctorBooking').hidden = tab !== 'create';
    $('staffStats').hidden = !['overview','bookings','today'].includes(tab);
    $('staffShortcuts').hidden = !['overview','bookings','today'].includes(tab);
    $('staffUsersSection').hidden = tab !== 'users';
    $('staffReportsSection').hidden = tab !== 'reports';
    ['Queue','Patients','Schedules','Services'].forEach(k=>{const el=$('staff'+k+'Section');if(el)el.hidden=tab!==k.toLowerCase();});
    $('staffUserManagement').hidden=true;
    $('staffUserEditor').hidden=true;
    $('staffAssignmentsSection').hidden=tab!=='assignments';
    $('staffDate').value = tab==='today' ? this.today() : '';
    $('staffSectionTitle').textContent = tab==='today'?'Agenda de hoy':this.role==='Médico'?'Mis citas médicas':'Reservas de estudiantes';
    if (tab==='queue') return StaffOperationsController.loadQueue();
    if (tab==='patients') return;
    if (tab==='schedules') return StaffOperationsController.loadSchedules();
    if (tab==='services') return StaffOperationsController.loadServices();
    if (tab==='assignments') return StaffOperationsController.loadAssignments();
    if (tab==='create') return;
    if (tab==='users') return this.loadUsers();
    if (tab==='reports') return this.loadReports();
    await this.reload();
  },
  today(){const now=new Date();const p=n=>String(n).padStart(2,'0');return `${now.getFullYear()}-${p(now.getMonth()+1)}-${p(now.getDate())}`;},
  async reload(){
    const body=document.getElementById('staffBookingsBody');
    const date=document.getElementById('staffDate').value;
    const query=document.getElementById('staffGlobalSearch').value.trim();
    body.innerHTML='<tr><td colspan="7">Consultando las reservas de la base de datos…</td></tr>';
    try {
      const result=await ApiClient.get('staff.bookings',{fecha:date,q:query});
      if (!document.getElementById('staffBookingsBody')) return;
      this.rows=result.citas||[]; this.render();
    }catch(err){body.innerHTML=`<tr><td colspan="7">${AppUtils.escapeHTML(err.message)}</td></tr>`;}
  },
  render(){
    const $=id=>document.getElementById(id), esc=AppUtils.escapeHTML;
    const rows=this.rows, today=this.today();
    $('staffStats').innerHTML=[['Reservas',rows.length],['Pendientes',rows.filter(r=>r.estado==='PENDIENTE').length],['En espera / atención',rows.filter(r=>['EN_ESPERA','EN_ATENCION'].includes(r.estado)).length],['Atendidas',rows.filter(r=>r.estado==='ATENDIDA').length]].map(([label,n])=>`<article class="staff-stat"><span>${label}</span><strong>${n}</strong></article>`).join('');
    $('staffBookingsBody').innerHTML=rows.length?rows.map(r=>{
      let actions='—';
      if(this.role==='Secretaria'||this.role==='Administrador') {
        if(r.estado==='PENDIENTE'&&r.fecha===today) actions=`<button class="staff-btn staff-primary" data-operation="arrival" data-id="${Number(r.id)}">Registrar llegada</button>`;
      }
      if(this.role==='Médico'&&r.fecha===today){
        if(['PENDIENTE','EN_ESPERA'].includes(r.estado)) actions=`<button class="staff-btn staff-primary" data-operation="start" data-id="${Number(r.id)}">Iniciar atención</button>`;
        if(r.estado==='EN_ATENCION') actions=`<button class="staff-btn staff-primary" data-operation="finish" data-id="${Number(r.id)}">Finalizar atención</button>`;
      }
      return `<tr><td>${esc(r.fecha)}</td><td>${esc(r.hora)}</td><td><strong>${esc(r.paciente)}</strong><small>DNI: ${esc(r.dni)}</small></td><td>${esc(r.especialidad)}</td><td>${esc(r.medico)}</td><td><span class="staff-status ${esc(r.estado)}">${esc(r.estado.replaceAll('_',' '))}</span></td><td>${actions}</td></tr>`;
    }).join(''):'<tr><td colspan="7">No existen citas con los filtros actuales. Prueba «Todas las fechas» para revisar las reservas futuras.</td></tr>';
  },
  async act(e){
    const b=e.target.closest('[data-operation]'); if(!b)return;
    const id=Number(b.dataset.id),op=b.dataset.operation;
    if(op==='finish') {
      this.activeBooking=id;
      document.getElementById('staffAttendPatient').textContent=this.rows.find(r=>Number(r.id)===id)?.paciente||'';
      document.getElementById('staffAttendDialog').showModal();return;
    }
    b.disabled=true;
    try{await ApiClient.post(op==='arrival'?'reception.call':'medical.bookings.start',{id_cita:id});await this.reload();}
    catch(err){alert(err.message);b.disabled=false;}
  },
  async finish(){
    const $=id=>document.getElementById(id);
    const body={id_cita:this.activeBooking,sintomas:$('staffSymptoms').value.trim(),diagnostico:$('staffDiagnosis').value.trim(),receta_medica:$('staffPrescription').value.trim()};
    if(!body.sintomas||!body.diagnostico)return alert('Síntomas y diagnóstico son obligatorios.');
    try{await ApiClient.post('medical.bookings.complete',body);$('staffAttendDialog').close();$('staffAttendForm').reset();await this.reload();}
    catch(err){alert(err.message);}
  },
  async loadDoctorServices(){
    try{const res=await ApiClient.get('medical.services');
      document.getElementById('staffService').innerHTML='<option value="">Seleccionar especialidad</option>'+(res.servicios||[]).map(s=>`<option value="${Number(s.id)}">${AppUtils.escapeHTML(s.nombre)}</option>`).join('');}
    catch(err){document.getElementById('staffCreateResult').textContent=err.message;}
  },
  async findPatients(){
    const query=document.getElementById('staffPatientQuery').value.trim();
    if(query.length<3){document.getElementById('staffPatient').innerHTML='<option value="">Escribe al menos 3 caracteres</option>';return;}
    try{const res=await ApiClient.get('medical.students.search',{q:query});
      document.getElementById('staffPatient').innerHTML='<option value="">Seleccionar estudiante</option>'+(res.estudiantes||[]).map(u=>`<option value="${Number(u.id)}">${AppUtils.escapeHTML(u.nombre)} · ${AppUtils.escapeHTML(u.dni)}</option>`).join('');}
    catch(err){document.getElementById('staffCreateResult').textContent=err.message;}
  },
  async loadSlots(){
    const service=document.getElementById('staffService').value, date=document.getElementById('staffSlotDate').value;
    const select=document.getElementById('staffSlot');
    select.innerHTML='<option value="">Selecciona fecha y especialidad</option>';
    if(!service||!date)return;
    try{const res=await ApiClient.get('medical.slots',{id_servicio:service,fecha:date});
      select.innerHTML='<option value="">Selecciona hora</option>'+(res.horarios||[]).map(h=>`<option value="${Number(h.id)}">${AppUtils.escapeHTML(h.hora)} · ${AppUtils.escapeHTML(h.medico||'')}</option>`).join('');}
    catch(err){document.getElementById('staffCreateResult').textContent=err.message;}
  },
  async createBooking(){
    const patient=Number(document.getElementById('staffPatient').value), slot=Number(document.getElementById('staffSlot').value);
    const status=document.getElementById('staffCreateResult');
    if(!patient||!slot){status.textContent='Selecciona estudiante y horario libre.';return;}
    const button=document.getElementById('staffCreateBooking');button.disabled=true;
    try{const res=await ApiClient.post('medical.bookings.create',{id_estudiante:patient,id_horario:slot});status.textContent=`Cita #${res.id_cita} registrada correctamente.`;await this.loadSlots();}
    catch(err){status.textContent=err.message;}
    finally{button.disabled=false;}
  },
  async loadUsers(){
    const body=document.getElementById('staffUsersBody');body.innerHTML='<tr><td colspan="6">Cargando usuarios…</td></tr>';
    try{const res=await ApiClient.get('staff.users');body.innerHTML=(res.usuarios||[]).map(u=>`<tr><td>${AppUtils.escapeHTML(u.nombres+' '+u.apellidos)}</td><td>${AppUtils.escapeHTML(u.dni)}</td><td>${AppUtils.escapeHTML(u.codigo_universitario||'—')}</td><td>${AppUtils.escapeHTML(u.rol)}</td><td>${AppUtils.escapeHTML(u.correo)}</td><td>${u.activo==1?'Activo':'Inactivo'}</td><td><button class="staff-btn" data-edit-user="${Number(u.id_usuario)}">Editar</button> <button class="staff-btn" data-toggle-user="${Number(u.id_usuario)}" data-user-active="${Number(u.activo)}">${u.activo==1?'Desactivar':'Activar'}</button></td></tr>`).join('')||'<tr><td colspan="6">No hay usuarios.</td></tr>';}
    catch(err){body.innerHTML=`<tr><td colspan="6">${AppUtils.escapeHTML(err.message)}</td></tr>`;}
  },
  async loadReports(){
    try{const response=await ApiClient.get('admin.metrics'), m=response.metricas;
      document.getElementById('staffReportMetrics').textContent=`Hoy: ${m.hoy.total} citas · Pendientes: ${m.hoy.pendientes} · Atendidas: ${m.hoy.atendidas}`;
      this.charts.forEach(c=>c.destroy());this.charts=[];
      if(!window.Chart)return;
      this.charts.push(new Chart(document.getElementById('staffMonthChart'),{type:'bar',data:{labels:m.mensual.map(x=>x.periodo),datasets:[{label:'Citas',data:m.mensual.map(x=>Number(x.total)),backgroundColor:'#a90d32'}]},options:{responsive:true,maintainAspectRatio:false}}));
      this.charts.push(new Chart(document.getElementById('staffServiceChart'),{type:'doughnut',data:{labels:m.servicios.map(x=>x.nombre),datasets:[{data:m.servicios.map(x=>Number(x.total)),backgroundColor:['#a90d32','#285c80','#a97b20','#357c65','#8265a7','#ca6643']}]},options:{responsive:true,maintainAspectRatio:false}}));
    }catch(err){document.getElementById('staffReportMetrics').textContent=err.message;}
  }
};
