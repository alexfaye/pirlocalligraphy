const {helpers: coreHelpers} = require("includes/core/helpers.js");



// Generate SQL to coalesce click_ids from different sources to return the first non-null value
// If any clickid contains collected_traffic_source, that clickid is Google-related click and can be 
// extracted from collected_traffic_source (Google official source) in the first place
// Other clickin may come from Microsoft, Facebook and so, so they will not be available in 
// collected_traffic_source
// There are only 3 types of clickin in collected_traffic_source field, these are gclid, dclid & srsltid
const generateClickIdCoalesceSQL = (clickId) => {
    if(clickId.sources.includes("collected_traffic_source")){
        return `COALESCE(collected_traffic_source.${clickId.name}, event_params.${clickId.name}, 
        click_ids.${clickId.name}) AS ${clickId.name}`;
    }
    return `click_ids.${clickId.name} AS ${clickId.name}`;
};

// Generate SQL to create a CASE statement for click_ids based on configuration CLICK_IDS_ARRAY
// It returns one of source/medium/campaign if click_ids is not null
const generateClickIdCasesSQL = (clickIdsArray, parameterName) => {
    return clickIdsArray.map((id) => 
        `when click_ids.${id.name} is not null then '${id[parameterName]}'`).join("\n");
};

// Generate SQL to return the first or last value of an array aggregation used in traffic_source Struct
const generateTrafficSourceSQL = (fixedTrafficSourceTable, column = null, orderTypeAsc = true, orderBy = "time.event_timestamp_utc") => {
    const alias = column === null ? "" : `AS ${column || "traffic_source"}`;
    const orderDirection = orderTypeAsc ? "asc" : "desc";

    return `
        ARRAY_AGG(
            IF(
                COALESCE(
                    ${fixedTrafficSourceTable}.campaign_id,
                    ${fixedTrafficSourceTable}.campaign,
                    ${fixedTrafficSourceTable}.source,
                    ${fixedTrafficSourceTable}.medium,
                    ${fixedTrafficSourceTable}.term,
                    ${fixedTrafficSourceTable}.content
                ) IS NULL, NULL, ${fixedTrafficSourceTable}
            )
            IGNORE NULLS ORDER BY ${orderBy} ${orderDirection}
            LIMIT 1)[SAFE_OFFSET](0) ${alias}`;
};

// Generate SQL to return the first or last value of an array aggregation used in click_ids Struct
const generateClickIdTrafficSourceSQL = (clickIdStruct, clickIdsArray, column = null, orderTypeAsc = true, orderBy = 'time.event_timestamp_utc') => {
    const alias = column === null ? "" : `AS ${column || "click_id"}`;
    const orderDirection = orderTypeAsc ? "asc" : "desc";

    const coalesceItems = clickIdsArray.map((item) => `${clickIdStruct}.${item.name}`).join(",\n");
    // Firstly check if there is any click_id in the session
    return `
        ARRAY_AGG(
            IF(
                COALESCE(${coalesceItems}) IS NULL, NULL, ${clickIdStruct})
                )
            IGNORE NULLS ORDER BY ${orderBy} ${orderDirection}
            LIMIT 1)[SAFE_OFFSET](0) ${alias}`;
};

// Generate SQL for CASE statement to determine the channel grouping based on provided parameters
// This logic represents the default channel grouping logic in GA4
const getDefaultChannelGroupingSQL = (config, source, medium, campaign, category, term, content, campaignId) => {
    return `
        case
            when(coalesce(${source}, ${medium}, ${campaign}, ${term}, ${content}, ${campaignId}) is not null)
            or (${source} = 'direct' and (${medium} = '(none)' or ${medium} = '(not set'))
            then 'Direct'

            when(regexp_contains(${source}, r"^(${config.SOCIAL_PLATFORMS_REGEX})$")
            or ${category} = 'SOURCE_CATEGORY_SOCIAL')
            and regexp_contains(${medium}, r"^(.*cp.*|ppc|retargeting|paid.*)$")
            then 'Paid Social'

            when regexp_contains(${source}, r"^(${config.SOCIAL_PLATFORMS_REGEX})$")
            or ${medium} in ("social", "social-network", "social-media", "sm", "social network", "social media")
            or ${category} = 'SOURCE_CATEGORY_SOCIAL'
            then 'Organic Social'

            when regexp_contains(${medium}, r"email|e-mail|e_mail|e mail|newsletter")
            or regexp_contains(${source}, r"email|e-mail|e_mail|e mail|newsletter")
            then 'Email'

            when regexp_contains(${medium}, r"affiliate|affiliates")
            then 'Affiliates'

            when ${category} = 'SOURCE_CATEGORY_SHOPPING'
            and regexp_contains(${medium}, r"^(.*cp.*|ppc|paid.*)$")
            then 'Paid Shopping'

            when ${category} = 'SOURCE_CATEGORY_SHOPPING'
            or ${campaign} = 'Shopping Free Listings'
            or ${medium} = 'shopping_free'
            then 'Organic Shopping'

            when (${categtory} = 'SOURCE_CATEGORY_VIDEO' and regexp_contains(${medium}, r"^(.*cp.*|ppc|paid.*)$")))
            or ${souce} = 'dv360_video'
            then 'Paid Video'

            when regexp_contains(${medium}, r"^(display|cpm|banner)$")
            or ${source} = 'dv360_display'
            then 'Display'

            when ${category} = 'SOURCE_CATEGORY_SEARCH'
            and regexp_contains(${medium}, r"^(.*cp.*|ppc|retargeting|paid.*)$")
            then 'Paid Search'

            when regexp_contains(${medium}, r"^(cpv|cpa|cpp|cpc|content-text)$")
            then 'Other Advertising'

            when ${medium} = 'organic' or ${category} = 'SOURCE_CATEGORY_SEARCH'
            then 'Organic Search'

            when ${category} = 'SOURCE_CATEGORY_VIDEO'
            or regexp_contains(${medium}, r"^(.*video.*)$")
            then 'Organic Video'

            when ${config.EXTRA_CHANNEL_GROUPS}
            and ${medium} = 'referral'
            and ${category} = 'SOURCE_CATEGORY_AI'
            then 'Organic AI'

            when ${medium} in ("referral", "app", "link")
            then 'Referral'

            when ${medium} = 'audio'
            then 'Audio'

            when ${medium} = 'sms'
            or ${source} = 'sms'
            then 'SMS'

            when regexp_contains(${medium}, r"(mobile|notification|push$)")
            or ${source} = 'firebase'
            then 'Mobile Push Notification'

            else '(Other)'
        end 
    `;
};

// Generate SQL to concatenate click_ids column names
const getClickIdsDimensionsSQL = (clickIds, prefix) => {
    return clickIds.map((id) => `${prefix}.${id.name}`).join(",\n");
};

const ga4Helpers={
    generateClickIdCoalesceSQL,
    generateClickIdCasesSQL,
    generateTrafficSourceSQL,
    generateClickIdTrafficSourceSQL,
    getDefaultChannelGroupingSQL,
    getClickIdsDimensionsSQL,
};

const helpers = {...coreHelpers, ...ga4Helpers};

module.exports = {
    helpers
};