document.addEventListener('DOMContentLoaded', () => {
    // DOM Element Selectors
    const settingsSidebar = document.getElementById('settings-sidebar');
    const triggerBtn = document.getElementById('trigger-assessment-btn');
    const closeBtn = document.getElementById('close-sidebar-btn');
    const mobileTriggerBtn = document.getElementById('mobile-sidebar-btn');
    const sidebarBackdrop = document.querySelector('.sidebar-backdrop');
    
    const targetUrlInput = document.getElementById('target-url');
    const preflightBtn = document.getElementById('preflight-btn');
    const preflightStatus = document.getElementById('preflight-status');
    const preflightSuccessBlock = document.getElementById('preflight-success-info');
    const preflightClassVal = document.getElementById('preflight-detected-class');
    const preflightJsonLdVal = document.getElementById('preflight-jsonld-status');
    
    const keywordTagsContainer = document.getElementById('keyword-tags-container');
    const newKeywordInput = document.getElementById('new-keyword-input');
    const addKeywordBtn = document.getElementById('add-keyword-btn');
    
    const startAuditBtn = document.getElementById('start-audit-btn');
    const auditSpinner = document.getElementById('audit-spinner');
    const executionConsole = document.getElementById('execution-console');
    const consoleLinesContainer = document.getElementById('console-lines-container');
    
    const oauthPopup = document.getElementById('oauth-popup');
    const cancelAuthBtn = document.getElementById('cancel-auth-btn');
    
    // VNC Selectors
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
    const cancelVncBtnDot = document.getElementById('cancel-vnc-btn-dot');
    const vncTabClose = document.getElementById('vnc-tab-close');
    const vncDynamicFormWrapper = document.getElementById('vnc-dynamic-form-wrapper');
    const extensionImportBtn = document.getElementById('extension-import-btn');
    
    const toast = document.getElementById('toast-notification');
    const toastMessage = document.getElementById('toast-message');
    
    // Dashboard Value Selectors (to update dynamically after run completes)
    const overallScoreVal = document.getElementById('overall-score-val');
    const businessClassDisplay = document.getElementById('business-class-display');
    const classConfidenceVal = document.getElementById('class-confidence-val');
    const classConfidenceFill = document.getElementById('class-confidence-fill');
    const weakestStageDisplay = document.getElementById('weakest-stage-display');
    const weakestStageDesc = document.getElementById('weakest-stage-desc');
    const weakestGapList = document.getElementById('weakest-gap-list');
    const scrapedUrlIndicator = document.getElementById('scraped-url-indicator');
    
    // Overall score breakdown selectors
    const overallBadgeDisplay = document.getElementById('overall-badge-display');
    const overallFactorList = document.getElementById('overall-factor-list');
    
    // Classification breakdown selectors
    const breakdownLabel1 = document.getElementById('breakdown-label-1');
    const breakdownVal1 = document.getElementById('breakdown-val-1');
    const breakdownFill1 = document.getElementById('breakdown-fill-1');
    const breakdownLabel2 = document.getElementById('breakdown-label-2');
    const breakdownVal2 = document.getElementById('breakdown-val-2');
    const breakdownFill2 = document.getElementById('breakdown-fill-2');
    const breakdownLabel3 = document.getElementById('breakdown-label-3');
    const breakdownVal3 = document.getElementById('breakdown-val-3');
    const breakdownFill3 = document.getElementById('breakdown-fill-3');
    const breakdownExplanation = document.getElementById('breakdown-explanation');
    
    const scoreAwareness = document.getElementById('score-awareness');
    const barAwareness = document.getElementById('bar-awareness');
    const scoreConsideration = document.getElementById('score-consideration');
    const barConsideration = document.getElementById('bar-consideration');
    const scoreDecision = document.getElementById('score-decision');
    const barDecision = document.getElementById('bar-decision');
    const scoreConversion = document.getElementById('score-conversion');
    const barConversion = document.getElementById('bar-conversion');
    const scoreRetention = document.getElementById('score-retention');
    const barRetention = document.getElementById('bar-retention');

    let currentOauthPlatform = null;
    let selectedKeywords = [
        "Milo's Original Burger Shop",
        "Birmingham Burgers",
        "Hamburgers in Alabama"
    ];

    // Check URL parameters for Client Intake Mode
    const urlParams = new URLSearchParams(window.location.search);
    const isIntakeMode = urlParams.get('mode') === 'intake';

    if (isIntakeMode) {
        // Configure UI for Client Intake Mode
        document.body.classList.add('intake-mode-active');
        
        // Hide dashboard
        const mainContent = document.querySelector('.main-content');
        if (mainContent) mainContent.style.display = 'none';
        if (mobileTriggerBtn) mobileTriggerBtn.style.display = 'none';
        
        // Force sidebar open and full screen style
        settingsSidebar.classList.add('open');
        settingsSidebar.classList.add('intake-full-screen');
        
        // Hide close button and backdrop
        if (closeBtn) closeBtn.style.display = 'none';
        if (sidebarBackdrop) sidebarBackdrop.style.display = 'none';
        
        // Adjust URL input section & hide Keyword section
        window.addEventListener('load', () => {
            const sections = settingsSidebar.querySelectorAll('.settings-section');
            if (sections[0]) {
                const label = sections[0].querySelector('.field-label');
                if (label) label.textContent = 'Your Business Website URL';
                
                const preflightBtn = sections[0].querySelector('#preflight-btn');
                if (preflightBtn) preflightBtn.style.display = 'none';
                
                const statusInfo = sections[0].querySelector('#preflight-status');
                if (statusInfo) statusInfo.style.display = 'none';
                
                const successInfo = sections[0].querySelector('#preflight-success-info');
                if (successInfo) successInfo.style.display = 'none';
                
                const input = sections[0].querySelector('#target-url');
                if (input) input.style.width = '100%';
            }
            if (sections[2]) {
                const kwTitle = sections[2].querySelector('.section-title');
                if (kwTitle) kwTitle.textContent = 'Target Search Keywords';
                
                const kwDesc = sections[2].querySelector('.section-desc');
                if (kwDesc) kwDesc.textContent = 'Specify the search phrases you target to evaluate your organic ranking visibility.';
            }
        });
        
        // Change headers
        const headerTitle = settingsSidebar.querySelector('.sidebar-header h2');
        if (headerTitle) headerTitle.textContent = 'Connect Social Channels';
        const headerSubtitle = settingsSidebar.querySelector('.sidebar-subtitle');
        if (headerSubtitle) headerSubtitle.textContent = 'Authorize read-only access for your 22-Point Structural Diagnostic';
        
        // Change CTA button text
        const ctaBtnText = startAuditBtn.querySelector('.btn-text');
        if (ctaBtnText) ctaBtnText.textContent = 'Submit Authorized Channels';
        
        // Intercept audit trigger to perform submit callback instead
        startAuditBtn.addEventListener('click', (e) => {
            e.stopImmediatePropagation();
            
            startAuditBtn.disabled = true;
            auditSpinner.classList.remove('hidden');
            
            setTimeout(() => {
                auditSpinner.classList.add('hidden');
                showToast('Platform connections successfully submitted!');
                
                // Show completion screen
                const scrollArea = settingsSidebar.querySelector('.sidebar-scroll-area');
                if (scrollArea) {
                    scrollArea.innerHTML = `
                        <div class="text-center" style="padding: 4rem 1rem; animation: scaleIn 0.4s ease;">
                            <div class="platform-icon-circle bg-google" style="width: 72px; height: 72px; font-size: 2.5rem; margin: 0 auto 2rem; background: var(--accent-success); box-shadow: 0 0 20px rgba(16,185,129,0.3); display: flex; align-items: center; justify-content: center;">✓</div>
                            <h2 style="font-family: var(--font-heading); margin-bottom: 1rem; color: var(--text-primary);">All Channels Linked!</h2>
                            <p style="color: var(--text-secondary); line-height: 1.6; font-size: 0.95rem;">
                                Your secure tokens have been encrypted and saved. You can close this window now. Your consultant will initiate the audit.
                            </p>
                        </div>
                    `;
                }
                const footer = settingsSidebar.querySelector('.sidebar-footer');
                if (footer) footer.style.display = 'none';
            }, 1800);
        }, { capture: true });
    }

    // ==========================================
    // Sidebar Toggle Logic
    // ==========================================
    function openSidebar() {
        settingsSidebar.classList.add('open');
    }

    function closeSidebar() {
        settingsSidebar.classList.remove('open');
    }

    triggerBtn.addEventListener('click', openSidebar);
    mobileTriggerBtn.addEventListener('click', openSidebar);
    closeBtn.addEventListener('click', closeSidebar);
    sidebarBackdrop.addEventListener('click', closeSidebar);

    // ==========================================
    // Pre-flight Crawl Simulation
    // ==========================================
    preflightBtn.addEventListener('click', () => {
        const url = targetUrlInput.value.trim();
        if (!url) return;

        preflightStatus.classList.remove('hidden');
        preflightSuccessBlock.classList.add('hidden');
        preflightBtn.disabled = true;

        setTimeout(() => {
            preflightStatus.classList.add('hidden');
            preflightSuccessBlock.classList.remove('hidden');
            preflightBtn.disabled = false;

            // Generate mock predictions based on URL
            if (url.includes('saas') || url.includes('app') || url.includes('software')) {
                preflightClassVal.textContent = 'SaaS Platform';
                preflightJsonLdVal.textContent = 'Found (SoftwareApplication)';
                preflightJsonLdVal.className = 'val text-success';
                updateSuggestedKeywords(['Subscription Billing', 'Cloud Analytics', 'SaaS App Dashboard']);
            } else if (url.includes('store') || url.includes('shop') || url.includes('ecommerce')) {
                preflightClassVal.textContent = 'E-Commerce';
                preflightJsonLdVal.textContent = 'Found (Store / Product)';
                preflightJsonLdVal.className = 'val text-success';
                updateSuggestedKeywords(['Free Shipping Checkout', 'Buy Online Store', 'Retail Goods Store']);
            } else if (url.includes('consult') || url.includes('agency') || url.includes('advisory')) {
                preflightClassVal.textContent = 'Professional Services';
                preflightJsonLdVal.textContent = 'Found (ProfessionalService)';
                preflightJsonLdVal.className = 'val text-success';
                updateSuggestedKeywords(['Business Consulting Firm', 'Strategy Advisory', 'Consultant Services']);
            } else if (url.includes('milos') || url.includes('burger') || url.includes('pizza') || url.includes('restaurant')) {
                preflightClassVal.textContent = 'Local Business';
                preflightJsonLdVal.textContent = 'Found (Restaurant)';
                preflightJsonLdVal.className = 'val text-success';
                updateSuggestedKeywords(["Milo's Original Burger Shop", "Birmingham Burgers", "Hamburgers in Alabama"]);
            } else {
                preflightClassVal.textContent = 'Content Creator';
                preflightJsonLdVal.textContent = 'None Found (Fallback)';
                preflightJsonLdVal.className = 'val text-meta';
                updateSuggestedKeywords(['Creator Portfolio', 'Blog Hub', 'Online Influencer Bio']);
            }
        }, 1500);
    });

    function updateSuggestedKeywords(keywordsList) {
        selectedKeywords = [...keywordsList];
        renderTags();
    }

    // ==========================================
    // Keyword Tag Management
    // ==========================================
    function renderTags() {
        keywordTagsContainer.innerHTML = '';
        selectedKeywords.forEach((keyword) => {
            const tag = document.createElement('span');
            tag.className = 'keyword-tag';
            tag.setAttribute('data-val', keyword);
            tag.innerHTML = `
                ${keyword}
                <button class="remove-tag-btn" aria-label="Remove tag">&times;</button>
            `;
            keywordTagsContainer.appendChild(tag);
        });
        attachTagEvents();
    }

    function attachTagEvents() {
        const removeButtons = keywordTagsContainer.querySelectorAll('.remove-tag-btn');
        removeButtons.forEach((btn) => {
            btn.addEventListener('click', (e) => {
                const keywordVal = e.target.parentElement.getAttribute('data-val');
                selectedKeywords = selectedKeywords.filter(k => k !== keywordVal);
                renderTags();
            });
        });
    }

    addKeywordBtn.addEventListener('click', () => {
        const val = newKeywordInput.value.trim();
        if (val && !selectedKeywords.includes(val)) {
            selectedKeywords.push(val);
            renderTags();
            newKeywordInput.value = '';
        }
    });

    newKeywordInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addKeywordBtn.click();
        }
    });

    // Initialize tags
    renderTags();

    // ==========================================
    // VNC Browser Stream & Extension Sync Simulation
    // ==========================================
    let vncTimeouts = [];

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

    // Connect trigger listener loop
    const oauthItems = document.querySelectorAll('.oauth-item');
    oauthItems.forEach(item => {
        const btn = item.querySelector('.oauth-toggle-btn');
        const statusEl = item.querySelector('.oauth-status');
        const platform = btn.getAttribute('data-platform');
        
        btn.addEventListener('click', () => {
            const isConnected = statusEl.getAttribute('data-connected') === 'true';
            
            if (isConnected) {
                // Perform simple disconnect
                statusEl.setAttribute('data-connected', 'false');
                statusEl.textContent = 'Not Connected';
                statusEl.className = 'oauth-status';
                if (btn) {
                    btn.textContent = 'Connect';
                    btn.classList.add('btn-highlight');
                }
                showToast(`Disconnected from ${getPlatformName(platform)}.`);
            } else {
                // Open VNC modal (Option 2-B)
                currentOauthPlatform = { btn, statusEl, platform };
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
        const btnToggleLink = item.querySelector('.btn-toggle-link');
        const urlContainer = item.querySelector('.direct-url-container');
        const urlInputs = item.querySelectorAll('.platform-direct-url');
        
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
                        statusEl.textContent = `Connected: @richard_${platform}`;
                        statusEl.className = 'oauth-status text-success';
                    } else {
                        statusEl.textContent = 'Not Connected';
                        statusEl.className = 'oauth-status';
                    }
                } else {
                    // Show input fields and hide OAuth button
                    urlContainer.classList.remove('hidden');
                    btnToggleLink.classList.add('active-link');
                    if (btn) btn.classList.add('hidden');
                    
                    const hasValue = Array.from(urlInputs).some(inp => inp.value.trim());
                    if (hasValue) {
                        statusEl.textContent = 'URL Configured';
                        statusEl.className = 'oauth-status text-success';
                    } else {
                        statusEl.textContent = 'Direct URL Configuration';
                        statusEl.className = 'oauth-status text-highlight';
                    }
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
                    } else {
                        statusEl.textContent = 'Direct URL Configuration';
                        statusEl.className = 'oauth-status text-highlight';
                    }
                });
            });
        }
    });

    function getPlatformName(platform) {
        switch(platform) {
            case 'google': return 'Google Business Profile';
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

    // VNC Control Event Bindings
    if (cancelVncBtnDot) cancelVncBtnDot.addEventListener('click', hideModal);
    if (vncTabClose) vncTabClose.addEventListener('click', hideModal);
    if (cancelAuthBtn) cancelAuthBtn.addEventListener('click', hideModal);
    
    function hideModal() {
        oauthPopup.classList.remove('show');
        oauthPopup.classList.add('hidden');
        clearVncTimeouts();
        currentOauthPlatform = null;
    }

    // Step 1 Simulation (Spawn browser context)
    function runVncStep1(platform) {
        clearVncTimeouts();
        showVncStep('vnc-step-init');
        clearVncTerminal();
        
        // Restore Step 4 Success Pane defaults
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
        const succHeading = document.querySelector('#vnc-step-success .vnc-step-heading');
        const succDesc = document.querySelector('#vnc-step-success .vnc-step-desc');
        succHeading.textContent = "Authentication Verified!";
        succDesc.textContent = "Session state captured. Credentials and cookies successfully encrypted & stored in Supabase SessionVault.";

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

    // Step 2 Simulation (LoginForm render and await click)
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

    // Step 3 Simulation (Capturing cookie credentials and health checking)
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

    // Step 4 Simulation (Success confirmed)
    function runVncStep4(platform, email) {
        showVncStep('vnc-step-success');
        vncActionBtn.classList.remove('hidden');
        vncActionBtn.textContent = 'Save Credentials';
        
        vncSuccessUserDisplay.textContent = email;
        vncSuccessCookieName.textContent = getPlatformCookie(platform);
        
        appendVncTerminalLine(`[SessionVault] Context credentials saved successfully. Session verified as HEALTHY.`, 'success');
    }

    // Chrome Extension Import Trigger (Option 1)
    if (extensionImportBtn) {
        extensionImportBtn.addEventListener('click', () => {
            currentOauthPlatform = { platform: 'extension' };
            vncTabFavicon.textContent = '🔌';
            vncTabTitle.textContent = `Extension Sync`;
            vncAddressInput.value = 'chrome-extension://moat-authenticator/popup.html';
            vncActionBtn.classList.add('hidden');
            
            oauthPopup.classList.add('show');
            oauthPopup.classList.remove('hidden');
            
            runExtensionStep1();
        });
    }

    function runExtensionStep1() {
        clearVncTimeouts();
        showVncStep('vnc-step-init');
        clearVncTerminal();
        
        const loadingHeading = document.querySelector('#vnc-step-init .vnc-step-heading');
        const loadingDesc = document.querySelector('#vnc-step-init .vnc-step-desc');
        const origHeading = loadingHeading.textContent;
        const origDesc = loadingDesc.textContent;
        
        loadingHeading.textContent = "Connecting to Chrome Extension...";
        loadingDesc.textContent = "Scanning active browser tabs for valid authenticated sessions (Option 1)...";
        
        appendVncTerminalLine(`[Extension] Hooking Chrome API chrome.cookies.getAll...`, 'info');
        
        let t1 = setTimeout(() => {
            appendVncTerminalLine(`[Extension] Inspecting active security origins...`, 'info');
        }, 400);
        
        let t2 = setTimeout(() => {
            appendVncTerminalLine(`[Extension] Detected active LinkedIn session: @richard_norwood`, 'success');
        }, 800);
        
        let t3 = setTimeout(() => {
            appendVncTerminalLine(`[Extension] Detected active Facebook session: /RichardNorwoodPMP`, 'success');
        }, 1200);
        
        let t4 = setTimeout(() => {
            appendVncTerminalLine(`[Extension] Detected active YouTube session: growth@richardnorwood.com`, 'success');
        }, 1600);
        
        let t5 = setTimeout(() => {
            appendVncTerminalLine(`[Extension] 3 active sessions found. Rendering sync console.`, 'success');
            loadingHeading.textContent = origHeading;
            loadingDesc.textContent = origDesc;
            
            runExtensionStep2();
        }, 2000);
        
        vncTimeouts.push(t1, t2, t3, t4, t5);
    }

    function runExtensionStep2() {
        showVncStep('vnc-step-login-form');
        
        vncDynamicFormWrapper.innerHTML = `
            <div class="vnc-login-form-box" style="max-width: 420px;">
                <div class="vnc-form-header" style="margin-bottom: 1rem;">
                    <div class="vnc-form-logo" style="color: var(--color-accent-light); font-size: 1.25rem;">🔌 Chrome Extension Moat</div>
                    <div class="vnc-form-title">Select active browser sessions to import:</div>
                </div>
                <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 1.25rem;">
                    <label style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; cursor: pointer; padding: 8px; background: rgba(255,255,255,0.02); border-radius: 6px; border: 1px solid rgba(255,255,255,0.04);">
                        <input type="checkbox" id="ext-check-linkedin" checked style="width: 16px; height: 16px; accent-color: var(--color-accent);">
                        <span>LinkedIn Profile (@richard_norwood)</span>
                        <span class="text-success" style="font-size: 0.7rem; margin-left: auto; background: rgba(16,185,129,0.1); padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(16,185,129,0.2);">ACTIVE</span>
                    </label>
                    <label style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; cursor: pointer; padding: 8px; background: rgba(255,255,255,0.02); border-radius: 6px; border: 1px solid rgba(255,255,255,0.04);">
                        <input type="checkbox" id="ext-check-facebook" checked style="width: 16px; height: 16px; accent-color: var(--color-accent);">
                        <span>Facebook Profile (/RichardNorwoodPMP)</span>
                        <span class="text-success" style="font-size: 0.7rem; margin-left: auto; background: rgba(16,185,129,0.1); padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(16,185,129,0.2);">ACTIVE</span>
                    </label>
                    <label style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; cursor: pointer; padding: 8px; background: rgba(255,255,255,0.02); border-radius: 6px; border: 1px solid rgba(255,255,255,0.04);">
                        <input type="checkbox" id="ext-check-youtube" checked style="width: 16px; height: 16px; accent-color: var(--color-accent);">
                        <span>YouTube Channel (growth@richardnorwood.com)</span>
                        <span class="text-success" style="font-size: 0.7rem; margin-left: auto; background: rgba(16,185,129,0.1); padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(16,185,129,0.2);">ACTIVE</span>
                    </label>
                    <label style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; opacity: 0.5; padding: 8px; background: rgba(0,0,0,0.25); border-radius: 6px; border: 1px solid rgba(255,255,255,0.02);">
                        <input type="checkbox" disabled style="width: 16px; height: 16px;">
                        <span>Twitter / X (Session Expired - Connect manually)</span>
                        <span class="text-error" style="font-size: 0.7rem; margin-left: auto; background: rgba(239,68,68,0.1); padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(239,68,68,0.2);">EXPIRED</span>
                    </label>
                </div>
                <button id="ext-sync-submit-btn" class="vnc-submit-btn" style="background: var(--color-accent); color: #000;">Sync 3 Selected Sessions</button>
            </div>
        `;
        
        const syncBtn = document.getElementById('ext-sync-submit-btn');
        syncBtn.addEventListener('click', () => {
            const syncList = [];
            if (document.getElementById('ext-check-linkedin').checked) syncList.push('LinkedIn');
            if (document.getElementById('ext-check-facebook').checked) syncList.push('Facebook');
            if (document.getElementById('ext-check-youtube').checked) syncList.push('YouTube');
            
            runExtensionStep3(syncList);
        });
    }

    function runExtensionStep3(syncList) {
        showVncStep('vnc-step-capturing');
        
        const capHeading = document.querySelector('#vnc-step-capturing .vnc-step-heading');
        const capDesc = document.querySelector('#vnc-step-capturing .vnc-step-desc');
        const origHeading = capHeading.textContent;
        const origDesc = capDesc.textContent;
        
        capHeading.textContent = "Syncing Cookies via Chrome Extension";
        capDesc.textContent = `Extracting active token profiles for ${syncList.join(', ')}...`;
        
        appendVncTerminalLine(`[Extension] Extracting browser storageState payload for checked sessions...`, 'info');
        
        let t1 = setTimeout(() => {
            appendVncTerminalLine(`[SessionVault] Syncing ${syncList.length} platform contexts to database...`, 'info');
        }, 400);
        
        let t2 = setTimeout(() => {
            if (syncList.includes('LinkedIn')) {
                appendVncTerminalLine(`[Health Check] Verifying active LinkedIn session... Status 200 OK`, 'success');
            }
        }, 800);
        
        let t3 = setTimeout(() => {
            if (syncList.includes('Facebook')) {
                appendVncTerminalLine(`[Health Check] Verifying active Facebook session... Status 200 OK`, 'success');
            }
        }, 1200);
        
        let t4 = setTimeout(() => {
            if (syncList.includes('YouTube')) {
                appendVncTerminalLine(`[Health Check] Verifying active YouTube session... Status 200 OK`, 'success');
            }
        }, 1600);
        
        let t5 = setTimeout(() => {
            appendVncTerminalLine(`[SessionVault] All ${syncList.length} contexts stored & encrypted in Supabase.`, 'success');
        }, 2000);
        
        let t6 = setTimeout(() => {
            capHeading.textContent = origHeading;
            capDesc.textContent = origDesc;
            
            runExtensionStep4(syncList);
        }, 2400);
        
        vncTimeouts.push(t1, t2, t3, t4, t5, t6);
    }

    function runExtensionStep4(syncList) {
        showVncStep('vnc-step-success');
        
        const succHeading = document.querySelector('#vnc-step-success .vnc-step-heading');
        const succDesc = document.querySelector('#vnc-step-success .vnc-step-desc');
        
        succHeading.textContent = "Import Sync Successful!";
        succDesc.textContent = `Successfully updated SessionVault with ${syncList.length} active sessions from your Chrome browser.`;
        
        const detailsCard = document.querySelector('#vnc-step-success .session-details-card');
        detailsCard.innerHTML = `
            <div class="detail-line">
                <span class="detail-lbl">Imported Profiles:</span>
                <span class="detail-val" style="color: var(--color-accent-light); font-weight: 700;">${syncList.length} Connected</span>
            </div>
            <div class="detail-line">
                <span class="detail-lbl">Connection Path:</span>
                <span class="detail-val">Chrome Extension Moat</span>
            </div>
            <div class="detail-line">
                <span class="detail-lbl">Synced Platforms:</span>
                <span class="detail-val" style="font-size: 0.75rem;">${syncList.join(', ')}</span>
            </div>
        `;
        
        vncActionBtn.classList.remove('hidden');
        vncActionBtn.textContent = 'Complete Sync';
        
        appendVncTerminalLine(`[Extension] Session state import finalized. Ready to save.`, 'success');
    }

    // Unified Save action click handler
    vncActionBtn.addEventListener('click', () => {
        if (currentOauthPlatform) {
            const { btn, statusEl, platform } = currentOauthPlatform;
            
            if (platform === 'extension') {
                const platformsToSync = ['linkedin', 'facebook', 'youtube'];
                platformsToSync.forEach(p => {
                    const oauthItem = document.getElementById(`oauth-${p}`);
                    if (oauthItem) {
                        const sEl = oauthItem.querySelector('.oauth-status');
                        const bEl = oauthItem.querySelector('.oauth-toggle-btn');
                        
                        sEl.setAttribute('data-connected', 'true');
                        sEl.textContent = `Connected: @richard_${p}`;
                        sEl.className = 'oauth-status text-success';
                        
                        if (bEl) {
                            bEl.textContent = 'Disconnect';
                            bEl.classList.remove('btn-highlight');
                        }
                    }
                });
                showToast("Chrome Extension synced 3 sessions successfully!");
            } else {
                statusEl.setAttribute('data-connected', 'true');
                statusEl.textContent = `Connected: @richard_${platform}`;
                statusEl.className = 'oauth-status text-success';
                
                if (btn) {
                    btn.textContent = 'Disconnect';
                    btn.classList.remove('btn-highlight');
                }
                
                showToast(`Successfully authenticated with ${getPlatformName(platform)}!`);
            }
            hideModal();
        }
    });

    // ==========================================
    // Toast Notification helper
    // ==========================================
    function showToast(message) {
        toastMessage.textContent = message;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // ==========================================
    // Scraper Run Simulation (Start Audit Run)
    // ==========================================
    const mockLogs = [
        { text: "[System] Initializing assessment crawl sequence...", delay: 0, type: 'info' },
        { text: "[System] Parsing input configuration...", delay: 400, type: 'info' },
        { text: "[Preflight] Inspecting metadata for website...", delay: 800, type: 'info' },
        { text: "[Preflight] Extracted Hero Headings successfully.", delay: 1200, type: 'success' },
        { text: "[Preflight] Parsed JSON-LD Schema (Type: Restaurant).", delay: 1500, type: 'success' },
        { text: "[Scraper] Spawning Cheerio scraper instance...", delay: 2000, type: 'info' },
        { text: "[Scraper] Got-Scraping TLS signature injected successfully.", delay: 2300, type: 'success' },
        { text: "[Scraper] Crawling social platform: Facebook...", delay: 2800, type: 'info' },
        { text: "[Scraper] Facebook Graph API: Extracted 48,290 likes and public CTAs.", delay: 3400, type: 'success' },
        { text: "[Scraper] Facebook Profile Classification: isPersonalProfile = false (Company).", delay: 3800, type: 'success' },
        { text: "[Scraper] Crawling social platform: Instagram...", delay: 4400, type: 'info' },
        { text: "[Scraper] Instagram Page: Extracted 12.5K followers & Linktree.", delay: 5000, type: 'success' },
        { text: "[Scraper] Crawling social platform: LinkedIn...", delay: 5600, type: 'info' },
        { text: "[Scraper] LinkedIn Page: Extracted 830 followers (Company page).", delay: 6200, type: 'success' },
        { text: "[Scraper] Crawling social platform: YouTube...", delay: 6800, type: 'info' },
        { text: "[Scraper] YouTube API: Channels list matching successful.", delay: 7200, type: 'success' },
        { text: "[Classifier] Evaluating accumulated platform signals...", delay: 7800, type: 'info' },
        { text: "[Classifier] Auto-detected Business Class: Local Business (Confidence: 94%).", delay: 8400, type: 'success' },
        { text: "[Scoring] Executing 22-Point Structural Diagnostic...", delay: 9000, type: 'info' },
        { text: "[Scoring] Calibrating Stage Weights: Local Business model applied.", delay: 9400, type: 'info' },
        { text: "[Supabase] Ingesting assessment f28cfc64-d58a... into revenue_journey_assessments.", delay: 10000, type: 'info' },
        { text: "[Supabase] JSONB assessment_detail and screenshots synchronized.", delay: 10500, type: 'success' },
        { text: "[System] Assessment complete! Exiting actor code 0.", delay: 11000, type: 'success' }
    ];

    startAuditBtn.addEventListener('click', () => {
        startAuditBtn.disabled = true;
        auditSpinner.classList.remove('hidden');
        executionConsole.classList.remove('hidden');
        consoleLinesContainer.innerHTML = '';
        
        let timer = null;

        mockLogs.forEach((log) => {
            setTimeout(() => {
                const line = document.createElement('div');
                line.className = `console-line ${log.type}`;
                line.textContent = log.text;
                consoleLinesContainer.appendChild(line);
                consoleLinesContainer.scrollTop = consoleLinesContainer.scrollHeight;
            }, log.delay);
        });

        // After all logs have printed (11 seconds)
        setTimeout(() => {
            startAuditBtn.disabled = false;
            auditSpinner.classList.add('hidden');
            executionConsole.classList.add('hidden');
            
            // Trigger UI updates with new data
            updateDashboardWithNewAudit();
            
            showToast("Audit run completed! Dashboard updated.");
            closeSidebar();
        }, 11500);
    });

    function updateDashboardWithNewAudit() {
        const url = targetUrlInput.value.trim();
        scrapedUrlIndicator.textContent = `Target: ${url}`;
        
        // Dynamic dashboard scoring update
        overallScoreVal.textContent = "6.8";
        overallScoreVal.style.animation = "scaleIn 0.5s ease";
        if (overallBadgeDisplay) {
            overallBadgeDisplay.textContent = "Growing Presence";
            overallBadgeDisplay.className = "badge badge-success";
        }
        updateOverallScoreBreakdown(6.8);
        
        const detectedClassStr = preflightClassVal.textContent;
        businessClassDisplay.textContent = detectedClassStr;
        classConfidenceVal.textContent = "94%";
        classConfidenceFill.style.width = "94%";
        
        // Update classification breakdown sub-segmentation
        updateClassificationBreakdown(detectedClassStr);

        // Update stages
        scoreAwareness.textContent = "8.5 / 10";
        barAwareness.style.width = "85%";
        
        scoreConsideration.textContent = "7.2 / 10";
        barConsideration.style.width = "72%";
        
        scoreDecision.textContent = "6.8 / 10";
        barDecision.style.width = "68%";
        
        scoreConversion.textContent = "5.5 / 10";
        barConversion.style.width = "55%";
        
        scoreRetention.textContent = "5.8 / 10";
        barRetention.style.width = "58%";

        // Adjust weakest stage
        weakestStageDisplay.textContent = "Conversion";
        weakestStageDisplay.className = "value-display text-warning";
        weakestStageDesc.textContent = "Conversion has improved via Google booking integration, but shop and pricing page tiers can be optimized further.";
        updateWeakestStageBreakdown("Conversion");

        // LinkedIn is now simulated as active card
        const linkedinCard = document.querySelector('.channels-grid .channel-card:last-child');
        if (linkedinCard) {
            linkedinCard.className = "channel-card active-channel";
            const statusBadge = linkedinCard.querySelector('.channel-status');
            if (statusBadge) {
                statusBadge.className = "channel-status badge-success";
                statusBadge.textContent = "OK";
            }
            const cardBody = linkedinCard.querySelector('.channel-body');
            if (cardBody) {
                cardBody.innerHTML = `
                    <div class="detail-row"><span>Followers:</span> <span class="text-highlight">830</span></div>
                    <div class="detail-row"><span>Class:</span> <span class="text-meta">Company Page</span></div>
                    <div class="detail-row"><span>Completeness:</span> <span class="text-success">92%</span></div>
                `;
            }
        }
    }

    function updateClassificationBreakdown(detectedClass) {
        if (!breakdownLabel1) return;
        
        let label1, val1, label2, val2, label3, val3, explanation;
        
        switch (detectedClass) {
            case 'Content Creator':
                label1 = "Organic Media (Culinary Content)";
                val1 = "50%";
                label2 = "Local Footprint (Maps & GBP)";
                val2 = "30%";
                label3 = "Transactional Engine (Direct Booking)";
                val3 = "20%";
                explanation = "Restaurateurs act as digital creators to capture organic local attention and funnel social followers into physical dining tables.";
                break;
            case 'Local Business':
                label1 = "Local Footprint (Maps & GBP)";
                val1 = "55%";
                label2 = "Organic Media (Culinary Content)";
                val2 = "25%";
                label3 = "Transactional Engine (Direct Booking)";
                val3 = "20%";
                explanation = "Traditional local establishment focus. Prioritizes local citations, search map packs, and direct booking/ordering engines.";
                break;
            case 'SaaS Platform':
                label1 = "Product Utility / Demo Content";
                val1 = "60%";
                label2 = "Organic Community Builders";
                val2 = "20%";
                label3 = "Transactional Conversion (Pricing)";
                val3 = "20%";
                explanation = "Leverages cloud software, subscription pricing tiers, and online developer/customer education documentation.";
                break;
            case 'E-Commerce':
                label1 = "Inventory Catalog Content";
                val1 = "50%";
                label2 = "Paid & Organic Ads (Socials)";
                val2 = "30%";
                label3 = "Cart/Checkout Conversion";
                val3 = "20%";
                explanation = "Focuses on shopping carts, product detail pages, and social media commerce integrations to drive direct checkouts.";
                break;
            case 'Professional Services':
                label1 = "Advisory Authority Content";
                val1 = "55%";
                label2 = "Relationship & Referrals";
                val2 = "25%";
                label3 = "Consultation Bookings (Leads)";
                val3 = "20%";
                explanation = "Establishes industry expertise and trust through white papers, blogs, and advisory posts to book direct consultation sessions.";
                break;
            default:
                label1 = "Organic Media & Audiences";
                val1 = "40%";
                label2 = "Local Authority & Listings";
                val2 = "30%";
                label3 = "Monetization & Conversion";
                val3 = "30%";
                explanation = "Multi-channel digital presence. Balances organic content generation with localized search visibility and direct conversion.";
        }
        
        breakdownLabel1.textContent = label1;
        breakdownVal1.textContent = val1;
        breakdownFill1.style.width = val1;
        
        breakdownLabel2.textContent = label2;
        breakdownVal2.textContent = val2;
        breakdownFill2.style.width = val2;
        
        breakdownLabel3.textContent = label3;
        breakdownVal3.textContent = val3;
        breakdownFill3.style.width = val3;
        
        breakdownExplanation.textContent = explanation;
    }

    function updateWeakestStageBreakdown(stage) {
        if (!weakestGapList) return;
        
        let gapsHtml = '';
        
        switch (stage) {
            case 'Conversion':
                gapsHtml = `
                    <div class="gap-item">
                        <span class="gap-bullet text-error">&bull;</span>
                        <span class="gap-text"><strong>Booking Engine</strong>: Unlinked or offline on social accounts.</span>
                    </div>
                    <div class="gap-item">
                        <span class="gap-bullet text-error">&bull;</span>
                        <span class="gap-text"><strong>Shop Integration</strong>: Inactive/broken link-in-bio checkout paths.</span>
                    </div>
                    <div class="gap-item">
                        <span class="gap-bullet text-warning">&bull;</span>
                        <span class="gap-text"><strong>Profile CTAs</strong>: Muted action banners on bio headings.</span>
                    </div>
                `;
                break;
            case 'Awareness':
                gapsHtml = `
                    <div class="gap-item">
                        <span class="gap-bullet text-error">&bull;</span>
                        <span class="gap-text"><strong>Posting Consistency</strong>: Long intervals between updates.</span>
                    </div>
                    <div class="gap-item">
                        <span class="gap-bullet text-error">&bull;</span>
                        <span class="gap-text"><strong>Local Citation Rank</strong>: Low visibility in map pack search.</span>
                    </div>
                    <div class="gap-item">
                        <span class="gap-bullet text-warning">&bull;</span>
                        <span class="gap-text"><strong>Short-form Reach</strong>: Negligible algorithmic recommendation views.</span>
                    </div>
                `;
                break;
            case 'Consideration':
                gapsHtml = `
                    <div class="gap-item">
                        <span class="gap-bullet text-error">&bull;</span>
                        <span class="gap-text"><strong>Interaction Rate</strong>: High views but low comment/share counts.</span>
                    </div>
                    <div class="gap-item">
                        <span class="gap-bullet text-error">&bull;</span>
                        <span class="gap-text"><strong>Bio Optimization</strong>: Profiles don't clearly state what you solve.</span>
                    </div>
                    <div class="gap-item">
                        <span class="gap-bullet text-warning">&bull;</span>
                        <span class="gap-text"><strong>Community Engagement</strong>: Direct replies to comments are missing.</span>
                    </div>
                `;
                break;
            case 'Decision':
                gapsHtml = `
                    <div class="gap-item">
                        <span class="gap-bullet text-error">&bull;</span>
                        <span class="gap-text"><strong>Social Proof</strong>: No user testimonials or ratings in profiles.</span>
                    </div>
                    <div class="gap-item">
                        <span class="gap-bullet text-error">&bull;</span>
                        <span class="gap-text"><strong>Map Ratings</strong>: GBP rating is below target benchmark (4.2 stars).</span>
                    </div>
                    <div class="gap-item">
                        <span class="gap-bullet text-warning">&bull;</span>
                        <span class="gap-text"><strong>Authority Seals</strong>: Badges and trust certifications unverified.</span>
                    </div>
                `;
                break;
            case 'Retention':
                gapsHtml = `
                    <div class="gap-item">
                        <span class="gap-bullet text-error">&bull;</span>
                        <span class="gap-text"><strong>Returning Engagement</strong>: Low interaction from existing followers.</span>
                    </div>
                    <div class="gap-item">
                        <span class="gap-bullet text-error">&bull;</span>
                        <span class="gap-text"><strong>FAQ & Support</strong>: Missing customer service links or chat options.</span>
                    </div>
                    <div class="gap-item">
                        <span class="gap-bullet text-warning">&bull;</span>
                        <span class="gap-text"><strong>User-Gen Content</strong>: Brand tags and customer reposts are uncurated.</span>
                    </div>
                `;
                break;
            default:
                gapsHtml = `
                    <div class="gap-item">
                        <span class="gap-bullet text-error">&bull;</span>
                        <span class="gap-text"><strong>High Priority Gaps</strong>: Key channels require basic setups.</span>
                    </div>
                `;
        }
        
        weakestGapList.innerHTML = gapsHtml;
    }

    function updateOverallScoreBreakdown(score) {
        if (!overallFactorList) return;
        
        let factorsHtml = '';
        
        if (score < 4.0) {
            factorsHtml = `
                <div class="factor-item positive">
                    <span class="factor-bullet">+</span>
                    <span class="factor-text"><strong>Broad Coverage</strong>: 7 active channels crawled.</span>
                </div>
                <div class="factor-item positive">
                    <span class="factor-bullet">+</span>
                    <span class="factor-text"><strong>Awareness Baseline</strong>: Active search listings (5.2/10).</span>
                </div>
                <div class="factor-item negative">
                    <span class="factor-bullet">-</span>
                    <span class="factor-text"><strong>Conversion Gap</strong>: Unlinked booking engine (-2.1 points).</span>
                </div>
                <div class="factor-item negative">
                    <span class="factor-bullet">-</span>
                    <span class="factor-text"><strong>Muted Authority</strong>: Low reviews and decision signals (-1.4 points).</span>
                </div>
            `;
        } else if (score < 7.0) {
            factorsHtml = `
                <div class="factor-item positive">
                    <span class="factor-bullet">+</span>
                    <span class="factor-text"><strong>Local Search Dominance</strong>: High GBP mapping and indexing (+1.8 points).</span>
                </div>
                <div class="factor-item positive">
                    <span class="factor-bullet">+</span>
                    <span class="factor-text"><strong>Connected Funnel</strong>: LinkedIn and Google Booking active (+1.2 points).</span>
                </div>
                <div class="factor-item negative">
                    <span class="factor-bullet">-</span>
                    <span class="factor-text"><strong>Retention Leak</strong>: Support & returning pathways unlinked (-0.8 points).</span>
                </div>
                <div class="factor-item negative">
                    <span class="factor-bullet">-</span>
                    <span class="factor-text"><strong>Engagement Cap</strong>: Low social dialogue rates (-0.4 points).</span>
                </div>
            `;
        } else {
            factorsHtml = `
                <div class="factor-item positive">
                    <span class="factor-bullet">+</span>
                    <span class="factor-text"><strong>Strong Direct Conversions</strong>: High booking & menu links (+2.2 points).</span>
                </div>
                <div class="factor-item positive">
                    <span class="factor-bullet">+</span>
                    <span class="factor-text"><strong>Active Audiences</strong>: High frequency posting (+1.4 points).</span>
                </div>
                <div class="factor-item positive">
                    <span class="factor-bullet">+</span>
                    <span class="factor-text"><strong>Authority Verified</strong>: Trust seals & 4.5+ star review average.</span>
                </div>
            `;
        }
        
        overallFactorList.innerHTML = factorsHtml;
    }

    function initGlowCards() {
        const cards = document.querySelectorAll('.dashboard-card');
        
        function getCardGlowProps(card) {
            const heading = card.querySelector('h3');
            if (heading) {
                const title = heading.textContent.toLowerCase();
                if (title.includes('overall score')) {
                    return { r: 240, g: 180, b: 41, colorVar: 'var(--color-secondary)' };
                } else if (title.includes('weakest stage')) {
                    return { r: 239, g: 68, b: 68, colorVar: 'var(--color-error)' };
                } else if (title.includes('classification')) {
                    return { r: 32, g: 201, b: 151, colorVar: 'var(--color-accent)' };
                } else if (title.includes('journey')) {
                    return { r: 240, g: 180, b: 41, colorVar: 'var(--color-secondary)' };
                } else if (title.includes('channel')) {
                    return { r: 32, g: 201, b: 151, colorVar: 'var(--color-accent)' };
                }
            }
            return { r: 32, g: 201, b: 151, colorVar: 'var(--color-accent)' };
        }

        cards.forEach((card) => {
            let edgeGlow = card.querySelector('.edge-glow');
            if (!edgeGlow) {
                edgeGlow = document.createElement('div');
                edgeGlow.className = 'edge-glow';
                card.appendChild(edgeGlow);
            }
            let innerGlow = card.querySelector('.inner-glow');
            if (!innerGlow) {
                innerGlow = document.createElement('div');
                innerGlow.className = 'inner-glow';
                card.appendChild(innerGlow);
            }
            let borderPulse = card.querySelector('.border-pulse');
            if (!borderPulse) {
                borderPulse = document.createElement('div');
                borderPulse.className = 'border-pulse';
                card.appendChild(borderPulse);
            }

            const glow = getCardGlowProps(card);

            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;

                const rotateX = ((centerY - y) / centerY) * 2.5;
                const rotateY = ((x - centerX) / centerX) * 2.5;

                card.style.transform = `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;

                const pctX = (x / rect.width) * 100;
                const pctY = (y / rect.height) * 100;

                edgeGlow.style.opacity = '1';
                edgeGlow.style.boxShadow = `inset 0 0 30px 8px rgba(${glow.r},${glow.g},${glow.b},0.08)`;
                edgeGlow.style.maskImage = `radial-gradient(ellipse at ${pctX}% ${pctY}%, transparent 20%, black 70%)`;
                edgeGlow.style.webkitMaskImage = `radial-gradient(ellipse at ${pctX}% ${pctY}%, transparent 20%, black 70%)`;

                innerGlow.style.opacity = '1';
                innerGlow.style.background = `radial-gradient(circle at ${pctX}% ${pctY}%, rgba(${glow.r},${glow.g},${glow.b},0.06) 0%, transparent 50%)`;

                borderPulse.classList.add('border-pulse-active');
                borderPulse.style.setProperty('--glow-color', glow.colorVar);
            });

            card.addEventListener('mouseenter', () => {
                let mist = card.querySelector('.nitrous-mist-wrapper');
                if (!mist) {
                    mist = document.createElement('div');
                    mist.className = 'nitrous-mist-wrapper';
                    
                    const leftPuff = document.createElement('div');
                    leftPuff.className = 'puff-left';
                    const rightPuff = document.createElement('div');
                    rightPuff.className = 'puff-right';
                    const bottomSpill = document.createElement('div');
                    bottomSpill.className = 'spill-bottom';
                    
                    mist.appendChild(leftPuff);
                    mist.appendChild(rightPuff);
                    mist.appendChild(bottomSpill);
                    card.appendChild(mist);
                } else {
                    mist.style.opacity = '1';
                }
            });

            card.addEventListener('mouseleave', () => {
                card.style.transform = 'perspective(1200px) rotateX(0deg) rotateY(0deg)';
                edgeGlow.style.opacity = '0';
                innerGlow.style.opacity = '0';
                borderPulse.classList.remove('border-pulse-active');

                const mist = card.querySelector('.nitrous-mist-wrapper');
                if (mist) {
                    mist.style.opacity = '0';
                    mist.style.transition = 'opacity 0.5s ease';
                    setTimeout(() => {
                        if (mist.parentNode === card) {
                            mist.remove();
                        }
                    }, 500);
                }
            });
        });
    }

    function initStarFieldBackground() {
        const canvas = document.getElementById('starfield-canvas');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const stars = [];
        const bodies = [];
        const STAR_COUNT = 600;
        const MIN_ADAPTIVE_STAR_COUNT = 180;
        const STAR_DENSITY_DIVISOR = 2500;
        const MAX_CANVAS_DPR = 1.5;
        const CURSOR_RADIUS = 120;
        const GATHER_STRENGTH = 0.015;
        const DISPERSE_STRENGTH = 0.008;
        const MAX_STAR_SIZE = 1.2;
        const MIN_STAR_SIZE = 0.2;
        const MAX_BODIES = 3;
        const BODY_SPAWN_CHANCE = 0.003;
        const METEOR_CHANCE = 0.35;
        
        const dpr = Math.min(window.devicePixelRatio || 1, MAX_CANVAS_DPR);
        let width = window.innerWidth;
        let height = window.innerHeight;
        
        const setCanvasSize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };
        
        function lerp(a, b, t) {
            return a + (b - a) * t;
        }
        
        function starColor(warmth, alpha) {
            const r = Math.round(lerp(180, 240, warmth));
            const g = Math.round(lerp(200, 232, warmth));
            const b = Math.round(lerp(255, 220, warmth));
            return `rgba(${r},${g},${b},${alpha})`;
        }
        
        function glowColor(warmth, alpha) {
            const r = Math.round(lerp(140, 240, warmth));
            const g = Math.round(lerp(170, 200, warmth));
            const b = Math.round(lerp(255, 160, warmth));
            return `rgba(${r},${g},${b},${alpha})`;
        }
        
        function initStars(w, h) {
            stars.length = 0;
            const adaptiveStarCount = Math.min(
                STAR_COUNT,
                Math.max(MIN_ADAPTIVE_STAR_COUNT, Math.round((w * h) / STAR_DENSITY_DIVISOR))
            );
            for (let i = 0; i < adaptiveStarCount; i++) {
                const x = Math.random() * w;
                const y = Math.random() * h;
                const bright = Math.random();
                const baseOpacity = bright < 0.85
                    ? 0.08 + Math.random() * 0.2
                    : bright < 0.97
                        ? 0.25 + Math.random() * 0.3
                        : 0.55 + Math.random() * 0.35;
                const size = bright < 0.85
                    ? MIN_STAR_SIZE + Math.random() * 0.3
                    : bright < 0.97
                        ? 0.4 + Math.random() * 0.4
                        : 0.7 + Math.random() * (MAX_STAR_SIZE - 0.7);
                stars.push({
                    x, y, baseX: x, baseY: y, size,
                    opacity: baseOpacity, baseOpacity,
                    twinkleSpeed: 0.3 + Math.random() * 1.5,
                    twinkleOffset: Math.random() * Math.PI * 2,
                    warmth: Math.random(),
                });
            }
        }
        
        function spawnBody(w, h) {
            const isMeteor = Math.random() < METEOR_CHANCE;
            if (isMeteor) {
                const edge = Math.random();
                let x, y, vx, vy;
                if (edge < 0.5) {
                    x = edge < 0.25 ? -10 : w + 10;
                    y = Math.random() * h;
                    vx = (edge < 0.25 ? 1 : -1) * (3 + Math.random() * 5);
                    vy = (Math.random() - 0.5) * 2;
                } else {
                    x = Math.random() * w;
                    y = edge < 0.75 ? -10 : h + 10;
                    vx = (Math.random() - 0.5) * 2;
                    vy = (edge < 0.75 ? 1 : -1) * (3 + Math.random() * 5);
                }
                return {
                    x, y, vx, vy,
                    size: 0.8 + Math.random() * 0.8,
                    opacity: 0.3 + Math.random() * 0.35,
                    tailLength: 30 + Math.random() * 60,
                    life: 0, maxLife: 120 + Math.random() * 180,
                    kind: 'meteor', warmth: 0.3 + Math.random() * 0.7,
                };
            } else {
                const x = Math.random() < 0.5 ? -10 : w + 10;
                const y = Math.random() * h;
                const direction = x < 0 ? 1 : -1;
                return {
                    x, y,
                    vx: direction * (0.15 + Math.random() * 0.4),
                    vy: (Math.random() - 0.5) * 0.15,
                    size: 0.6 + Math.random() * 0.6,
                    opacity: 0.12 + Math.random() * 0.2,
                    tailLength: 0, life: 0, maxLife: 600 + Math.random() * 900,
                    kind: 'drift', warmth: Math.random(),
                };
            }
        }
        
        setCanvasSize();
        initStars(width, height);
        
        const mouse = { x: -9999, y: -9999, active: false };
        window.addEventListener('mousemove', (e) => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
            mouse.active = true;
        });
        document.addEventListener('mouseleave', () => {
            mouse.active = false;
        });
        
        window.addEventListener('resize', () => {
            setCanvasSize();
            initStars(width, height);
        });
        
        let time = 0;
        const animate = () => {
            time += 0.016;
            ctx.clearRect(0, 0, width, height);
            
            // Draw Stars
            stars.forEach((s) => {
                const twinkle = 0.7 + 0.3 * Math.sin(time * s.twinkleSpeed + s.twinkleOffset);
                s.opacity = s.baseOpacity * twinkle;
                
                if (mouse.active) {
                    const dx = mouse.x - s.x;
                    const dy = mouse.y - s.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < CURSOR_RADIUS) {
                        const force = (1 - dist / CURSOR_RADIUS) * GATHER_STRENGTH;
                        s.x += dx * force;
                        s.y += dy * force;
                        s.opacity = Math.min(s.baseOpacity + 0.15, s.opacity + (1 - dist / CURSOR_RADIUS) * 0.12);
                    } else {
                        s.x += (s.baseX - s.x) * DISPERSE_STRENGTH;
                        s.y += (s.baseY - s.y) * DISPERSE_STRENGTH;
                    }
                } else {
                    s.x += (s.baseX - s.x) * DISPERSE_STRENGTH;
                    s.y += (s.baseY - s.y) * DISPERSE_STRENGTH;
                }
                
                if (s.baseOpacity > 0.3) {
                    ctx.globalAlpha = s.opacity * 0.15;
                    ctx.fillStyle = glowColor(s.warmth, 1);
                    ctx.beginPath();
                    ctx.arc(s.x, s.y, s.size * 2.5, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.globalAlpha = s.opacity;
                ctx.fillStyle = starColor(s.warmth, 1);
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
                ctx.fill();
            });
            
            // Spawn moving bodies (drift + meteor)
            if (bodies.length < MAX_BODIES && Math.random() < BODY_SPAWN_CHANCE) {
                bodies.push(spawnBody(width, height));
            }
            
            // Draw bodies
            for (let i = bodies.length - 1; i >= 0; i--) {
                const b = bodies[i];
                b.x += b.vx;
                b.y += b.vy;
                b.life++;
                
                const fadeIn = Math.min(1, b.life / 30);
                const fadeOut = Math.max(0, 1 - (b.life - b.maxLife + 40) / 40);
                const alpha = b.opacity * fadeIn * (b.life > b.maxLife - 40 ? fadeOut : 1);
                
                if (b.kind === 'meteor' && b.tailLength > 0) {
                    const grad = ctx.createLinearGradient(b.x, b.y, b.x - b.vx * b.tailLength * 0.3, b.y - b.vy * b.tailLength * 0.3);
                    grad.addColorStop(0, starColor(b.warmth, alpha));
                    grad.addColorStop(1, starColor(b.warmth, 0));
                    ctx.globalAlpha = 1;
                    ctx.strokeStyle = grad;
                    ctx.lineWidth = b.size * 0.6;
                    ctx.lineCap = 'round';
                    ctx.beginPath();
                    ctx.moveTo(b.x, b.y);
                    ctx.lineTo(b.x - b.vx * b.tailLength * 0.3, b.y - b.vy * b.tailLength * 0.3);
                    ctx.stroke();
                }
                
                ctx.globalAlpha = alpha;
                ctx.fillStyle = starColor(b.warmth, 1);
                ctx.beginPath();
                ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.globalAlpha = alpha * 0.2;
                ctx.fillStyle = glowColor(b.warmth, 1);
                ctx.beginPath();
                ctx.arc(b.x, b.y, b.size * 2, 0, Math.PI * 2);
                ctx.fill();
                
                if (b.life > b.maxLife || b.x < -50 || b.x > width + 50 || b.y < -50 || b.y > height + 50) {
                    bodies.splice(i, 1);
                }
            }
            
            requestAnimationFrame(animate);
        };
        
        requestAnimationFrame(animate);
    }

    // Initialize Default Classification, Weakest Stage, Overall Score Breakdowns, GlowCards and StarField on Load
    updateClassificationBreakdown('Content Creator');
    updateWeakestStageBreakdown('Conversion');
    updateOverallScoreBreakdown(3.3);
    initGlowCards();
    initStarFieldBackground();
});
