/**
 * @file dashboard-auth.js
 * @description Auth gate removed. The dashboard renders for everyone; assessment data is
 * loaded by the /api/assessment endpoint (see dashboard.js): server-side token resolution
 * for the live path, or the validated-run fixture for ?demo=1.
 *
 * Access to a specific client's data is gated by possession of its URL token — the server
 * endpoint only returns a row when given a valid token, and the service-role key never
 * reaches the browser. There is no longer a password lockscreen (magic-link model).
 */
document.addEventListener('DOMContentLoaded', () => {
    const appContainer = document.querySelector('.app-container');
    const lockscreen = document.getElementById('lockscreen-gate');

    if (appContainer) appContainer.style.display = 'flex';
    if (lockscreen) lockscreen.style.display = 'none';

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => { window.location.href = 'index.html'; });
    }
});
