/* Módulo Médico - Agenda (Aquino)
   Conectado a la BD mediante ../api/agenda/agenda.php. Solo LEE las citas del médico y CREA citas nuevas;
   el cambio a ATENDIDA lo hace el módulo de atención clínica (historia_clinica.html). */
(() => {
  const $ = (id) => document.getElementById(id);
  const API = "../api/agenda/agenda.php";
  let citas = [], ultima = "";

  const fechaLocal = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
  function escapeHTML(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}

  async function api(accion, params = {}, cuerpo = null){
    const url = API + "?" + new URLSearchParams({accion, ...params});
    const r = await fetch(url, cuerpo
      ? {method:"POST", credentials:"same-origin", headers:{"Content-Type":"application/json"}, body:JSON.stringify(cuerpo)}
      : {credentials:"same-origin"});
    let d; try { d = await r.json(); } catch(e) { d = {error:"Respuesta inválida del servidor"}; }
    if (r.status === 401) { window.location.href = "../login.html"; throw new Error(d.error); }
    if (!r.ok || !d.ok) throw new Error(d.error || "Error " + r.status);
    return d;
  }

  // ---------- Avatares (foto_perfil de la BD o ilustración generada) ----------
  const PIEL=["#f1c27d","#e8b08a","#c68642","#8d5524","#f5d0b0"], PELO=["#2b1b17","#171010","#6b3b1d","#a0522d","#0f0a0a"];
  const ROPA=["#dc2c4c","#b70730","#8a0522","#ffffff","#f6b8c3"], FONDO=["#ffe3e8","#ffd0d8","#fff1f3","#ffc2cd"];
  function hash(s){let h=0;for(const ch of String(s))h=(h*31+ch.charCodeAt(0))>>>0;return h;}
  function avatar(c,clase=""){
    if(c.foto) return `<div class="avatar ${clase}"><img src="${escapeHTML(c.foto)}" alt="${escapeHTML(c.paciente)}"></div>`;
    const h=hash(c.paciente), pick=(a,n)=>a[(h>>n)%a.length], mujer=(h%2===0), pelo=pick(PELO,3), piel=pick(PIEL,5);
    const cab=mujer?`<path d="M22 46c-4-26 8-34 28-34s32 8 28 34c0 14 2 26 6 34H16c4-8 6-20 6-34z" fill="${pelo}"/>`
                   :`<path d="M25 44c-2-22 8-30 25-30s27 8 25 30c-6-10-14-14-25-14s-19 4-25 14z" fill="${pelo}"/>`;
    return `<div class="avatar ${clase}"><svg viewBox="0 0 100 100" role="img" aria-label="${escapeHTML(c.paciente)}">
      <rect width="100" height="100" fill="${pick(FONDO,7)}"/>${mujer?cab:""}
      <path d="M14 100c2-22 18-30 36-30s34 8 36 30z" fill="${pick(ROPA,9)}"/>
      <rect x="43" y="56" width="14" height="16" rx="5" fill="${piel}"/><ellipse cx="50" cy="44" rx="19" ry="22" fill="${piel}"/>${mujer?"":cab}
      <circle cx="43" cy="45" r="2.3" fill="#2a1218"/><circle cx="57" cy="45" r="2.3" fill="#2a1218"/>
      <path d="M43 54q7 6 14 0" stroke="#2a1218" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg></div>`;
  }
  const minutosDe = (hora) => { const [a,b]=hora.split(":").map(Number); return a*60+b; };
  function textoEspera(c){ const d=new Date(), dif=d.getHours()*60+d.getMinutes()-minutosDe(c.hora); return dif>=0?`Esperando hace ${dif} min`:`Cita en ${-dif} min`; }
  function contar(el,fin){
    const ini=+el.textContent||0; if(ini===fin){el.textContent=fin;return;}
    const t0=performance.now();
    (function paso(t){const p=Math.min((t-t0)/700,1);el.textContent=Math.round(ini+(fin-ini)*p);if(p<1)requestAnimationFrame(paso);})(t0);
  }
  const reloj = () => { $("reloj").textContent = new Date().toLocaleTimeString("es-PE",{hour12:false}); };
  setInterval(reloj,1000); reloj();
  $("fechaHoy").textContent = new Date().toLocaleDateString("es-PE",{weekday:"long",day:"2-digit",month:"long",year:"numeric"});

  // ---------- Carga y pintado ----------
  const estadoClass = (e) => e.toLowerCase()==="atendida"?"atendida":e.toLowerCase()==="cancelada"?"cancelada":"pendiente";
  async function cargar(){
    try {
      const d = await api("agenda");
      $("nombreMedico").textContent = d.medico;
      const firma = JSON.stringify(d.citas);
      if (firma === ultima) return;           // sin cambios: no se vuelve a animar
      ultima = firma; citas = d.citas; render();
    } catch(e) { $("sinCitas").textContent = e.message; $("sinCitas").hidden = false; }
  }
  function render(){
    const filtro=$("buscarPaciente").value.trim().toLowerCase();
    const visibles=citas.filter(c=>(c.paciente+" "+c.dni).toLowerCase().includes(filtro));
    contar($("totalCitas"),citas.length);
    contar($("totalPendientes"),citas.filter(c=>c.estado==="Pendiente").length);
    contar($("totalAtendidas"),citas.filter(c=>c.estado==="Atendida").length);
    $("tablaAgenda").innerHTML=visibles.map((c,i)=>`
      <tr style="animation-delay:${i*70}ms">
        <td class="hour">${escapeHTML(c.hora)}</td>
        <td><div class="who">${avatar(c,"sm")}<strong>${escapeHTML(c.paciente)}</strong></div></td>
        <td>${escapeHTML(c.dni)}</td><td>${escapeHTML(c.especialidad)}</td>
        <td><span class="badge ${estadoClass(c.estado)}">${escapeHTML(c.estado)}</span></td>
        <td>${c.estado==="Pendiente"
          ? `<button class="btn btn-primary btn-atender" data-id="${c.id}">Atender</button>`
          : `<button class="btn btn-disabled" disabled>${c.estado==="Atendida"?"Finalizada":"No disponible"}</button>`}</td>
      </tr>`).join("");
    $("sinCitas").textContent="No hay citas para mostrar."; $("sinCitas").hidden=visibles.length>0;
    const espera=citas.filter(c=>c.estado==="Pendiente");
    $("listaEspera").innerHTML=espera.length?espera.map((c,i)=>`
      <article class="pcard ${i===0?"next":""}" style="animation-delay:${i*120}ms">
        ${i===0?'<span class="tag">SIGUIENTE</span>':""}
        ${avatar(c)}<strong>${escapeHTML(c.paciente)}</strong>
        <span class="wait">${escapeHTML(c.hora)} · ${escapeHTML(c.especialidad)}</span>
        <span class="wait">${textoEspera(c)} <span class="dots"><i></i><i></i><i></i></span></span>
        <button class="btn btn-primary btn-atender" data-id="${c.id}">Atender</button>
      </article>`).join(""):'<p class="sin-espera">🎉 No hay pacientes en espera.</p>';
  }

  // Atender → módulo de atención clínica (Ortega) recibe el id de la cita
  const atender = (e) => {
    const btn=e.target.closest("[data-id]"); if(!btn) return;
    window.location.href=`historia_clinica.html?idCita=${encodeURIComponent(btn.dataset.id)}`;
  };
  $("tablaAgenda").addEventListener("click",atender);
  $("listaEspera").addEventListener("click",atender);
  $("buscarPaciente").addEventListener("input",render);
  $("btnCerrarSesion").addEventListener("click",()=>{ window.location.href="../login.html"; });

  // ---------- Nueva cita ----------
  const m = {est:null, hor:null}; let lista = [], debounce;
  const err = (t="") => { $("citaError").textContent=t; $("citaError").hidden=!t; };
  function toast(t){ const el=$("toast"); el.textContent=t; el.hidden=false; el.classList.remove("show"); void el.offsetWidth; el.classList.add("show"); setTimeout(()=>el.hidden=true,3500); }
  function resumen(){
    const ok = m.est && m.hor;
    $("citaResumen").textContent = ok ? `${m.est.nombre} · ${$("citaServicio").selectedOptions[0].text} · ${$("citaFecha").value.split("-").reverse().join("/")} a las ${m.hor.hora}` : "Elige paciente, servicio, fecha y hora.";
    $("citaGuardar").disabled = !ok;
  }
  async function abrir(){
    m.est=m.hor=null; err(); $("citaBuscar").value=""; $("citaResultados").innerHTML=""; $("citaHoras").innerHTML="";
    $("citaFecha").min=$("citaFecha").value=fechaLocal(); resumen(); $("modalCita").hidden=false; $("citaBuscar").focus();
    try {
      const d = await api("servicios");
      $("citaServicio").innerHTML = d.servicios.length ? '<option value="">Servicio…</option>'+d.servicios.map(s=>`<option value="${s.id}">${escapeHTML(s.nombre)}</option>`).join("") : '<option value="">Sin servicios asignados</option>';
    } catch(e) { err(e.message); }
  }
  const cerrar = () => { $("modalCita").hidden = true; };
  async function cargarHoras(){
    m.hor=null; resumen(); err();
    const s=$("citaServicio").value, f=$("citaFecha").value;
    if(!s||!f){ $("citaHoras").innerHTML=""; return; }
    try {
      const d = await api("horarios",{id_servicio:s,fecha:f});
      $("citaHoras").innerHTML = d.horarios.length ? d.horarios.map(h=>`<button type="button" class="hora" data-h="${h.id}" data-t="${h.hora}">${h.hora}</button>`).join("") : '<p class="empty">No hay horarios libres para ese día.</p>';
    } catch(e) { err(e.message); }
  }
  $("btnNuevaCita").addEventListener("click",abrir);
  $("cerrarCita").addEventListener("click",cerrar); $("citaCancelar").addEventListener("click",cerrar);
  $("modalCita").addEventListener("click",e=>{ if(e.target===$("modalCita")) cerrar(); });
  document.addEventListener("keydown",e=>{ if(e.key==="Escape"&&!$("modalCita").hidden) cerrar(); });
  $("citaServicio").addEventListener("change",cargarHoras); $("citaFecha").addEventListener("change",cargarHoras);
  $("citaBuscar").addEventListener("input",()=>{
    clearTimeout(debounce); m.est=null; resumen(); err();
    const q=$("citaBuscar").value.trim();
    if(q.length<3){ $("citaResultados").innerHTML=""; return; }
    debounce=setTimeout(async()=>{
      try {
        lista=(await api("estudiantes",{q})).estudiantes;
        $("citaResultados").innerHTML = lista.length ? lista.map(e=>`<button type="button" class="res" data-est="${e.id}">${avatar({paciente:e.nombre,foto:e.foto},"sm")}<span><strong>${escapeHTML(e.nombre)}</strong><small>DNI ${escapeHTML(e.dni)}${e.codigo?" · "+escapeHTML(e.codigo):""}</small></span></button>`).join("") : '<p class="empty">Sin resultados.</p>';
      } catch(x) { err(x.message); }
    },300);
  });
  // Alta rápida de paciente desde el flujo de nueva cita (misma tabla usuarios).
  $("btnMostrarPaciente").addEventListener("click",()=>{const f=$("formPacienteRapido");f.hidden=!f.hidden;});
  $("formPacienteRapido").addEventListener("submit",async e=>{
    e.preventDefault();const f=e.currentTarget;const datos=Object.fromEntries(new FormData(f));
    try{
      const r=await api("crear_paciente",{},datos);
      m.est={id:r.id_estudiante,nombre:datos.nombres+" "+datos.apellidos,dni:datos.dni,codigo:datos.codigo_universitario};
      $("citaBuscar").value=datos.dni;$("citaResultados").innerHTML=`<div class="res sel">${escapeHTML(m.est.nombre)} · DNI ${escapeHTML(datos.dni)} <b>Paciente recién registrado</b></div>`;
      f.reset();f.hidden=true;resumen();toast("Paciente creado. Clave temporal: "+r.clave_temporal+" (comunicar de forma segura).");
    }catch(x){err(x.message);}
  });
  $("citaResultados").addEventListener("click",e=>{
    const b=e.target.closest("[data-est]"); if(!b) return;
    m.est=lista.find(x=>String(x.id)===b.dataset.est);
    $("citaResultados").querySelectorAll(".res").forEach(r=>r.classList.toggle("sel",r===b)); resumen();
  });
  $("citaHoras").addEventListener("click",e=>{
    const b=e.target.closest("[data-h]"); if(!b) return;
    m.hor={id:b.dataset.h,hora:b.dataset.t};
    $("citaHoras").querySelectorAll(".hora").forEach(r=>r.classList.toggle("sel",r===b)); resumen();
  });
  $("citaGuardar").addEventListener("click",async()=>{
    err(); $("citaGuardar").disabled=true;
    try {
      await api("crear",{},{id_estudiante:+m.est.id,id_horario:+m.hor.id});
      cerrar(); toast("✔ Cita creada para "+m.est.nombre); ultima=""; await cargar();
    } catch(e) { cargarHoras(); err(e.message); }   // p. ej. si otro tomó la hora, se refrescan las horas libres
  });

  cargar(); setInterval(cargar,30000);
})();
