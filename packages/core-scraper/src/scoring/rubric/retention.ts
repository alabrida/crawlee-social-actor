import { MechanismConfig } from '../types.js';

export const RETENTION_MECHANISMS: MechanismConfig[] = [
    {
        name: 'content_consistency',
        label: 'Content Consistency',
        stage: 'retention',
        weights: { local: 2, professional_services: 3, ecommerce: 3, saas: 3, content_creator: 3 },
        lowScoreInsight: 'You post infrequently. Retention and community growth depend on a steady content calendar.',
        evaluate(platforms) {
            let activePlatforms = 0;
            let sumFrequency = 0;

            Object.values(platforms).forEach((p: any) => {
                if (p && typeof p.days_since_post === 'number') {
                    sumFrequency += p.days_since_post;
                    activePlatforms++;
                }
            });

            if (activePlatforms === 0) {
                return { score: 0, evidence: 'No posting frequency data extracted' };
            }

            const avgDays = sumFrequency / activePlatforms;

            if (avgDays > 60) {
                return { score: 0, evidence: `Infrequent posting: average ${avgDays.toFixed(1)} days between posts` };
            }
            if (avgDays > 14) {
                return { score: 1, evidence: `Occasional posting: average ${avgDays.toFixed(1)} days between posts` };
            }
            if (avgDays > 3) {
                return { score: 2, evidence: `Steady posting: average ${avgDays.toFixed(1)} days between posts` };
            }
            return { score: 3, evidence: `Highly active: average ${avgDays.toFixed(1)} days between posts` };
        }
    },
    {
        name: 'cross_platform_connectivity',
        label: 'Cross-Platform Connectivity',
        stage: 'retention',
        weights: { local: 2, professional_services: 3, ecommerce: 3, saas: 3, content_creator: 3 },
        lowScoreInsight: 'Your social profiles and website do not link to each other. Users cannot follow you across the web.',
        evaluate(platforms, hub) {
            let socialLinksCount = 0;
            if (hub && hub.scrapeSuccess !== false) {
                socialLinksCount = Object.keys(hub.social_links || {}).length;
            }

            let profileLinksBack = 0;
            let totalProfiles = 0;
            Object.values(platforms).forEach((p: any) => {
                if (p && p.url) {
                    totalProfiles++;
                    if (p.link_in_bio?.url) {
                        profileLinksBack++;
                    }
                }
            });

            if (socialLinksCount === 0 && profileLinksBack === 0) {
                return { score: 0, evidence: 'No cross-platform linking detected' };
            }
            if (socialLinksCount <= 2 && profileLinksBack <= 1) {
                return { score: 1, evidence: `Minimal connection: Hub links to ${socialLinksCount} profiles, ${profileLinksBack}/${totalProfiles} profiles link back` };
            }
            if (socialLinksCount >= 3 && profileLinksBack >= 2) {
                return { score: 2, evidence: `Good connection: Hub links to ${socialLinksCount} profiles, ${profileLinksBack}/${totalProfiles} profiles link back` };
            }
            return { score: 3, evidence: `Full ecosystem: Hub links to ${socialLinksCount} profiles, active cross-links on profiles` };
        }
    },
    {
        name: 'community_presence',
        label: 'Community Presence',
        stage: 'retention',
        weights: { local: 1, professional_services: 2, ecommerce: 2, saas: 3, content_creator: 3 },
        lowScoreInsight: 'No community channels detected. Build customer stickiness by hosting interactive communities.',
        evaluate(platforms, hub) {
            let communityCount = 0;
            const channels: string[] = [];

            if (platforms.reddit && platforms.reddit.url) {
                communityCount++;
                channels.push('Reddit');
            }
            if (platforms.youtube && platforms.youtube.content_tabs?.includes('community')) {
                communityCount++;
                channels.push('YouTube Community');
            }

            if (hub && hub.scrapeSuccess !== false) {
                const links = Object.values(hub.social_links || {});
                const hasDiscord = links.some((l: any) => l.includes('discord.gg') || l.includes('discord.com'));
                const hasSlack = links.some((l: any) => l.includes('slack.com'));
                const hasFacebookGroup = links.some((l: any) => l.includes('facebook.com/groups'));
                if (hasDiscord) { communityCount++; channels.push('Discord'); }
                if (hasSlack) { communityCount++; channels.push('Slack'); }
                if (hasFacebookGroup) { communityCount++; channels.push('Facebook Group'); }
            }

            if (communityCount === 0) {
                return { score: 0, evidence: 'No community channels detected' };
            }
            if (communityCount === 1) {
                return { score: 1, evidence: `Community presence on 1 channel: ${channels[0]}` };
            }
            if (communityCount === 2) {
                return { score: 2, evidence: `Active community on 2 channels: [${channels.join(', ')}]` };
            }
            return { score: 3, evidence: `Strategic community: active across ${communityCount} channels: [${channels.join(', ')}]` };
        }
    },
    {
        name: 'gbp_review_engagement',
        label: 'GBP Review Engagement',
        stage: 'retention',
        weights: { local: 3, professional_services: 2, ecommerce: 2, saas: 1, content_creator: 1 },
        lowScoreInsight: 'Reviews exist but you respond to few or none. Responding build client retention and search ranking authority.',
        evaluate(platforms) {
            const gbp = platforms.google_business_profile || platforms.google_maps;
            if (!gbp || !gbp.url || !gbp.reviews_count) {
                return { score: 0, evidence: 'No reviews found on Google listing' };
            }
            const rate = gbp.owner_response_rate || 0;
            const ratePercent = rate <= 1 ? rate * 100 : rate;

            if (ratePercent === 0) {
                return { score: 0, evidence: 'Owner has responded to 0% of reviews' };
            }
            if (ratePercent < 25) {
                return { score: 1, evidence: `Owner responses minimal: responded to ${ratePercent.toFixed(0)}% of reviews` };
            }
            if (ratePercent < 75) {
                return { score: 2, evidence: `Owner responses active: responded to ${ratePercent.toFixed(0)}% of reviews` };
            }
            return { score: 3, evidence: `Owner responses optimized: responded to ${ratePercent.toFixed(0)}% of reviews` };
        }
    },
    {
        name: 'content_organization',
        label: 'Content Organization',
        stage: 'retention',
        weights: { local: 1, professional_services: 2, ecommerce: 2, saas: 2, content_creator: 3 },
        lowScoreInsight: 'Your social content is disorganized. Curation helps direct viewers through the marketing funnel.',
        evaluate(platforms) {
            let count = 0;
            const details: string[] = [];

            const yt = platforms.youtube;
            if (yt && yt.playlist_count && yt.playlist_count > 0) {
                count++;
                details.push(`${yt.playlist_count} YT playlists`);
            }
            const pin = platforms.pinterest;
            if (pin && pin.board_count && pin.board_count > 0) {
                count++;
                details.push(`${pin.board_count} Pinterest boards`);
            }
            const ig = platforms.instagram;
            if (ig && ig.content_mix?.highlights && ig.content_mix.highlights > 0) {
                count++;
                details.push(`${ig.content_mix.highlights} IG highlights`);
            }
            const li = platforms.linkedin;
            if (li && li.featured_section) {
                count++;
                details.push('LinkedIn Featured section');
            }

            if (count === 0) {
                return { score: 0, evidence: 'No content organization detected' };
            }
            if (count === 1) {
                return { score: 1, evidence: `Basic organization: ${details[0]}` };
            }
            if (count <= 3) {
                return { score: 2, evidence: `Organized content on multiple platforms: [${details.join(', ')}]` };
            }
            return { score: 3, evidence: `Strategic curation active: [${details.join(', ')}]` };
        }
    }
];
