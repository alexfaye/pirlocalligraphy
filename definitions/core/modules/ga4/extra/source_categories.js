const { helpers } = require("includes/core/helpers");

// Return a js object like [{},{},{},...]
const rows = require("includes/core/modules/ga4/extra/source_categories.json");
const selectedStatements = helpers.getSqlUnionAllFromRowsSQL(rows);

// To create tables dynamically with js that do not exit, from a JSON file to a BigQuery table
// query() is to tell the the publish() where the table data comes from
publish("source_categories", {
    type: "table",
    schema: dataform.projectConfig.vars.TRANSFORMATIONS_DATASET,
}).query(() => selectStatements);
