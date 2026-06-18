/**
 * index.js - Landing Page Interactive Logic & Supabase Client Authentication
 */

// Initialize Starfield background
if (window.initStarField) {
    window.initStarField('starfield-canvas');
}

// Supabase Client-Side Auth and Client Retention Integration
const supabaseUrl = 'https://wraqaqyqqeswufbarhcz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndyYXFhcXlxcWVzd3VmYmFyaGN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzNDYxNTcsImV4cCI6MjA4ODkyMjE1N30.8MME9AjR7jupsIkaUvFAuz3VFMiYRXvhNDyk8d4DDLY';

// Initialize Supabase Client
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

document.addEventListener('DOMContentLoaded', () => {
    // Modal Toggles
    const modal = document.getElementById('login-modal');
    const trigger = document.getElementById('navbar-login-trigger');
    const closeBtn = document.getElementById('close-modal-btn');
    
    if (trigger && modal) {
        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            modal.classList.add('open');
        });
    }
    if (closeBtn && modal) {
        closeBtn.addEventListener('click', () => {
            modal.classList.remove('open');
        });
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('open');
        });
    }

    // Intake Form Submission
    const intakeForm = document.getElementById('intake-form');
    const intakeSubmitBtn = document.getElementById('intake-submit-btn');
    
    if (intakeForm) {
        intakeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const url = document.getElementById('intake-url').value.trim();
            const brand = document.getElementById('intake-brand').value.trim();
            const keyword = document.getElementById('intake-keyword').value.trim();
            const email = document.getElementById('intake-email').value.trim();
            const password = document.getElementById('intake-password').value;
            const errorMsg = document.getElementById('intake-error-msg');
            
            if (errorMsg) errorMsg.style.display = 'none';
            intakeSubmitBtn.disabled = true;
            intakeSubmitBtn.textContent = 'Creating Account...';
            
            const clientToken = 'MMM-CLIENT-' + Math.random().toString(36).substring(2, 10).toUpperCase();
            const assessmentId = crypto.randomUUID ? crypto.randomUUID() : 'c' + Math.random().toString(36).substring(2, 15);
            
            try {
                // Check if session exists first (user already logged in)
                const { data: sessionData } = await supabaseClient.auth.getSession();
                let activeUser = sessionData.session ? sessionData.session.user : null;
                
                if (!activeUser) {
                    // User is not logged in, attempt registration
                    const { data: authData, error: authError } = await supabaseClient.auth.signUp({
                        email: email,
                        password: password
                    });
                    
                    if (authError) {
                        // If already registered, suggest using login
                        if (authError.message.includes('already registered') || authError.status === 400) {
                            throw new Error('This email address is already registered. Please use Console Login.');
                        }
                        throw authError;
                    }
                    activeUser = authData.user;
                }

                // Create the assessment record in the DB
                const payload = {
                    assessment_id: assessmentId,
                    business_url: url,
                    brand_name: brand,
                    business_class: 'Pending Scrape',
                    business_class_confidence: 0,
                    source_channel: 'saas_funnel',
                    assessment_detail: {
                        user_email: email,
                        targetKeywords: [keyword],
                        client_token: clientToken,
                        status: 'intake_registered'
                    },
                    overall_score: 0,
                    awareness_score: 0,
                    consideration_score: 0,
                    decision_score: 0,
                    conversion_score: 0,
                    retention_score: 0,
                    weakest_stage: 'Pending',
                    strongest_stage: 'Pending'
                };

                const response = await fetch(supabaseUrl + '/rest/v1/revenue_journey_assessments', {
                    method: 'POST',
                    headers: {
                        'apikey': supabaseKey,
                        'Authorization': 'Bearer ' + supabaseKey,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify(payload)
                });
                
                if (!response.ok) {
                    const errBody = await response.json().catch(() => ({}));
                    throw new Error('Database insertion failed: ' + (errBody.message || response.statusText));
                }
                
                intakeSubmitBtn.textContent = 'Redirecting to Gateway...';
                sessionStorage.setItem('auth_completed', 'true');
                
                setTimeout(() => {
                    window.location.href = 'gateway.html?token=' + clientToken;
                }, 1000);
                
            } catch (err) {
                console.error('Registration failed:', err);
                intakeSubmitBtn.disabled = false;
                intakeSubmitBtn.textContent = 'Prequalify Website Journey';
                if (errorMsg) {
                    errorMsg.textContent = err.message || 'Failed to register account. Please try again.';
                    errorMsg.style.display = 'block';
                }
            }
        });
    }

    // Login Form Submission
    const loginForm = document.getElementById('console-login-form');
    const loginSubmitBtn = document.getElementById('login-submit-btn');
    const loginError = document.getElementById('login-modal-error');
    
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const identifier = document.getElementById('login-identifier').value.trim();
            const password = document.getElementById('console-login-password').value;
            if (loginError) loginError.style.display = 'none';
            
            loginSubmitBtn.disabled = true;
            loginSubmitBtn.textContent = 'Searching...';
            
            try {
                let clientToken = '';
                let userEmail = '';
                
                if (identifier.startsWith('MMM-')) {
                    if (identifier.startsWith('MMM-CONSULT-') || identifier.startsWith('MMM-ACTOR-')) {
                        // Consultant/actor bypass token
                        sessionStorage.setItem('auth_completed', 'true');
                        loginSubmitBtn.textContent = 'Access Granted!';
                        setTimeout(() => {
                            window.location.href = 'dashboard.html?token=' + identifier;
                        }, 800);
                        return;
                    } else {
                        // Client Token login
                        const queryUrl = supabaseUrl + '/rest/v1/revenue_journey_assessments?assessment_detail->>client_token=eq.' + encodeURIComponent(identifier) + '&select=assessment_detail';
                        const res = await fetch(queryUrl, {
                            method: 'GET',
                            headers: {
                                'apikey': supabaseKey,
                                'Authorization': 'Bearer ' + supabaseKey
                            }
                        });
                        if (!res.ok) throw new Error('Token verification failed.');
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
                    
                    loginSubmitBtn.textContent = 'Authenticating...';
                    const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
                        email: userEmail,
                        password: password
                    });
                    
                    if (authError) throw authError;
                    
                    // If we didn't have clientToken, query it from the DB
                    if (!clientToken) {
                        const queryUrl = supabaseUrl + '/rest/v1/revenue_journey_assessments?assessment_detail->>user_email=eq.' + encodeURIComponent(userEmail) + '&select=assessment_detail';
                        const res = await fetch(queryUrl, {
                            method: 'GET',
                            headers: {
                                'apikey': supabaseKey,
                                'Authorization': 'Bearer ' + supabaseKey
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
                
                loginSubmitBtn.textContent = 'Success!';
                sessionStorage.setItem('auth_completed', 'true');
                
                setTimeout(() => {
                    window.location.href = 'dashboard.html?token=' + (clientToken || 'MMM-CLIENT-DEFAULT');
                }, 1000);
                
            } catch (err) {
                console.error('Login failed:', err);
                loginSubmitBtn.disabled = false;
                loginSubmitBtn.textContent = 'Access Dashboard';
                if (loginError) {
                    loginError.textContent = err.message || 'Invalid email or password.';
                    loginError.style.display = 'block';
                }
            }
        });
    }
});
