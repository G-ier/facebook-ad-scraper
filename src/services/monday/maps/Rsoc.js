// Internal imports
const { validatePayload } = require('../../helpers/validation');

/**
 * RSoC Board Configuration
 *
 * This object maps the Monday.com column IDs (from the terminal output)
 * to internal keys used throughout the launcher.
 *
 * Fields are grouped into:
 *  - columnMappings: General board data and creative content
 *  - campaignDataMappings: Data used for campaign creation
 *  - adsetDataMappings: Data used for ad set grouping
 *  - linkDataMappings: Data for generating link payloads
 */

const Rsoc = {
    boardId: 8457550521,
    columnMappings: {
        page_name: 'text_mknxzyvv',
        page_id: 'text_mknxg5bv',

        // Core Identifiers / System Fields
        mass_launcher_id: 'text_mkm03zz6', // (line 14) contains "mass launcher id"
        status: 'status62__1',             // (line 38) "Created"
        ad_launcher_error: 'long_text_mknyregg',     // "Missing Parameters"
        traffic_source: 'status__1',        // (line 62) "Facebook"
        
        // Branding / Campaign Details
        vertical: 'text__1',                // (line 92) "vertical"
        category: 'text63__1',              // (line 98) "category"
        content_type: 'content_type__1',    // (line 282) "AI UGC"
        
        // Campaign Structure & Settings
        camp_structure: 'text9__1',         // (line 343) expected campaign structure field
        campaign_objective: 'status_13__1',   // (line 307) "Sales"
        campaign_budget_mode: 'dropdown__1',  // (line 379) no text returned but used as placeholder
        campaign_budget: 'numbers__1',        // (line 349) "5"
        campaign_bid_strategy: 'status_18__1', // (line 385) value is null but reserved
        campaign_start_date: 'date__1',       // (line 319) "2025-02-12 09:00"
        schedule_start: 'date_mkmpjeym',      // (line 451) "2025-02-12 09:00"
        schedule_end: 'ad_group_scheduled_end_mkn21m8f', // (line 457) "2025-02-12 09:00"

        // Ad Account & Status
        ad_account: 'text_mknx7x6e',           // (line 74) "Airfind-M"
        ad_account_id: 'text_mknxgagv',    // (placeholder; not seen in snippet)
        special_ads_category: 'dropdown7__1', // (line 325) "FINANCIAL_PRODUCTS_SERVICES"

        // Targeting (User/Geo data)
        country: 'country__1',              // (line 104) "US"
        age: 'text8__1',                    // (line 361) "12"
        gender: 'dropdown8__1',             // (line 367) "M"
        language: 'text4',                  // (line 110) "english"

        // Delivery & Bidding
        network: 'status2__1',              // (line 68) "Airfind"
        delivery_type: 'dropdown12__1',     // (line 373) "Standard"
        method: 'dropdown1__1',             // (line 331) "CBO"
        bid: 'numbers9__1',                 // (line 391) "0"
        conversion_bid: 'text294__1',       // (line 397) null

        // Creative Content
        primary_text: 'long_text9__1',      // (line 469) "test"
        headlines: 'long_text3__1',         // (line 481) "test"
        description: 'long_text0__1',       // (line 492) "desc"
        call_to_action: 'dropdown5__1',     // (line 355) "Learn More"
        creatives: 'files__1',              // (line 288) contains file URL
        creative_hashes: 'text_mkkhdnrx',    // (line 295) null
        creatives_uploaded_log: 'text_mkkhckxb', // (line 301) null
        inspo: 'files1__1',             // (line 264) "inspo hl"
        inspo_primary_text: 'text_mkn2z9rb',
        inspo_headline: 'text_mkn29byp',

        // Attribution (Shared between campaign and link data)
        buyer: 'dup__of_buyer__1',          // (line 32) (empty in sample; may be filled later)
        creator: 'people2__1',              // (line 246) (empty)
        
        // Pixel Information (if applicable)
        pixel_name: 'text_mknx77de',        // (placeholder)
        pixel_id: 'text_mknx4nks',               // (placeholder)

        // Launch Results
        launched_campaign_id: 'text74__1',   // (line 505) "launched campaign id"
        launched_adset_id: 'text1__1',       // (line 511) "launched adset id"
        launched_ad_creative_ids: 'text_mkky359j', // (line 517) "launched ad creative id"
        launched_ad_creatives_log: 'text_mkkywt64', // (line 523) "launched ad creative log"
        launched_ad_ids: 'text20__1',        // (line 529) "launched ad ids"
        launched_ads_log: 'text_mkky3fsq',      // (line 535) "launched ad logs"

        // Compliance Check
        compliance: 'text_mkqjw5qg',
        compliance_score: 'text_mkqqg6f3',
        rec_headline: 'text_mkqjsevg',
        rec_description: 'text_mkqjd03z',
        rec_cta: 'text_mkqj3vfz',

        // Classification
        ad_classification: 'text_mkqjnty'
        
    },
    campaignDataMappings: {
        // If present, you can map an ad account display name here.
        adAccountName: 'text5__1',          // (placeholder as not seen in snippet)
        buyer: 'dup__of_buyer__1',          // reuse buyer from above
        country: 'country__1',
        language: 'text4',
        vertical: 'text__1',
        network: 'status2__1'
    },
    adsetDataMappings: {
        event: 'dropdown83',               // (line 180) "Purchase"
        country: 'country__1',
        language: 'text4',
        vertical: 'text__1',
        uniqueIdentifier: 'item_id__1',     // (line 26) item id "8457666416"
        creativeRequestedOn: 'last_updated__1' // (line 20) using last_updated timestamp as a proxy
    },
    linkDataMappings: {
        article_id: "text92__1",
        channel_id: "text_mkn55mj4",
        brand: "text_mknyb1rh",
        style_id: "text_mknyjkdj",
        adTitle: 'text02__1',              // (line 234) "offer name"
        baseLink: 'da_naked_domain__1',     // (placeholder; same as used in AFD)
        campaignTarget: 'text_mkqfv4n4',    // (placeholder; same as used in AFD)
        kw1: 'text4__1',                   // (line 186) "kw1"
        kw2: 'dup__of_kw1__1',             // (line 192) "kw2"
        kw3: 'dup__of_kw2__1',             // (line 198) "kw3"
        kw4: 'text29__1',                  // (line 204) "kw4"
        kw5: 'text7__1',                   // (line 210) "kw5"
        kw6: 'text2__1',                   // (line 216) "kw6"
        kw7: 'dup__of_kw6__1',             // (line 222) "kw7"
        kw8: 'dup__of_kw7__1',             // (line 228) "kw8"
        buyer: 'dup__of_buyer__1',          // reuse buyer mapping
        requestId: 'item_id__1'             // (line 26) item id as unique request id
    },
    validateItem: (payload) => {

        let requiredGroups;
        if (payload.network === 'sedo rsoc') {

            // Define the groups of required keys.
            requiredGroups = {
                required: ['ad_account_id', 'creatives', 'method'],
                campaign: ['campaign_name', 'campaign_objective'],
                adset: ['ad_set_name', 'pixel_id', 'country'],
                adCreative: ['page_id', 'network', 'traffic_source']
            };

            if (!payload.method) payload.method = 'CBO';

            // Example: If method is not provided or is one of 'CBO' or 'ABO', require additional campaign keys.
            if (payload['method'] === '' || payload['method'] === 'CBO' || payload['method'] === 'ABO') {
                requiredGroups.campaign.push('campaign_bid_strategy', 'campaign_budget');
            }
        }
        else {
            // Define the groups of required keys.
            requiredGroups = {
                required: ['ad_account_id', 'creatives', 'method'],
                campaign: ['campaign_name', 'campaign_objective'],
                adset: ['ad_set_name', 'pixel_id', 'country'],
                adCreative: ['page_id', 'network', 'traffic_source', 'brand', 'style_id', 'channel_id', 'article_id']
            };

            if (!payload.method) payload.method = 'CBO';
            payload.brand = payload.link_payload.brand;
            payload.style_id = payload.link_payload.style_id;
            payload.channel_id = payload.link_payload.channel_id;
            payload.article_id = payload.link_payload.article_id;

            // Example: If method is not provided or is one of 'CBO' or 'ABO', require additional campaign keys.
            if (payload['method'] === '' || payload['method'] === 'CBO' || payload['method'] === 'ABO') {
                requiredGroups.campaign.push('campaign_bid_strategy', 'campaign_budget');
            }
        }

        return validatePayload(payload, requiredGroups);
    }
};

module.exports = Rsoc;