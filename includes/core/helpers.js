/*
This helpers.js file is used to 

*/

// This getConfigByType checks if the config.js exists in the dedicated directory
// and it returns the module's config.js itself
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

};

const helpers = {
    getModuleConfig,
    getConfigByType,
    checkColumnNames,
};

module.exports = {helpers};