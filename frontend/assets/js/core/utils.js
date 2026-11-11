/* Funciones de presentación compartidas. No contiene reglas de negocio. */
(() => {
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);

  const parseLocalDate = value => {
    const [year, month, day] = String(value).slice(0, 10).split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const formatDate = value => parseLocalDate(value).toLocaleDateString('es-PE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  const formatShortDate = value => parseLocalDate(value).toLocaleDateString('es-PE', {
    day: '2-digit', month: 'short', year: 'numeric'
  });

  const formatTime = value => {
    const [hour, minute] = String(value).slice(0, 5).split(':').map(Number);
    return `${String((hour % 12) || 12).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${hour >= 12 ? 'p. m.' : 'a. m.'}`;
  };

  function toast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }
    const icons = { success: 'ri-checkbox-circle-fill', info: 'ri-information-fill', error: 'ri-error-warning-fill' };
    const element = document.createElement('div');
    element.className = `custom-toast toast-${type}`;
    element.innerHTML = `<i class="${icons[type] || icons.info}"></i><span>${escapeHTML(message)}</span>`;
    container.appendChild(element);
    requestAnimationFrame(() => element.classList.add('show'));
    window.setTimeout(() => {
      element.classList.remove('show');
      window.setTimeout(() => element.remove(), 300);
    }, 3200);
  }

  window.AppUtils = { escapeHTML, formatDate, formatShortDate, formatTime, toast };
})();
