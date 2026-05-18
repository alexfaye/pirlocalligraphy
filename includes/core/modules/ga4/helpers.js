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

const generateClickCasesSQL = (clickIdsArray, parameterName) => {
    return clickIdsArray.map((id) => 
        `when click_ids.${id.name} is not null then '${id[parameterName]}'`).join("\n");
};

const ga4Helpers={
    generateClickIdCoalesceSQL,
    generateClickCasesSQL
};

const helpers = {...coreHelpers, ...ga4Helpers};

module.exports = {
    helpers
};