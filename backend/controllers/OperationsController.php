<?php
declare(strict_types=1);

/** Acciones operativas: todas con permiso de rol y validaciones en servidor. */
final class OperationsController
{
    public function __construct(private PDO $db, private BookingRepository $bookings, private BookingService $service) {}

    private function number(mixed $v): int { return filter_var($v, FILTER_VALIDATE_INT) ?: 0; }
    private function txt(array $data, string $key, int $max = 120): string {
        $value = trim((string)($data[$key] ?? ''));
        if ($value === '' || mb_strlen($value) > $max) ApiResponse::error("Campo inválido: $key", 422);
        return $value;
    }
    public function createUser(): never {
        ApiResponse::requireMethod('POST'); Auth::requireRole(['Administrador']);
        $d = ApiResponse::input();
        $names=$this->txt($d,'nombres',80); $surnames=$this->txt($d,'apellidos',80);
        $dni=$this->txt($d,'dni',8); $mail=$this->txt($d,'correo',150);
        $role=$this->number($d['id_rol'] ?? 0); $code=trim((string)($d['codigo_universitario']??''));
        $pass=$this->txt($d,'password',120);
        if (!preg_match('/^\d{8}$/',$dni) || !filter_var($mail,FILTER_VALIDATE_EMAIL) || !in_array($role,[1,2,3,4],true)
            || ($role===1 && !preg_match('/^\d{10}$/',$code)) || ($role!==1 && $code!=='')) {
            ApiResponse::error('DNI, correo, rol o código universitario incorrectos.',422);
        }
        if (strlen($pass)<10) ApiResponse::error('La contraseña debe tener al menos 10 caracteres.',422);
        try {
            $this->db->beginTransaction();
            $stmt=$this->db->prepare('INSERT INTO usuarios(id_rol,nombres,apellidos,dni,codigo_universitario,correo,contrasena_hash,activo) VALUES(?,?,?,?,?,?,?,1)');
            $stmt->execute([$role,$names,$surnames,$dni,$role===1?$code:null,$mail,password_hash($pass,PASSWORD_DEFAULT)]);
            $id=(int)$this->db->lastInsertId();
            if ($role===2) {
                $consultorio=trim((string)($d['consultorio']??'Centro Médico UNS'));
                if (mb_strlen($consultorio)>100) throw new DomainException('Consultorio demasiado largo.');
                $st=$this->db->prepare('INSERT INTO medicos(id_usuario,numero_colegiatura,consultorio,activo) VALUES(?,?,?,1)');
                $license=trim((string)($d['colegiatura']??''));
                $st->execute([$id,$license?:null,$consultorio?:'Centro Médico UNS']);
                $mid=(int)$this->db->lastInsertId();
                $services=array_values(array_unique(array_map('intval',(array)($d['servicios']??[]))));
                if (!$services) throw new DomainException('Asigna una especialidad al profesional.');
                foreach ($services as $sid) {
                    $chk=$this->db->prepare('SELECT 1 FROM servicios WHERE id_servicio=? AND activo=1');$chk->execute([$sid]);
                    if (!$chk->fetchColumn()) throw new DomainException('Especialidad inválida.');
                    $st=$this->db->prepare('INSERT INTO medico_servicio(id_medico,id_servicio) VALUES(?,?)');$st->execute([$mid,$sid]);
                }
            }
            $this->db->commit(); ApiResponse::success(['id_usuario'=>$id],201);
        }catch(PDOException $e){if($this->db->inTransaction())$this->db->rollBack();if($e->getCode()==='23000')ApiResponse::error('DNI, correo, código o colegiatura ya registrados.',409);throw $e;}
        catch(Throwable $e){if($this->db->inTransaction())$this->db->rollBack();if($e instanceof DomainException)ApiResponse::error($e->getMessage(),422);throw $e;}
    }
    public function updateUser(): never {
        ApiResponse::requireMethod('POST');$actor=Auth::requireRole(['Administrador']);$d=ApiResponse::input();
        $id=$this->number($d['id_usuario']??0); if(!$id)ApiResponse::error('Usuario inválido.',422);
        $active=($d['activo']??null);if(!in_array($active,[0,1,'0','1'],true))ApiResponse::error('Estado inválido.',422);
        if($id===(int)$actor['id_usuario'] && (int)$active===0)ApiResponse::error('No puedes desactivar tu propia cuenta.',409);
        $st=$this->db->prepare('UPDATE usuarios SET activo=? WHERE id_usuario=?');$st->execute([(int)$active,$id]);
        if($st->rowCount()===0){$st=$this->db->prepare('SELECT 1 FROM usuarios WHERE id_usuario=?');$st->execute([$id]);if(!$st->fetchColumn())ApiResponse::error('Usuario no encontrado.',404);}
        ApiResponse::success(['mensaje'=>'Estado actualizado.']);
    }
    public function editUser(): never {
        ApiResponse::requireMethod('POST'); Auth::requireRole(['Administrador']);$d=ApiResponse::input();
        $id=$this->number($d['id_usuario']??0);$name=$this->txt($d,'nombres',80);$surname=$this->txt($d,'apellidos',80);
        $mail=$this->txt($d,'correo',150);
        if (!$id||!filter_var($mail,FILTER_VALIDATE_EMAIL)) ApiResponse::error('Usuario o correo inválido.',422);
        try{$st=$this->db->prepare('UPDATE usuarios SET nombres=?,apellidos=?,correo=? WHERE id_usuario=?');$st->execute([$name,$surname,$mail,$id]);}
        catch(PDOException $e){if($e->getCode()==='23000')ApiResponse::error('Ese correo ya existe.',409);throw $e;}
        ApiResponse::success(['mensaje'=>'Datos del usuario actualizados.']);
    }
    public function assignSpecialty(): never {
        ApiResponse::requireMethod('POST');Auth::requireRole(['Administrador']);$d=ApiResponse::input();
        $doctor=$this->number($d['id_medico']??0);$service=$this->number($d['id_servicio']??0);$active=($d['asignar']??1)?1:0;
        if (!$doctor||!$service)ApiResponse::error('Selecciona profesional y especialidad.',422);
        $check=$this->db->prepare('SELECT 1 FROM medicos m JOIN usuarios u ON u.id_usuario=m.id_usuario JOIN servicios s ON s.id_servicio=? WHERE m.id_medico=? AND m.activo=1 AND u.activo=1 AND s.activo=1');$check->execute([$service,$doctor]);
        if(!$check->fetchColumn())ApiResponse::error('Profesional o servicio inactivo.',422);
        if($active){$st=$this->db->prepare('INSERT IGNORE INTO medico_servicio(id_medico,id_servicio) VALUES(?,?)');$st->execute([$doctor,$service]);}
        else {
            $st=$this->db->prepare('SELECT 1 FROM horarios_medicos WHERE id_medico=? AND id_servicio=? LIMIT 1');$st->execute([$doctor,$service]);
            if($st->fetchColumn()) ApiResponse::error('El profesional tiene horarios vinculados a esta especialidad; no puede retirarse.',409);
            $st=$this->db->prepare('DELETE FROM medico_servicio WHERE id_medico=? AND id_servicio=?');$st->execute([$doctor,$service]);
        }
        ApiResponse::success();
    }
    public function services(): never {
        Auth::requireRole(['Administrador','Secretaria','Médico']);
        $rows=$this->db->query('SELECT id_servicio AS id,nombre,descripcion,activo FROM servicios ORDER BY nombre')->fetchAll();
        ApiResponse::success(['servicios'=>$rows]);
    }
    public function saveService(): never {
        ApiResponse::requireMethod('POST');Auth::requireRole(['Administrador']);$d=ApiResponse::input();
        $id=$this->number($d['id_servicio']??0);$name=$this->txt($d,'nombre',80);$desc=trim((string)($d['descripcion']??''));
        if(mb_strlen($desc)>255)ApiResponse::error('Descripción demasiado extensa.',422);
        $active=($d['activo']??1)?1:0;
        try {
            if($id){$st=$this->db->prepare('UPDATE servicios SET nombre=?,descripcion=?,activo=? WHERE id_servicio=?');$st->execute([$name,$desc,$active,$id]);}
            else{$st=$this->db->prepare('INSERT INTO servicios(nombre,descripcion,activo) VALUES(?,?,?)');$st->execute([$name,$desc,$active]);$id=(int)$this->db->lastInsertId();}
        }catch(PDOException $e){if($e->getCode()==='23000')ApiResponse::error('Ya existe un servicio con ese nombre.',409);throw $e;}
        ApiResponse::success(['id_servicio'=>$id]);
    }
    public function schedules(): never {
        Auth::requireRole(['Administrador','Médico']);
        $sql="SELECT h.id_horario AS id,h.id_medico,h.id_servicio,h.fecha,TIME_FORMAT(h.hora_inicio,'%H:%i') AS inicio,TIME_FORMAT(h.hora_fin,'%H:%i') AS fin,h.activo,s.nombre AS servicio,CONCAT(u.nombres,' ',u.apellidos) AS profesional FROM horarios_medicos h JOIN medicos m ON m.id_medico=h.id_medico JOIN usuarios u ON u.id_usuario=m.id_usuario JOIN servicios s ON s.id_servicio=h.id_servicio WHERE h.fecha BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 60 DAY)";
        $args=[];$user=Auth::user();
        if($user['rol']==='Médico'){$sql.=' AND m.id_usuario=?';$args[]=$user['id_usuario'];}
        $sql.=' ORDER BY h.fecha,h.hora_inicio LIMIT 2000';$st=$this->db->prepare($sql);$st->execute($args);
        $doctors=$this->db->query("SELECT m.id_medico AS id, CONCAT(u.nombres,' ',u.apellidos) AS nombre, ms.id_servicio FROM medicos m JOIN usuarios u ON u.id_usuario=m.id_usuario JOIN medico_servicio ms ON ms.id_medico=m.id_medico WHERE m.activo=1 AND u.activo=1 ORDER BY nombre")->fetchAll();
        if($user['rol']==='Médico')$doctors=array_values(array_filter($doctors,fn($r)=>$r['nombre']===(($user['nombres']??'').' '.($user['apellidos']??''))));
        ApiResponse::success(['horarios'=>$st->fetchAll(),'profesionales'=>$doctors]);
    }
    public function saveSchedule(): never {
        ApiResponse::requireMethod('POST');Auth::requireRole(['Administrador']);$d=ApiResponse::input();
        $doctor=$this->number($d['id_medico']??0);$service=$this->number($d['id_servicio']??0);
        $day=Validator::date($this->txt($d,'fecha',10));$start=$this->txt($d,'hora_inicio',8);
        if(!preg_match('/^([01]\d|2[0-3]):[0-5]\d$/',$start))ApiResponse::error('Hora inválida.',422);
        if($day<date('Y-m-d')||$day>date('Y-m-d',strtotime('+60 days')))ApiResponse::error('Fecha fuera del rango de 60 días.',422);
        $st=$this->db->prepare('SELECT 1 FROM medico_servicio ms JOIN medicos m ON m.id_medico=ms.id_medico JOIN usuarios u ON u.id_usuario=m.id_usuario WHERE ms.id_medico=? AND ms.id_servicio=? AND m.activo=1 AND u.activo=1');$st->execute([$doctor,$service]);
        if(!$st->fetchColumn())ApiResponse::error('El profesional no está asignado al servicio.',422);
        $end=date('H:i:s',strtotime($start.':00 +30 minutes'));
        try{$st=$this->db->prepare('INSERT INTO horarios_medicos(id_medico,id_servicio,fecha,hora_inicio,hora_fin,activo) VALUES(?,?,?,?,?,1)');$st->execute([$doctor,$service,$day,$start.':00',$end]);}
        catch(PDOException $e){if($e->getCode()==='23000')ApiResponse::error('El profesional ya tiene un horario a esa hora.',409);throw $e;}
        ApiResponse::success(['id_horario'=>(int)$this->db->lastInsertId()],201);
    }
    public function toggleSchedule(): never {
        ApiResponse::requireMethod('POST');Auth::requireRole(['Administrador']);$d=ApiResponse::input();$id=$this->number($d['id_horario']??0);$active=$this->number($d['activo']??0);
        if(!$id||!in_array($d['activo']??null,[0,1,'0','1'],true))ApiResponse::error('Horario inválido.',422);
        if(!$active){$st=$this->db->prepare("SELECT 1 FROM citas WHERE id_horario=? AND estado <> 'CANCELADA' LIMIT 1");$st->execute([$id]);if($st->fetchColumn())ApiResponse::error('No se puede desactivar un horario con reserva vigente.',409);}
        $st=$this->db->prepare('UPDATE horarios_medicos SET activo=? WHERE id_horario=?');$st->execute([$active,$id]);ApiResponse::success();
    }
    public function patientHistory(): never {
        $user=Auth::requireRole(['Médico']);$id=$this->number($_GET['id_estudiante']??0);if(!$id)ApiResponse::error('Paciente inválido.',422);
        $st=$this->db->prepare("SELECT c.fecha,s.nombre AS servicio, a.sintomas,a.diagnostico,a.receta_medica, CONCAT(u.nombres,' ',u.apellidos) AS profesional FROM atenciones a JOIN citas c ON c.id_cita=a.id_cita JOIN servicios s ON s.id_servicio=c.id_servicio JOIN medicos m ON m.id_medico=a.id_medico JOIN usuarios u ON u.id_usuario=m.id_usuario WHERE c.id_estudiante=? AND m.id_usuario=? ORDER BY c.fecha DESC LIMIT 100");
        $st->execute([$id,$user['id_usuario']]);ApiResponse::success(['historial'=>$st->fetchAll()]);
    }
    public function bookForPatient(): never {
        ApiResponse::requireMethod('POST');Auth::requireRole(['Secretaria','Administrador']);$d=ApiResponse::input();
        $student=$this->number($d['id_estudiante']??0);$slot=$this->number($d['id_horario']??0);
        if(!$student||!$slot)ApiResponse::error('Selecciona paciente y horario.',422);
        try{$id=$this->service->createForPatient($student,$slot,null);ApiResponse::success(['id_cita'=>$id],201);}
        catch(DomainException $e){ApiResponse::error($e->getMessage(),409);}
    }
}
