#!/usr/bin/env node

var chalk       = require('chalk');
var inquirer    = require('inquirer');
var listDelete = require('./list_delete');
var modelInsert = require('./model_insert');
var async = require('async');
var debug       = require('debug')('nxhero');


var BaseParameter = require('./base_parameter.js');
var BaseBinary = require('./base_binary');
var ParamModels = require('../parameters/module.js');
var db = require('./db');
var log = require("../lib/log");



var modelName = "Parameter";

module.exports = {

    main: function(store, options, callback) {
        db.getModelSelectQuestion(store, modelName, {returnItem: true, newItem: true}, function(err, question) {
            inquirer.prompt([question]).then(function(answers) {
                if (answers.id === -1)
                    callback(null);
                else if (answers.id === -2)
                    module.exports.add(store, {}, callback);
                else {
                    Model = store.Model(modelName);
                    Model.where({id: answers.id}).delete();
                    callback(null);
                }
            });
        });
    },

	getAddQuestions(store, options, callback) {
    	var noBinary = typeof options.noBinary === "undefined" ? false : options.noBinary;
		calls = [];

		if (noBinary === false)
			calls.push(function(callback) {
                BaseBinary.getBinaryChoices(store, {}, callback);
            });


		calls.push(function(callback) {
            BaseParameter.getParameterModelChoices(
                store,
                {addReturn: noBinary, binaryId: options.binaryId, binaryType: options.binaryType},
                callback
            );
        });

        async.parallel(calls, function(err, results) {
        	var questions = [];
            if (!noBinary) {
            	questions.push({
                        type: 'list',
                        name: 'binary_id',
                        message: 'For which binary:',
                        choices: results[0],
                    });
            	paramChoices = results[1];
            } else
            	paramChoices = results[0];

            questions = questions.concat([
				{
                    type: 'list',
                    name: 'parameter_model',
                    message: 'Parameter Type:',
                    choices: paramChoices,
                },
                {
                    type: 'input',
                    name: 'name',
                    message: 'Name:',
                    when: function (answers) {
                        return answers.parameter_model !== -1;
                    },

                },
                {
                    type: 'list',
                    name: 'type',
                    message: 'Value Type:',
                    choices: BaseParameter.typeChoices,
                    when: function (answers) {
                        return answers.parameter_model !== -1;
                    },

                },
                {
                    type: 'input',
                    name: 'values',
                    message: 'List of choices (comma seperated)',
                    when: function (answers) {
                        return (answers.parameter_model !== -1 && answers.type === BaseParameter.typeString);
                    },
                },
                {
                    type: 'input',
                    name: 'default_value',
                    message: 'Default Value',
                    when: function (answers) {
                        return answers.parameter_model !== -1;
                    },
                },
            ]);
            questions = questions.concat(BaseParameter.getParameterModelQuestions());

            return callback(null, questions);
        });
	},

    add: function(store, options, callback) {
        var binaryId = null;
        if (typeof options.binaryId !== "undefined") {
            log.info("Done. Creating Next Parameter");
            binaryId = options.binaryId;
        }

        var options = {
            noBinary : (binaryId !== null),
            binaryId: binaryId,
            binaryType: (binaryId === null ? null : options.binaryType)
        };

        module.exports.getAddQuestions(store, options, function(err, questions) {
            inquirer.prompt(questions).then(function(answers) {

                /* Quit if user chose to return on parameter type selection */
                if (answers.parameter_model === -1)
                    return callback(null);

                var binaryType;
                if (binaryId !== null)
                    answers.binary_id = binaryId;
                else {
                    binaryType = answers.binary_id.type;
                    answers.binary_id = answers.binary_id.id;
                }

                /* Remove spaces from values list */
                if (typeof answers.values !== "undefined")
                    answers.values = answers.values.trim().replace(/ *, */g,',');

                /* Split all answers starting with 'modelData_' and combine in model_data field */
                modelData = {};
                for (var i in answers) {
                    if (i.split("_")[0] === "modelData") {
                        var name = i.split("_")[1];
                        modelData[name] = answers[i];
                        delete answers[i];
                    }
                }
                answers.model_data = JSON.stringify(modelData);

                /* Save */
                modelInsert(store, "Parameter", answers, function(err, parameter) {
                    if (err !== null)
                        throw new Error("Error saving parameter");
                });
                return module.exports.add(store, {binaryId: answers.binary_id, binaryType: binaryType}, callback)
            });
        });
    }
}
