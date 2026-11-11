/* Estado de sesión en memoria: la autoridad real es la sesión PHP. */
(() => {
  let currentUser = null;
  window.SessionStore = {
    setUser(user) { currentUser = user || null; },
    getUser() { return currentUser; },
    clear() { currentUser = null; },
    initials(user = currentUser) {
      if (!user) return 'UN';
      return `${(user.nombres || 'U').trim().charAt(0)}${(user.apellidos || 'N').trim().charAt(0)}`.toUpperCase();
    },
    fullName(user = currentUser) {
      return user ? `${user.nombres || ''} ${user.apellidos || ''}`.trim() : 'Usuario';
    }
  };
})();
