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
        SAFE_CAST(value.float_value AS Numeric)) FROM UNNEST(${column}) WHERE key = '${config.name}') `;
    }
    else if(config.type === "string"){
        // Sometimes GA4 will make mistake, putting string value into a number field
        value = `(SELECT COALESCE(value.string_value, CAST(value.int_value AS string),
        CAST(value.float_value AS string), CAST(value.double_value AS string))
        FROM UNNEST(${column}) WHERE key = '${config.name}') `;
    }
    else {
        value = `(SELECT value.${config.type}_value FROM UNNEST(${column}) WHERE key = '${config.name}') `;
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


// The following two functions extract url param from url to form a Struct
const generateURLParamSQL = (urlParam, column, urlDecode = true) => {
    let value = `regexp_extract(${column}, r"^[^#]+[?&]${urlParam.name}=([^&#]+)")`;
    value = urlParam.cleaningMethod ? urlParam.cleaningMethod(value) : value;
    value = urlDecode ? urlDecodeSQL(value) : value;
    return `${value} AS ${urlParam.reNameTo ? urlParam.reNameTo : urlParam.name}`;
};

const generateURLParamsSQL = (urlParamsArray, column, urlDecode = true) => {
    return `${urlParamsArray.map((urlParam) => 
        generateURLParamSQL(urlParam, column, urlDecode)).join(",\n")
    }`;
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

const lowerSQL = (columnName) => `lower(${columnName})`;

const generateArrayAggSQL = (
    paramName, column = false, orderTypeAsc = true, orderBy = "time.event_timestamp_utc"
) => {
    const alias = column === null ? "" : `AS ${column ? column : paramName}`;
    return `ARRAY_AGG(${paramName} IGNORE NULLS ORDER BY ${orderBy} ${orderTypeAsc ? "ASC" : "DESC"}
    LIMIT 1) [SAFE_OFFSET(0)] ${alias}`; // Get the first one after sorting by LIMIT 1 which is used in the attribution model
    };

// Generate SELECT statements for a single object
const getSqlSelectFromRowSQL = (config) => {
    // Object.entries() can convert an object to a key-value array
    // map([key, value]) is called array destructing
    return Object.entries(config).map(([key, value]) => {
        if(typeof value === "number"){
            return `${value} AS ${key}`;
        } 
        else if(key ==="date") return `DATE '${value}' AS ${key}`;
        else if(key === "event_timestamp" && !/^\d+$/.test(value)) return `TIMESTAMP '${value}' AS ${key}`;
        else if(key === "session_start" && !/^\d+$/.test(value)) return `TIMESTAMP '${value}' AS ${key}`;
        else if(key === "session_end" && !/^\d+$/.test(value)) return `TIMESTAMP '${value}' AS ${key}`;
        else if(typeof value === "string"){
            if(key === "int_value") return `${parseInt(value)} AS ${key}`;
            if(key.indexOf("timestamp") > -1) return `${parseInt(value)} AS ${key}`;
            if(key === "float_value" || key === "double_value") return `${parseFloat(value)} AS ${key}`;
            return `'${value}' AS ${key}`;
        } 
        else if(value === null) return `${value} AS ${key}`;
        else if(value instanceof Array) return `[${getSqlSelectFromRowSQL(value)}] AS ${key}`;
        else {
            if (isStringInteger(key)) return `STRUCT(${getSwlSelectFromRowSQL(value)})`;
            else return `STRUCT(${getSqlSelectFromRowSQL(value)}) AS ${key}`;
        }
    })
    .join(", ");
};

// Genereate SELECT statements for list of objects and concatenate them with UNION ALL
// This is used to create list of source_cagegories based on JSON file
const getSqlUnionAllFromRowsSQL = (rows) => {
    try{
        const selectStatements = rows.map((row) => "SELECT" + getSqlSelectFromRowSQL(row)).join("\nUNION ALL\n");
        return selectStatements;
    } catch(error){
        console.error("Error reading or parsing rows", error);
    }
};

// Generate SQL to URL decode a column. Used to clean up URL parameters like utm_source e
const urlDecodeSQL = (urlColumn) => {
    return `
        (SELECT SAFE_CONVERT_BYTES_TO_STRING(
            ARRAY_TO_STRING(ARRAY_AGG(
                IF(STARTS_WITH(y, '%'), FROM_HEX(SUBSTR(y, 2)), CAST(y AS BYTES)) ORDER BY i), b''))
        FROM UNNEST(REGEXP_EXTRACT_ALL(${urlColumn}, r"%[0-9a-fA-F]{2}|[^%]+")) AS y WITH OFFSET AS i
    )`;
};

const helpers = {
    getModuleConfig,
    getConfigByType,
    checkColumnNames,
    generateParamsSQL,
    generateStructSQL,
    generateURLParamsSQL,
    generateFilterTypeFromListSQL,
    lowerSQL,
    generateArrayAggSQL,
    getSqlUnionAllFromRowsSQL,
    urlDecodeSQL
};

module.exports = {helpers};