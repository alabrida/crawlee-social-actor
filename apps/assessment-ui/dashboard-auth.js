/**
 * @file dashboard-auth.js
 * @description Handles session validation, token gating logic, and lockscreen verification via Supabase Auth.
 */
document.addEventListener('DOMContentLoaded', () => {
    const app = window.DashboardApp;
    if (!app) return;

    const supabaseUrl = app.supabaseUrl;
    const supabaseKey = app.supabaseKey;
    const supabaseClient = app.supabaseClient;
    const token = app.token;

    // Session Verification & Auth gating checks
    async function checkAuthAndInit() {
        const { data: { session } } = await supabaseClient.auth.getSession();
        
        const isBypassToken = token && (
            token.startsWith('MMM-CONSULT-') || 
            token.startsWith('MMM-ACTOR-')
        );
        
        const isUserAuthenticated = !!session;
        const authCompleted = sessionStorage.getItem('auth_completed') === 'true' || isBypassToken || isUserAuthenticated;

        if (isBypassToken) {
            sessionStorage.setItem('auth_completed', 'true');
        }

        const appContainer = document.querySelector('.app-container');
        const lockscreen = document.getElementById('lockscreen-gate');

        if (!authCompleted) {
            if (appContainer) appContainer.style.display = 'none';
            if (lockscreen) lockscreen.style.display = 'flex';
            setupLockscreenForm();
            return;
        } else {
            if (appContainer) appContainer.style.display = 'flex';
            if (lockscreen) lockscreen.style.display = 'none';
            
            // Logout button
            const logoutBtn = document.getElementById('logout-btn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', async () => {
                    await supabaseClient.auth.signOut();
                    sessionStorage.removeItem('auth_completed');
                    sessionStorage.removeItem('connected_platforms');
                    window.location.href = 'index.html';
                });
            }

            // Load data
            await loadClientData(session);
        }
    }

    async function loadClientData(session) {
        let activeToken = token;
        let userEmail = session ? session.user.email : null;
        
        let clientRecord = null;
        if (activeToken && activeToken.startsWith('MMM-CLIENT-')) {
            try {
                const queryUrl = `${supabaseUrl}/rest/v1/revenue_journey_assessments?assessment_detail->>client_token=eq.${encodeURIComponent(activeToken)}`;
                const response = await fetch(queryUrl, {
                    method: 'GET',
                    headers: {
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${supabaseKey}`
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.length > 0) {
                        clientRecord = data[0];
                        if (clientRecord.assessment_detail && clientRecord.assessment_detail.user_email) {
                            userEmail = clientRecord.assessment_detail.user_email;
                        }
                    }
                }
            } catch (e) {
                console.error('Failed to load client data by token:', e);
            }
        } else if (userEmail) {
            try {
                const queryUrl = `${supabaseUrl}/rest/v1/revenue_journey_assessments?assessment_detail->>user_email=eq.${encodeURIComponent(userEmail)}&order=assessment_date.desc&limit=1`;
                const response = await fetch(queryUrl, {
                    method: 'GET',
                    headers: {
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${supabaseKey}`
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.length > 0) {
                        clientRecord = data[0];
                        if (clientRecord.assessment_detail && clientRecord.assessment_detail.client_token) {
                            activeToken = clientRecord.assessment_detail.client_token;
                        }
                    }
                }
            } catch (e) {
                console.error('Failed to load client data by email:', e);
            }
        }
        
        if (clientRecord && app.updateDashboardWithRealData) {
            app.updateDashboardWithRealData(clientRecord);
        }

        // Load history if email is present
        if (userEmail) {
            try {
                const queryUrl = `${supabaseUrl}/rest/v1/revenue_journey_assessments?assessment_detail->>user_email=eq.${encodeURIComponent(userEmail)}&order=assessment_date.desc`;
                const response = await fetch(queryUrl, {
                    method: 'GET',
                    headers: {
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${supabaseKey}`
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (app.renderAuditHistory) {
                        app.renderAuditHistory(data);
                    }
                }
            } catch (historyErr) {
                console.error('Failed to load audit history:', historyErr);
            }
        }
    }

    function setupLockscreenForm() {
        const form = document.getElementById('lockscreen-form');
        const submitBtn = document.getElementById('lockscreen-submit-btn');
        const errorMsg = document.getElementById('lockscreen-error-msg');
        
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const identifier = document.getElementById('token-input').value.trim();
                const password = document.getElementById('lockscreen-password-input').value;
                
                if (errorMsg) errorMsg.style.display = 'none';
                submitBtn.disabled = true;
                submitBtn.textContent = 'Verifying...';
                
                try {
                    let clientToken = '';
                    let userEmail = '';
                    
                    if (identifier.startsWith('MMM-')) {
                        if (identifier.startsWith('MMM-CONSULT-') || identifier.startsWith('MMM-ACTOR-')) {
                            // Bypass Consultant/Actor tokens
                            sessionStorage.setItem('auth_completed', 'true');
                            window.location.href = `?token=${identifier}`;
                            return;
                        } else {
                            // Client Token secure lookup
                            const queryUrl = `${supabaseUrl}/rest/v1/revenue_journey_assessments?assessment_detail->>client_token=eq.${encodeURIComponent(identifier)}&select=assessment_detail`;
                            const res = await fetch(queryUrl, {
                                headers: {
                                    'apikey': supabaseKey,
                                    'Authorization': `Bearer ${supabaseKey}`
                                }
                            });
                            if (!res.ok) throw new Error('Database query failed');
                            const resData = await res.json();
                            if (resData.length === 0) throw new Error('Invalid client access token.');
                            userEmail = resData[0].assessment_detail.user_email;
                            clientToken = identifier;
                        }
                    } else {
                        userEmail = identifier;
                    }
                    
                    if (userEmail) {
                        if (!password) {
                            throw new Error('Password is required for secure account access.');
                        }
                        
                        submitBtn.textContent = 'Authenticating...';
                        const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
                            email: userEmail,
                            password: password
                        });
                        
                        if (authError) throw authError;
                        
                        // If we didn't have clientToken, query it from the DB
                        if (!clientToken) {
                            const queryUrl = `${supabaseUrl}/rest/v1/revenue_journey_assessments?assessment_detail->>user_email=eq.${encodeURIComponent(userEmail)}&select=assessment_detail`;
                            const res = await fetch(queryUrl, {
                                headers: {
                                    'apikey': supabaseKey,
                                    'Authorization': `Bearer ${supabaseKey}`
                                }
                            });
                            if (res.ok) {
                                const resData = await res.json();
                                if (resData.length > 0) {
                                    clientToken = resData[0].assessment_detail.client_token;
                                }
                            }
                        }
                    }
                    
                    sessionStorage.setItem('auth_completed', 'true');
                    window.location.href = `?token=${clientToken || 'MMM-CLIENT-DEFAULT'}`;
                    
                } catch (err) {
                    console.error('Lockscreen unlock failed:', err);
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Verify & Unlock';
                    if (errorMsg) {
                        errorMsg.textContent = err.message || 'Invalid token or email/password.';
                        errorMsg.style.display = 'block';
                    }
                }
            });
        }
    }

    // Run Auth Verification check
    checkAuthAndInit();
});
