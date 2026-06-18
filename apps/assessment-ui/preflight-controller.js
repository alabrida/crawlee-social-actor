(function() {
    let selectedKeywords = window.MockData ? [...window.MockData.defaultKeywords] : [];

    function initPreflight() {
        const targetUrlInput = document.getElementById('target-url');
        const preflightBtn = document.getElementById('preflight-btn');
        const preflightStatus = document.getElementById('preflight-status');
        const preflightSuccessBlock = document.getElementById('preflight-success-info');
        const preflightClassVal = document.getElementById('preflight-detected-class');
        const preflightJsonLdVal = document.getElementById('preflight-jsonld-status');
        
        const keywordTagsContainer = document.getElementById('keyword-tags-container');
        const newKeywordInput = document.getElementById('new-keyword-input');
        const addKeywordBtn = document.getElementById('add-keyword-btn');

        if (!preflightBtn || !keywordTagsContainer) return;

        // Pre-flight Crawl Simulation
        preflightBtn.addEventListener('click', () => {
            const url = targetUrlInput.value.trim();
            if (!url) return;

            preflightStatus.classList.remove('hidden');
            preflightSuccessBlock.classList.add('hidden');
            preflightBtn.disabled = true;

            setTimeout(() => {
                preflightStatus.classList.add('hidden');
                preflightSuccessBlock.classList.remove('hidden');
                preflightBtn.disabled = false;

                if (url.includes('saas') || url.includes('app') || url.includes('software')) {
                    preflightClassVal.textContent = 'SaaS Platform';
                    preflightJsonLdVal.textContent = 'Found (SoftwareApplication)';
                    preflightJsonLdVal.className = 'val text-success';
                    updateSuggestedKeywords(['Subscription Billing', 'Cloud Analytics', 'SaaS App Dashboard']);
                } else if (url.includes('store') || url.includes('shop') || url.includes('ecommerce')) {
                    preflightClassVal.textContent = 'E-Commerce';
                    preflightJsonLdVal.textContent = 'Found (Store / Product)';
                    preflightJsonLdVal.className = 'val text-success';
                    updateSuggestedKeywords(['Free Shipping Checkout', 'Buy Online Store', 'Retail Goods Store']);
                } else if (url.includes('consult') || url.includes('agency') || url.includes('advisory')) {
                    preflightClassVal.textContent = 'Professional Services';
                    preflightJsonLdVal.textContent = 'Found (ProfessionalService)';
                    preflightJsonLdVal.className = 'val text-success';
                    updateSuggestedKeywords(['Business Consulting Firm', 'Strategy Advisory', 'Consultant Services']);
                } else if (url.includes('milos') || url.includes('burger') || url.includes('pizza') || url.includes('restaurant')) {
                    preflightClassVal.textContent = 'Local Business';
                    preflightJsonLdVal.textContent = 'Found (Restaurant)';
                    preflightJsonLdVal.className = 'val text-success';
                    updateSuggestedKeywords(["Milo's Original Burger Shop", "Birmingham Burgers", "Hamburgers in Alabama"]);
                } else {
                    preflightClassVal.textContent = 'Content Creator';
                    preflightJsonLdVal.textContent = 'None Found (Fallback)';
                    preflightJsonLdVal.className = 'val text-meta';
                    updateSuggestedKeywords(['Creator Portfolio', 'Blog Hub', 'Online Influencer Bio']);
                }
            }, 1500);
        });

        function updateSuggestedKeywords(keywordsList) {
            selectedKeywords = [...keywordsList];
            renderTags();
        }

        // Keyword Tag Management
        function renderTags() {
            keywordTagsContainer.innerHTML = '';
            selectedKeywords.forEach((keyword) => {
                const tag = document.createElement('span');
                tag.className = 'keyword-tag';
                tag.setAttribute('data-val', keyword);
                tag.innerHTML = `
                    ${keyword}
                    <button class="remove-tag-btn" aria-label="Remove tag">&times;</button>
                `;
                keywordTagsContainer.appendChild(tag);
            });
            attachTagEvents();
        }

        function attachTagEvents() {
            const removeButtons = keywordTagsContainer.querySelectorAll('.remove-tag-btn');
            removeButtons.forEach((btn) => {
                btn.addEventListener('click', (e) => {
                    const keywordVal = e.target.parentElement.getAttribute('data-val');
                    selectedKeywords = selectedKeywords.filter(k => k !== keywordVal);
                    renderTags();
                });
            });
        }

        if (addKeywordBtn && newKeywordInput) {
            addKeywordBtn.addEventListener('click', () => {
                const val = newKeywordInput.value.trim();
                if (val && !selectedKeywords.includes(val)) {
                    selectedKeywords.push(val);
                    renderTags();
                    newKeywordInput.value = '';
                }
            });

            newKeywordInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    addKeywordBtn.click();
                }
            });
        }

        renderTags();
    }

    window.PreflightController = {
        init: initPreflight
    };
})();
