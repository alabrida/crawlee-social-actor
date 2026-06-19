/**
 * @file dashboard-history.js
 * @description Manages rendering and updating the dashboard widgets with active or past diagnostic scan runs.
 */
document.addEventListener('DOMContentLoaded', () => {
    const app = window.DashboardApp;
    if (!app) return;

    function renderAuditHistory(runs) {
        const historySection = document.getElementById('audit-history-section');
        const historyList = document.getElementById('audit-history-list');
        const settingsSidebar = document.getElementById('settings-sidebar');
        
        if (!historySection || !historyList) return;
        
        if (runs && runs.length > 0) {
            historySection.style.display = 'block';
            historyList.innerHTML = '';
            
            runs.forEach(run => {
                const item = document.createElement('div');
                item.className = 'oauth-item';
                item.style.cssText = 'cursor: pointer; display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border: 1px solid var(--color-border); border-radius: 8px; background: rgba(255,255,255,0.01); transition: all 0.2s; margin-bottom: 8px; box-sizing: border-box;';
                
                item.addEventListener('mouseenter', () => {
                    item.style.background = 'rgba(255, 255, 255, 0.04)';
                    item.style.borderColor = 'var(--color-secondary-light)';
                });
                item.addEventListener('mouseleave', () => {
                    item.style.background = 'rgba(255, 255, 255, 0.01)';
                    item.style.borderColor = 'var(--color-border)';
                });
                
                const dateStr = new Date(run.assessment_date).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                });
                
                const score = parseFloat(run.overall_score || 0);
                const scoreDisplay = score > 0 ? score.toFixed(1) : 'Pending';
                
                let displayUrl = run.business_url || 'Unknown website';
                if (displayUrl.startsWith('http://')) displayUrl = displayUrl.substring(7);
                if (displayUrl.startsWith('https://')) displayUrl = displayUrl.substring(8);
                if (displayUrl.endsWith('/')) displayUrl = displayUrl.slice(0, -1);
                if (displayUrl.length > 25) displayUrl = displayUrl.substring(0, 22) + '...';
                
                item.innerHTML = `
                    <div style="text-align: left;">
                        <div style="font-weight: 600; font-size: 0.85rem; color: #fff; line-height: 1.2;">${displayUrl}</div>
                        <div style="font-size: 0.72rem; color: var(--color-text-muted); margin-top: 2px;">${dateStr}</div>
                    </div>
                    <div style="font-family: 'Outfit'; font-weight: 700; font-size: 0.95rem; color: var(--color-secondary-light);">${scoreDisplay}</div>
                `;
                
                item.addEventListener('click', () => {
                    updateDashboardWithRealData(run);
                    
                    historyList.querySelectorAll('.oauth-item').forEach(el => {
                        el.style.boxShadow = 'none';
                    });
                    item.style.boxShadow = '0 0 10px rgba(240, 180, 41, 0.2)';
                    
                    if (settingsSidebar) settingsSidebar.classList.remove('open');
                });
                
                historyList.appendChild(item);
            });
        } else {
            historySection.style.display = 'none';
        }
    }

    function updateDashboardWithRealData(record) {
        const scrapedUrlIndicator = document.getElementById('scraped-url-indicator');
        if (scrapedUrlIndicator) scrapedUrlIndicator.textContent = `Target: ${record.business_url || 'Pending...'}`;
        
        const brandNameEl = document.querySelector('.logo-text .accent-text');
        if (brandNameEl && record.brand_name) brandNameEl.textContent = ` | ${record.brand_name}`;

        const overallScoreVal = document.getElementById('overall-score-val');
        const score = parseFloat(record.overall_score || 0);
        if (overallScoreVal) {
            overallScoreVal.textContent = score > 0 ? score.toFixed(1) : 'Pending';
        }

        const overallBadgeDisplay = document.getElementById('overall-badge-display');
        if (overallBadgeDisplay) {
            if (score === 0) {
                overallBadgeDisplay.textContent = "Intake Registered";
                overallBadgeDisplay.className = "badge badge-warning";
            } else {
                overallBadgeDisplay.textContent = record.business_class || "Scanned";
                overallBadgeDisplay.className = "badge badge-success";
            }
        }

        const businessClassDisplay = document.getElementById('business-class-display');
        if (businessClassDisplay) {
            businessClassDisplay.textContent = record.business_class || 'Awaiting Scan...';
        }
        
        const classConfidenceVal = document.getElementById('class-confidence-val');
        const confidence = record.business_class_confidence ? `${Math.round(record.business_class_confidence)}%` : '0%';
        if (classConfidenceVal) classConfidenceVal.textContent = confidence;
        const classConfidenceFill = document.getElementById('class-confidence-fill');
        if (classConfidenceFill) classConfidenceFill.style.width = confidence;

        const stages = [
            { id: 'awareness', val: record.awareness_score },
            { id: 'consideration', val: record.consideration_score },
            { id: 'decision', val: record.decision_score },
            { id: 'conversion', val: record.conversion_score },
            { id: 'retention', val: record.retention_score }
        ];
        
        stages.forEach(st => {
            const scoreEl = document.getElementById(`score-${st.id}`);
            const val = parseFloat(st.val || 0);
            if (scoreEl) scoreEl.textContent = val > 0 ? `${val.toFixed(1)} / 10` : '0.0 / 10';
            const barEl = document.getElementById(`bar-${st.id}`);
            if (barEl) barEl.style.width = val > 0 ? `${val * 10}%` : '0%';
        });

        const weakestStageDisplay = document.getElementById('weakest-stage-display');
        if (weakestStageDisplay) {
            weakestStageDisplay.textContent = record.weakest_stage || 'None';
            weakestStageDisplay.className = "value-display " + (score === 0 ? "text-meta" : "text-warning");
        }
        const weakestStageDesc = document.getElementById('weakest-stage-desc');
        if (weakestStageDesc) {
            weakestStageDesc.textContent = score === 0 
                ? "Connect your social platforms using Option 1 or Option 2 in the gateway to start diagnostic auditing."
                : `Weakest stage identified as ${record.weakest_stage || 'none'}.`;
        }

        if (window.UIRenderer) {
            window.UIRenderer.updateClassificationBreakdown(record.business_class || 'Content Creator');
            window.UIRenderer.updateWeakestStageBreakdown(record.weakest_stage || 'Awareness');
            window.UIRenderer.updateOverallScoreBreakdown(score);
            if (window.UIRenderer.renderLeaksAndSolutions) {
                window.UIRenderer.renderLeaksAndSolutions(record);
            }
        }
    }

    // Attach to DashboardApp namespace for access in dashboard-auth.js
    app.renderAuditHistory = renderAuditHistory;
    app.updateDashboardWithRealData = updateDashboardWithRealData;
});
