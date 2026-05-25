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
    const modalPlatformTitle = document.getElementById('modal-platform-title');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const cancelAuthBtn = document.getElementById('cancel-auth-btn');
    const simulateAuthSuccessBtn = document.getElementById('simulate-auth-success');
    
    const toast = document.getElementById('toast-notification');
    const toastMessage = document.getElementById('toast-message');
    
    // Dashboard Value Selectors (to update dynamically after run completes)
    const overallScoreVal = document.getElementById('overall-score-val');
    const businessClassDisplay = document.getElementById('business-class-display');
    const classConfidenceVal = document.getElementById('class-confidence-val');
    const classConfidenceFill = document.getElementById('class-confidence-fill');
    const weakestStageDisplay = document.getElementById('weakest-stage-display');
    const weakestStageDesc = document.getElementById('weakest-stage-desc');
    const scrapedUrlIndicator = document.getElementById('scraped-url-indicator');
    
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
    // OAuth Connections Simulation
    // ==========================================
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
                btn.textContent = 'Connect';
                btn.classList.add('btn-highlight');
                showToast(`Disconnected from ${getPlatformName(platform)}.`);
            } else {
                // Open Auth Modal popup simulator
                currentOauthPlatform = { btn, statusEl, platform };
                modalPlatformTitle.textContent = `Connect to ${getPlatformName(platform)}`;
                oauthPopup.classList.add('show');
            }
        });
    });

    function getPlatformName(platform) {
        switch(platform) {
            case 'google': return 'Google Business Profile';
            case 'linkedin': return 'LinkedIn';
            case 'facebook': return 'Facebook';
            case 'youtube': return 'YouTube';
            case 'tiktok': return 'TikTok';
            default: return platform;
        }
    }

    closeModalBtn.addEventListener('click', hideModal);
    cancelAuthBtn.addEventListener('click', hideModal);
    
    function hideModal() {
        oauthPopup.classList.remove('show');
        currentOauthPlatform = null;
    }

    simulateAuthSuccessBtn.addEventListener('click', () => {
        if (currentOauthPlatform) {
            const { btn, statusEl, platform } = currentOauthPlatform;
            statusEl.setAttribute('data-connected', 'true');
            statusEl.textContent = `Connected: @milos_${platform}`;
            statusEl.className = 'oauth-status text-success';
            btn.textContent = 'Disconnect';
            btn.classList.remove('btn-highlight');
            
            showToast(`Successfully authenticated with ${getPlatformName(platform)}!`);
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
        { text: "[Scoring] Running Revenue Journey Rubric Engine v5.2...", delay: 9000, type: 'info' },
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
        
        const detectedClassStr = preflightClassVal.textContent;
        businessClassDisplay.textContent = detectedClassStr;
        classConfidenceVal.textContent = "94%";
        classConfidenceFill.style.width = "94%";

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

        // LinkedIn is now simulated as active card
        const linkedinCard = document.querySelector('.channels-grid .channel-card:last-child');
        linkedinCard.className = "channel-card active-channel";
        linkedinCard.querySelector('.channel-status').className = "channel-status badge-success";
        linkedinCard.querySelector('.channel-status').textContent = "OK";
        linkedinCard.querySelector('.channel-body').innerHTML = `
            <div class="detail-row"><span>Followers:</span> <span class="text-highlight">830</span></div>
            <div class="detail-row"><span>Class:</span> <span class="text-meta">Company Page</span></div>
            <div class="detail-row"><span>Completeness:</span> <span class="text-success">92%</span></div>
        `;
    }
});
