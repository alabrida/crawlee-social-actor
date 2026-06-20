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

        // Pre-flight Crawl via Backend
        preflightBtn.addEventListener('click', async () => {
            const url = targetUrlInput.value.trim();
            if (!url) return;

            preflightStatus.classList.remove('hidden');
            preflightSuccessBlock.classList.add('hidden');
            preflightBtn.disabled = true;

            try {
                const res = await fetch('/api/audit/preflight', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url })
                });
                if (!res.ok) throw new Error('Preflight request failed');

                const data = await res.json();
                preflightClassVal.textContent = data.detectedClass;
                preflightJsonLdVal.textContent = data.jsonLdStatus;
                
                if (data.jsonLdStatus.includes('Found')) {
                    preflightJsonLdVal.className = 'val text-success';
                } else {
                    preflightJsonLdVal.className = 'val text-meta';
                }
                updateSuggestedKeywords(data.suggestedKeywords);
                preflightSuccessBlock.classList.remove('hidden');
            } catch (err) {
                console.error(err);
                // Fallback to local default classification
                preflightClassVal.textContent = 'Local Business';
                preflightJsonLdVal.textContent = 'None Found (Fallback)';
                preflightJsonLdVal.className = 'val text-meta';
                updateSuggestedKeywords(["Birmingham Burgers", "Milo's Original Burger Shop", "Hamburgers in Alabama"]);
                preflightSuccessBlock.classList.remove('hidden');
            } finally {
                preflightStatus.classList.add('hidden');
                preflightBtn.disabled = false;
            }
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
