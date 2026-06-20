document.addEventListener('DOMContentLoaded', () => {
    const $ = id => document.getElementById(id);
    const supabaseUrl = 'https://wraqaqyqqeswufbarhcz.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndyYXFhcXlxcWVzd3VmYmFyaGN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzNDYxNTcsImV4cCI6MjA4ODkyMjE1N30.8MME9AjR7jupsIkaUvFAuz3VFMiYRXvhNDyk8d4DDLY';
    const supabaseClient = window.supabase ? window.supabase.createClient(supabaseUrl, supabaseKey) : null;
    const generateAuditBtn = $('generate-audit');

    const state = window.AuthGateState;
    const ui = window.AuthGateUI;
    const platformsMetadata = window.AuthGateData ? window.AuthGateData.platformsMetadata : {};

    if (!state || !state.token) {
        setTimeout(() => {
            if (ui) ui.showToast("Invalid Access Token. Please check your email.");
            const subtitle = document.querySelector('.gate-subtitle');
            if (subtitle) {
                subtitle.innerHTML = `<span style="color: var(--color-error); font-weight: bold;">⚠️ Access Restricted:</span> Please use the unique link sent via email to configure credentials.`;
            }
        }, 300);
    }

    const sleep = ms => new Promise(r => state.vncTimeouts.push(setTimeout(r, ms)));

    window.handleInteractiveLogin = async function(event) {
        event.preventDefault();
        const loginUsername = $('login-username');
        const loginPassword = $('login-password');
        const username = loginUsername.value.trim();
        const password = loginPassword.value;
        const meta = platformsMetadata[state.currentPlatform];
        
        $('login-form-view').style.display = 'none';
        $('login-progress-view').style.display = 'block';
        $('console-output').innerHTML = '';
        
        ui.appendTerminalLine(`[System] Spawning isolated Playwright context for ${meta.name}...`, 'info');
        
        if (!meta.requiresAuth) {
            ui.appendTerminalLine(`[System] Registering public target link for ${meta.name}...`, 'info');
            await sleep(400);
            ui.appendTerminalLine(`[System] Target URL/Username: ${username}`, 'info');
            await sleep(400);
            ui.appendTerminalLine(`[Validation] Checking link structure and reachability...`, 'info');
            
            try {
                const res = await fetch('/api/audit/preflight', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: username })
                });
                if (!res.ok) throw new Error('Unreachable or invalid format.');
                
                await sleep(500);
                ui.appendTerminalLine(`[Success] Target validated! Added to audit queue.`, 'success');
                await sleep(400);
                
                $('login-progress-view').style.display = 'none';
                $('login-success-view').style.display = 'block';
                $('success-message').textContent = `Target profile connected successfully: ${username}`;
                
                state.connectedPlatforms.set(state.currentPlatform, { type: 'public', username: username });
                ui.connectPlatformUI(state.currentPlatform, username);
                await sleep(1200);
                ui.hideModal();
            } catch (err) {
                ui.appendTerminalLine(`[Error] Validation failed: ${err.message}`, 'error');
                await sleep(2000);
                $('login-form-view').style.display = 'block';
                $('login-progress-view').style.display = 'none';
            }
            return;
        }

        ui.appendTerminalLine(`[Proxy] Routing browser context traffic through US Residential Proxy...`, 'info');
        await sleep(300);
        ui.appendTerminalLine(`[Playwright] Spawning clean Chromium context (stealth fingerprints active)...`, 'info');
        await sleep(300);
        ui.appendTerminalLine(`[Playwright] Navigating context to login page: ${meta.loginUrl}...`, 'info');
        await sleep(300);
        ui.appendTerminalLine(`[Playwright] Inputting credentials for user: ${username}...`, 'info');
        
        try {
            const res = await fetch('/api/auth/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    platform: state.currentPlatform,
                    username: username,
                    password: password,
                    token: state.token
                })
            });
            const data = await res.json();
            
            if (data.logs && Array.isArray(data.logs)) {
                for (const l of data.logs) {
                    await sleep(200);
                    ui.appendTerminalLine(l.text, l.type);
                }
            }
            
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Authentication failed.');
            }
            
            await sleep(500);
            $('login-progress-view').style.display = 'none';
            $('login-success-view').style.display = 'block';
            $('success-message').textContent = `Account login completed successfully for ${username}.`;
            
            state.connectedPlatforms.set(state.currentPlatform, {
                type: 'login',
                username: username,
                password: password,
                cookies: data.cookies || null
            });
            ui.connectPlatformUI(state.currentPlatform, `@${username.split('@')[0]}`);
            await sleep(1500);
            ui.hideModal();
        } catch (err) {
            ui.appendTerminalLine(`[Error] ${err.message}`, 'error');
            await sleep(2000);
            $('login-form-view').style.display = 'block';
            $('login-progress-view').style.display = 'none';
        }
    };

    window.handleManualCookie = function(event) {
        event.preventDefault();
        const inputs = $('cookie-fields-container').querySelectorAll('.cookie-input');
        const cookies = {};
        let isValid = true;
        inputs.forEach(input => {
            const val = input.value.trim();
            if (!val) isValid = false;
            cookies[input.getAttribute('data-cookie')] = val;
        });
        if (!isValid) return alert('Please fill out all cookie fields.');

        state.connectedPlatforms.set(state.currentPlatform, { type: 'cookie', cookies: cookies });
        ui.connectPlatformUI(state.currentPlatform, 'Session Cookies Injected');
        ui.hideModal();
    };

    if (generateAuditBtn) {
        generateAuditBtn.addEventListener('click', async () => {
            const platformsArray = Array.from(state.connectedPlatforms.keys());
            if (platformsArray.length === 0 || !state.token || !supabaseClient) return;

            generateAuditBtn.disabled = true;
            generateAuditBtn.textContent = "Initiating Diagnostic Scan...";

            try {
                const { data, error } = await supabaseClient
                    .from('revenue_journey_assessments')
                    .select('*')
                    .filter('assessment_detail->>client_token', 'eq', state.token);

                if (error) throw error;
                if (!data || data.length === 0) throw new Error("Assessment record not found.");

                const record = data[0];
                const authTokens = {};
                state.connectedPlatforms.forEach((val, key) => {
                    authTokens[key] = {
                        type: val.type,
                        username: val.username || null,
                        password: val.password || null,
                        cookies: val.cookies || null
                    };
                });

                const updatedDetail = {
                    ...(record.assessment_detail || {}),
                    authTokens: authTokens,
                    status: 'auth_submitted'
                };

                const { error: updateError } = await supabaseClient
                    .from('revenue_journey_assessments')
                    .update({
                        assessment_detail: updatedDetail,
                        overall_score: 0.0,
                        awareness_score: 0.0,
                        consideration_score: 0.0,
                        decision_score: 0.0,
                        conversion_score: 0.0,
                        retention_score: 0.0
                    })
                    .eq('assessment_id', record.assessment_id);

                if (updateError) throw updateError;

                const mainGate = document.querySelector('.gate-container');
                const initiatedView = document.getElementById('initiated-view');
                if (mainGate) mainGate.style.display = 'none';
                if (initiatedView) initiatedView.classList.add('show');

                ui.showToast("Diagnostic scan successfully started!");
            } catch (err) {
                console.error(err);
                ui.showToast(`Error: ${err.message || err}`);
                generateAuditBtn.disabled = false;
                generateAuditBtn.textContent = "Submit & Start Diagnostic Scan";
            }
        });
    }
});
