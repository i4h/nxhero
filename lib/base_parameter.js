var cartesian = require('cartesian');
var debug       = require('debug')('nxhero');
var ParamModels = require('../parameters/module.js');
var in_array = require('in_array');

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
        var questions = [];
        Model.where({binary_id: binaryId}).exec(function(records) {
            for (var idx = 0; idx < records.length; idx++) {
                record = records[idx];
                questions.push(record.getValuesQuestion());
            }
            callback(null, questions);
        });
    },

    getParameterModelChoices : function(store, options, callback) {
        if (options.binaryId !== null ) {
            // We have a binary id, we know the list
            var paramModelChoices = [];
            if (typeof options.addReturn !== "undefined" && options.addReturn) {
                paramModelChoices = [{name: "<< Return", value: -1}];
            }
            for (item in ParamModels) {
                if (in_array(options.binaryType, ParamModels[item].binaryTypes)) {
                    paramModelChoices.push({name: ParamModels[item].label, value: item});
                }
            }
        } else {
            // Need to define choices based on binary id in answers
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


}

