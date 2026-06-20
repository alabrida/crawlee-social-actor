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
                    <span class="gap-bullet ${isLeak ? 'text-error' : 'text-success'}">${isLeak ? '&bull;' : '✓'}</span>
                    <span class="gap-text" style="${isLeak ? '' : 'color: var(--color-text-muted);'}">${g}</span>
                </div>
            `).join('');

            const headerBorderColor = isWeakest ? '#ffc014' : (isLeak ? 'var(--color-border)' : 'rgba(32, 201, 151, 0.3)');
            const bgGradient = isLeak 
                ? 'rgba(255, 255, 255, 0.02)' 
                : 'linear-gradient(135deg, rgba(32, 201, 151, 0.02) 0%, rgba(15, 26, 46, 0.6) 100%)';

            html += `
                <div class="channel-card pathway-card" data-stage="${st.id}" style="grid-column: span 3; margin-bottom: 0.75rem; border-color: ${headerBorderColor}; background: ${bgGradient}; box-shadow: 0 0 10px rgba(240, 180, 41, 0.02); transition: all 0.25s ease;">
                    <div class="pathway-header" style="display: flex; justify-content: space-between; align-items: center; cursor: pointer; padding: 0.25rem 0; user-select: none;">
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                            <span class="channel-icon" style="${isLeak ? '' : 'filter: drop-shadow(0 0 4px rgba(32,201,151,0.4));'}">${config.icon}</span>
                            <div>
                                <span class="channel-title" style="font-size: 1.05rem; font-weight: 600; color: #fff;">
                                    ${config.name} Pathway
                                </span>
                                <span style="font-size: 0.75rem; color: var(--color-text-muted); margin-left: 8px;">
                                    ${isWeakest ? '— Critical Bottleneck' : (isLeak ? '— Leak Identified' : '— Pathway Sealed')}
                                </span>
                            </div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            ${isLeak 
                                ? `<span class="badge badge-warning" style="font-size: 0.72rem; background: rgba(240, 180, 41, 0.1); color: var(--color-secondary-light); border: 1px solid rgba(240, 180, 41, 0.2);">⚠️ Needs Work</span>`
                                : `<span class="badge badge-success" style="font-size: 0.72rem; background: rgba(32, 201, 151, 0.15); color: var(--color-success); border: 1px solid rgba(32, 201, 151, 0.3);">✓ Sealed</span>`
                            }
                            <span class="channel-status ${isLeak ? 'badge-warning' : 'badge-success'}" style="font-size: 0.75rem; font-weight: 600;">Score: ${stageScore.toFixed(1)}/10</span>
                            <span class="expand-chevron" style="transition: transform 0.25s ease; transform: ${isLeak ? 'rotate(180deg)' : 'rotate(0deg)'}; color: var(--color-text-muted); font-size: 0.85rem;">▼</span>
                        </div>
                    </div>
                    
                    <div class="pathway-details-body" style="display: ${isLeak ? 'grid' : 'none'}; grid-template-columns: 1fr 1.2fr; gap: 1.5rem; border-top: 1px solid rgba(255, 255, 255, 0.05); margin-top: 0.75rem; padding-top: 0.75rem;">
                        <div>
                            <h4 style="font-size: 0.8rem; text-transform: uppercase; color: var(--color-text-muted); margin-bottom: 0.5rem; letter-spacing: 0.5px;">Diagnostic Rubric Gaps</h4>
                            <div class="gap-list">${gapsHtml}</div>
                        </div>
                        <div style="border-left: 1px solid rgba(255, 255, 255, 0.05); padding-left: 1.5rem;">
                            <h4 style="font-size: 0.8rem; text-transform: uppercase; color: var(--color-text-muted); margin-bottom: 0.5rem; letter-spacing: 0.5px;">Platform Solution Remediation</h4>
                            <div>${platformsHtml}</div>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;

        // Attach click listeners to expand/collapse details dynamically
        const cards = container.querySelectorAll('.pathway-card');
        cards.forEach(card => {
            const header = card.querySelector('.pathway-header');
            const body = card.querySelector('.pathway-details-body');
            const chevron = card.querySelector('.expand-chevron');

            header.addEventListener('click', () => {
                const isCollapsed = body.style.display === 'none';
                if (isCollapsed) {
                    body.style.display = 'grid';
                    chevron.style.transform = 'rotate(180deg)';
                    card.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                } else {
                    body.style.display = 'none';
                    chevron.style.transform = 'rotate(0deg)';
                    
                    const stageId = card.getAttribute('data-stage');
                    const isWeakest = record.weakest_stage && record.weakest_stage.toLowerCase() === stageId;
                    const stageScore = parseFloat(stages.find(s => s.id === stageId)?.score || 0);
                    const isLeak = stageScore < 8.0 || isWeakest;
                    card.style.borderColor = isWeakest ? '#ffc014' : (isLeak ? 'var(--color-border)' : 'rgba(32, 201, 151, 0.3)');
                }
            });
        });
    }

    if (window.UIRenderer) {
        window.UIRenderer.renderLeaksAndSolutions = renderLeaksAndSolutions;
    } else {
        window.UIRenderer = { renderLeaksAndSolutions };
    }
})();
