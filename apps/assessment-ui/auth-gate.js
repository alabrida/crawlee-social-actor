document.addEventListener('DOMContentLoaded', () => {
    // DOM Element Selectors
    const oauthPopup = document.getElementById('oauth-popup');
    const cancelAuthBtn = document.getElementById('cancel-auth-btn');
    const cancelVncBtnDot = document.getElementById('cancel-vnc-btn-dot');
    const vncTabClose = document.getElementById('vnc-tab-close');
    
    const vncTabTitle = document.getElementById('vnc-tab-title');
    const vncTabFavicon = document.getElementById('vnc-tab-favicon');
    const vncAddressInput = document.getElementById('vnc-address-input');
    const vncStepInit = document.getElementById('vnc-step-init');
    const vncStepLoginForm = document.getElementById('vnc-step-login-form');
    const vncStepCapturing = document.getElementById('vnc-step-capturing');
    const vncStepSuccess = document.getElementById('vnc-step-success');
    const vncTerminalLines = document.getElementById('vnc-terminal-lines');
    const vncActionBtn = document.getElementById('vnc-action-btn');
    const vncSuccessUserDisplay = document.getElementById('vnc-success-user-display');
    const vncSuccessCookieName = document.getElementById('vnc-success-cookie-name');
    const vncDynamicFormWrapper = document.getElementById('vnc-dynamic-form-wrapper');
    
    const toast = document.getElementById('toast-notification');
    const toastMessage = document.getElementById('toast-message');
    
    const connectionsCountEl = document.getElementById('connections-count');
    const generateAuditBtn = document.getElementById('generate-audit');

    let currentOauthPlatform = null;
    let connectedPlatforms = new Set();
    let directUrlPlatforms = new Set();
    let vncTimeouts = [];

    // Clear session storage on fresh landing gate entry
    sessionStorage.removeItem('auth_source');
    sessionStorage.removeItem('connected_platforms');
    sessionStorage.removeItem('auth_completed');

    function updateGateStatus() {
        const totalConnected = connectedPlatforms.size + directUrlPlatforms.size;
        connectionsCountEl.textContent = `${totalConnected} Platform${totalConnected === 1 ? '' : 's'} Linked`;
        
        if (totalConnected > 0) {
            generateAuditBtn.classList.add('active');
            generateAuditBtn.disabled = false;
        } else {
            generateAuditBtn.classList.remove('active');
            generateAuditBtn.disabled = true;
        }
    }

    // Connect trigger listener loop
    const authCards = document.querySelectorAll('.auth-card');
    authCards.forEach(card => {
        const btn = card.querySelector('.oauth-toggle-btn');
        const statusEl = card.querySelector('.oauth-status');
        const platform = btn.getAttribute('data-platform');
        
        btn.addEventListener('click', () => {
            const isConnected = statusEl.getAttribute('data-connected') === 'true';
            
            if (isConnected) {
                // Perform simple disconnect
                statusEl.setAttribute('data-connected', 'false');
                statusEl.textContent = 'Not Connected';
                statusEl.className = 'oauth-status';
                card.classList.remove('connected');
                if (btn) {
                    btn.textContent = 'Connect';
                    btn.classList.add('btn-highlight');
                }
                connectedPlatforms.delete(platform);
                showToast(`Disconnected from ${getPlatformName(platform)}.`);
                updateGateStatus();
            } else {
                // Open VNC modal (Option 2-B)
                currentOauthPlatform = { btn, statusEl, platform, card };
                vncTabFavicon.textContent = getPlatformFavicon(platform);
                vncTabTitle.textContent = `${getPlatformName(platform)} Login`;
                vncAddressInput.value = getPlatformUrl(platform);
                vncActionBtn.classList.add('hidden');
                
                oauthPopup.classList.add('show');
                oauthPopup.classList.remove('hidden');
                
                runVncStep1(platform);
            }
        });

        // Direct URL toggle button
        const btnToggleLink = card.querySelector('.btn-toggle-link');
        const urlContainer = card.querySelector('.direct-url-container');
        const urlInputs = card.querySelectorAll('.platform-direct-url');
        
        if (btnToggleLink && urlContainer && urlInputs.length > 0) {
            btnToggleLink.addEventListener('click', () => {
                const isInputVisible = !urlContainer.classList.contains('hidden');
                
                if (isInputVisible) {
                    // Hide input fields and restore OAuth buttons
                    urlContainer.classList.add('hidden');
                    btnToggleLink.classList.remove('active-link');
                    if (btn) btn.classList.remove('hidden');
                    
                    const isConnected = statusEl.getAttribute('data-connected') === 'true';
                    if (isConnected) {
                        statusEl.textContent = `Connected`;
                        statusEl.className = 'oauth-status text-success';
                        card.classList.add('connected');
                    } else {
                        statusEl.textContent = 'Not Connected';
                        statusEl.className = 'oauth-status';
                        card.classList.remove('connected');
                    }
                    directUrlPlatforms.delete(platform);
                    updateGateStatus();
                } else {
                    // Show input fields and hide OAuth button
                    urlContainer.classList.remove('hidden');
                    btnToggleLink.classList.add('active-link');
                    if (btn) btn.classList.add('hidden');
                    
                    const hasValue = Array.from(urlInputs).some(inp => inp.value.trim());
                    if (hasValue) {
                        statusEl.textContent = 'URL Configured';
                        statusEl.className = 'oauth-status text-success';
                        card.classList.add('connected');
                        directUrlPlatforms.add(platform);
                    } else {
                        statusEl.textContent = 'Direct URL';
                        statusEl.className = 'oauth-status text-highlight';
                        card.classList.remove('connected');
                        directUrlPlatforms.delete(platform);
                    }
                    updateGateStatus();
                    urlInputs[0].focus();
                }
            });
            
            // Sync status feedback text to user typing in any direct URL field
            urlInputs.forEach(inpEl => {
                inpEl.addEventListener('input', () => {
                    const hasValue = Array.from(urlInputs).some(inp => inp.value.trim());
                    if (hasValue) {
                        statusEl.textContent = 'URL Configured';
                        statusEl.className = 'oauth-status text-success';
                        card.classList.add('connected');
                        directUrlPlatforms.add(platform);
                    } else {
                        statusEl.textContent = 'Direct URL';
                        statusEl.className = 'oauth-status text-highlight';
                        card.classList.remove('connected');
                        directUrlPlatforms.delete(platform);
                    }
                    updateGateStatus();
                });
            });
        }
    });

    function getPlatformName(platform) {
        switch(platform) {
            case 'google': return 'Google Business';
            case 'linkedin': return 'LinkedIn';
            case 'facebook': return 'Facebook';
            case 'instagram': return 'Instagram';
            case 'youtube': return 'YouTube';
            case 'tiktok': return 'TikTok';
            case 'twitter': return 'Twitter / X';
            case 'pinterest': return 'Pinterest';
            case 'reddit': return 'Reddit';
            default: return platform;
        }
    }

    function getPlatformFavicon(platform) {
        switch(platform) {
            case 'google':
            case 'youtube': return 'G';
            case 'linkedin': return 'in';
            case 'facebook': return 'f';
            case 'instagram': return '📸';
            case 'twitter': return '𝕏';
            case 'pinterest': return 'P';
            case 'reddit': return 'R';
            default: return '🌐';
        }
    }

    function getPlatformCookie(platform) {
        switch(platform) {
            case 'linkedin': return 'li_at';
            case 'facebook': return 'c_user';
            case 'instagram': return 'ds_user_id';
            case 'twitter': return 'auth_token';
            case 'google':
            case 'youtube': return 'VISITOR_INFO1_LIVE';
            case 'pinterest': return '_auth';
            case 'reddit': return 'reddit_session';
            default: return 'session_id';
        }
    }

    function getPlatformUrl(platform) {
        switch(platform) {
            case 'linkedin': return 'https://www.linkedin.com/login';
            case 'facebook': return 'https://www.facebook.com/login';
            case 'twitter': return 'https://x.com/i/flow/login';
            case 'google':
            case 'youtube': return 'https://accounts.google.com/signin';
            case 'tiktok': return 'https://www.tiktok.com/login';
            case 'instagram': return 'https://www.instagram.com/accounts/login/';
            case 'pinterest': return 'https://www.pinterest.com/login/';
            case 'reddit': return 'https://www.reddit.com/login/';
            default: return 'https://' + platform + '.com/login';
        }
    }

    function getLoginFormHTML(platform) {
        let brandClass = 'brand-' + platform;
        let btnClass = 'btn-' + platform;
        let logoText = '';
        let titleText = 'Incognito Authentication';
        let userPlaceholder = 'Email or phone number';
        let btnText = 'Sign In';

        switch(platform) {
            case 'linkedin':
                logoText = '<span class="brand-linkedin">Linked</span>In';
                titleText = 'Stay updated on your professional world';
                btnText = 'Sign in';
                break;
            case 'facebook':
                logoText = '<span class="brand-facebook">facebook</span>';
                titleText = 'Connect with friends and the world around you.';
                btnText = 'Log In';
                break;
            case 'twitter':
                logoText = '𝕏';
                titleText = 'Happening now. Join today.';
                userPlaceholder = 'Phone, email, or username';
                btnText = 'Log in';
                break;
            case 'google':
            case 'youtube':
                logoText = '<span style="color:#4285F4">G</span><span style="color:#EA4335">o</span><span style="color:#FBBC05">o</span><span style="color:#4285F4">g</span><span style="color:#34A853">l</span><span style="color:#EA4335">e</span>';
                titleText = 'Sign in to your Google Account';
                userPlaceholder = 'Email or phone';
                btnText = 'Next';
                break;
            case 'tiktok':
                logoText = '🎵 TikTok';
                titleText = 'Manage your account, check notifications, and more.';
                btnText = 'Log in';
                break;
            case 'instagram':
                logoText = '<span class="brand-instagram" style="font-family: serif; font-style: italic; font-weight: 700; font-size: 1.8rem;">Instagram</span>';
                titleText = 'Sign up to see photos and videos from your friends.';
                btnText = 'Log in';
                break;
            case 'pinterest':
                logoText = '<span class="brand-pinterest">Pinterest</span>';
                titleText = 'Find new ideas to try';
                btnText = 'Log in';
                break;
            case 'reddit':
                logoText = '<span class="brand-reddit">reddit</span>';
                titleText = 'Dive into anything';
                btnText = 'Log In';
                break;
            default:
                logoText = platform.toUpperCase();
                titleText = 'Connect Profile';
                btnText = 'Connect';
        }

        return `
            <div class="vnc-login-form-box">
                <div class="vnc-form-header">
                    <div class="vnc-form-logo">${logoText}</div>
                    <div class="vnc-form-title">${titleText}</div>
                </div>
                <form id="vnc-simulated-form">
                    <div class="vnc-form-group">
                        <label>Username / Email</label>
                        <input type="text" class="vnc-input" id="vnc-username-field" placeholder="${userPlaceholder}" value="growth@richardnorwood.com" required>
                    </div>
                    <div class="vnc-form-group">
                        <label>Password</label>
                        <input type="password" class="vnc-input" id="vnc-password-field" placeholder="Enter password" value="••••••••••••" required>
                    </div>
                    <button type="submit" class="vnc-submit-btn ${btnClass}">${btnText}</button>
                </form>
            </div>
        `;
    }

    if (cancelVncBtnDot) cancelVncBtnDot.addEventListener('click', hideModal);
    if (vncTabClose) vncTabClose.addEventListener('click', hideModal);
    if (cancelAuthBtn) cancelAuthBtn.addEventListener('click', hideModal);
    
    function hideModal() {
        oauthPopup.classList.remove('show');
        oauthPopup.classList.add('hidden');
        clearVncTimeouts();
        currentOauthPlatform = null;
    }

    function clearVncTimeouts() {
        vncTimeouts.forEach(clearTimeout);
        vncTimeouts = [];
    }

    function showVncStep(stepId) {
        vncStepInit.classList.add('hidden');
        vncStepLoginForm.classList.add('hidden');
        vncStepCapturing.classList.add('hidden');
        vncStepSuccess.classList.add('hidden');
        
        document.getElementById(stepId).classList.remove('hidden');
    }

    function clearVncTerminal() {
        vncTerminalLines.innerHTML = '';
    }

    function appendVncTerminalLine(text, type = 'info') {
        const line = document.createElement('div');
        line.className = `term-line ${type}`;
        line.textContent = text;
        vncTerminalLines.appendChild(line);
        vncTerminalLines.scrollTop = vncTerminalLines.scrollHeight;
    }

    function runVncStep1(platform) {
        clearVncTimeouts();
        showVncStep('vnc-step-init');
        clearVncTerminal();
        
        const detailsCard = document.querySelector('#vnc-step-success .session-details-card');
        detailsCard.innerHTML = `
            <div class="detail-line">
                <span class="detail-lbl">User Session:</span>
                <span class="detail-val" id="vnc-success-user-display">Active</span>
            </div>
            <div class="detail-line">
                <span class="detail-lbl">Security State:</span>
                <span class="detail-val text-success">Active & Encrypted</span>
            </div>
            <div class="detail-line">
                <span class="detail-lbl">Cookies Intercepted:</span>
                <span class="detail-val" id="vnc-success-cookie-name">li_at</span>
            </div>
        `;

        appendVncTerminalLine(`[System] Spawning incognito browserContext for ${getPlatformName(platform)}...`, 'info');
        
        let t1 = setTimeout(() => {
            appendVncTerminalLine(`[Proxy] Routed traffic via Residential US-East proxy (172.98.43.201)...`, 'info');
        }, 300);
        
        let t2 = setTimeout(() => {
            appendVncTerminalLine(`[Playwright] Spawning isolated Chromium context (fingerprints active)...`, 'info');
        }, 700);
        
        let t3 = setTimeout(() => {
            appendVncTerminalLine(`[Playwright] Navigating context to login portal: ${getPlatformUrl(platform)}...`, 'info');
        }, 1100);
        
        let t4 = setTimeout(() => {
            appendVncTerminalLine(`[VNC Server] Stream connection established (60fps, 1024x768).`, 'success');
            runVncStep2(platform);
        }, 1500);
        
        vncTimeouts.push(t1, t2, t3, t4);
    }

    function runVncStep2(platform) {
        showVncStep('vnc-step-login-form');
        vncDynamicFormWrapper.innerHTML = getLoginFormHTML(platform);
        
        const form = document.getElementById('vnc-simulated-form');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = document.getElementById('vnc-username-field').value || 'growth@richardnorwood.com';
            runVncStep3(platform, username);
        });
    }

    function runVncStep3(platform, email) {
        showVncStep('vnc-step-capturing');
        
        const cookieName = getPlatformCookie(platform);
        appendVncTerminalLine(`[VNC Browser] Form submit intercepted. Capturing authentication trigger...`, 'info');
        
        let t1 = setTimeout(() => {
            appendVncTerminalLine(`[Playwright] Waiting for cookies to be set...`, 'info');
        }, 400);
        
        let t2 = setTimeout(() => {
            appendVncTerminalLine(`[SessionVault] Intercepted network cookies: checking requirements...`, 'info');
        }, 800);
        
        let t3 = setTimeout(() => {
            appendVncTerminalLine(`[SessionVault] Found session key: '${cookieName}' detected.`, 'success');
        }, 1200);
        
        let t4 = setTimeout(() => {
            appendVncTerminalLine(`[Playwright] Capture successful! Storing storageState JSON structure.`, 'success');
        }, 1600);
        
        let t5 = setTimeout(() => {
            appendVncTerminalLine(`[Health Check] Running pre-flight request with captured storageState...`, 'info');
        }, 2000);
        
        let t6 = setTimeout(() => {
            appendVncTerminalLine(`[Health Check] Request GET /feed HTTP/1.1 -> Status 200 OK (Auth Valid)`, 'success');
        }, 2400);
        
        let t7 = setTimeout(() => {
            appendVncTerminalLine(`[SessionVault] Encrypting and saving context credentials to Supabase...`, 'info');
        }, 2800);
        
        let t8 = setTimeout(() => {
            runVncStep4(platform, email);
        }, 3200);
        
        vncTimeouts.push(t1, t2, t3, t4, t5, t6, t7, t8);
    }

    function runVncStep4(platform, email) {
        showVncStep('vnc-step-success');
        vncActionBtn.classList.remove('hidden');
        vncActionBtn.textContent = 'Save Credentials';
        
        vncSuccessUserDisplay.textContent = email;
        vncSuccessCookieName.textContent = getPlatformCookie(platform);
        
        appendVncTerminalLine(`[SessionVault] Context credentials saved successfully. Session verified as HEALTHY.`, 'success');
    }

    vncActionBtn.addEventListener('click', () => {
        if (currentOauthPlatform) {
            const { btn, statusEl, platform, card } = currentOauthPlatform;
            
            statusEl.setAttribute('data-connected', 'true');
            statusEl.textContent = `Connected`;
            statusEl.className = 'oauth-status text-success';
            card.classList.add('connected');
            
            if (btn) {
                btn.textContent = 'Disconnect';
                btn.classList.remove('btn-highlight');
            }
            
            connectedPlatforms.add(platform);
            showToast(`Successfully authenticated with ${getPlatformName(platform)}!`);
            updateGateStatus();
            hideModal();
        }
    });

    function showToast(message) {
        toastMessage.textContent = message;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // Generate Audit redirection handler
    generateAuditBtn.addEventListener('click', () => {
        const totalList = [...connectedPlatforms, ...directUrlPlatforms];
        if (totalList.length === 0) return;

        // Save session items
        sessionStorage.setItem('auth_source', 'vnc');
        sessionStorage.setItem('connected_platforms', JSON.stringify(totalList));
        sessionStorage.setItem('auth_completed', 'true');

        generateAuditBtn.disabled = true;
        generateAuditBtn.textContent = "Compiling Credentials & Redirecting...";

        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1200);
    });

    // ── Canvas Starfield background simulation ──
    const canvas = document.getElementById('starfield-canvas');
    const ctx = canvas.getContext('2d');

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    const STAR_COUNT = 120;
    const stars = [];

    function initStars() {
        stars.length = 0;
        for (let i = 0; i < STAR_COUNT; i++) {
            stars.push({
                x: Math.random() * width,
                y: Math.random() * height,
                size: Math.random() * 1.5 + 0.2,
                opacity: Math.random() * 0.6 + 0.1,
                twinkleSpeed: 0.5 + Math.random() * 1.5,
                twinkleOffset: Math.random() * Math.PI * 2
            });
        }
    }

    function drawStars(time) {
        ctx.clearRect(0, 0, width, height);
        stars.forEach(s => {
            const twinkle = s.opacity * (0.7 + 0.3 * Math.sin(time * s.twinkleSpeed + s.twinkleOffset));
            ctx.globalAlpha = twinkle;
            ctx.fillStyle = '#e8edf5';
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    window.addEventListener('resize', () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
        initStars();
    });

    initStars();
    let time = 0;
    function animate() {
        time += 0.016;
        drawStars(time);
        requestAnimationFrame(animate);
    }
    animate();
});
