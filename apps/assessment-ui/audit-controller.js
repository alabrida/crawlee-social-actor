(function() {
    function runAudit() {
        const startAuditBtn = document.getElementById('start-audit-btn');
        const auditSpinner = document.getElementById('audit-spinner');
        const executionConsole = document.getElementById('execution-console');
        const consoleLinesContainer = document.getElementById('console-lines-container');

        if (!startAuditBtn || !auditSpinner || !executionConsole || !consoleLinesContainer) return;

        const token = new URLSearchParams(window.location.search).get('token');
        const targetUrl = document.getElementById('target-url').value.trim();
        if (!token || !targetUrl) {
            alert('Access token and Target URL are required to execute audit.');
            return;
        }

        const keywordTags = document.querySelectorAll('#keyword-tags-container .keyword-tag');
        const keywords = Array.from(keywordTags).map(tag => tag.getAttribute('data-val') || tag.textContent.replace('×', '').trim());

        startAuditBtn.disabled = true;
        auditSpinner.classList.remove('hidden');
        executionConsole.classList.remove('hidden');
        consoleLinesContainer.innerHTML = '';

        const appendLog = (text, type = 'info') => {
            const line = document.createElement('div');
            line.className = `console-line ${type}`;
            line.textContent = text;
            consoleLinesContainer.appendChild(line);
            consoleLinesContainer.scrollTop = consoleLinesContainer.scrollHeight;
        };

        appendLog('[System] Initiating local scraper daemon run...', 'info');

        fetch('/api/audit/run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, targetUrl, keywords })
        })
        .then(res => res.json())
        .then(data => {
            if (!data.success) throw new Error(data.error || 'Failed to trigger scraper run');
            appendLog('[System] Scraper trigger registered. Opening log stream...', 'success');

            const logSource = new EventSource(`/api/audit/logs?token=${encodeURIComponent(token)}`);

            logSource.onmessage = function(event) {
                const logData = JSON.parse(event.data);
                if (logData.done) {
                    logSource.close();
                    appendLog('[System] Log stream closed. Finalizing dashboard data...', 'success');
                    finishAudit();
                } else if (logData.error) {
                    logSource.close();
                    appendLog(`[Error] Stream error: ${logData.error}`, 'error');
                    finishAudit();
                } else {
                    appendLog(logData.text, logData.type || 'info');
                }
            };

            logSource.onerror = function() {
                logSource.close();
                appendLog('[System] Connection to log stream terminated.', 'warn');
                finishAudit();
            };
        })
        .catch(err => {
            appendLog(`[Error] Scraper setup failed: ${err.message}`, 'error');
            startAuditBtn.disabled = false;
            auditSpinner.classList.add('hidden');
        });

        async function finishAudit() {
            startAuditBtn.disabled = false;
            auditSpinner.classList.add('hidden');
            
            try {
                const app = window.DashboardApp;
                if (app && app.supabaseClient && app.token) {
                    const { data, error } = await app.supabaseClient
                        .from('revenue_journey_assessments')
                        .select('*')
                        .filter('assessment_detail->>client_token', 'eq', app.token)
                        .order('assessment_date', { ascending: false });

                    if (!error && data && data.length > 0) {
                        const latestRecord = data[0];
                        if (app.updateDashboardWithRealData) {
                            app.updateDashboardWithRealData(latestRecord);
                        }
                    }
                }
            } catch (err) {
                console.error('Failed to load updated audit details:', err);
            }
            
            if (window.Dashboard && window.Dashboard.showToast) {
                window.Dashboard.showToast("Audit run completed! Dashboard updated.");
            }
            if (window.Dashboard && window.Dashboard.closeSidebar) {
                window.Dashboard.closeSidebar();
            }
        }
    }

    window.AuditController = {
        runAudit
    };
})();
