/* API Client: única puerta de comunicación del frontend con PHP. */
(() => {
  const API_BASE = window.APP_CONFIG?.apiBase || '../backend/public/api.php';
  let csrfToken = null;

  class ApiError extends Error {
    constructor(message, status = 0, payload = {}) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
      this.payload = payload;
    }
  }

  async function getCsrfToken() {
    if (csrfToken) return csrfToken;
    const response = await fetch(`${API_BASE}?action=auth.csrf`, {
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
      cache: 'no-store'
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.csrf_token) {
      throw new ApiError(payload.error || 'No se pudo iniciar la sesión segura.', response.status, payload);
    }
    csrfToken = payload.csrf_token;
    return csrfToken;
  }

  async function request(action, options = {}) {
    const method = (options.method || 'GET').toUpperCase();
    const url = new URL(API_BASE, document.baseURI);
    url.searchParams.set('action', action);
    Object.entries(options.query || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
    });

    const headers = { Accept: 'application/json', ...(options.headers || {}) };
    const config = { method, credentials: 'same-origin', headers, cache: 'no-store' };

    if (method !== 'GET' && method !== 'HEAD') {
      headers['X-CSRF-Token'] = await getCsrfToken();
      if (options.body instanceof FormData) {
        config.body = options.body;
      } else {
        headers['Content-Type'] = 'application/json';
        config.body = JSON.stringify(options.body || {});
      }
    }

    const response = await fetch(url, config);
    const payload = await response.json().catch(() => ({ ok: false, error: 'El servidor devolvió una respuesta no válida.' }));
    if (payload.csrf_token) csrfToken = payload.csrf_token;
    if (response.status === 419) csrfToken = null;
    if (!response.ok || payload.ok === false) {
      throw new ApiError(payload.error || `Error ${response.status}`, response.status, payload);
    }
    return payload;
  }

  window.ApiClient = {
    ApiError,
    get: (action, query = {}) => request(action, { method: 'GET', query }),
    post: (action, body = {}) => request(action, { method: 'POST', body }),
    postForm: (action, formData) => request(action, { method: 'POST', body: formData }),
    clearCsrf: () => { csrfToken = null; }
  };
})();
