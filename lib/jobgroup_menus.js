var inquirer    = require('inquirer');
var selectAndCall = require('./select_and_call');
var modelInsert = require('./model_insert');
var BaseJobgroup = require('./base_jobgroup');
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
var LatexTable = require('latex-data-table');

var listSelect = require('./list_select');
var parseSequence = require('./parse_sequence');
var ParamModels = require('../parameters/module.js');
var BinaryModels = require('../binaries/module.js');

var date = require('./date');
var log = require("../lib/log");
var db = require('./db');

var modelName = "Jobgroup";


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
                    name: "Launch",
                    value: module.exports.launch,
                },
                {
                    name: "List",
                    value: module.exports.list,
                },
                {
                    name: "List Partitions",
                    value: module.exports.listPartitions,
                },

                {
                    name: "Delete",
                    value: module.exports.delete,
                },
            ]
        }).then(function(answers) {
            return answers.action(store, options, callback);
        });
    },

    delete: function(store, options, callback) {
        options.returnItem = true;
        options.listType = "checkbox";
        options.series = true;
        let call = function(store, record, options) {
            return new Promise((resolve, reject) => {
                record.deleteDeep(store, options, function(err) {
                    if (err)
                        return reject(err);
                    return resolve();
                });
            });
        };

        selectAndCall(store, "Jobgroup", call, options).then(() => {
            return callback(null);
        });
    },


    list: function(store, options, callback) {
        var options = {};
        log.info("Jobgroup List:")
        db.getModelList(store, modelName, options, function(err, body, header) {
            var table = LatexTable(body, header, {style: "ascii"});
            log.verbose(table);
            return callback(err);
        });
    },

    listPartitions: function(store, options, callback) {
        let listHeader = [{content:'Name', colWidth: 40}, {content:'wd', colWidth: 30},{content:'Partition', colWidth: 20} ];
        var options = {};
        log.info("Jobgroup / Partition List:")

        /* Get jobgroups */
        var Model = store.Model("Jobgroup");
        var Job = store.Model("Job");
        Model.exec(function(records) {



            /* Get one job for each group in parallel */
            let calls = [];
            let getPartitionCb = function(jobgroupId) {
                return function(callback) {
                    Job.where({jobgroup_id: jobgroupId}).limit(1).exec( (job)  => {
                        if (typeof job === "undefined")
                            return callback(null, "- no jobs -");
                        debug("got job " + job.id + " - " + job.launcher_data);
                        let d = JSON.parse(job.launcher_data);
                        debug(d);
                        return callback(null, d.slurmOptions.partition);
                    });
                }
            }
            // records.forEach((record) => {
            //     calls.push(getPartitionCb(record.id));
            //     //calls.push(getPartitionCb(records[0].id));
            //     debug("getting partition of jobgroup " + records[0].name)
            // });
            //
            // async.parallel(calls, function(err, results)

            Job.select(["launcher_data", "jobgroup_id", "id"]).group("jobgroup_id").exec( (jobs) =>
            {
                let partitions = {};

                jobs.forEach((job) => {
                    debug(job);
                    let d = JSON.parse(job.launcher_data);
                    partitions[job.jobgroup_id] = d.slurmOptions.partition;
                });
                debug(partitions);
                var rows = [];

                for (var idx = 0; idx < records.length; idx++) {
                    //debug(records[idx].name + " - " + results[idx]);
                    let record = records[idx];
                    if (typeof partitions[record.id] === "undefined")
                        rows.push([record.name, path.basename(record.wd), "- no jobs -"]);
                    else
                        rows.push([record.name, path.basename(record.wd), partitions[record.id]]);
                    debug(rows)
                }
                var table = LatexTable(rows, listHeader, {style: "ascii"});
                log.verbose(table);

                callback(null, rows, listHeader);
            });
        });
    },

    launch: function(store, options, callback) {
        listSelect(store, "Jobgroup", {pageSize: 30, type: "list", join: ["binary"], where: {launched_date: null}, order: "jobgroups.id", DESC: true}, function(err, jobgroup) {
            if (jobgroup === "Return") {
                return callback(null);
            } else
                return module.exports.launchJobgroup(store, jobgroup, options, callback);
        });
    },

    launchJobgroup: function(store, jobgroup, options, callback) {
        /* Get the jobgroup with all joins everything we need */
        db.findByPk(store, "Jobgroup", jobgroup.id, {join: BaseJobgroup.getLaunchJoin()}, function(err, jobgroup) {
            //var question = BaseLauncher.getLauncherQuestion(store, {});
            inquirer.prompt([BaseLauncher.getLauncherQuestion(store, {})]).then(function (answers) {
                db.setAttributes(jobgroup, {launcher: answers.launcher}, {}, true, function (err) {
                    if (err)
                        throw err;
                    /* Selected jobgroup, now launch */
                    return jobgroup.launch(store, {}, callback);
                });
            });
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
            },
            function(callback) {
                BaseParameter.getFloatParameterIds(store, {}, callback);
            },

        ], function(err, results) {
            /* Add manual select option to testset choices */
            var manualChoice = [{
                name: "Select Problems manually",
                value: -1
            }];
            testsetChoices = manualChoice.concat(results[2]);
            var askForDescription = nconf.get('jobgroups').askForDescription;

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
                    when: askForDescription !== false,
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
                        return model.takesProblems && answers.testset === -1;
                    },
                    pageSize: 30,
                },
                {
                    type: 'input',
                    name: 'timelimit',
                    message: 'Timelimit (0: No limit, "3600", "3600s", "60m" and "1h" are equivalent):',
                    default: "0",
                },
            ];
            var intParameterIds = results[3];
            var floatParameterIds = results[4];

            inquirer.prompt(questions).then(function(answers) {
                /* If a testset was given, set problem_ids */
                if (typeof answers.testset !== "undefined" && answers.testset !== -1) {
                    answers.problem_ids = answers.testset.problemIds;
                    answers.testset_id = answers.testset.id;
                }
                delete answers.testset;
                if (answers.timelimit.trim() === "0" ||  answers.timelimit.trim() === "")
                    answers.timelimit = null;
                else
                    answers.timelimit = date.parseDurationString(answers.timelimit);

                /* Now ask parameter questions */
                BaseParameter.getParameterQuestions(store, answers.binary_id.id, {}, function(err, paramQuestions) {
                    inquirer.prompt(paramQuestions).then(function(paramAnswers) {
                        var paramvals = paramAnswers;
                        for (prop in paramvals) {
                            var id = prop.split("_")[1];
                            if (in_array(id, intParameterIds) || in_array(id, floatParameterIds)) {
                                paramvals[prop] = parseSequence(paramvals[prop]);
                            }
                        }
                        answers['parameter_values'] = JSON.stringify(paramvals);
                        answers.binary_id = answers.binary_id.id;

                        modelInsert(store, "Jobgroup", answers, function (err, jobgroup) {
                            /* Set and save wd once we have id */
                            jobgroup.setWd(store, {}, function(err) {
                                if (err)
                                    throw err;
                                return callback(null, jobgroup);
                            });
                        });
                    });
                });
            });
        });
    },
}
