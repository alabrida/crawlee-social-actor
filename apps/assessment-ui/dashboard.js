/**
 * @file dashboard.js
 * @description Central coordinator for the Revenue Journey Diagnostics Dashboard.
 * Initializes the global state immediately, and sets up main event handlers on DOMContentLoaded.
 */

// Initialize Global App State Namespace immediately at script-load time
window.DashboardApp = {
    supabaseUrl: 'https://wraqaqyqqeswufbarhcz.supabase.co',
    supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndyYXFhcXlxcWVzd3VmYmFyaGN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzNDYxNTcsImV4cCI6MjA4ODkyMjE1N30.8MME9AjR7jupsIkaUvFAuz3VFMiYRXvhNDyk8d4DDLY',
    urlParams: new URLSearchParams(window.location.search),
    token: new URLSearchParams(window.location.search).get('token'),
    supabaseClient: null,
    
    // Toast Notification helper
    showToast: function(message) {
        const toast = document.getElementById('toast-notification');
        const toastMessage = document.getElementById('toast-message');
        if (toast && toastMessage) {
            toastMessage.textContent = message;
            toast.classList.add('show');
            setTimeout(() => { toast.classList.remove('show'); }, 3000);
        }
    },
    
    // Sidebar Toggles
    openSidebar: function() {
        const sidebar = document.getElementById('settings-sidebar');
        if (sidebar) sidebar.classList.add('open');
    },
    closeSidebar: function() {
        const sidebar = document.getElementById('settings-sidebar');
        if (sidebar) sidebar.classList.remove('open');
    }
};

// Initialize Supabase Client immediately
window.DashboardApp.supabaseClient = window.supabase.createClient(
    window.DashboardApp.supabaseUrl, 
    window.DashboardApp.supabaseKey
);

document.addEventListener('DOMContentLoaded', () => {
    const startAuditBtn = document.getElementById('start-audit-btn');

    // Audit Simulation Click Handler
    if (startAuditBtn) {
        startAuditBtn.addEventListener('click', () => {
            if (window.AuditController && window.AuditController.runAudit) {
                window.AuditController.runAudit();
            }
        });
    }

    // Set connected platforms from sessionStorage in sidebar on load
    const savedPlatformsStr = sessionStorage.getItem('connected_platforms');
    if (savedPlatformsStr) {
        try {
            const savedPlatforms = JSON.parse(savedPlatformsStr);
            savedPlatforms.forEach(p => {
                const oauthItem = document.getElementById(`oauth-${p}`);
                if (oauthItem) {
                    const sEl = oauthItem.querySelector('.oauth-status');
                    if (sEl) {
                        sEl.setAttribute('data-connected', 'true');
                        sEl.textContent = `Connected (Active Session)`;
                        sEl.className = 'oauth-status text-success';
                    }
                }
            });
        } catch (e) {
            console.error("Error parsing connected platforms", e);
        }
    }

    // Initialize UI Elements
    if (window.GlowCards && window.GlowCards.init) window.GlowCards.init();
    if (window.initStarField) window.initStarField('starfield-canvas');
    if (window.PreflightController && window.PreflightController.init) window.PreflightController.init();
    if (window.UIRenderer && window.UIRenderer.updateDashboardWithNewAudit) {
        window.UIRenderer.updateDashboardWithNewAudit();
    }

    // Bind public API namespace
    window.Dashboard = {
        showToast: window.DashboardApp.showToast,
        closeSidebar: window.DashboardApp.closeSidebar
    };
});
