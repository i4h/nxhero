var cartesian = require('cartesian');
var debug       = require('debug')('nxhero');
var in_array = require('in_array');
var async = require('async');

var ParamModels = require('../parameters/module.js');
var db = require('../lib/db');
var model_insert = require('../lib/model_insert');
var ArrayHelper = require("../lib/array_helper");


const PARAM_TYPE_INTEGER = 1;
const PARAM_TYPE_FLOAT = 2;
const PARAM_TYPE_STRING = 3;

module.exports = {
    typeInteger: PARAM_TYPE_INTEGER,
    typeFloat: PARAM_TYPE_FLOAT,
    typeString: PARAM_TYPE_STRING,
    typeChoices:  [
        {name: 'integer', value: PARAM_TYPE_INTEGER},
        {name: 'float', value: PARAM_TYPE_FLOAT},
        {name: 'string', value: PARAM_TYPE_STRING}
    ],
    types : {
        1: 'integer',
        2: 'float',
        3 :'string'
    },
    valueModels : {
        1: 'ParameterValueInt',
        2: 'ParameterValueFloat',
        3: 'ParameterValueString'
    },
    valueRelations: {
        1: 'parameter_value_int',
        2: 'parameter_value_float',
        3: 'parameter_value_string'
    },


    label : "Parameter",

    getParameterQuestions : function(store, binaryId, options, callback) {
        store.verify();
        var Model = store.Model("Parameter");
        Model = Model.join("binaries_parameters");
        var questions = [];

        /* Where clause */
        var where = options.where || {};
        where.binaries_parameters = {binary_id: binaryId};

        /* query */
        Model.where(where).exec(function(records) {
            for (var idx = 0; idx < records.length; idx++) {
                record = records[idx];
                questions.push(record.getValuesQuestion());
            }
            callback(null, questions);
        });
    },

    getParameterModelChoices : function(store, options, callback) {
        debug(options);
        if (typeof options.binaryId !== "undefined" && options.binaryId !== null ) {
            debug("binary is ");
            debug(options.binaryId);
            // We have a binary id, we know the list
            var paramModelChoices = [];
            if (typeof options.addReturn !== "undefined" && options.addReturn) {
                paramModelChoices = [{name: "<< Return", value: -1}];
            }
            for (item in ParamModels) {
                debug("checking paramModels + " + item);
                if (in_array(options.binaryType, ParamModels[item].binaryTypes)) {
                    paramModelChoices.push({name: ParamModels[item].label, value: item});
                }
            }
        } else {
            // Need to define choices based on binary id in answers
            /* Should be unused since we now make sure we have a binary first */
            var choicesClosure = function(ParamModels, addReturn) {
                return function(answers) {
                    paramModelChoices = [];
                    if (typeof addReturn !== "undefined" && addReturn) {
                        paramModelChoices = [{name: "<< Return", value: -1}];
                    }
                    for (item in ParamModels) {
                        if (in_array(answers.binary_id.type, ParamModels[item].binaryTypes)) {
                            paramModelChoices.push({name: ParamModels[item].label, value: item});
                        }
                    }
                    return paramModelChoices;
                }
            }
            paramModelChoices = choicesClosure(ParamModels, options.addReturn);
        }
        callback(null, paramModelChoices);
    },

    getParameterModelQuestions : function() {
        var result = [];
        for (i in ParamModels) {
            if (typeof ParamModels[i].getModelQuestions === "function")
                result = result.concat(ParamModels[i].getModelQuestions());
        }
        return result;
    },

    getParameterProduct: function(parameterValues) {
        paramsArray = [];
        for (key in  parameterValues)
            paramsArray.push(parameterValues[key]);
        return cartesian(paramsArray);
    },

    getParameterIds: function(parameterValues) {
        paramIdArray = [];
        for (key in  parameterValues)
            paramIdArray.push(key.split("_")[1]);
        return paramIdArray;
    },

    getIntegerParameterIds: function(store, options, callback) {
        var Model = store.Model("Parameter");
        var ids = [];
        Model.where({type: this.typeInteger}).exec(function(records) {
            for (var idx = 0; idx < records.length; idx++) {
                record = records[idx];
                ids.push(record.id);
            }
            callback(null, ids);
        });
    },

    //@todo: Allow selection of some parameter ids via options
	getParametersById: function(store, options, callback) {
        var Model = store.Model("Parameter");
        Model.exec(function(records) {
        	var result = {};
        	for (var i = 0; i < records.length; ++i) {
        		var id = records[i].id;
        		result[id] = records[i];
            }
            return callback(null, result);
        });
	},

    /**
     * Map parameters with the same name between binaries
     * to params on new binary
     * @param store
     * @param jobs
     * @param options
     * @param callback
     */
    getParameterMapping: function(oldBinaryId, newBinaryId, parametersById, paramList, options) {
        var mapping = {};

        /* Iterate over parameters, sort into array if they should be copied */
        for (var id in parametersById) {
            if (paramList === null || in_array(parametersById[id].name, paramList)) {

                if (typeof mapping[parametersById[id].name] === "undefined")
                    mapping[parametersById[id].name] = {};

                if (parametersById[id].binary_id === oldBinaryId)
                    mapping[parametersById[id].name].oldParamId = id;
                else if (parametersById[id].binary_id === newBinaryId)
                    mapping[parametersById[id].name].newParamId = id;
            }
        }
        return mapping;
    },

    getParameterIdsFromNames: function(parametersById, paramNames, binaryId, options) {
        var result = {};
        for (var id in parametersById) {
            var parameter = parametersById[id];
            if (parameter.binaryId === binaryId && in_array(parameter.name, paramNames)) {
                result[parameter.name] = id;
            }
        }
        return result;
    },

    /** Makes copies of parameterValuesModels of job fromJobId
     * and associates them with toJobId
     *
      * @param store
     * @param fromJobId
     * @param toJobId
     * @param options
     * @param callback
     * @returns new parameter values in a two dimension array where the first index
     * is the type of value model as given in BaseParameter.valueModels
     */
    copyParameterValues(store, fromJobId, toJobId, options, callback) {
        var calls =[];

        for (i in module.exports.valueModels) {
            var modelName = module.exports.valueModels[i];
            calls.push(
                (function(modelName) {
                    return function (callback) {
                        return module.exports.copyParameterValuesType(store, fromJobId, toJobId, modelName, callback);
                    };
                })(modelName)
            );
        }
        return async.parallel(calls, callback);
    },

    /**
     * Copy parameter values of the type given by modelName from
     * and associate them to the given jobId
     * @param store
     * @param fromJobId
     * @param toJobId
     * @param modelName
     * @param callback
     */
    copyParameterValuesType(store, fromJobId, toJobId, modelName, callback) {
        var Model = store.Model(modelName);
        Model.where({job_id: fromJobId}).exec(function(values) {

            var copyClosure = function(value) {
                return function(callback) {
                    var attribs = db.copyAttributes(value, {except: ["id", "job_id"]});
                    attribs.job_id = toJobId;
                    return model_insert(store, modelName, attribs, callback);
                }
            };
            var calls = [];

            for (var i = 0; i < values.length; ++i)
                calls.push(copyClosure(values[i]));

            return async.parallel(calls, callback);
        });
    },

    /** Get all existing parameters that are not already
     * attached to the given binary
     * @param binary
     * @param options
     * @param callback
     */
    getAttachableParameters: function(store, binary, options, callback) {
        async.parallel([
            /* Get all parameters */
            function(callback) {
                var Parameter = store.Model("Parameter");
                Parameter.exec(function(records) {
                    callback(null, records);
                });
            },
            /* Get parameterIds that are already attached to the binary */
            function(callback) {
                var BinariesParameter = store.Model("BinariesParameter");
                BinariesParameter.where({binary_id: binary.id}).exec(function(records) {
                    debug("got junction records");
                    debug(records);
                    callback(null, ArrayHelper.getColumn(records, "parameter_id"));
                });
            },
        ], function(err, results) {
            var params = results[0];
            var attachedParams = results[1];
            /* Filter already attached parameters */
            params = params.filter(function(element) {
                return !in_array(element.id, attachedParams);
            });
            return callback(null, params);
        });
    },

}

