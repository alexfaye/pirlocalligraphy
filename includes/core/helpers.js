/*
This helpers.js file is core helpers of common functions

*/


// The following generateParamSQL, generateParamsSQL and generateStructSQL are sometimes
// working together to generate a 'SELECT FROM UNNEST()' statement based on the config.js
// like event.params, item_params
const generateParamSQL = (config, column = "event_params") => {
    let value ="";
    // Decimal type of values are all related to currency value and should be converted to Numeric type in BigQuery
    if(config.type === "decimal"){
        value = `(SELECT COALESCE(SAFE_CAST(value.int_value AS Numeric), SAFE_CAST(value.double_value AS Numeric),
        SAFE_CAST(value.float_value AS Numeric) FROM UNNEST(${column}) WHERE key='${config.name}') `;
    }
    else if(config.type === "string"){
        // Sometimes GA4 will make mistake, putting string value into a number field
        value = `(SELECT COALESCE(value.string_value, CAST(value.int_value AS string),
        CAST(value.float_value AS string), CAST(value.double_value AS string))
        FROM UNNEST(${column}) WHERE key='${config.name}') `;
    }
    else {
        value = `(SELECT value.${config.type}_value FROM UNNEST(${column})) WHERE key='${config.name}') `;
    }
    value = config.cleaningMethod ? config.cleaningMethod(value) : value;
    return `${value} AS ${config.reNameTo ? config.reNameTo : config.name}`;
};

// This function uses the array in config.js and needed column to generate the sql for a Struct
const generateParamsSQL = (configArray, column = "event_params") => {
    return `${configArray.map((config) => {
        return generateParamSQL(config, column);
    }).join(",\n")}`;
};

// This returns a standand Struct for a SQL statement
const generateStructSQL = (sql) => {
    return `STRUCT (${sql})`;
};

// This getConfigByType checks if the config.js exists in the dedicated directory
// and it returns the module's config itself
const getConfigByType = (moduleName, configType="custom") => {
    let jsConfig;
    try{
        const jsConfigFile = require(`includes/${configType}/modules/${moduleName}/config.js`);
        jsConfig = jsConfigFile.config;
    }
    catch(error){
        if(error instanceof SyntaxError){
            throw new Error(
                `includes/${configType}/modules/${moduleName}/config.js: ` + error
            );
        }
        jsConfig = {};
    }
    return jsConfig;
};

// This getModuleConfig reads and combines the core and custom config, 
// and inspects the config of some module
// and it returns the config which were defined in the module.exports()
const getModuleConfig = (moduleName) => {
    const coreConfig = getConfigByType(moduleName, "core");
    const customConfig = getConfigByType(moduleName);
    const config = {...coreConfig, ...customConfig};

    // If either ENABLED or enabled exists, the check can be passed.
    if("ENABLED" in config){
        config.enabled = config.ENABLED;
    }

    if(!("enabled" in config)){
        throw new Error(`Module ${moduleName} config is missing enabled property`);
    }

    // Check dependencies for each module
    if("dependencies" in config && config.dependencies.length > 0){
        for(const dependency of config.dependencies){
            try{
                const dependencyConfig = getModuleConfig(dependency);
                if(!dependencyConfig.enabled){
                    // if the dependency is avalaible but not enabled
                    throw new Error(
                        `Module ${moduleName}: required dependency ${dependency} but is is disabled`
                    );
                }
            }
            // If the dependency is not avalaible
            catch (error){
                throw new Error(
                    `Module ${moduleName}: required dependency ${dependency} but cannot be found: ${error}`
                );
            }
        }
    }

    // If all the inspect passed, return the config
    return config;
};

// Check the duplcate column names and invalid column names in the config.
const checkColumnNames = (config) => {
    const sanityCheck = (configArray, description) => {
        // Check if the array is not defined
        if(configArray === undefined){
            return true;
        }
        // Check if the array can be iterated
        if(typeof configArray[Symbol.iterator] != "function"){
            return true;
        }

        // Continue to check
        const cols = new Set();
        for(const obj of configArray){
            const col = obj.renameTo || obj.name;
            // Check if there are duplcate names in the custom array
            if(cols.has(col)){
                throw new Error("Duplicate column: `" + col + "` found in " + description ||
                    "config" + " - please rename"
                );
            }

            // Check if there are invalid names in the custom array
            if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(col) || col.includes(" ")){
                throw new Error("Invalid column name: `" + col + "`found in " + description ||
                    "config" + " - please rename"
                );
            }
        cols.add(col);
        }
        return true; // No duplcate found
    };

    sanityCheck(config.CUSTOM_EVENT_PARAMS_ARRAY, "custom event params");
    sanityCheck(config.CUSTOM_USER_PROPERTIES_ARRAY, "user properties");
    sanityCheck(config.CUSTOM_ITEM_PARAMS_ARRAY, "custom item parameters");
    sanityCheck(config.CUSTOM_URL_PARAMS_ARRAY, "custom url parameters");

    return true;
};

// Generate SQL for a list creation based on provided list
// A list like ['a', 'b', 'c'] will returned (a, b, c) for SQL clause
const  generateListSQL = (list) => {
    return `('${list.join("', ")}')`;
};

// Generate SQL for a WHERE clause based on provided list
const generateFilterTypeFromListSQL = (type="exclude", column, list) => {
    if(list.length == 0) return `true`;
    const filterType = type === "exclude" ? "not in" : "in";
    // if column is null, null not in (...) will cause null return
    return `COALESCE(${column}, "") ${filterType} ${generateListSQL(list)}`;
};

const helpers = {
    getModuleConfig,
    getConfigByType,
    checkColumnNames,
    generateParamsSQL,
    generateStructSQL,
    generateFilterTypeFromListSQL,
};

module.exports = {helpers};