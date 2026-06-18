(function() {
    const platformsMetadata = {
        google: {
            name: "Google Business",
            favicon: "G",
            requiresAuth: false,
            publicLabel: "Google Maps Business Name or Link",
            publicPlaceholder: "e.g., Milo's Hamburgers Birmingham or https://maps.google.com/?cid=...",
            publicInstructions: "Search for your business on Google Maps, click Share, copy the link, and paste it here. Or type the exact registered business name and city."
        },
        linkedin: {
            name: "LinkedIn",
            favicon: "in",
            requiresAuth: true,
            loginUrl: "https://www.linkedin.com/login",
            usernameLabel: "Email or Phone Number",
            usernamePlaceholder: "you@example.com",
            cookies: [
                { name: "li_at", label: "li_at (Session Token)", placeholder: "AQEDASz..." },
                { name: "JSESSIONID", label: "JSESSIONID (CSRF Token)", placeholder: "ajax:824..." }
            ],
            instructions: [
                "Open a browser tab to <strong>linkedin.com</strong> and ensure you are logged in.",
                "Open browser Developer Tools (F12 or right-click -> Inspect).",
                "Navigate to the <strong>Application</strong> (or Storage) tab.",
                "In the left pane, expand <strong>Cookies</strong> and select <code>https://www.linkedin.com</code>.",
                "Locate the <strong>li_at</strong> and <strong>JSESSIONID</strong> keys, copy their values, and paste them here."
            ]
        },
        facebook: {
            name: "Facebook",
            favicon: "f",
            requiresAuth: true,
            loginUrl: "https://www.facebook.com/login",
            usernameLabel: "Email or Phone Number",
            usernamePlaceholder: "you@example.com",
            cookies: [
                { name: "c_user", label: "c_user (User ID)", placeholder: "1000854..." },
                { name: "xs", label: "xs (Session Cookie)", placeholder: "46%3Aabcd..." }
            ],
            instructions: [
                "Open a browser tab to <strong>facebook.com</strong> and ensure you are logged in.",
                "Open browser Developer Tools (F12 or right-click -> Inspect).",
                "Navigate to the <strong>Application</strong> (or Storage) tab.",
                "In the left pane, expand <strong>Cookies</strong> and select <code>https://www.facebook.com</code>.",
                "Locate the <strong>c_user</strong> and <strong>xs</strong> keys, copy their values, and paste them here."
            ]
        },
        instagram: {
            name: "Instagram",
            favicon: "📸",
            requiresAuth: true,
            loginUrl: "https://www.instagram.com/accounts/login/",
            usernameLabel: "Phone number, username, or email",
            usernamePlaceholder: "username_or_email",
            cookies: [
                { name: "ds_user_id", label: "ds_user_id (User ID)", placeholder: "532387..." },
                { name: "sessionid", label: "sessionid (Session ID)", placeholder: "532387%3Asf..." }
            ],
            instructions: [
                "Open a browser tab to <strong>instagram.com</strong> and ensure you are logged in.",
                "Open browser Developer Tools (F12 or right-click -> Inspect).",
                "Navigate to the <strong>Application</strong> (or Storage) tab.",
                "In the left pane, expand <strong>Cookies</strong> and select <code>https://www.instagram.com</code>.",
                "Locate the <strong>ds_user_id</strong> and <strong>sessionid</strong> keys, copy their values, and paste them here."
            ]
        },
        youtube: {
            name: "YouTube",
            favicon: "YT",
            requiresAuth: false,
            publicLabel: "YouTube Channel Link or @Handle",
            publicPlaceholder: "e.g., https://youtube.com/@mychannel or @mychannel",
            publicInstructions: "Navigate to your YouTube Channel main page, copy the URL from your address bar, and paste it here."
        },
        tiktok: {
            name: "TikTok",
            favicon: "🎵",
            requiresAuth: false,
            publicLabel: "TikTok Profile Link or @Username",
            publicPlaceholder: "e.g., https://tiktok.com/@myprofile or @myprofile",
            publicInstructions: "Open your TikTok profile in a browser, copy the URL from the address bar, and paste it here."
        },
        twitter: {
            name: "Twitter / X",
            favicon: "𝕏",
            requiresAuth: true,
            loginUrl: "https://x.com/i/flow/login",
            usernameLabel: "Phone, email, or username",
            usernamePlaceholder: "x_handle",
            cookies: [
                { name: "auth_token", label: "auth_token (Session Token)", placeholder: "af2843efc..." }
            ],
            instructions: [
                "Open a browser tab to <strong>x.com</strong> and ensure you are logged in.",
                "Open browser Developer Tools (F12 or right-click -> Inspect).",
                "Navigate to the <strong>Application</strong> (or Storage) tab.",
                "In the left pane, expand <strong>Cookies</strong> and select <code>https://x.com</code>.",
                "Locate the <strong>auth_token</strong> key, copy its value, and paste it here."
            ]
        },
        pinterest: {
            name: "Pinterest",
            favicon: "P",
            requiresAuth: false,
            publicLabel: "Pinterest Profile Link or Username",
            publicPlaceholder: "e.g., https://pinterest.com/myusername or myusername",
            publicInstructions: "Navigate to your Pinterest profile, copy the URL from the address bar, and paste it here."
        },
        reddit: {
            name: "Reddit",
            favicon: "R",
            requiresAuth: false,
            publicLabel: "Reddit Profile Link, Subreddit, or Username",
            publicPlaceholder: "e.g., https://reddit.com/user/myusername or u/myusername",
            publicInstructions: "Open your Reddit profile page in a browser, copy the URL, and paste it here."
        }
    };

    const getInteractiveSteps = function(platformName, loginUrl, username) {
        return [
            { text: `[Proxy] Routing browser context traffic through US Residential Proxy...`, type: 'info', delay: 400 },
            { text: `[Playwright] Spawning clean Chromium context (stealth fingerprints active)...`, type: 'info', delay: 400 },
            { text: `[Playwright] Navigating context to login page: ${loginUrl}...`, type: 'info', delay: 500 },
            { text: `[Playwright] Inputting credentials for user: ${username}...`, type: 'info', delay: 500 },
            { text: `[System] Awaiting security/2FA checks from active session...`, type: 'warn', delay: 600 },
            { text: `[SessionVault] Intercepted authentication state successfully!`, type: 'success', delay: 600 },
            { text: `[Health Check] Running pre-flight request with captured storageState...`, type: 'info', delay: 400 },
            { text: `[Health Check] GET validation request -> Status 200 OK (Auth Valid)`, type: 'success', delay: 400 },
            { text: `[SessionVault] Saving credentials for ${platformName} to local database...`, type: 'info', delay: 400 }
        ];
    };

    const renderCookieForm = function(container, instructionsContainer, meta) {
        container.innerHTML = '';
        meta.cookies.forEach(c => {
            const group = document.createElement('div');
            group.className = 'form-group';
            group.innerHTML = `
                <label class="form-label" for="cookie-${c.name}">${c.label}</label>
                <input type="text" class="form-input cookie-input" id="cookie-${c.name}" data-cookie="${c.name}" placeholder="${c.placeholder}" required>
            `;
            container.appendChild(group);
        });

        instructionsContainer.innerHTML = '';
        meta.instructions.forEach(ins => {
            const li = document.createElement('li');
            li.innerHTML = ins;
            instructionsContainer.appendChild(li);
        });
    };

    const simulateTerminalLogs = async function(meta, username, appendFn, sleepFn) {
        appendFn(`[System] Spawning isolated Playwright context for ${meta.name}...`, 'info');
        const steps = getInteractiveSteps(meta.name, meta.loginUrl, username);
        for (const s of steps) {
            await sleepFn(s.delay);
            appendFn(s.text, s.type);
        }
    };

    const simulatePublicLogs = async function(meta, username, appendFn, sleepFn) {
        appendFn(`[System] Registering public target link for ${meta.name}...`, 'info');
        await sleepFn(400); appendFn(`[System] Target URL/Username: ${username}`, 'info');
        await sleepFn(400); appendFn(`[Validation] Checking link structure and reachability...`, 'info');
        await sleepFn(500); appendFn(`[Success] Target validated! Added to audit queue.`, 'success');
    };

    window.AuthGateData = {
        platformsMetadata,
        getInteractiveSteps,
        renderCookieForm,
        simulateTerminalLogs,
        simulatePublicLogs
    };
})();
