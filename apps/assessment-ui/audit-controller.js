(function() {
    function runAudit() {
        const startAuditBtn = document.getElementById('start-audit-btn');
        const auditSpinner = document.getElementById('audit-spinner');
        const executionConsole = document.getElementById('execution-console');
        const consoleLinesContainer = document.getElementById('console-lines-container');

        if (!startAuditBtn || !auditSpinner || !executionConsole || !consoleLinesContainer) return;

        startAuditBtn.disabled = true;
        auditSpinner.classList.remove('hidden');
        executionConsole.classList.remove('hidden');
        consoleLinesContainer.innerHTML = '';

        const mockLogs = window.MockData ? window.MockData.mockLogs : [];

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
            if (window.UIRenderer && window.UIRenderer.updateDashboardWithNewAudit) {
                window.UIRenderer.updateDashboardWithNewAudit();
            }
            
            if (window.Dashboard && window.Dashboard.showToast) {
                window.Dashboard.showToast("Audit run completed! Dashboard updated.");
            }
            
            if (window.Dashboard && window.Dashboard.closeSidebar) {
                window.Dashboard.closeSidebar();
            }
        }, 11500);
    }

    window.AuditController = {
        runAudit
    };
})();
