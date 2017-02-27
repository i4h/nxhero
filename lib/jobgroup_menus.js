var inquirer    = require('inquirer');
var listDelete = require('./list_delete');
var modelInsert = require('./model_insert');
var BaseProblem = require('./base_problem');
var BaseTestset = require('./base_testset');
var BaseBinary = require('./base_binary');
var BaseParameter = require('./base_parameter');
var BaseLauncher = require('./base_launcher');
var extend = require('util')._extend;
var async = require('async');
var in_array = require('in_array');
const path      = require('path');
var resolveHome = require('../lib/files').resolveHome;
var debug       = require('debug')('nxhero');
var nconf       = require('nconf');
var zpad = require('zpad');

var listSelect = require('./list_select');
var parseSequence = require('./parse_sequence');
var ParamModels = require('../parameters/module.js');
var BinaryModels = require('../binaries/module.js');

var log = require("../lib/log");
var db = require('./db');

var modelName = "Jobgroup";


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
                    return Model.where({id: answers.id}).exec(function(records) {
                        return records[0].deleteDeep(store, {}, callback);
                    });
                }
            });
        });
    },

    list: function(store, options, callback) {
        listDelete(store, "Jobgroup", {}, callback);
    },

    launch: function(store, options, callback) {
        listSelect(store, "Jobgroup", {join: ["binary"]}, function(err, jobgroup) {
            if (jobgroup === "Return") {
                callback(null);
            } else {
                question = BaseLauncher.getLauncherQuestion(store, {});
                inquirer.prompt([BaseLauncher.getLauncherQuestion(store, {})]).then(function(answers) {
                    jobgroup.launcher = answers.launcher;
                    jobgroup.save(function(okay) {
                        if (!okay)
                            throw new Error("Error saving launcher in Jobgrup");

                        log.verbose(jobgroup);
                        /* Selected jobgroup, now create jobs */
                        jobgroup.launch(store, {}, callback);
                    });
                });

            }
        });
    },

    add: function(store, options, callback) {
        // Get choices in parallel, then ask questions
        async.parallel([
            function(callback) {
                BaseBinary.getBinaryChoices(store, {}, callback);
            },
            function(callback) {
                BaseProblem.getProblemChoices(store, {}, callback);
            },
            function(callback) {
                BaseTestset.getTestsetChoices(store, {join: {testsets_problems:"problem"}}, callback);
            },

            /*function(callback) {
                BaseParameter.getParameterQuestions(store, {}, callback);
            },*/
            function(callback) {
                BaseParameter.getIntegerParameterIds(store, {}, callback);
            }
        ], function(err, results) {

            /* Add manual select option to testset choices */
            var manualChoice = [{
                name: "Select Problems manually",
                value: -1
            }];
            testsetChoices = manualChoice.concat(results[2]);
            debug(testsetChoices);

            var questions = [
                {
                    type: 'input',
                    name: 'name',
                    message: 'Jobgroup Name:',
                },
                {
                    type: 'editor',
                    name: 'description',
                    message: 'Description:',
                },
                {
                    type: 'list',
                    name: 'binary_id',
                    message: 'Binary:',
                    choices: results[0],
                },
                {
                    type: 'list',
                    name: 'testset',
                    message: 'Testset:',
                    choices: testsetChoices,
                    when: function(answers) {
                        model =  BinaryModels[answers.binary_id.type];
                        return model.takesProblems;
                    }
                },
                {
                    type: 'checkbox',
                    name: 'problem_ids',
                    message: 'Problems:',
                    choices: results[1],
                    when: function(answers) {
                        model =  BinaryModels[answers.binary_id.type];
                        return model.takesProblems && answers.testset_id === -1;
                    }
                },
            ];
            var intParameterIds = results[3];

            inquirer.prompt(questions).then(function(answers) {
                /* If a testset was given, set problem_ids */
                if (answers.testset !== -1)
                    answers.problem_ids = answers.testset;
                delete answers.testset_id;

                /* Now ask parameter questions */
                BaseParameter.getParameterQuestions(store, answers.binary_id.id, {}, function(err, paramQuestions) {
                    inquirer.prompt(paramQuestions).then(function(paramAnswers) {
                        var paramvals = paramAnswers;
                        for (prop in paramvals) {
                            var id = prop.split("_")[1];
                            if (in_array(id, intParameterIds)) {
                                paramvals[prop] = parseSequence(paramvals[prop]);
                            }
                        }
                        answers['parameter_values'] = JSON.stringify(paramvals);
                        answers.binary_id = answers.binary_id.id;

                        modelInsert(store, "Jobgroup", answers, function (err, jobgroup) {
                            /* Set and save wd once we have id */
                            jobgroup.wd = path.resolve(resolveHome(nconf.get('runs').rootdir) + "/group_" + zpad(jobgroup.id));
                            jobgroup.save(function(okay) {
                                if (!okay)
                                    throw new Error("Unable to wd on jobgroup");
                                return callback(null, jobgroup);
                            });
                        });
                    });
                });
            });
        });
    },

}
