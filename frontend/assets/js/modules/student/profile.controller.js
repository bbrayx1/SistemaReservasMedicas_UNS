/* Perfil del estudiante: datos de cuenta, contraseña y fotografía. */
window.ProfileController = {
  async init() {
    const root = document.querySelector('.profile-shell');
    if (!root) return;
    root.querySelectorAll('[data-profile-route]').forEach(button => {
      button.addEventListener('click', () => AppRouter.loadView(button.dataset.profileRoute));
    });
    root.querySelector('#profileLogout').addEventListener('click', () => AppRouter.logout());
    this.initTabs(root);
    this.initEmailForm(root);
    this.initPasswordForm(root);

    try {
      const response = await ApiClient.get('student.profile');
      SessionStore.setUser(response.user);
      this.paintProfile(root, response.user);
      this.initPhotoEditor(root, response.user.foto_perfil);
    } catch (error) {
      AppUtils.toast(error.message, 'error');
    }
  },

  paintProfile(root, user) {
    const fullName = SessionStore.fullName(user);
    root.querySelector('#profileHeroName').textContent = fullName;
    root.querySelector('#profileHeroCode').textContent = user.codigo_universitario || 'No registrado';
    root.querySelector('#profileFullName').textContent = fullName;
    root.querySelector('#profileCode').textContent = user.codigo_universitario || 'No registrado';
    root.querySelector('#profileDni').textContent = user.dni || '—';
    root.querySelector('#profileEmailText').textContent = user.correo || '—';
    root.querySelector('#profileEmailInput').value = user.correo || '';
  },

  initTabs(root) {
    const tabs = [root.querySelector('#tabDatos'), root.querySelector('#tabSeguridad')];
    const panels = [root.querySelector('#panelDatos'), root.querySelector('#panelSeguridad')];
    const activate = (index, focus = false) => {
      tabs.forEach((tab, position) => {
        const active = position === index;
        tab.classList.toggle('is-active', active);
        tab.setAttribute('aria-selected', String(active));
        tab.tabIndex = active ? 0 : -1;
        panels[position].hidden = !active;
      });
      if (focus) tabs[index].focus();
    };
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => activate(index));
      tab.addEventListener('keydown', event => {
        if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
          event.preventDefault();
          activate((index + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length, true);
        }
      });
    });
  },

  initEmailForm(root) {
    const form = root.querySelector('#profileEmailForm');
    const message = root.querySelector('#profileMessage');
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const button = form.querySelector('button[type="submit"]');
      button.disabled = true;
      message.textContent = 'Guardando correo...';
      try {
        const response = await ApiClient.post('student.profile.update', {
          correo: root.querySelector('#profileEmailInput').value.trim()
        });
        SessionStore.setUser(response.user);
        this.paintProfile(root, response.user);
        message.textContent = response.message;
        AppUtils.toast(response.message, 'success');
      } catch (error) {
        message.textContent = error.message;
        AppUtils.toast(error.message, 'error');
      } finally {
        button.disabled = false;
      }
    });
  },

  initPasswordForm(root) {
    const form = root.querySelector('#formCambiarPassword');
    const message = root.querySelector('#mensajePassword');
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const current = root.querySelector('#passwordActual').value;
      const next = root.querySelector('#passwordNueva').value;
      const confirm = root.querySelector('#passwordConfirmacion').value;
      if (next.length < 8) {
        message.textContent = 'La nueva contraseña debe tener al menos 8 caracteres.';
        root.querySelector('#passwordNueva').focus();
        return;
      }
      if (next !== confirm) {
        message.textContent = 'Las contraseñas nuevas no coinciden.';
        root.querySelector('#passwordConfirmacion').focus();
        return;
      }
      const button = form.querySelector('button[type="submit"]');
      button.disabled = true;
      message.textContent = 'Verificando contraseña actual...';
      try {
        const response = await ApiClient.post('student.password.change', {
          password_actual: current,
          password_nueva: next
        });
        message.textContent = response.message;
        form.reset();
        AppUtils.toast(response.message, 'success');
      } catch (error) {
        message.textContent = error.message;
      } finally {
        button.disabled = false;
      }
    });
  },

  initPhotoEditor(root, storedPath) {
    const avatar = root.querySelector('#fotoPerfil');
    const emptyAvatar = root.querySelector('#fotoPerfilVacia');
    const dialog = root.querySelector('#editorFoto');
    const fileInput = root.querySelector('#archivoFoto');
    const fullPhoto = root.querySelector('#fotoCompleta');
    const emptyFull = root.querySelector('#fotoOriginalVacia');
    const canvas = root.querySelector('#lienzoFoto');
    const emptyCrop = root.querySelector('#fotoRecorteVacia');
    const zoom = root.querySelector('#zoomFoto');
    const zoomOutput = root.querySelector('#valorZoom');
    const rotateButton = root.querySelector('#girarFoto');
    const removeButton = root.querySelector('#quitarFoto');
    const saveButton = root.querySelector('#guardarFoto');
    const photoMessage = root.querySelector('#mensajeFoto');
    const context = canvas.getContext('2d');
    const size = canvas.width;
    const photoUrl = path => path ? `../backend/public/${String(path).replace(/^\//, '')}` : null;

    let saved = storedPath ? this.makePhotoState(photoUrl(storedPath)) : null;
    const updateAvatar = () => {
      avatar.hidden = !saved;
      emptyAvatar.hidden = Boolean(saved);
      if (saved) avatar.src = saved.crop || saved.original;
      else avatar.removeAttribute('src');
    };
    updateAvatar();

    let draft = null;
    let editorImage = null;
    let loadVersion = 0;
    let pointer = null;
    const copy = value => value ? { ...value } : null;
    const notify = text => { photoMessage.textContent = text; };
    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

    const drawCrop = () => {
      if (!draft || !editorImage) return;
      const quarterTurn = draft.rotation % 2 !== 0;
      const rotatedWidth = quarterTurn ? editorImage.height : editorImage.width;
      const rotatedHeight = quarterTurn ? editorImage.width : editorImage.height;
      const scale = Math.max(size / rotatedWidth, size / rotatedHeight) * draft.zoom;
      const maxX = Math.max(0, (rotatedWidth * scale - size) / 2);
      const maxY = Math.max(0, (rotatedHeight * scale - size) / 2);
      draft.offsetX = clamp(draft.offsetX, -maxX, maxX);
      draft.offsetY = clamp(draft.offsetY, -maxY, maxY);
      context.clearRect(0, 0, size, size);
      context.save();
      context.translate(size / 2 + draft.offsetX, size / 2 + draft.offsetY);
      context.rotate(draft.rotation * Math.PI / 2);
      context.scale(scale, scale);
      context.drawImage(editorImage, -editorImage.width / 2, -editorImage.height / 2);
      context.restore();
      zoomOutput.value = `${Math.round(draft.zoom * 100)} %`;
    };

    const refreshEditor = () => {
      const hasPhoto = Boolean(draft && editorImage);
      fullPhoto.hidden = !hasPhoto;
      emptyFull.hidden = hasPhoto;
      canvas.hidden = !hasPhoto;
      emptyCrop.hidden = hasPhoto;
      zoom.disabled = !hasPhoto;
      rotateButton.disabled = !hasPhoto;
      removeButton.disabled = !draft;
      saveButton.disabled = Boolean(draft && !editorImage);
      zoom.value = draft?.zoom ?? 1;
      zoomOutput.value = `${Math.round((draft?.zoom ?? 1) * 100)} %`;
      if (hasPhoto) {
        fullPhoto.src = draft.original;
        drawCrop();
      } else {
        fullPhoto.removeAttribute('src');
        context.clearRect(0, 0, size, size);
      }
    };

    const setDraft = value => {
      draft = copy(value);
      editorImage = null;
      const version = ++loadVersion;
      refreshEditor();
      if (!draft) return;
      const image = new Image();
      image.onload = () => { if (version === loadVersion) { editorImage = image; refreshEditor(); } };
      image.onerror = () => { if (version === loadVersion) notify('No se pudo abrir la imagen. Selecciona otra foto.'); };
      image.src = draft.original;
    };

    root.querySelector('#abrirEditorFoto').addEventListener('click', () => {
      notify('');
      setDraft(saved);
      dialog.showModal();
    });
    const closeEditor = () => dialog.close();
    root.querySelector('#cerrarEditorFoto').addEventListener('click', closeEditor);
    root.querySelector('#cancelarFoto').addEventListener('click', closeEditor);
    dialog.addEventListener('click', event => { if (event.target === dialog) closeEditor(); });
    root.querySelector('#cambiarFoto').addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', () => {
      const file = fileInput.files?.[0];
      fileInput.value = '';
      if (!file) return;
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return notify('Selecciona una imagen JPG, PNG o WebP.');
      if (file.size > 4 * 1024 * 1024) return notify('La imagen debe pesar menos de 4 MB.');
      const reader = new FileReader();
      reader.onerror = () => notify('No se pudo leer el archivo.');
      reader.onload = () => {
        const image = new Image();
        image.onerror = () => notify('El archivo no contiene una imagen válida.');
        image.onload = () => {
          const limit = 1400;
          const factor = Math.min(1, limit / Math.max(image.width, image.height));
          const work = document.createElement('canvas');
          work.width = Math.max(1, Math.round(image.width * factor));
          work.height = Math.max(1, Math.round(image.height * factor));
          const workContext = work.getContext('2d');
          workContext.fillStyle = '#ffffff';
          workContext.fillRect(0, 0, work.width, work.height);
          workContext.drawImage(image, 0, 0, work.width, work.height);
          notify('Arrastra la vista circular o ajusta el zoom; guarda cuando esté a tu gusto.');
          setDraft({ original: work.toDataURL('image/jpeg', .84), crop: '', zoom: 1, rotation: 0, offsetX: 0, offsetY: 0 });
        };
        image.src = reader.result;
      };
      reader.readAsDataURL(file);
    });

    zoom.addEventListener('input', () => { if (draft) { draft.zoom = Number(zoom.value); drawCrop(); } });
    rotateButton.addEventListener('click', () => {
      if (!draft) return;
      draft.rotation = (draft.rotation + 1) % 4;
      draft.offsetX = 0; draft.offsetY = 0;
      drawCrop();
    });
    removeButton.addEventListener('click', () => { setDraft(null); notify('La foto se quitará cuando pulses «Guardar cambios».'); });
    canvas.addEventListener('pointerdown', event => {
      if (!draft || !editorImage) return;
      pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
      canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener('pointermove', event => {
      if (!pointer || pointer.id !== event.pointerId || !draft) return;
      const ratio = size / canvas.getBoundingClientRect().width;
      draft.offsetX += (event.clientX - pointer.x) * ratio;
      draft.offsetY += (event.clientY - pointer.y) * ratio;
      pointer.x = event.clientX; pointer.y = event.clientY;
      drawCrop();
    });
    const finishDrag = () => { pointer = null; };
    canvas.addEventListener('pointerup', finishDrag);
    canvas.addEventListener('pointercancel', finishDrag);

    saveButton.addEventListener('click', async () => {
      saveButton.disabled = true;
      try {
        if (draft && editorImage) {
          drawCrop();
          const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .88));
          if (!blob) throw new Error('No se pudo preparar la fotografía.');
          const formData = new FormData();
          formData.append('foto', blob, 'perfil.jpg');
          const response = await ApiClient.postForm('student.photo.update', formData);
          saved = this.makePhotoState(photoUrl(response.user.foto_perfil));
          SessionStore.setUser(response.user);
          updateAvatar();
          notify('Fotografía actualizada correctamente.');
        } else if (!draft && saved) {
          const response = await ApiClient.post('student.photo.remove', {});
          saved = null;
          SessionStore.setUser(response.user);
          updateAvatar();
          notify('Fotografía eliminada.');
        }
        closeEditor();
        AppUtils.toast('Foto de perfil actualizada.', 'success');
      } catch (error) {
        notify(error.message || 'No se pudo guardar la fotografía.');
      } finally {
        saveButton.disabled = false;
      }
    });
  },

  makePhotoState(url) {
    return url ? { original: url, crop: url, zoom: 1, rotation: 0, offsetX: 0, offsetY: 0 } : null;
  }
};
