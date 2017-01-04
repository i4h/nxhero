var inquirer    = require('inquirer');
var listDelete = require('./list_delete');
var modelInsert = require('./model_insert');
var BaseProblem = require('./base_problem');
var BaseBinary = require('./base_binary');
var BaseParameter = require('./base_parameter');
var BaseLauncher = require('./base_launcher');
var extend = require('util')._extend;
var async = require('async');
var in_array = require('in_array');
var debug       = require('debug')('nxhero');

var listSelect = require('./list_select');
var parseSequence = require('./parse_sequence');
var ParamModels = require('../parameters/module.js');
var log = require("../lib/log");


module.exports = {
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
                BaseParameter.getParameterQuestions(store, {}, callback);
            },
            function(callback) {
                BaseParameter.getIntegerParameterIds(store, {}, callback);
            }
        ], function(err, results) {

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
                    type: 'checkbox',
                    name: 'problem_ids',
                    message: 'Problems:',
                    choices: results[1],
                    when: function(answers) {
                        model =  ParamModels[answers.binary_id.type];
                        return model.takesProblems;
                    }
                },
            ];
            questions = questions.concat(results[2]);

            inquirer.prompt(questions).then(function(answers) {
                var paramvals = extend({}, answers);
                delete paramvals.name;
                delete paramvals.binary_id;
                delete paramvals.problem_ids;
                delete paramvals.description;
                for (prop in paramvals) {
                    delete answers[prop];
                    id = prop.split("_")[1];
                    if (in_array(id, results[3])) {
                        paramvals[prop] = parseSequence(paramvals[prop]);
                    }
                }
                answers['parameter_values'] = JSON.stringify(paramvals);

                answers.binary_id = answers.binary_id.id;

                modelInsert(store, "Jobgroup", answers, function(err, jobgroup) {
                    callback(null, jobgroup);
                });
            });
        });
    },

}
