var inquirer    = require('inquirer');
var chalk       = require('chalk');
var nconf       = require('nconf');
var async = require('async');


var cartesian = require('cartesian');
var OpenRecord = require('openrecord');
var zpad = require('zpad');
var fs = require('fs-extra')
const path      = require('path');
var debug       = require('debug')('nxhero');


var BaseParameter = require('../lib/base_parameter');
var BaseJobgroup = require('../lib/base_jobgroup');
var BaseBinary = require('../lib/base_binary');
var BaseProblem = require('../lib/base_problem');
var BaseJob = require('../lib/base_job');
var resolveHome = require('../lib/files').resolveHome;
var log = require("../lib/log");

module.exports = function() {

    this.stampable();

    this.hasMany('job');
    this.belongsTo('binary');


    this.getString = function () {
        return this.name;
    };

    this.getProblems = function (store, options, callback) {
        var Model = store.Model("Problem");
        if (this.problem_ids === null)
            return callback(null, null);

        Model.where({id: this.problem_ids.split(",")}).exec(function (records) {
            callback(null, records);
        });

    };

    this.getParameterValues = function () {
        return JSON.parse(this.parameter_values);
    };

    /** Prepare the launch by
     *   - getting the problem records from the database
     *   - getting the parameter records indexed by id
     *   - Creating the working directory for the group
     * @param store
     * @param options
     * @param callback
     */
    this.prepareLaunch = function (store, options, callback) {
        var jobgroup = this;
        async.parallel([
            /* Get problems */
            function (callback) {
                return jobgroup.getProblems(store, {}, function (err, problems) {
                    callback(err, problems)
                })
            },
            function (callback) {
                return BaseParameter.getParametersById(store, {}, function (err, parametersById) {
                    callback(err, parametersById);
                });
            },
            function (callback) {
                return jobgroup.makeWd(callback);
            }
        ], function (err, results) {
            data = {
                problems: results[0],
                parametersById: results[1],
            };
            callback(err, data);
        });
    }

    /** Create the working directory for this job */
    this.makeWd = function (callback) {
        zpad.amount(nconf.get('runs').idpadamount);
        this.wd = path.resolve(resolveHome(nconf.get('runs').rootdir) + "/group_" + zpad(this.id));
        fs.mkdirs(this.wd, function (err) {
            callback(err);
        });
    };


    /** Create and launch jobs
     *
     * Database queries for problems and parametersById should be performed
     * beforehand (using jobgroup.prepareLaunch)
     *
     * @param store
     * @param problems
     * @param parametersById
     * @param callback
     */
    this.createAndLaunchJobs = function (store, problems, parametersById, callback) {

        /* Get paramvals: paramVals{id} : value */
        var jobParameters = BaseParameter.getParameterProduct(this.getParameterValues());
        var parameterIds = BaseParameter.getParameterIds(this.getParameterValues());
        var jobgroup = this;
        var Job = store.Model("Job");

        if (problems === null)
            problems = [null];

        /* Create jobs for each problem and parameter configuration */

        /*  - Prepare calls */
        var calls = [];
        callClosure = function (problem, params) {
            /* Create object mapping parameterIds to values */
            var paramVals = {};
            for (var i = 0; i < parameterIds.length; ++i) {
                paramVals[parameterIds[i]] = params[i];
            }

            return function (callback) {
                BaseJob.insertFromModelAndValues(
                    store, {}, this, problem, parametersById, paramVals, function (err, job) {
                        /* Launch the job */
                        job.jobgroup = jobgroup;
                        job.launch(store, {}, function (err) {
                            callback(err, job);
                        });
                    });
            };
        }

        for (var i = 0; i < problems.length; ++i) {
            for (var j = 0; j < jobParameters.length; ++j)
                calls.push(callClosure(problems[i], jobParameters[j]));
        }

        /* - Execute */
        async.parallel(calls, function (err, results) {
            if (err)
                throw err;
            log.info("All jobs submitted");
            callback(err, results);
        });
    };

    /** Launch the job by
     * - Getting the launch data
     * - Summarize the launch and have the user confirm
     * - Run prepareJobgroup on the binary model for preflight
     * - Creating and saving the jobs
     * - Letting the selected launcher launch the jobs
     *
     *  Callback receives an error and the array jobs
     * @param store
     * @param options
     * @param callback(error, jobs)
     */
    this.launch = function (store, options, callback) {

        var jobgroup = this;
        var binaryModel = this.binary.getBinaryModel();

        this.prepareLaunch(store, {}, function (err, data) {
            var problems = data.problems;
            var parametersById = data.parametersById;
            debug(parametersById);

            /* Summarize the launch and allow the user to abort */
            var parameterValues = jobgroup.getParameterValues();
            if (problems !== null) {
                var nJobs = problems.length;
                var problemNames = [];
                for (var i = 0; i < problems.length; ++i) {
                    problemNames.push(problems[i].name);
                }
            } else
                nJobs = 1;

            for (var i  in parameterValues) {
                nJobs = nJobs * parameterValues[i].length;
            }

            log.info("I will submit " + nJobs + " Jobs:");
            if (problems !== null)
                log.verbose("Problems: " + problemNames.join(", "));

            debug(parameterValues);
            for (var i  in parameterValues) {
                id = i.split("_")[1];
                log.verbose("Values of " + parametersById[id].name + ": " + (typeof parameterValues[i] !== "string" ? parameterValues[i].join(", ") : parameterValues[i]));
            }

            //inquirer.prompt([{type: 'input',name: 'continue', 'message': "Continue? (y/n)"}]).then(function(answers) {
            answers = {continue: "y"};

            if (answers.continue != "y")
                return callback(null);

            /* Run the binaries pre-flight checks */
            binaryModel.prepareJobgroup(jobgroup, jobgroup.wd, function (err) {
                if (err !== null) {
                    log.info("An error occured in the preflight checks of binary " + binaryModel.label);
                    log.verbose(err.message);
                    inquirer.prompt([{
                        type: 'list',
                        name: 'continue',
                        message: "Okay?",
                        choices: ["Okay!"]
                    }]).then(function (answers) {
                        return callback()
                    });
                } else {
                    log.verbose("Preflight checks of " + binaryModel.label + " passed!");

                    /* Create and launch the jobs */
                    jobgroup.createAndLaunchJobs(store, problems, parametersById, callback)
                }
            });

        });
    };
};
