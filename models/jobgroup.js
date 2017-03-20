var inquirer    = require('inquirer');
var chalk       = require('chalk');
var nconf       = require('nconf');
var async = require('async');
var date = require('../lib/date');

var cartesian = require('cartesian');
var OpenRecord = require('openrecord');
var zpad = require('zpad');
var fs = require('fs-extra');
const path      = require('path');
var debug       = require('debug')('nxhero');


var MenuHelpers = require('../lib/menu_helpers');

var BaseParameter = require('../lib/base_parameter');
var BaseJobgroup = require('../lib/base_jobgroup');
var BaseBinary = require('../lib/base_binary');
var BaseProblem = require('../lib/base_problem');
var BaseJob = require('../lib/base_job');
var resolveHome = require('../lib/files').resolveHome;
var log = require("../lib/log");
var db = require("../lib/db");

module.exports = function() {

    this.stampable();

    this.hasMany('job');
    this.belongsTo('binary');

    this.models_name = "Jobgroups";

    this.getString = function () {
        return this.name;
    };

    this.confirmLaunch = true;
    this.confirmPreflightErrors = true;


    this.setWd = function (store, options, callback) {
        zpad.amount(nconf.get('runs').idpadamount);
        this.wd = path.resolve(resolveHome(nconf.get('runs').rootdir) + "/group_" + zpad(this.id));
        this.save(function (okay) {
            if (!okay) {
                return callback(new Error("Unable to set wd on jobgroup"));
            } else {
                return callback(null);
            }
        });
    };

    this.getProblemsFromTestset = function(store, options, callback) {
        var jobgroup = this;
        var Testset = store.Model("Testset");
        Testset.join({testsets_problems: "problem"}).where({id: this.testset_id}).exec(function(records){
            var testset = records[0];
            var problems = [];
            for (var i  = 0; i < testset.testsets_problems.length; ++i) {
                var problem = testset.testsets_problems[i].problem;
                problem.timeLimitFactor = testset.testsets_problems[i].timelimit_factor === null ? 1 : testset.testsets_problems[i].timelimit_factor;
                problem.timeLimit = jobgroup.timelimit * problem.timeLimitFactor;
                problems.push(problem);
            }
            return callback(null, problems);
        });
    },

    this.getProblems = function (store, options, callback) {
        debug("get problems");
        var jobgroup = this;
        if (this.testset_id !== null) {
            debug("not null");
            return this.getProblemsFromTestset(store, options, callback);
        } else {
            var Model = store.Model("Problem");
            if (this.problem_ids === null)
                return callback(null, null);

            Model.where({id: this.problem_ids.split(",")}).exec(function (records) {
                /* No testset: set all timelimitFactors to 1 */
                for (var i = 0; i < records.length; i++) {
                    records[i].timeLimitFactor = 1.0;
                    records[i].timeLimit = jobgroup.timelimit;
                }

                callback(null, records);
            });
        }
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
                //@todo: Only get parameters for which the jobgroup has values
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
        var jobgroup = this;

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
                    store, {}, jobgroup, problem, parametersById, paramVals, function (err, job) {
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

            jobgroup.setLaunched(function (err) {
                if (err)
                    throw err;
                callback(err, results);
            })

        });
    };

    this.launch = function (store, options, callback) {
        log.info("Launching jobgroup " + this.name);
        var jobgroup = this;

        var inform = function(err) {
            if (err)
                log.error("Error launching jobgroup: " + err.message);
            else
                log.info("Successfully launched jobgroup in " + jobgroup.wd);
            return callback(null);
        };

        if (this.ready_for_launch === true) {
            return this.preflightAndLaunch(store, options, inform);
        } else {
            return this.prepareAndLaunch(store, options, inform);
        }
    };

    /**
     * If the jobgroup was ready to launch, we dont need to create jobs
     * (this must already be done). So we need to
     * - Create wd if needed
     * - Run preflight checks on binary
     * - launch
     * @param store
     * @param options
     * @param callback
     * @returns {Error}
     */
    this.preflightAndLaunch = function (store, options, callback) {

        var jobgroup = this;
        var binaryModel = this.binary.getBinaryModel();

        /* Create wd */
        async.series([
            function (callback) {
                return fs.mkdirs(jobgroup.wd, callback);
            },
            function (callback) {
                return binaryModel.runPreflightChecks(jobgroup, jobgroup.wd, callback);
            },
            function (callback) {
            /* Get jobgroup without job relation to avoid circular dependencies when attaching to job */
                return db.findByPk(store, "Jobgroup", jobgroup.id, {join: "binary"}, callback);
            }
            //@todo: sumarize and confirm
        ], function (err, results) {
            if (err) {
                log.error("Error preparing launch: " + err.message, function(err) {
                    if (err)
                        throw err;
                    return callback(null);
                });
            } else {
                var minJobgroup = results[2];

                /* All good, launch */
                calls = [];
                var launchCallback = function(job) {
                    job.jobgroup = minJobgroup;

                    return function(callback) {
                        console.info("Launching job " + job.id);
                        job.launch(store, {}, callback);
                    }
                };
                for (var i = 0; i < jobgroup.job.length; ++i) {
                    calls.push(launchCallback(jobgroup.job[i]));
                }
                async.parallel(calls, function(err, results) {
                    return callback(err);
                });
            }
        });

    };

    /** Launch the job by
     * - Getting the launch data
     * - Summarize the launch and have the user confirm
     * - Run runPreflightChecks on the binary model for preflight
     * - Create and save the jobs
     * - Let the selected launcher launch the jobs
     *
     *  Callback receives an error and the array jobs
     * @param store
     * @param options
     * @param callback(error, jobs)
     */
    this.prepareAndLaunch = function (store, options, callback) {
        var jobgroup = this;
        var binaryModel = this.binary.getBinaryModel();

        this.prepareLaunch(store, {}, function (err, data) {
            var problems = data.problems;
            var parametersById = data.parametersById;

            /* Summarize the launch and allow the user to abort */
            var parameterValues = jobgroup.getParameterValues();
            if (problems !== null) {
                var nJobs = problems.length;
                var problemNames = [];
                for (var i = 0; i < problems.length; ++i) {
                    problemNames.push(problems[i].name + "(" + date.secondsToDurationString(problems[i].timeLimit)+ ")");
                }
            } else
                nJobs = 1;

            for (var i  in parameterValues) {
                nJobs = nJobs * parameterValues[i].length;
            }

            log.info("I will submit " + nJobs + " Jobs:");
            if (problems !== null)
                log.verbose("Problems (Timelimits): " + problemNames.join(", "));

            for (var i  in parameterValues) {
                id = i.split("_")[1];
                log.verbose("Values of " + parametersById[id].name + ": " + (typeof parameterValues[i] !== "string" ? parameterValues[i].join(", ") : parameterValues[i]));
            }
            MenuHelpers.confirmIfTrue(jobgroup.confirmLaunch, null, function(err, confirmed) {
            //inquirer.prompt([{type: 'input', name: 'continue', 'message': "Continue? (y/n)"}]).then(function (answers) {

                if (!confirmed) {
                    log.info("Canceled");
                    return callback(null);
                }

                /* Run the binaries pre-flight checks */
                binaryModel.runPreflightChecks(jobgroup, jobgroup.wd, function (err) {
                    if (err !== null) {
                        return jobgroup.handlePreflightError(binaryModel, err, callback);
                    } else {
                        log.verbose("Preflight checks of " + binaryModel.label + " passed!");

                        /* Create and launch the jobs */
                        jobgroup.createAndLaunchJobs(store, problems, parametersById, callback)
                    }
                });
            });

        });
    }

    this.handlePreflightError = function (binaryModel, err, callback) {
        log.error("An error occured in the preflight checks of binary " + binaryModel.label);
        log.verbose(err.message);
        MenuHelpers.confirmIfTrue(this.confirmPreflightErrors, "Okay?",function (confirmed) {
            return callback(new Error("Preflight checks failed"));
        });
    };

    this.setLaunched = function (callback) {
        this.launched_date = date.dbDatetime();
        this.save(function (okay) {
            if (!okay)
                callback(new Error("Error updating this " + this.id));
            else
                callback(null);
        });
    };

    this.deleteDeep = function (store, options, callback) {
        var jobgroup = this;
        inquirer.prompt({
                type: "confirm",
                name: "confirm",
                message: "Really delete jobgroup " + this.name + "with jobs and trash directory?",
            }
        ).then(function (answers) {
            if (answers.confirm === true)
            {
                var calls = [];


                /* Check if wd exists before adding the call */
                var wdExists = true;
                try {
                    fs.statSync(jobgroup.wd);
                } catch (e) {
                    wdExists = false;
                    log.verbose("Groups working directory " + jobgroup.wd + " does not exist.");
                }

                if (wdExists) {
                    /* Add call to move groups wd if it exists */
                    var trashdir = path.resolve(resolveHome(nconf.get('runs').rootdir) + "/.trash");
                    var target = trashdir + "/" + path.basename(jobgroup.wd);
                    console.info("Moving " + jobgroup.wd + " to " + target);
                    calls.push(function (callback) {
                        /* Create runs/.trash if needed*/

                        fs.mkdirs(trashdir, function (err) {
                            if (err)
                                return callback(err);

                            /* Move jobgroup dir to trash */
                            fs.move(jobgroup.wd, target, function (err) {
                                return callback(err);
                            });
                        });
                    });
                }

                /* Delete jobs */
                calls.push(function (callback) {
                    var Job = store.Model("Job");
                    Job.where({jobgroup_id: jobgroup.id}).deleteAll(function (okay) {
                        if (!okay)
                            throw new Error("Error deleting jobs of jobgroup");
                        console.info("Deleted jobs of the jobgroup");
                        callback(null);

                    });
                });

                async.parallel(calls, function (err, results) {
                    /* Finally delete the jobgroup */
                    jobgroup.delete(function (okay) {
                        if (!okay)
                            throw new Error("Error deleting jobgroup");

                        log.info("Deleted jobgroup");
                        return callback(null);
                    });
                });

            }
            else
                return callback(null);
        });
    }
}
