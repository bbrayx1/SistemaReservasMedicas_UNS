const AppRouter = {
  rootElement: null,

  init() {
    this.rootElement = document.getElementById('app-root');
    this.loadView('login');
  },

  async loadView(viewName) {
    // Hasta integrar el backend, la única vista navegable es el acceso público.
    if (viewName !== 'login') return;

    try {
      const response = await fetch(`views/${viewName}.html`, { cache: 'no-cache' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      this.rootElement.innerHTML = await response.text();
      LoginController.init();
    } catch (error) {
      console.error('Error cargando la vista:', error);
      this.rootElement.innerHTML = `
        <main style="padding:60px 24px;text-align:center;font-family:Arial,sans-serif">
          <h1>La página no pudo cargarse</h1>
          <p>Ejecuta el proyecto con Live Server o XAMPP, no con file://.</p>
          <button onclick="location.reload()">Reintentar</button>
        </main>`;
    }
  }
};

document.addEventListener('DOMContentLoaded', () => AppRouter.init());
