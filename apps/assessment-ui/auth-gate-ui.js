(function() {
    const $ = id => document.getElementById(id);
    
    // UI elements
    const oauthPopup = $('oauth-popup');
    const modalBrowserTitle = $('modal-browser-title');
    const tabLogin = $('tab-login');
    const tabCookie = $('tab-cookie');
    const contentLogin = $('content-login');
    const contentCookie = $('content-cookie');
    const loginFormView = $('login-form-view');
    const loginProgressView = $('login-progress-view');
    const loginSuccessView = $('login-success-view');
    const consoleOutput = $('console-output');
    const loginUsername = $('login-username');
    const loginPassword = $('login-password');
    const labelUsername = $('label-username');
    const cookieFieldsContainer = $('cookie-fields-container');
    const cookieInstructions = $('cookie-instructions');
    const toast = $('toast-notification');
    const toastMessage = $('toast-message');
    const connectionsCountEl = $('connections-count');
    const generateAuditBtn = $('generate-audit');

    // Global state registry
    window.AuthGateState = {
        token: new URLSearchParams(window.location.search).get('token'),
        connectedPlatforms: new Map(),
        currentPlatform: null,
        vncTimeouts: []
    };

    const platformsMetadata = window.AuthGateData ? window.AuthGateData.platformsMetadata : {};

    function updateConnectionsState() {
        const count = window.AuthGateState.connectedPlatforms.size;
        if (connectionsCountEl) {
            connectionsCountEl.textContent = `${count} Platform${count === 1 ? '' : 's'} Connected`;
        }
        if (generateAuditBtn) {
            generateAuditBtn.classList.toggle('active', count > 0);
            generateAuditBtn.disabled = count === 0 || !window.AuthGateState.token;
        }
    }

    function showToast(message) {
        if (!toastMessage || !toast) return;
        toastMessage.textContent = message;
        toast.classList.add('show');
        setTimeout(() => { toast.classList.remove('show'); }, 3000);
    }

    function appendTerminalLine(text, type = 'info') {
        if (!consoleOutput) return;
        const line = document.createElement('div');
        line.className = `console-line ${type}`;
        line.textContent = text;
        consoleOutput.appendChild(line);
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
    }

    function openAuthModal(platformId) {
        window.AuthGateState.currentPlatform = platformId;
        const meta = platformsMetadata[platformId];
        if (!meta) return;

        const modalTabsEl = document.querySelector('.modal-tabs');
        const passwordGroup = loginPassword ? loginPassword.closest('.form-group') : null;
        const submitBtn = document.querySelector('#interactive-login-form .btn-sync-action');

        if (!meta.requiresAuth) {
            if (modalBrowserTitle) modalBrowserTitle.textContent = `Configure Profile: ${meta.name}`;
            if (modalTabsEl) modalTabsEl.style.display = 'none';
            if (passwordGroup) passwordGroup.style.display = 'none';
            if (loginPassword) loginPassword.required = false;
            if (labelUsername) labelUsername.textContent = meta.publicLabel;
            if (loginUsername) {
                loginUsername.placeholder = meta.publicPlaceholder;
                loginUsername.value = '';
            }
            if (submitBtn) submitBtn.textContent = 'Save Profile Link';
            switchTab('login');
        } else {
            if (modalBrowserTitle) modalBrowserTitle.textContent = `Authentication Terminal: ${meta.name}`;
            if (modalTabsEl) modalTabsEl.style.display = 'flex';
            if (passwordGroup) passwordGroup.style.display = 'block';
            if (loginPassword) {
                loginPassword.required = true;
                loginPassword.value = '';
            }
            if (labelUsername) labelUsername.textContent = meta.usernameLabel;
            if (loginUsername) {
                loginUsername.placeholder = meta.usernamePlaceholder;
                loginUsername.value = '';
            }
            if (submitBtn) submitBtn.textContent = 'Verify & Connect';
            switchTab('login');
            if (window.AuthGateData.renderCookieForm) {
                window.AuthGateData.renderCookieForm(cookieFieldsContainer, cookieInstructions, meta);
            }
        }
        if (oauthPopup) oauthPopup.classList.remove('hidden');
    }

    function switchTab(tabName) {
        if (window.AuthGateState.vncTimeouts) {
            window.AuthGateState.vncTimeouts.forEach(clearTimeout);
            window.AuthGateState.vncTimeouts = [];
        }
        if (loginFormView) loginFormView.style.display = 'block';
        if (loginProgressView) loginProgressView.style.display = 'none';
        if (loginSuccessView) loginSuccessView.style.display = 'none';
        
        const isLogin = tabName === 'login';
        if (tabLogin) tabLogin.classList.toggle('active', isLogin);
        if (tabCookie) tabCookie.classList.toggle('active', !isLogin);
        if (contentLogin) contentLogin.classList.toggle('active', isLogin);
        if (contentCookie) contentCookie.classList.toggle('active', !isLogin);
    }

    function hideModal() {
        if (oauthPopup) oauthPopup.classList.add('hidden');
        if (window.AuthGateState.vncTimeouts) {
            window.AuthGateState.vncTimeouts.forEach(clearTimeout);
            window.AuthGateState.vncTimeouts = [];
        }
        window.AuthGateState.currentPlatform = null;
    }

    function connectPlatformUI(platformId, detailsText) {
        const card = document.getElementById(`oauth-${platformId}`);
        if (card) {
            const statusEl = card.querySelector('.oauth-status');
            const btn = card.querySelector('.oauth-toggle-btn');
            statusEl.setAttribute('data-connected', 'true');
            statusEl.textContent = `Connected: ${detailsText}`;
            statusEl.className = 'oauth-status text-success';
            card.classList.add('connected');
            if (btn) {
                btn.textContent = 'Disconnect';
                btn.classList.remove('btn-highlight');
            }
        }
        showToast(`Successfully connected to ${platformsMetadata[platformId].name}!`);
        updateConnectionsState();
    }

    function disconnectPlatformUI(platformId) {
        const card = document.getElementById(`oauth-${platformId}`);
        if (card) {
            const statusEl = card.querySelector('.oauth-status');
            const btn = card.querySelector('.oauth-toggle-btn');
            statusEl.setAttribute('data-connected', 'false');
            statusEl.textContent = platformsMetadata[platformId].requiresAuth ? 'Not Connected' : 'Not Configured';
            statusEl.className = 'oauth-status';
            card.classList.remove('connected');
            if (btn) {
                btn.textContent = platformsMetadata[platformId].requiresAuth ? 'Connect Account' : 'Configure Profile';
                btn.classList.add('btn-highlight');
            }
        }
        showToast(`Removed config for ${platformsMetadata[platformId].name}.`);
        updateConnectionsState();
    }

    // Bind DOM triggers
    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('.auth-card').forEach(card => {
            const btn = card.querySelector('.oauth-toggle-btn');
            if (!btn) return;
            const platform = btn.getAttribute('data-platform');
            
            btn.addEventListener('click', () => {
                if (window.AuthGateState.connectedPlatforms.has(platform)) {
                    window.AuthGateState.connectedPlatforms.delete(platform);
                    disconnectPlatformUI(platform);
                } else {
                    openAuthModal(platform);
                }
            });
        });

        const btnCloseDot = $('btn-close-dot');
        const btnCancel = $('btn-cancel');
        if (btnCloseDot) btnCloseDot.addEventListener('click', hideModal);
        if (btnCancel) btnCancel.addEventListener('click', hideModal);

        if (window.initStarField) window.initStarField('starfield-canvas');
    });

    // Expose UI helpers
    window.AuthGateUI = {
        updateConnectionsState,
        showToast,
        appendTerminalLine,
        openAuthModal,
        switchTab,
        hideModal,
        connectPlatformUI,
        disconnectPlatformUI
    };
    window.switchTab = switchTab; // Preserve legacy onclick target
})();
