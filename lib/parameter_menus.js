#!/usr/bin/env node

var chalk       = require('chalk');
var inquirer    = require('inquirer');
var listDelete = require('./list_delete');
var modelInsert = require('./model_insert');
var async = require('async');
var debug       = require('debug')('nxhero');
var LatexTable = require('latex-data-table');


var BaseParameter = require('./base_parameter');
var BaseBinary = require('./base_binary');
var ParamModels = require('../parameters/module');
var db = require('./db');
var log = require("../lib/log");
var ArrayHelper = require('arrayhelper-yii2-style');



var modelName = "Parameter";

module.exports = {

    main: function(store, options, callback) {
        inquirer.prompt({
            type: "list",
            message: "Parameter Action:",
            name: "action",
            choices: [
                {
                    name: "Create New",
                    value: module.exports.add
                },
                {
                    name: "Attach Exising to Binary",
                    value: module.exports.attach,
                },
                {
                    name: "List",
                    value: module.exports.list,
                },
                {
                    name: "Delete",
                    value: module.exports.selectDelete,
                },
            ]
        }).then(function(answers) {
            return answers.action(store, options, callback);
        });
    },

    selectDelete: function(store, options, callback) {
        var options = {returnItem: true, join: {binaries_parameters: "binary"}};
        db.getModelSelectQuestion(store, modelName, options, function(err, question) {
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

    list: function(store, options, callback) {
        var options = {returnItem: true, join: {binaries_parameters: "binary"}, order: "parameters.name"};
        log.info("Parameter List:")
        db.getModelList(store, modelName, options, function(err, body, header) {
            var table = LatexTable(body, header, {style: "ascii"});
            log.verbose(table);
            return callback(err);
        });
    },

    attach: function(store, options, callback) {
        /* Ask stuff */
        async.waterfall([
                function(callback) {
                BaseBinary.getBinaryChoices(store, {fullRecord: true}, function(err, choices) {
                    inquirer.prompt({
                        type: 'list',
                        name: 'binary',
                        message: 'Select the binary:',
                        choices: choices,
                    }).then(function(answers) {
                        return callback(null, answers.binary)
                    });
                });
            },
            function(binary, callback) {
                BaseParameter.getAttachableParameters(store, binary, options, function(err, parameters) {
                    inquirer.prompt({
                        type: 'checkbox',
                        message: "Which Parameters?",
                        name: "params",
                        choices: ArrayHelper.reMap(parameters,[true, 'name'],['value', 'name'])
                    }).then(function(answers) {
                        return callback(null, binary, answers);
                    });
                });
            }
        ], function(err, binary, answers) {
            if (err)
                return callback(err);
            binary.parameter = answers.params;
            binary.save(function(result) {
                if (result !== true)
                    return callback(new Error("Error attaching parameters"));
                else
                    return callback(null);
            });
        });
    },

    getAddQuestions(store, options, callback) {
        if (typeof options.binary === "undefined")
            return callback(new Error("Need binary for add questions"));
        /* Find out if a binary id is given via options */
		calls = [];

		var modelChoicesClosure = function(binary) {
		    return function(callback) {
                var getOptions = {addReturn: options.addReturn, binaryId: binary[0].id, binaryType: binary[0].type};
                return BaseParameter.getParameterModelChoices(
                    store,
                    getOptions,
                    callback
                );
            }
        };
		calls.push(modelChoicesClosure(options.binary));

        async.parallel(calls, function(err, results) {
        	var questions = [];
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
        var binary = options.binary;

        /* Ask for the binary or use the one in the options */
        async.series([
            function(callback) {
                if (typeof options.binary !== "undefined") {
                    log.info("Done. Creating Next Parameter");
                    return callback(null, options.binary);
                }
                /* No binary */
                BaseBinary.getBinaryChoices(store, {fullRecord: true}, function(err, choices) {
                    inquirer.prompt({
                        type: 'checkbox',
                        name: 'binary',
                        message: 'For which binaries:',
                        choices: choices,
                    }).then(function(answers) {
                        return callback(null, answers.binary)
                    });
                });
        },
        ], function(err, results) {
            if (err)
                return callback(err);

            var binary = results[0]
            var addOptions = {};
            if (typeof options.binary === "undefined")
                addOptions.addReturn === false; /* Had to ask for binary */

            else
                addOptions.addReturn = true;  /* Binary was given */

            addOptions.binary = binary;

            module.exports.getAddQuestions(store, addOptions, function(err, questions) {
                if (err)
                    return callback(err);
                inquirer.prompt(questions).then(function(answers) {

                    /* Quit if user chose to return on parameter type selection */
                    if (answers.parameter_model === -1)
                        return callback(null);

                    answers.binary = binary;

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
                        if (err !== null) {
                            throw new Error("Error saving parameter");
                        }
                        return module.exports.add(store, {binary: binary}, callback)
                    });
                });
            });
        });
    }
}
