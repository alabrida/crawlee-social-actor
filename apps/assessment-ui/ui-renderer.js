(function() {
    const { CLASSIFICATION_DATA, DEFAULT_CLASSIFICATION, WEAKEST_STAGE_DATA } = window.UIRendererData || {};

    function updateClassificationBreakdown(detectedClass) {
        const data = CLASSIFICATION_DATA[detectedClass] || DEFAULT_CLASSIFICATION;
        document.getElementById('breakdown-label-1').textContent = data.label1;
        const fill1 = document.getElementById('breakdown-fill-1');
        fill1.style.width = data.val1;
        document.getElementById('breakdown-val-1').textContent = data.val1;

        document.getElementById('breakdown-label-2').textContent = data.label2;
        const fill2 = document.getElementById('breakdown-fill-2');
        fill2.style.width = data.val2;
        document.getElementById('breakdown-val-2').textContent = data.val2;

        document.getElementById('breakdown-label-3').textContent = data.label3;
        const fill3 = document.getElementById('breakdown-fill-3');
        fill3.style.width = data.val3;
        document.getElementById('breakdown-val-3').textContent = data.val3;

        document.getElementById('breakdown-explanation').textContent = data.explanation;
    }

    function updateWeakestStageBreakdown(stage) {
        const weakestGapList = document.getElementById('weakest-gap-list');
        if (!weakestGapList) return;
        weakestGapList.innerHTML = WEAKEST_STAGE_DATA[stage] || `
            <div class="gap-item">
                <span class="gap-bullet text-error">&bull;</span>
                <span class="gap-text"><strong>High Priority Gaps</strong>: Key channels require basic setups.</span>
            </div>
        `;
    }

    function updateOverallScoreBreakdown(score) {
        const overallFactorList = document.getElementById('overall-factor-list');
        if (!overallFactorList) return;

        let factorsHtml = '';
        if (score === 0.0) {
            factorsHtml = `
                <div class="factor-item" style="color: var(--text-secondary);">
                    <span class="factor-bullet">&bull;</span>
                    <span class="factor-text">Audit pending. Run the diagnostic to evaluate score contribution factors.</span>
                </div>
            `;
        } else if (score < 4.0) {
            factorsHtml = `
                <div class="factor-item positive"><span class="factor-bullet">+</span><span class="factor-text"><strong>Broad Coverage</strong>: 7 active channels crawled.</span></div>
                <div class="factor-item positive"><span class="factor-bullet">+</span><span class="factor-text"><strong>Awareness Baseline</strong>: Active search listings (5.2/10).</span></div>
                <div class="factor-item negative"><span class="factor-bullet">-</span><span class="factor-text"><strong>Conversion Gap</strong>: Unlinked booking engine (-2.1 points).</span></div>
                <div class="factor-item negative"><span class="factor-bullet">-</span><span class="factor-text"><strong>Muted Authority</strong>: Low reviews and decision signals (-1.4 points).</span></div>
            `;
        } else if (score < 7.0) {
            factorsHtml = `
                <div class="factor-item positive"><span class="factor-bullet">+</span><span class="factor-text"><strong>Local Search Dominance</strong>: High GBP mapping and indexing (+1.8 points).</span></div>
                <div class="factor-item positive"><span class="factor-bullet">+</span><span class="factor-text"><strong>Connected Funnel</strong>: LinkedIn and Google Booking active (+1.2 points).</span></div>
                <div class="factor-item negative"><span class="factor-bullet">-</span><span class="factor-text"><strong>Retention Leak</strong>: Support & returning pathways unlinked (-0.8 points).</span></div>
                <div class="factor-item negative"><span class="factor-bullet">-</span><span class="factor-text"><strong>Engagement Cap</strong>: Low social dialogue rates (-0.4 points).</span></div>
            `;
        } else {
            factorsHtml = `
                <div class="factor-item positive"><span class="factor-bullet">+</span><span class="factor-text"><strong>Strong Direct Conversions</strong>: High booking & menu links (+2.2 points).</span></div>
                <div class="factor-item positive"><span class="factor-bullet">+</span><span class="factor-text"><strong>Active Audiences</strong>: High frequency posting (+1.4 points).</span></div>
                <div class="factor-item positive"><span class="factor-bullet">+</span><span class="factor-text"><strong>Authority Verified</strong>: Trust seals & 4.5+ star review average.</span></div>
            `;
        }
        overallFactorList.innerHTML = factorsHtml;
    }

    function updateDashboardWithNewAudit() {
        const urlInput = document.getElementById('target-url');
        const url = urlInput ? urlInput.value.trim() : '';
        const scrapedUrlIndicator = document.getElementById('scraped-url-indicator');
        if (scrapedUrlIndicator) {
            scrapedUrlIndicator.textContent = `Target: ${url}`;
        }

        const overallScoreVal = document.getElementById('overall-score-val');
        if (overallScoreVal) {
            overallScoreVal.textContent = "6.8";
            overallScoreVal.style.animation = "scaleIn 0.5s ease";
        }

        const overallBadgeDisplay = document.getElementById('overall-badge-display');
        if (overallBadgeDisplay) {
            overallBadgeDisplay.textContent = "Growing Presence";
            overallBadgeDisplay.className = "badge badge-success";
            overallBadgeDisplay.style.background = "";
            overallBadgeDisplay.style.color = "";
        }
        updateOverallScoreBreakdown(6.8);

        const detectedClassVal = document.getElementById('preflight-detected-class');
        const detectedClassStr = detectedClassVal ? detectedClassVal.textContent : 'Local Business';
        const businessClassDisplay = document.getElementById('business-class-display');
        if (businessClassDisplay) {
            businessClassDisplay.textContent = detectedClassStr;
        }

        const classConfidenceVal = document.getElementById('class-confidence-val');
        if (classConfidenceVal) classConfidenceVal.textContent = "94%";
        const classConfidenceFill = document.getElementById('class-confidence-fill');
        if (classConfidenceFill) classConfidenceFill.style.width = "94%";

        // NAICS and Maturity Mapping
        const naicsMap = {
            'Local Business': { code: '722511', title: 'Full-Service Restaurants' },
            'SaaS Platform': { code: '513210', title: 'Software Publishers' },
            'E-Commerce': { code: '454110', title: 'Electronic Shopping and Mail-Order Houses' },
            'Professional Services': { code: '541611', title: 'Administrative and General Management Consulting Services' },
            'Content Creator': { code: '711510', title: 'Independent Artists, Writers, and Performers' }
        };

        const maturityMap = {
            'Local Business': 'Maturity Tier 2 (Validated Brand)',
            'SaaS Platform': 'Maturity Tier 3 (Scale / Growth)',
            'E-Commerce': 'Maturity Tier 2 (Validated Brand)',
            'Professional Services': 'Maturity Tier 3 (Scale / Growth)',
            'Content Creator': 'Maturity Tier 1 (Emerging Creator)'
        };

        const naicsVal = naicsMap[detectedClassStr] || { code: '541611', title: 'Administrative and General Management Consulting Services' };
        const maturityVal = maturityMap[detectedClassStr] || 'Maturity Tier 3 (Scale / Growth)';

        const maturityEl = document.getElementById('maturity-tier-val');
        if (maturityEl) maturityEl.textContent = maturityVal;
        
        const naicsEl = document.getElementById('naics-code-val');
        if (naicsEl) naicsEl.textContent = `${naicsVal.code} (${naicsVal.title})`;

        updateClassificationBreakdown(detectedClassStr);

        // Stages Update
        const stages = [
            { id: 'awareness', val: '8.5 / 10', w: '85%' },
            { id: 'consideration', val: '7.2 / 10', w: '72%' },
            { id: 'decision', val: '6.8 / 10', w: '68%' },
            { id: 'conversion', val: '5.5 / 10', w: '55%' },
            { id: 'retention', val: '5.8 / 10', w: '58%' }
        ];
        stages.forEach(st => {
            const scoreEl = document.getElementById(`score-${st.id}`);
            if (scoreEl) scoreEl.textContent = st.val;
            const barEl = document.getElementById(`bar-${st.id}`);
            if (barEl) barEl.style.width = st.w;
        });

        if (window.UIRenderer && window.UIRenderer.drawLineChart) {
            window.UIRenderer.drawLineChart({
                awareness: 8.5,
                consideration: 7.2,
                decision: 6.8,
                conversion: 5.5,
                retention: 5.8
            });
        }

        // Weakest stage
        const weakestStageDisplay = document.getElementById('weakest-stage-display');
        if (weakestStageDisplay) {
            weakestStageDisplay.textContent = "Conversion";
            weakestStageDisplay.className = "value-display text-warning";
            weakestStageDisplay.style.background = "";
            weakestStageDisplay.style.webkitTextFillColor = "";
        }
        const weakestStageDesc = document.getElementById('weakest-stage-desc');
        if (weakestStageDesc) {
            weakestStageDesc.textContent = "Conversion has improved via Google booking integration, but shop and pricing page tiers can be optimized further.";
        }
        updateWeakestStageBreakdown("Conversion");

        // LinkedIn Connected Check
        const linkedinOauth = document.getElementById('oauth-linkedin');
        const isLinkedinConnected = linkedinOauth && linkedinOauth.querySelector('.oauth-status').getAttribute('data-connected') === 'true';

        const mockRecord = {
            overall_score: 6.8,
            awareness_score: 8.5,
            consideration_score: 7.2,
            decision_score: 6.8,
            conversion_score: 5.5,
            retention_score: 5.8,
            weakest_stage: 'Conversion',
            platforms_found: ['website', 'instagram', 'facebook', 'youtube', 'tiktok', isLinkedinConnected ? 'linkedin' : ''].filter(Boolean),
            business_url: url || 'https://miloshamburgers.com/'
        };

        if (window.UIRenderer && window.UIRenderer.renderLeaksAndSolutions) {
            window.UIRenderer.renderLeaksAndSolutions(mockRecord);
        }
    }

    // Map the core scraper's business_class enum to the dashboard display label.
    const CLASS_LABEL = {
        local: 'Local Business',
        professional_services: 'Professional Services',
        ecommerce: 'E-Commerce',
        saas: 'SaaS Platform',
        content_creator: 'Content Creator',
        influencer: 'Content Creator'
    };

    const NAICS_MAP = {
        'Local Business': { code: '722511', title: 'Full-Service Restaurants' },
        'SaaS Platform': { code: '513210', title: 'Software Publishers' },
        'E-Commerce': { code: '454110', title: 'Electronic Shopping and Mail-Order Houses' },
        'Professional Services': { code: '541611', title: 'Administrative and General Management Consulting Services' },
        'Content Creator': { code: '711510', title: 'Independent Artists, Writers, and Performers' }
    };
    const MATURITY_MAP = {
        'Local Business': 'Maturity Tier 2 (Validated Brand)',
        'SaaS Platform': 'Maturity Tier 3 (Scale / Growth)',
        'E-Commerce': 'Maturity Tier 2 (Validated Brand)',
        'Professional Services': 'Maturity Tier 3 (Scale / Growth)',
        'Content Creator': 'Maturity Tier 1 (Emerging Creator)'
    };

    function cap(s) { return s ? String(s).charAt(0).toUpperCase() + String(s).slice(1) : ''; }
    function setText(id, text) { const el = document.getElementById(id); if (el) el.textContent = text; }

    // Compact a follower/subscriber count for KPI tiles: 837000 -> "837K", 7900000 -> "7.9M".
    function compactNum(n) {
        if (n == null || isNaN(n)) return '—';
        if (n >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
        if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
        if (n >= 1e3) return Math.round(n / 1e3) + 'K';
        return String(n);
    }

    // One headline metric per platform for the scan row, in the platform's brand color.
    const PLATFORM_KPIS = [
        { name: 'Google', icon: 'G', accent: '#4285F4', label: 'GBP Rating', get: r => r.gbp_rating, fmt: v => (v != null ? Number(v).toFixed(1) + '★' : '—') },
        { name: 'YouTube', icon: 'YT', accent: '#FF0000', label: 'Subscribers', get: r => r.youtube_subscribers },
        { name: 'Facebook', icon: 'f', accent: '#1877F2', label: 'Followers', get: r => r.facebook_followers },
        { name: 'Instagram', icon: 'IG', accent: '#E4405F', label: 'Followers', get: r => r.instagram_followers },
        { name: 'TikTok', icon: 'TT', accent: '#25F4EE', label: 'Followers', get: r => r.tiktok_followers },
        { name: 'LinkedIn', icon: 'in', accent: '#0A66C2', label: 'Followers', get: r => r.linkedin_followers },
        { name: 'Pinterest', icon: 'P', accent: '#E60023', label: 'Followers', get: r => r.pinterest_followers },
        { name: 'X', icon: '𝕏', accent: '#1d9bf0', label: 'Followers', get: r => r.twitter_followers }
    ];

    function renderPlatformKpis(record) {
        const el = document.getElementById('platform-kpi-row');
        if (!el) return;
        el.innerHTML = PLATFORM_KPIS.map(p => {
            const raw = p.get(record);
            const has = raw != null && raw !== 0;
            const valStr = p.fmt ? p.fmt(raw) : compactNum(raw);
            const verified = (p.name === 'TikTok' && record.tiktok_verified) || (p.name === 'X' && record.twitter_verified);
            return `<div class="platform-kpi ${has ? '' : 'is-empty'}" style="--kpi-accent:${p.accent}">
                <div class="platform-kpi-head">
                    <div class="platform-kpi-icon">${p.icon}</div>
                    <span class="platform-kpi-name">${p.name}</span>
                    ${verified ? '<span class="platform-kpi-verified" title="Verified">✓</span>' : ''}
                </div>
                <div class="platform-kpi-value">${valStr}</div>
                <div class="platform-kpi-label">${p.label}</div>
            </div>`;
        }).join('');
    }
    function scoreBadge(score) {
        if (score >= 7) return { text: 'Strong Presence', cls: 'badge badge-success' };
        if (score >= 4) return { text: 'Growing Presence', cls: 'badge badge-success' };
        return { text: 'Critical Leaks', cls: 'badge badge-error' };
    }

    /**
     * Bind a REAL assessment record (the core scraper's 41-column row + assessment_detail)
     * to the dashboard DOM. Replaces updateDashboardWithNewAudit's hardcoded demo values.
     */
    function renderAssessment(record) {
        if (!record) return;

        const url = record.business_url || '';
        setText('scraped-url-indicator', `Target: ${url}`);
        const urlInput = document.getElementById('target-url');
        if (urlInput && !urlInput.value) urlInput.value = url;

        // Overall score + badge
        const overall = Number(record.overall_score) || 0;
        const ov = document.getElementById('overall-score-val');
        if (ov) { ov.textContent = overall.toFixed(1); ov.style.animation = 'scaleIn 0.5s ease'; }
        const badge = scoreBadge(overall);
        const badgeEl = document.getElementById('overall-badge-display');
        if (badgeEl) { badgeEl.textContent = badge.text; badgeEl.className = badge.cls; badgeEl.style.background = ''; badgeEl.style.color = ''; }
        updateOverallScoreBreakdown(overall);

        // Business class + confidence + NAICS + maturity
        const displayClass = CLASS_LABEL[record.business_class] || 'Professional Services';
        setText('business-class-display', displayClass);
        const conf = Math.round((Number(record.business_class_confidence) || 0) * 100);
        setText('class-confidence-val', conf + '%');
        const cf = document.getElementById('class-confidence-fill'); if (cf) cf.style.width = conf + '%';

        const detailCls = (record.assessment_detail && record.assessment_detail.classification) || {};
        const naics = (detailCls.naics_code && detailCls.naics_title)
            ? { code: detailCls.naics_code, title: detailCls.naics_title }
            : (NAICS_MAP[displayClass] || NAICS_MAP['Professional Services']);
        setText('naics-code-val', `${naics.code} (${naics.title})`);
        setText('maturity-tier-val', MATURITY_MAP[displayClass] || 'Maturity Tier 3 (Scale / Growth)');

        updateClassificationBreakdown(displayClass);

        // Platform KPI scan row (YouTube subs, IG/FB/TikTok/Pinterest/LinkedIn followers, GBP rating)
        renderPlatformKpis(record);

        // Stage scores (0-10) -> labels, bars, line chart
        const stageScores = {
            awareness: Number(record.awareness_score) || 0,
            consideration: Number(record.consideration_score) || 0,
            decision: Number(record.decision_score) || 0,
            conversion: Number(record.conversion_score) || 0,
            retention: Number(record.retention_score) || 0
        };
        Object.keys(stageScores).forEach(id => {
            const s = stageScores[id];
            setText(`score-${id}`, `${s.toFixed(1)} / 10`);
            const barEl = document.getElementById(`bar-${id}`);
            if (barEl) barEl.style.width = `${Math.max(0, Math.min(100, s * 10))}%`;
        });
        if (window.UIRenderer && window.UIRenderer.drawLineChart) window.UIRenderer.drawLineChart(stageScores);

        // Weakest stage
        const weakest = cap(record.weakest_stage);
        const wd = document.getElementById('weakest-stage-display');
        if (wd) { wd.textContent = weakest; wd.className = 'value-display text-warning'; wd.style.background = ''; wd.style.webkitTextFillColor = ''; }
        updateWeakestStageBreakdown(weakest);

        // Leaks + per-platform solutions (real record drives platforms_found + metrics)
        if (window.UIRenderer && window.UIRenderer.renderLeaksAndSolutions) {
            window.UIRenderer.renderLeaksAndSolutions(record);
        }
    }

    window.UIRenderer = {
        updateClassificationBreakdown,
        updateWeakestStageBreakdown,
        updateOverallScoreBreakdown,
        updateDashboardWithNewAudit,
        renderAssessment
    };
})();
