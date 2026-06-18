(function() {
    const CLASSIFICATION_DATA = {
        'Pending': {
            label1: "Organic Media & Audiences", val1: "0%",
            label2: "Local Authority & Listings", val2: "0%",
            label3: "Monetization & Conversion", val3: "0%",
            explanation: "No audit results available yet. Run the audit crawl sequence from the sidebar to populate digital presence classification."
        },
        'Content Creator': {
            label1: "Organic Media (Culinary Content)", val1: "50%",
            label2: "Local Footprint (Maps & GBP)", val2: "30%",
            label3: "Transactional Engine (Direct Booking)", val3: "20%",
            explanation: "Restaurateurs act as digital creators to capture organic local attention and funnel social followers into physical dining tables."
        },
        'Local Business': {
            label1: "Local Footprint (Maps & GBP)", val1: "55%",
            label2: "Organic Media (Culinary Content)", val2: "25%",
            label3: "Transactional Engine (Direct Booking)", val3: "20%",
            explanation: "Traditional local establishment focus. Prioritizes local citations, search map packs, and direct booking/ordering engines."
        },
        'SaaS Platform': {
            label1: "Product Utility / Demo Content", val1: "60%",
            label2: "Organic Community Builders", val2: "20%",
            label3: "Transactional Conversion (Pricing)", val3: "20%",
            explanation: "Leverages cloud software, subscription pricing tiers, and online developer/customer education documentation."
        },
        'E-Commerce': {
            label1: "Inventory Catalog Content", val1: "50%",
            label2: "Paid & Organic Ads (Socials)", val2: "30%",
            label3: "Cart/Checkout Conversion", val3: "20%",
            explanation: "Focuses on shopping carts, product detail pages, and social media commerce integrations to drive direct checkouts."
        },
        'Professional Services': {
            label1: "Advisory Authority Content", val1: "55%",
            label2: "Relationship & Referrals", val2: "25%",
            label3: "Consultation Bookings (Leads)", val3: "20%",
            explanation: "Establishes industry expertise and trust through white papers, blogs, and advisory posts to book direct consultation sessions."
        }
    };

    const DEFAULT_CLASSIFICATION = {
        label1: "Organic Media & Audiences", val1: "40%",
        label2: "Local Authority & Listings", val2: "30%",
        label3: "Monetization & Conversion", val3: "30%",
        explanation: "Multi-channel digital presence. Balances organic content generation with localized search visibility and direct conversion."
    };

    const WEAKEST_STAGE_DATA = {
        'Pending': `
            <div class="gap-item">
                <span class="gap-bullet text-meta">&bull;</span>
                <span class="gap-text">No gaps identified yet. Start an audit run to analyze your revenue journey.</span>
            </div>
        `,
        'Conversion': `
            <div class="gap-item">
                <span class="gap-bullet text-error">&bull;</span>
                <span class="gap-text"><strong>Booking Engine</strong>: Unlinked or offline on social accounts.</span>
            </div>
            <div class="gap-item">
                <span class="gap-bullet text-error">&bull;</span>
                <span class="gap-text"><strong>Shop Integration</strong>: Inactive/broken link-in-bio checkout paths.</span>
            </div>
            <div class="gap-item">
                <span class="gap-bullet text-warning">&bull;</span>
                <span class="gap-text"><strong>Profile CTAs</strong>: Muted action banners on bio headings.</span>
            </div>
        `,
        'Awareness': `
            <div class="gap-item">
                <span class="gap-bullet text-error">&bull;</span>
                <span class="gap-text"><strong>Posting Consistency</strong>: Long intervals between updates.</span>
            </div>
            <div class="gap-item">
                <span class="gap-bullet text-error">&bull;</span>
                <span class="gap-text"><strong>Local Citation Rank</strong>: Low visibility in map pack search.</span>
            </div>
            <div class="gap-item">
                <span class="gap-bullet text-warning">&bull;</span>
                <span class="gap-text"><strong>Short-form Reach</strong>: Negligible algorithmic recommendation views.</span>
            </div>
        `,
        'Consideration': `
            <div class="gap-item">
                <span class="gap-bullet text-error">&bull;</span>
                <span class="gap-text"><strong>Interaction Rate</strong>: High views but low comment/share counts.</span>
            </div>
            <div class="gap-item">
                <span class="gap-bullet text-error">&bull;</span>
                <span class="gap-text"><strong>Bio Optimization</strong>: Profiles don't clearly state what you solve.</span>
            </div>
            <div class="gap-item">
                <span class="gap-bullet text-warning">&bull;</span>
                <span class="gap-text"><strong>Community Engagement</strong>: Direct replies to comments are missing.</span>
            </div>
        `,
        'Decision': `
            <div class="gap-item">
                <span class="gap-bullet text-error">&bull;</span>
                <span class="gap-text"><strong>Social Proof</strong>: No user testimonials or ratings in profiles.</span>
            </div>
            <div class="gap-item">
                <span class="gap-bullet text-error">&bull;</span>
                <span class="gap-text"><strong>Map Ratings</strong>: GBP rating is below target benchmark (4.2 stars).</span>
            </div>
            <div class="gap-item">
                <span class="gap-bullet text-warning">&bull;</span>
                <span class="gap-text"><strong>Authority Seals</strong>: Badges and trust certifications unverified.</span>
            </div>
        `,
        'Retention': `
            <div class="gap-item">
                <span class="gap-bullet text-error">&bull;</span>
                <span class="gap-text"><strong>Returning Engagement</strong>: Low interaction from existing followers.</span>
            </div>
            <div class="gap-item">
                <span class="gap-bullet text-error">&bull;</span>
                <span class="gap-text"><strong>FAQ & Support</strong>: Missing customer service links or chat options.</span>
            </div>
            <div class="gap-item">
                <span class="gap-bullet text-warning">&bull;</span>
                <span class="gap-text"><strong>User-Gen Content</strong>: Brand tags and customer reposts are uncurated.</span>
            </div>
        `
    };

    window.UIRendererData = {
        CLASSIFICATION_DATA,
        DEFAULT_CLASSIFICATION,
        WEAKEST_STAGE_DATA
    };
})();
