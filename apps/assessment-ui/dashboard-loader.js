(function() {
    const sidebarPlatforms = [
        { id: 'google', name: 'Google Business', icon: 'G', cssClass: 'platform-icon-google' },
        { id: 'linkedin', name: 'LinkedIn', icon: 'in', cssClass: 'platform-icon-linkedin' },
        { id: 'facebook', name: 'Facebook', icon: 'f', cssClass: 'platform-icon-facebook' },
        { id: 'instagram', name: 'Instagram', icon: '📸', cssClass: 'platform-icon-instagram' },
        { id: 'youtube', name: 'YouTube', icon: 'YT', cssClass: 'platform-icon-youtube' },
        { id: 'tiktok', name: 'TikTok', icon: '🎵', cssClass: 'platform-icon-tiktok' },
        { id: 'twitter', name: 'Twitter / X', icon: '𝕏', cssClass: 'platform-icon-twitter' },
        { id: 'pinterest', name: 'Pinterest', icon: 'P', cssClass: 'platform-icon-pinterest' },
        { id: 'reddit', name: 'Reddit', icon: 'R', cssClass: 'platform-icon-reddit' }
    ];

    const syncPlatforms = [
        { id: 'google', name: 'Google Business', icon: 'G', color: '#4285F4' },
        { id: 'linkedin', name: 'LinkedIn', icon: 'in', color: '#0A66C2' },
        { id: 'facebook', name: 'Facebook', icon: 'f', color: '#1877F2' },
        { id: 'instagram', name: 'Instagram', icon: '📸', color: '#E4405F' },
        { id: 'youtube', name: 'YouTube', icon: 'YT', color: '#FF0000' },
        { id: 'tiktok', name: 'TikTok', icon: '🎵', color: '#ffffff' },
        { id: 'twitter', name: 'Twitter / X', icon: '𝕏', color: '#ffffff' },
        { id: 'pinterest', name: 'Pinterest', icon: 'P', color: '#E60023' },
        { id: 'reddit', name: 'Reddit', icon: 'R', color: '#FF4500' }
    ];

    const stages = [
        { id: 'awareness', name: 'Awareness', desc: 'Traffic generation, brand discovery & reach.' },
        { id: 'consideration', name: 'Consideration', desc: 'Target audience engagement & social signals.' },
        { id: 'decision', name: 'Decision', desc: 'Reviews, trust signals, and brand credibility.' },
        { id: 'conversion', name: 'Conversion', desc: 'Ease of direct checkout, booking, or leads.' },
        { id: 'retention', name: 'Retention', desc: 'Sub subscriptions, newsletter, community hooks.' }
    ];

    function init() {
        const stagesContainer = document.getElementById('stages-container');
        if (stagesContainer) {
            stagesContainer.innerHTML = `
                <div id="stages-bar-view" style="display: flex; flex-direction: column; gap: 1rem; width: 100%;">
                    ${stages.map(st => `
                        <div class="stage-item" data-stage="${st.id}">
                            <div class="stage-metric">
                                <span class="stage-name">${st.name}</span>
                                <span id="score-${st.id}" class="stage-score">0.0 / 10</span>
                            </div>
                            <div class="progress-bar-track">
                                <div id="bar-${st.id}" class="progress-bar-fill fill-${st.id}" style="width: 0%;"></div>
                            </div>
                            <p class="stage-desc">${st.desc}</p>
                        </div>
                    `).join('')}
                </div>
                <div id="stages-line-view" class="hidden" style="position: relative; width: 100%; height: auto; padding: 10px 0; box-sizing: border-box;">
                    <!-- Line chart SVG will be drawn here -->
                </div>
            `;
        }

        const leaksSolutions = document.getElementById('leaks-solutions-container');
        if (leaksSolutions) {
            leaksSolutions.innerHTML = `
                <div style="grid-column: span 3; text-align: center; padding: 3rem; color: var(--color-text-muted); font-style: italic; background: rgba(255,255,255,0.01); border: 1px dashed var(--border-color); border-radius: 12px;">
                    Awaiting diagnostic run to map unified commercial engine leaks and platform-specific solutions.
                </div>
            `;
        }

        const oauthList = document.getElementById('oauth-list-container');
        if (oauthList) {
            oauthList.innerHTML = sidebarPlatforms.map(p => `
                <div class="oauth-item" id="oauth-${p.id}">
                    <div class="oauth-platform-info">
                        <div class="platform-icon-circle ${p.cssClass}">${p.icon}</div>
                        <div class="platform-details-box">
                            <div class="platform-name">${p.name}</div>
                            <div class="oauth-status" data-connected="false">Not Connected</div>
                        </div>
                    </div>
                </div>
            `).join('');
        }

        const syncList = document.getElementById('sync-list-container');
        if (syncList) {
            syncList.innerHTML = syncPlatforms.map(p => `
                <div class="sync-item">
                    <div class="sync-platform-info">
                        <span style="color: ${p.color}; font-weight: bold; width: 24px; text-align: center;">${p.icon}</span>
                        <span class="sync-platform-name">${p.name}</span>
                    </div>
                    <input type="checkbox" class="sync-checkbox" data-platform="${p.id}" checked>
                </div>
            `).join('');
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
