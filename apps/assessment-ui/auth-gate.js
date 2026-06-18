document.addEventListener('DOMContentLoaded', () => {
    const $ = id => document.getElementById(id);
    const oauthPopup = $('oauth-popup'), btnCancel = $('btn-cancel'), btnCloseDot = $('btn-close-dot');
    const modalBrowserTitle = $('modal-browser-title'), tabLogin = $('tab-login'), tabCookie = $('tab-cookie');
    const contentLogin = $('content-login'), contentCookie = $('content-cookie'), loginFormView = $('login-form-view');
    const loginProgressView = $('login-progress-view'), loginSuccessView = $('login-success-view'), consoleOutput = $('console-output');
    const loginUsername = $('login-username'), loginPassword = $('login-password'), labelUsername = $('label-username');
    const cookieFieldsContainer = $('cookie-fields-container'), cookieInstructions = $('cookie-instructions');
    const toast = $('toast-notification'), toastMessage = $('toast-message');
    const connectionsCountEl = $('connections-count'), generateAuditBtn = $('generate-audit');

    let currentPlatform = null, connectedPlatforms = new Map(), vncTimeouts = [];
    const platformsMetadata = window.AuthGateData ? window.AuthGateData.platformsMetadata : {};

    const supabaseUrl = 'https://wraqaqyqqeswufbarhcz.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndyYXFhcXlxcWVzd3VmYmFyaGN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzNDYxNTcsImV4cCI6MjA4ODkyMjE1N30.8MME9AjR7jupsIkaUvFAuz3VFMiYRXvhNDyk8d4DDLY';
    const supabaseClient = window.supabase ? window.supabase.createClient(supabaseUrl, supabaseKey) : null;
    const token = new URLSearchParams(window.location.search).get('token');

    if (!token) {
        setTimeout(() => {
            showToast("Invalid Access Token. Please check your email.");
            const subtitle = document.querySelector('.gate-subtitle');
            if (subtitle) {
                subtitle.innerHTML = `<span style="color: var(--color-error); font-weight: bold;">⚠️ Access Restricted:</span> Please use the unique link sent via email to configure credentials.`;
            }
        }, 300);
    }

    const sleep = ms => new Promise(r => vncTimeouts.push(setTimeout(r, ms)));
    const clearTimeouts = () => { vncTimeouts.forEach(clearTimeout); vncTimeouts = []; };

    function updateConnectionsState() {
        const count = connectedPlatforms.size;
        connectionsCountEl.textContent = `${count} Platform${count === 1 ? '' : 's'} Connected`;
        generateAuditBtn.classList.toggle('active', count > 0);
        generateAuditBtn.disabled = count === 0 || !token;
    }

    document.querySelectorAll('.auth-card').forEach(card => {
        const btn = card.querySelector('.oauth-toggle-btn');
        const statusEl = card.querySelector('.oauth-status');
        const platform = btn.getAttribute('data-platform');
        
        btn.addEventListener('click', () => {
            if (connectedPlatforms.has(platform)) {
                connectedPlatforms.delete(platform);
                const req = platformsMetadata[platform].requiresAuth;
                statusEl.setAttribute('data-connected', 'false');
                statusEl.textContent = req ? 'Not Connected' : 'Not Configured';
                statusEl.className = 'oauth-status';
                card.classList.remove('connected');
                btn.textContent = req ? 'Connect Account' : 'Configure Profile';
                btn.classList.add('btn-highlight');
                showToast(`Removed config for ${platformsMetadata[platform].name}.`);
                updateConnectionsState();
            } else {
                openAuthModal(platform);
            }
        });
    });

    function openAuthModal(platformId) {
        currentPlatform = platformId;
        const meta = platformsMetadata[platformId];
        const modalTabsEl = document.querySelector('.modal-tabs');
        const passwordGroup = loginPassword.closest('.form-group');
        const submitBtn = document.querySelector('#interactive-login-form .btn-sync-action');

        if (!meta.requiresAuth) {
            modalBrowserTitle.textContent = `Configure Profile: ${meta.name}`;
            if (modalTabsEl) modalTabsEl.style.display = 'none';
            if (passwordGroup) passwordGroup.style.display = 'none';
            loginPassword.required = false;
            labelUsername.textContent = meta.publicLabel;
            loginUsername.placeholder = meta.publicPlaceholder;
            if (submitBtn) submitBtn.textContent = 'Save Profile Link';
            switchTab('login');
        } else {
            modalBrowserTitle.textContent = `Authentication Terminal: ${meta.name}`;
            if (modalTabsEl) modalTabsEl.style.display = 'flex';
            if (passwordGroup) passwordGroup.style.display = 'block';
            loginPassword.required = true;
            labelUsername.textContent = meta.usernameLabel;
            loginUsername.placeholder = meta.usernamePlaceholder;
            if (submitBtn) submitBtn.textContent = 'Verify & Connect';
            switchTab('login');
            if (window.AuthGateData.renderCookieForm) {
                window.AuthGateData.renderCookieForm(cookieFieldsContainer, cookieInstructions, meta);
            }
        }
        loginUsername.value = '';
        loginPassword.value = '';
        oauthPopup.classList.remove('hidden');
    }

    window.switchTab = function(tabName) {
        clearTimeouts();
        loginFormView.style.display = 'block';
        loginProgressView.style.display = 'none';
        loginSuccessView.style.display = 'none';
        const isLogin = tabName === 'login';
        tabLogin.classList.toggle('active', isLogin);
        tabCookie.classList.toggle('active', !isLogin);
        contentLogin.classList.toggle('active', isLogin);
        contentCookie.classList.toggle('active', !isLogin);
    };

    function hideModal() {
        oauthPopup.classList.add('hidden');
        clearTimeouts();
        currentPlatform = null;
    }

    if (btnCloseDot) btnCloseDot.addEventListener('click', hideModal);
    if (btnCancel) btnCancel.addEventListener('click', hideModal);

    function appendTerminalLine(text, type = 'info') {
        const line = document.createElement('div');
        line.className = `console-line ${type}`;
        line.textContent = text;
        consoleOutput.appendChild(line);
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
    }

    window.handleInteractiveLogin = async function(event) {
        event.preventDefault();
        const username = loginUsername.value.trim();
        const password = loginPassword.value;
        const meta = platformsMetadata[currentPlatform];
        
        loginFormView.style.display = 'none';
        loginProgressView.style.display = 'block';
        consoleOutput.innerHTML = '';
        
        if (!meta.requiresAuth) {
            if (window.AuthGateData.simulatePublicLogs) {
                await window.AuthGateData.simulatePublicLogs(meta, username, appendTerminalLine, sleep);
            }
            loginProgressView.style.display = 'none';
            loginSuccessView.style.display = 'block';
            $('success-message').textContent = `Target profile connected successfully: ${username}`;
            connectedPlatforms.set(currentPlatform, { type: 'public', username: username });
            connectPlatformUI(currentPlatform, username);
            await sleep(1200);
            hideModal();
            return;
        }

        if (window.AuthGateData.simulateTerminalLogs) {
            await window.AuthGateData.simulateTerminalLogs(meta, username, appendTerminalLine, sleep);
        }
        await sleep(500);
        loginProgressView.style.display = 'none';
        loginSuccessView.style.display = 'block';
        $('success-message').textContent = `Account login completed successfully for ${username}.`;
        
        connectedPlatforms.set(currentPlatform, { type: 'login', username: username, password: password });
        connectPlatformUI(currentPlatform, `@${username.split('@')[0]}`);
        await sleep(1500);
        hideModal();
    };

    window.handleManualCookie = function(event) {
        event.preventDefault();
        const inputs = cookieFieldsContainer.querySelectorAll('.cookie-input');
        const cookies = {};
        let isValid = true;
        inputs.forEach(input => {
            const val = input.value.trim();
            if (!val) isValid = false;
            cookies[input.getAttribute('data-cookie')] = val;
        });
        if (!isValid) return alert('Please fill out all cookie fields.');

        connectedPlatforms.set(currentPlatform, { type: 'cookie', cookies: cookies });
        connectPlatformUI(currentPlatform, 'Session Cookies Injected');
        hideModal();
    };

    function connectPlatformUI(platformId, detailsText) {
        const card = document.getElementById(`oauth-${platformId}`);
        if (card) {
            const statusEl = card.querySelector('.oauth-status');
            const btn = card.querySelector('.oauth-toggle-btn');
            statusEl.setAttribute('data-connected', 'true');
            statusEl.textContent = `Connected: ${detailsText}`;
            statusEl.className = 'oauth-status text-success';
            card.classList.add('connected');
            btn.textContent = 'Disconnect';
            btn.classList.remove('btn-highlight');
        }
        showToast(`Successfully connected to ${platformsMetadata[platformId].name}!`);
        updateConnectionsState();
    }

    function showToast(message) {
        toastMessage.textContent = message;
        toast.classList.add('show');
        setTimeout(() => { toast.classList.remove('show'); }, 3000);
    }

    generateAuditBtn.addEventListener('click', async () => {
        const platformsArray = Array.from(connectedPlatforms.keys());
        if (platformsArray.length === 0 || !token || !supabaseClient) return;

        generateAuditBtn.disabled = true;
        generateAuditBtn.textContent = "Initiating Diagnostic Scan...";

        try {
            const { data, error } = await supabaseClient
                .from('revenue_journey_assessments')
                .select('*')
                .filter('assessment_detail->>client_token', 'eq', token);

            if (error) throw error;
            if (!data || data.length === 0) throw new Error("Assessment record not found.");

            const record = data[0];
            const authTokens = {};
            connectedPlatforms.forEach((val, key) => {
                authTokens[key] = {
                    type: val.type,
                    username: val.username || null,
                    password: val.password || null,
                    cookies: val.cookies || null
                };
            });

            const updatedDetail = {
                ...(record.assessment_detail || {}),
                authTokens: authTokens,
                status: 'auth_submitted'
            };

            const { error: updateError } = await supabaseClient
                .from('revenue_journey_assessments')
                .update({
                    assessment_detail: updatedDetail,
                    overall_score: 0.0,
                    awareness_score: 0.0,
                    consideration_score: 0.0,
                    decision_score: 0.0,
                    conversion_score: 0.0,
                    retention_score: 0.0
                })
                .eq('assessment_id', record.assessment_id);

            if (updateError) throw updateError;

            const mainGate = document.querySelector('.gate-container');
            const initiatedView = document.getElementById('initiated-view');
            if (mainGate) mainGate.style.display = 'none';
            if (initiatedView) initiatedView.classList.add('show');

            showToast("Diagnostic scan successfully started!");
        } catch (err) {
            console.error(err);
            showToast(`Error: ${err.message || err}`);
            generateAuditBtn.disabled = false;
            generateAuditBtn.textContent = "Submit & Start Diagnostic Scan";
        }
    });

    if (window.initStarField) window.initStarField('starfield-canvas');
});
