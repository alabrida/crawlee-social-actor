/**
 * @file dashboard-sidebar.js
 * @description Manages settings sidebar toggles, keyword managers, and Chrome Extension sync drawer triggers.
 */
document.addEventListener('DOMContentLoaded', () => {
    const app = window.DashboardApp;
    if (!app) return;

    const settingsSidebar = document.getElementById('settings-sidebar');
    const triggerBtn = document.getElementById('trigger-assessment-btn');
    const closeBtn = document.getElementById('close-sidebar-btn');
    const mobileTriggerBtn = document.getElementById('mobile-sidebar-btn');
    const sidebarBackdrop = document.querySelector('.sidebar-backdrop');

    if (triggerBtn) triggerBtn.addEventListener('click', app.openSidebar);
    if (mobileTriggerBtn) mobileTriggerBtn.addEventListener('click', app.openSidebar);
    if (closeBtn) closeBtn.addEventListener('click', app.closeSidebar);
    if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', app.closeSidebar);

    // Keyword tag management
    const keywordTagsContainer = document.getElementById('keyword-tags-container');
    const newKeywordInput = document.getElementById('new-keyword-input');
    const addKeywordBtn = document.getElementById('add-keyword-btn');

    if (keywordTagsContainer) {
        keywordTagsContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-tag-btn')) {
                const tag = e.target.closest('.keyword-tag');
                if (tag) tag.remove();
            }
        });
    }

    if (addKeywordBtn && newKeywordInput && keywordTagsContainer) {
        addKeywordBtn.addEventListener('click', () => {
            const kw = newKeywordInput.value.trim();
            if (kw) {
                const tag = document.createElement('span');
                tag.className = 'keyword-tag';
                tag.setAttribute('data-val', kw);
                tag.innerHTML = `${kw}<button class="remove-tag-btn" aria-label="Remove tag">&times;</button>`;
                keywordTagsContainer.appendChild(tag);
                newKeywordInput.value = '';
            }
        });
    }

    // Extension Drawer Event Handlers
    const evokeBtn = document.getElementById('evoke-extension-btn');
    const closeDrawerBtn = document.getElementById('close-drawer-btn');
    const drawerEl = document.getElementById('extension-sidebar-drawer');
    const syncNowBtn = document.getElementById('sync-now-btn');
    const syncCheckboxes = document.querySelectorAll('.sync-checkbox');

    if (evokeBtn && drawerEl) evokeBtn.addEventListener('click', () => { drawerEl.classList.add('open'); });
    if (closeDrawerBtn && drawerEl) closeDrawerBtn.addEventListener('click', () => { drawerEl.classList.remove('open'); });

    if (syncNowBtn && drawerEl) {
        syncNowBtn.addEventListener('click', () => {
            syncNowBtn.disabled = true;
            syncNowBtn.textContent = 'Syncing sessions...';

            setTimeout(() => {
                const checkedPlatforms = [];
                syncCheckboxes.forEach(cb => { if (cb.checked) checkedPlatforms.push(cb.getAttribute('data-platform')); });

                let existingPlatforms = [];
                try {
                    const saved = sessionStorage.getItem('connected_platforms');
                    if (saved) existingPlatforms = JSON.parse(saved);
                } catch (e) { console.error(e); }

                const mergedPlatforms = Array.from(new Set([...existingPlatforms, ...checkedPlatforms]));
                sessionStorage.setItem('connected_platforms', JSON.stringify(mergedPlatforms));

                mergedPlatforms.forEach(p => {
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

                syncNowBtn.disabled = false;
                syncNowBtn.textContent = 'Sync Checked Sessions';
                drawerEl.classList.remove('open');

                app.showToast(`Synced ${checkedPlatforms.length} session(s) via Chrome extension!`);
            }, 1500);
        });
    }
});
