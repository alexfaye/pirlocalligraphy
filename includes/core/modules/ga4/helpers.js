const {helpers: coreHelpers} = require("includes/core/helpers.js");

const ga4Helpers={};

const helpers = {...coreHelpers, ...ga4Helpers};

module.exports = {
    helpers
};