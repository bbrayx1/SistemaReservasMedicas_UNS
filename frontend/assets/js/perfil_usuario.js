const PerfilUsuarioController = {
  init() {
    const root = document.querySelector('.profile-shell');
    if (!root) return;

    root.querySelectorAll('[data-profile-route]').forEach(button => {
      button.addEventListener('click', () => AppRouter.loadView(button.dataset.profileRoute));
    });
    root.querySelector('#profileLogout').addEventListener('click', () => AppRouter.logout());

    const tabs = [root.querySelector('#tabDatos'), root.querySelector('#tabSeguridad')];
    const panels = [root.querySelector('#panelDatos'), root.querySelector('#panelSeguridad')];

    const activateTab = (index, focus = false) => {
      tabs.forEach((tab, i) => {
        const active = i === index;
        tab.classList.toggle('is-active', active);
        tab.setAttribute('aria-selected', String(active));
        tab.tabIndex = active ? 0 : -1;
        panels[i].hidden = !active;
      });
      if (focus) tabs[index].focus();
    };

    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => activateTab(index));
      tab.addEventListener('keydown', event => {
        if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
          event.preventDefault();
          activateTab(
            (index + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length,
            true
          );
        }
      });
    });

    const form = root.querySelector('#formCambiarPassword');
    const passwordMessage = root.querySelector('#mensajePassword');

    form.addEventListener('submit', event => {
      event.preventDefault();
      const nueva = root.querySelector('#passwordNueva').value;
      const confirmacion = root.querySelector('#passwordConfirmacion').value;

      if (nueva !== confirmacion) {
        passwordMessage.textContent = 'Las contraseñas nuevas no coinciden.';
        passwordMessage.style.color = '#ab0d35';
        root.querySelector('#passwordConfirmacion').focus();
        return;
      }

      passwordMessage.textContent =
        'Los campos coinciden. El cambio real requiere conectar el servidor.';
      passwordMessage.style.color = '#785269';
    });

    const storageKey = 'perfilFotoDemoV2';
    const legacyKey = 'fotoPerfilDemo';
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
    const ctx = canvas.getContext('2d');
    const size = canvas.width;

    let saved = null;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const value = JSON.parse(stored);
        if (typeof value.original === 'string' && value.original.startsWith('data:image/')) {
          saved = value;
        }
      } else {
        const oldPhoto = localStorage.getItem(legacyKey);
        if (oldPhoto?.startsWith('data:image/')) {
          saved = {
            original: oldPhoto,
            crop: oldPhoto,
            zoom: 1,
            rotation: 0,
            offsetX: 0,
            offsetY: 0
          };
        }
      }
    } catch (error) {
      // El perfil sigue disponible aunque el navegador bloquee el almacenamiento.
    }

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
    const copyPhoto = value => value ? { ...value } : null;
    const notify = message => { photoMessage.textContent = message; };
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

      ctx.clearRect(0, 0, size, size);
      ctx.save();
      ctx.translate(size / 2 + draft.offsetX, size / 2 + draft.offsetY);
      ctx.rotate(draft.rotation * Math.PI / 2);
      ctx.scale(scale, scale);
      ctx.drawImage(editorImage, -editorImage.width / 2, -editorImage.height / 2);
      ctx.restore();
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
        ctx.clearRect(0, 0, size, size);
      }
    };

    const setDraft = value => {
      draft = copyPhoto(value);
      editorImage = null;
      const thisLoad = ++loadVersion;
      refreshEditor();
      if (!draft) return;

      const image = new Image();
      image.onload = () => {
        if (thisLoad !== loadVersion) return;
        editorImage = image;
        refreshEditor();
      };
      image.onerror = () => {
        if (thisLoad === loadVersion) {
          notify('No se pudo abrir la imagen. Selecciona otra foto.');
        }
      };
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
    dialog.addEventListener('click', event => {
      if (event.target === dialog) closeEditor();
    });
    root.querySelector('#cambiarFoto').addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', () => {
      const file = fileInput.files?.[0];
      fileInput.value = '';
      if (!file) return;

      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        notify('Selecciona una imagen JPG, PNG o WebP.');
        return;
      }
      if (file.size > 8 * 1024 * 1024) {
        notify('La imagen debe pesar menos de 8 MB.');
        return;
      }

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

          const workCtx = work.getContext('2d');
          workCtx.fillStyle = '#ffffff';
          workCtx.fillRect(0, 0, work.width, work.height);
          workCtx.drawImage(image, 0, 0, work.width, work.height);

          const original = work.toDataURL('image/jpeg', .84);
          notify('Arrastra la vista circular o ajusta el zoom; guarda cuando esté a tu gusto.');
          setDraft({
            original,
            crop: '',
            zoom: 1,
            rotation: 0,
            offsetX: 0,
            offsetY: 0
          });
        };
        image.src = reader.result;
      };
      reader.readAsDataURL(file);
    });

    zoom.addEventListener('input', () => {
      if (!draft) return;
      draft.zoom = Number(zoom.value);
      drawCrop();
    });

    rotateButton.addEventListener('click', () => {
      if (!draft) return;
      draft.rotation = (draft.rotation + 1) % 4;
      draft.offsetX = 0;
      draft.offsetY = 0;
      drawCrop();
    });

    removeButton.addEventListener('click', () => {
      setDraft(null);
      notify('La foto se quitará cuando pulses «Guardar cambios».');
    });

    let pointer = null;
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
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      drawCrop();
    });

    const finishDrag = () => { pointer = null; };
    canvas.addEventListener('pointerup', finishDrag);
    canvas.addEventListener('pointercancel', finishDrag);

    saveButton.addEventListener('click', () => {
      try {
        if (draft && editorImage) {
          drawCrop();
          const next = { ...draft, crop: canvas.toDataURL('image/jpeg', .88) };
          localStorage.setItem(storageKey, JSON.stringify(next));
          localStorage.removeItem(legacyKey);
          saved = next;
        } else if (!draft) {
          localStorage.removeItem(storageKey);
          localStorage.removeItem(legacyKey);
          saved = null;
        } else {
          return;
        }

        updateAvatar();
        closeEditor();
      } catch (error) {
        notify('No se pudo guardar en este navegador. Prueba con una imagen más pequeña.');
      }
    });
  }
};