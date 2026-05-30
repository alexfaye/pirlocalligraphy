const { helpers } = require("includes/core/helpers");

const rows = require("includes/core/modules/ga4/extra/source_categories.json");
const selectedStatements = helpers.getSqlUnionAllFromRowsSQL(rows);

publish("source_categories", {
    type: "table",
    schema: dataform.projectConfig.vars.TRANSFORMATIONS_DATASET,
}).query(() => selectStatements);
