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

    function updateChannelCard(cardId, data) {
        const card = document.getElementById(`channel-card-${cardId}`);
        if (!card) return;
        card.className = `channel-card ${data.active ? 'active-channel' : 'inactive-channel'}`;
        const statusEl = card.querySelector('.channel-status');
        if (statusEl) {
            statusEl.className = `channel-status ${data.active ? 'badge-success' : 'badge-inactive'}`;
            statusEl.textContent = data.active ? 'OK' : 'Disconnected';
        }
        const bodyEl = card.querySelector('.channel-body');
        if (bodyEl) {
            bodyEl.innerHTML = data.html;
        }
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

        // Channel Cards
        const channelData = {
            website: {
                active: true,
                html: `
                    <div class="detail-row"><span>SSL:</span> <span class="text-success">Active</span></div>
                    <div class="detail-row"><span>Schema.org:</span> <span class="text-success">JSON-LD</span></div>
                    <div class="detail-row"><span>Hero H1:</span> <span class="text-meta">"Original Burgers since 1952"</span></div>
                `
            },
            instagram: {
                active: true,
                html: `
                    <div class="detail-row"><span>Followers:</span> <span class="text-highlight">12.5K</span></div>
                    <div class="detail-row"><span>Bio link:</span> <span class="text-meta">Linktree</span></div>
                    <div class="detail-row"><span>Account:</span> <span class="text-meta">Business Page</span></div>
                `
            },
            facebook: {
                active: true,
                html: `
                    <div class="detail-row"><span>Likes:</span> <span class="text-highlight">48K</span></div>
                    <div class="detail-row"><span>Class:</span> <span class="text-meta">Business Page</span></div>
                    <div class="detail-row"><span>Messenger:</span> <span class="text-success">Active</span></div>
                `
            },
            youtube: {
                active: true,
                html: `
                    <div class="detail-row"><span>Subscribers:</span> <span class="text-highlight">1.2K</span></div>
                    <div class="detail-row"><span>Store Tab:</span> <span class="text-error">Missing</span></div>
                    <div class="detail-row"><span>Recency:</span> <span class="text-meta">14 days ago</span></div>
                `
            },
            tiktok: {
                active: true,
                html: `
                    <div class="detail-row"><span>Followers:</span> <span class="text-highlight">5.8K</span></div>
                    <div class="detail-row"><span>Shop Tab:</span> <span class="text-error">Missing</span></div>
                    <div class="detail-row"><span>Bio Link:</span> <span class="text-meta">linktr.ee/milos</span></div>
                `
            }
        };

        Object.keys(channelData).forEach(id => {
            updateChannelCard(id, channelData[id]);
        });

        // LinkedIn Connected Check
        const linkedinOauth = document.getElementById('oauth-linkedin');
        const isLinkedinConnected = linkedinOauth && linkedinOauth.querySelector('.oauth-status').getAttribute('data-connected') === 'true';
        updateChannelCard('linkedin', {
            active: isLinkedinConnected,
            html: isLinkedinConnected ? `
                <div class="detail-row"><span>Followers:</span> <span class="text-highlight">830</span></div>
                <div class="detail-row"><span>Class:</span> <span class="text-meta">Company Page</span></div>
                <div class="detail-row"><span>Completeness:</span> <span class="text-success">92%</span></div>
            ` : `<p class="card-desc">No profile was scraped or linked. Authenticate in settings to retry.</p>`
        });
    }

    window.UIRenderer = {
        updateClassificationBreakdown,
        updateWeakestStageBreakdown,
        updateOverallScoreBreakdown,
        updateDashboardWithNewAudit
    };
})();
