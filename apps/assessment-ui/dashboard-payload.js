/**
 * @file dashboard-payload.js
 * @description Compiles targets, keywords, and active platform sessions from the UI into a valid Apify Actor payload and triggers a download.
 */
document.addEventListener('DOMContentLoaded', () => {
    const app = window.DashboardApp;
    if (!app) return;

    const downloadPayloadBtn = document.getElementById('download-payload-btn');
    if (downloadPayloadBtn) {
        downloadPayloadBtn.addEventListener('click', () => {
            const targetUrl = document.getElementById('target-url').value.trim();
            const keywords = [];
            document.querySelectorAll('#keyword-tags-container .keyword-tag').forEach(tag => {
                const val = tag.getAttribute('data-val') || tag.textContent.replace('×', '').trim();
                if (val) keywords.push(val);
            });
            
            let connected = [];
            try {
                const saved = sessionStorage.getItem('connected_platforms');
                if (saved) connected = JSON.parse(saved);
            } catch (e) {
                console.error(e);
            }
            
            const urls = [];
            connected.forEach(platform => {
                let platformUrl = '';
                if (platform === 'linkedin') platformUrl = 'https://www.linkedin.com/company/alabrida';
                else if (platform === 'facebook') platformUrl = 'https://www.facebook.com/alabrida';
                else if (platform === 'instagram') platformUrl = 'https://www.instagram.com/alabrida';
                else if (platform === 'twitter') platformUrl = 'https://twitter.com/alabrida';
                else if (platform === 'youtube') platformUrl = 'https://www.youtube.com/@alabrida';
                else if (platform === 'tiktok') platformUrl = 'https://www.tiktok.com/@alabrida';
                else if (platform === 'pinterest') platformUrl = 'https://www.pinterest.com/alabrida';
                else if (platform === 'reddit') platformUrl = 'https://www.reddit.com/r/alabrida';
                
                if (platformUrl) {
                    urls.push({ platform, url: platformUrl });
                }
            });
            
            const inputPayload = {
                urls: urls,
                interactiveSessionSetup: false,
                authTokens: {
                    linkedin: "li_at=PLACEHOLDER_LI_AT; JSESSIONID=PLACEHOLDER_JSESSIONID;",
                    facebook: "c_user=PLACEHOLDER_C_USER; xs=PLACEHOLDER_XS;",
                    instagram: "ds_user_id=PLACEHOLDER_DS_USER_ID; sessionid=PLACEHOLDER_SESSIONID;",
                    twitter: "auth_token=PLACEHOLDER_AUTH_TOKEN;"
                },
                businessUrl: targetUrl,
                serpApiKey: "PLACEHOLDER_SERP_API_KEY",
                targetKeywords: keywords,
                actorMode: "INTERNAL",
                supabaseUrl: app.supabaseUrl,
                supabaseServiceRoleKey: "PLACEHOLDER_SUPABASE_SERVICE_ROLE_KEY",
                maxConcurrency: 5,
                takeScreenshots: true
            };
            
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(inputPayload, null, 2));
            const downloadAnchor = document.createElement('a');
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", "apify_actor_input.json");
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
            
            app.showToast("Apify Scraper input payload downloaded!");
        });
    }
});
