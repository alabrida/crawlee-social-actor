(function() {
    function renderLeaksAndSolutions(record) {
        const container = document.getElementById('leaks-solutions-container');
        if (!container) return;

        const score = parseFloat(record.overall_score || 0);
        if (score === 0) {
            container.innerHTML = `
                <div style="grid-column: span 3; text-align: center; padding: 3rem; color: var(--color-text-muted); font-style: italic; background: rgba(255,255,255,0.01); border: 1px dashed var(--border-color); border-radius: 12px; width: 100%; box-sizing: border-box;">
                    Awaiting diagnostic run to map unified commercial engine leaks and platform-specific solutions.
                </div>
            `;
            return;
        }

        const stageSolutions = {
            awareness: {
                name: "Awareness",
                icon: "👁️",
                platforms: [
                    { id: 'website', name: 'Google Search / Website', icon: '🌐', fix: 'Optimize search indexing & keywords' },
                    { id: 'instagram', name: 'Instagram Reach', icon: '📸', fix: 'Publish reels and videos consistently' },
                    { id: 'tiktok', name: 'TikTok Algorithm', icon: '🎵', fix: 'Deploy short-form video recommendation hooks' },
                    { id: 'youtube', name: 'YouTube Video SEO', icon: '▶️', fix: 'Optimize video search tags & titles' }
                ],
                gaps: ["Long posting frequency intervals", "Low organic local search map visibility"]
            },
            consideration: {
                name: "Consideration",
                icon: "🤔",
                platforms: [
                    { id: 'instagram', name: 'Instagram Engagement', icon: '📸', fix: 'Optimize bio description & links' },
                    { id: 'facebook', name: 'Facebook Community', icon: '👥', fix: 'Respond to direct replies and messages' },
                    { id: 'youtube', name: 'YouTube Education', icon: '▶️', fix: 'Address customer questions in video descriptions' }
                ],
                gaps: ["High views but low comment/share counts", "Profiles fail to state core solution"]
            },
            decision: {
                name: "Decision",
                icon: "🏆",
                platforms: [
                    { id: 'google', name: 'Google Business Profile', icon: 'G', fix: 'Increase ratings and review response rates' },
                    { id: 'facebook', name: 'Facebook Trust Ratings', icon: 'f', fix: 'Collect visitor recommendations' }
                ],
                gaps: ["No user testimonials or ratings on profile", "GBP rating is below target benchmark (4.2 stars)"]
            },
            conversion: {
                name: "Conversion",
                icon: "💰",
                platforms: [
                    { id: 'website', name: 'Website Checkout', icon: '🌐', fix: 'Integrate prominent direct booking engine' },
                    { id: 'instagram', name: 'Instagram Shop Tab', icon: '📸', fix: 'Link booking engines in bio headers' },
                    { id: 'tiktok', name: 'TikTok Commerce Link', icon: '🎵', fix: 'Set up checkout/merch platform tabs' }
                ],
                gaps: ["Booking engine offline or unlinked on socials", "Broken or missing link-in-bio paths"]
            },
            retention: {
                name: "Retention",
                icon: "🔄",
                platforms: [
                    { id: 'website', name: 'FAQ & Support Hub', icon: '🌐', fix: 'Create customer self-service support page' },
                    { id: 'linkedin', name: 'LinkedIn Company Page', icon: '💼', fix: 'Set up email newsletter signup hooks' },
                    { id: 'facebook', name: 'Facebook VIP Group', icon: '👥', fix: 'Curate customer re-engagement content' }
                ],
                gaps: ["Missing FAQ chat links", "Low interaction from returning clients"]
            }
        };

        const stages = [
            { id: 'awareness', score: record.awareness_score },
            { id: 'consideration', score: record.consideration_score },
            { id: 'decision', score: record.decision_score },
            { id: 'conversion', score: record.conversion_score },
            { id: 'retention', score: record.retention_score }
        ];

        let html = '';

        stages.forEach(st => {
            const stageScore = parseFloat(st.score || 0);
            const isWeakest = record.weakest_stage && record.weakest_stage.toLowerCase() === st.id;
            const isLeak = stageScore < 8.0 || isWeakest;
            const config = stageSolutions[st.id];

            if (isLeak) {
                const platformsHtml = config.platforms.map(p => {
                    const isFound = record.platforms_found?.some(pf => pf.toLowerCase().includes(p.id)) || 
                                    (p.id === 'website' && record.business_url) || 
                                    (p.id === 'google' && record.platforms_found?.some(pf => pf.includes('google') || pf.includes('maps')));
                    
                    return `
                        <div class="detail-row" style="padding: 0.35rem 0; font-size: 0.78rem;">
                            <span>${p.icon} <strong>${p.name}</strong></span>
                            <span class="${isFound ? 'text-success' : 'text-error'}" style="font-weight: 600;">
                                ${isFound ? '✓ Connected' : '⚠️ Remediation: ' + p.fix}
                            </span>
                        </div>
                    `;
                }).join('');

                const gapsHtml = config.gaps.map(g => `
                    <div class="gap-item" style="margin-bottom: 0.25rem;">
                        <span class="gap-bullet text-error">&bull;</span>
                        <span class="gap-text">${g}</span>
                    </div>
                `).join('');

                html += `
                    <div class="channel-card active-channel" style="border-color: ${isWeakest ? '#ffc014' : 'var(--color-border)'}; box-shadow: 0 0 10px rgba(240, 180, 41, 0.05); grid-column: span 3; margin-bottom: 0.75rem;">
                        <div class="channel-header" style="justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; margin-bottom: 0.75rem;">
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <span class="channel-icon">${config.icon}</span>
                                <span class="channel-title" style="font-size: 1.1rem; color: #fff;">${config.name} Leak ${isWeakest ? '(Critical bottleneck)' : 'identified'}</span>
                            </div>
                            <span class="channel-status ${isWeakest ? 'badge-warning' : 'badge-inactive'}" style="font-size: 0.75rem;">Score: ${stageScore.toFixed(1)}/10</span>
                        </div>
                        <div class="channel-body" style="display: grid; grid-template-columns: 1fr 1.2fr; gap: 1.5rem;">
                            <div>
                                <h4 style="font-size: 0.8rem; text-transform: uppercase; color: var(--color-text-muted); margin-bottom: 0.5rem; letter-spacing: 0.5px;">Identified Rubric Gaps</h4>
                                <div class="gap-list">${gapsHtml}</div>
                            </div>
                            <div style="border-left: 1px solid rgba(255, 255, 255, 0.05); padding-left: 1.5rem;">
                                <h4 style="font-size: 0.8rem; text-transform: uppercase; color: var(--color-text-muted); margin-bottom: 0.5rem; letter-spacing: 0.5px;">Platform Solution Remediation</h4>
                                <div>${platformsHtml}</div>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                html += `
                    <div class="channel-card" style="opacity: 0.85; grid-column: span 3; margin-bottom: 0.5rem; padding: 0.75rem 1.25rem; border-color: rgba(32, 201, 151, 0.15); background: rgba(32, 201, 151, 0.01);">
                        <div class="channel-header" style="justify-content: space-between; align-items: center;">
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <span class="channel-icon" style="filter: grayscale(1);">${config.icon}</span>
                                <span class="channel-title" style="font-size: 0.95rem; color: var(--color-text-muted); font-weight: 500;">${config.name} Pathway</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 0.75rem;">
                                <span class="text-success" style="font-size: 0.85rem; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">✓ Sealed</span>
                                <span class="channel-status badge-success" style="background: rgba(32, 201, 151, 0.15); color: var(--color-success); font-size: 0.75rem;">Score: ${stageScore.toFixed(1)}/10</span>
                            </div>
                        </div>
                    </div>
                `;
            }
        });

        container.innerHTML = html;
    }

    if (window.UIRenderer) {
        window.UIRenderer.renderLeaksAndSolutions = renderLeaksAndSolutions;
    } else {
        window.UIRenderer = { renderLeaksAndSolutions };
    }
})();
