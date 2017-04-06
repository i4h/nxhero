var inquirer    = require('inquirer');
var debug       = require('debug')('nxhero');
var async = require('async');
var pad = require('pad');
fs = require('fs');


var BaseJob = require('../lib/base_job');
var BaseParameter = require('../lib/base_parameter');
var BaseProcessor = require('../lib/base_processor');
var BaseJobgroup = require('../lib/base_jobgroup');
var BaseTag = require('../lib/base_tag');


var JobgroupMenus = require('../lib/jobgroup_menus');

var JobFilter = require('../lib/job_filter');
var db = require('../lib/db.js');

var Menu = require('../lib/flatActionsMenu');

var MenuHelper = require('../lib/menu_helpers');
var ArrayHelper = require('../lib/array_helper');
var log = require("../lib/log");




module.exports = {

    labelPad : 16,
    numberPad: 5,

    menuActions : {
        menu: {
            d: {
                label: '(d)isplay',
                breadcrumb: "Display",
                menu: {
                    j: {
                        label: '(j)obs',
                        final: true
                    },
                    p: {
                        label: '(p)arameters',
                        final: true
                    },
                    o: {
                        label: 'pr(o)blems',
                        final: true
                    },
                    f: {
                        label: 'active (f)ilters',
                        final: true
                    },
                }
            },
            f: {
                label: '(f)ilter',
                breadcrumb: "Filter",
                menu: {
                    j: JobFilter.getElementFilterMenu('(j)ob', 'Job', function (input) {
                        return {
                            type: 'checkbox',
                            name: 'ids',
                            message: 'Jobs:',
                            choices: ArrayHelper.reMap(input.data.jobs, ['id', 'name'], ['value', 'name'])
                        };
                    }),
                    g: JobFilter.getElementFilterMenu('job(g)roup', 'Jobgroup', function (input) {
                        return {
                            type: 'checkbox',
                            name: 'ids',
                            message: 'Jobgroups:',
                            pageSize: 30,
                            choices: ArrayHelper.reMap(input.data.jobgroups, ['id', 'name'], ['value', 'name'])
                        };
                    }),
                    t: JobFilter.getElementFilterMenu('(t)ag', 'Tag', function (input) {
                        return {
                            type: 'checkbox',
                            name: 'ids',
                            message: 'Tags:',
                            choices: input.data.tagsUnique,
                        };
                    }),
                    p: {
                        label : '(p)arameter',
                        breadcrumb: "Parameter",
                        menu: {
                            s : {
                                label: "(s)et",
                                breadcrumb: "Set",
                                question : function (input) {
                                    var questions = [];
                                    questions.push({
                                        type: 'list',
                                        message: "Which Parameter?",
                                        name: "paramId",
                                        choices: ArrayHelper.reMap(input.data.parameters.parameters,['id', 'name'],['value', 'name'])
                                    });
                                    questions.push({
                                        type: 'checkbox',
                                        message: "Which Values?",
                                        name: "values",
                                        choices: function(answers) {
                                            return input.data.parameters.valuesById[answers.paramId];
                                        }
                                    })
                                    return questions;
                                }
                            },
                            d : {
                                label: "(d)elete",
                                breadcrumb: "Delete",
                                question : function (input) {
                                    var questions = [];
                                    questions.push({
                                        type: 'list',
                                        message: "Which Parameter?",
                                        name: "paramId",
                                        choices: ArrayHelper.reMap(input.filters.parameters,[true, 'name'],['value', 'name'])
                                    });
                                    return questions;
                                }
                            },
                            r: {
                                label: "(r)eset",
                                final: true,
                            },
                        }

                    },
                    o: JobFilter.getElementFilterMenu('pr(o)blem', 'Problem', function (input) {
                        return {
                            type: 'checkbox',
                            name: 'ids',
                            message: 'Problems:',
                            choices: ArrayHelper.reMap(input.data.problems, ['id', 'name'], ['value', 'name'])
                        };
                    }),
                    b: JobFilter.getElementFilterMenu('(b)inary', 'Binary', function (input) {
                        return {
                            type: 'checkbox',
                            name: 'ids',
                            message: 'Binaries:',
                            choices: ArrayHelper.reMap(input.data.binaries, ['id', 'name'], ['value', 'name'])
                        };
                    }),
                    y: JobFilter.getElementFilterMenu('binaryt(y)pe', 'Binary Type', function (input) {
                        return {
                            type: 'checkbox',
                            name: 'ids',
                            message: 'Binaries:',
                            choices: input.data.binaryTypes
                        };
                    }),
                    l: JobFilter.getElementFilterMenu('(l)auncher', 'Launcher', function (input) {
                        return {
                            type: 'checkbox',
                            name: 'ids',
                            message: 'Launchers:',
                            choices: input.data.launchers
                        };
                    }),
                    s: JobFilter.getElementFilterMenu('(s)tatus', 'Status', function (input) {
                        return {
                            type: 'checkbox',
                            name: 'ids',
                            message: 'Execution Statuses:',
                            choices: input.data.executionStatuses
                        };
                    }),
                    e: JobFilter.getElementFilterMenu('r(e)t. status', 'Return Status', function (input) {
                        return {
                            type: 'checkbox',
                            name: 'ids',
                            message: 'Return Status:',
                            choices: input.data.returnStatuses
                        };
                    }),
                    c: JobFilter.getElementFilterMenu('su(c)cess', 'Success', function (input) {
                        return {
                            type: 'checkbox',
                            name: 'ids',
                            message: 'Success:',
                            choices: input.data.success
                        };
                    }),
                    r: {
                        label: "(r)eset",
                        final: true,
                    }
                }
            },
            p: {
                label: "(p)rocess",
                breadcrumb: "Process",
                question : function (input) {
                    var question = {
                        type: 'list',
                        message: "Which Processor?",
                        name: "processorId",
                        choices: ArrayHelper.unMap(BaseProcessor.getApplicableProcessorLabels(input.data.binaryTypes), "value", "name")
                    };
                    return question;
                },
            },
            l: {
                label: "re(l)aunch",
                breadcrumb: "Launch"
            },
            t: {
                label: "(t)ag",
                breadcrumb: "Tag",
                final: true,
            },
            u: {
                label: "(u)pdate status",
                final: true,
            }
        },
    },

    /** Filterview entry point
     *  Show filterView without active filters
     *
     * @param store
     * @param options
     * @param callback
     * @returns {*}
     */

    filter: function(store, options, callback) {
        return module.exports.filterView(store,null,{}, {}, callback);
    },

    listJobs : function(jobs, options) {
        log.verbose("============= JOB LIST START =================");
        for (var i = 0; i < jobs.length; ++i) {
            log.verbose(jobs[i].id + ": " + jobs[i].wd);
        }
        log.verbose("============= JOB LIST END ==================");

    },

    listParameters : function(parameters, options) {
        log.verbose("============= PARAMETER LIST START =================");
        var nameColWidth = 0;
        for (var id in parameters.parametersById)
            var parameter = parameters.parametersById[id];
            nameColWidth = Math.max(nameColWidth, parameter.name.length);

        for (var id in parameters.parametersById) {
            var parameter = parameters.parametersById[id];
            var values = parameters.valuesById[id];
            log.verbose(pad(parameter.name + ":", nameColWidth + 2) + values.join(", "));
        }
        log.verbose("============= PARAMETER LIST END ==================");

    },

    listProblems : function(problems, problemIdCounts, options) {
        log.verbose("============= PROBLEM LIST START =================");
        var nameColWidth = 0;
        for (var i = 0; i < problems.length; ++i) {
            log.verbose(problems[i].name + " (" + problemIdCounts[problems[i].id] + ")");
        }
        log.verbose("============= PROBLEM LIST END ==================");

    },

    /** Show the filterview with the filters
     *
     * @param store
     * @param data object containing needed records
     *             if data === null, records will be queried form db
     *             if data !== null, it is assumed that data matches
     *             filters
     * @param filters currently active filters
     * @param options
     * @param callback
     */
    filterView: function(store, data, filters, options, callback) {
        var filtersString = JobFilter.filtersToString(filters);
        if (filtersString === "")
            log.info("No Filters Active");
        else {
            log.info("Active Filters:");
            log.verbose(filtersString);
        }

        module.exports.getFilteredViewData(store, data, filters, {}, function(err, data) {

            /* Show the summary of current selection */
            console.info( pad("Jobs:",module.exports.labelPad) + pad(module.exports.numberPad, String(data.jobs.length)));
            var elements    = {
                jobgroups: "Jobgroups",
                tagsUnique: "Tags",
                problems: "Problems",
                binaries: "Binaries",
                binaryTypes: "BinaryTypes",
                launchers: "Launchers",
                executionStatuses: "Exec. Statuses",
                returnStatuses: "Return Values",
                success: "Success",
            };

            for (var prop in elements) {
                var label = elements[prop];
                log.verbose(module.exports.getSelectionString(data[prop], label, 5));
            }
            log.verbose(module.exports.getSelectionString(data.parameters.parameters, "Parameters", 5));
            log.verbose(module.exports.getSelectionString(data.parameters.values, "ParameterValues", 0));


            Menu.render(module.exports.menuActions, [], {data: data, filters: filters}, function(err, userInput) {
                if (userInput.slice(-1)[0]  === "x")
                    return callback(null);

                var first = userInput[0];
                userInput.shift();
                switch(first) {
                    case 'f':
                        JobFilter.updateFilters(filters, userInput, data);
                        /* Mark that data needs refresh */
                        data = null;
                        break;
                    case 'd':
                        /* Perform ''list ''actions */
                        module.exports.showLists(filters, data, {}, userInput);
                        break;
                    case 'p':
                        /* Perform ''process ''actions */
                        return module.exports.process(store, data, {}, userInput, function(err) {
                            if (err)
                                throw err;
                            return module.exports.filterView(store, null, filters, {}, callback);
                        });
                        break;
                    case 'l':
                        /* Relaunch selected jobs */
                        return module.exports.relaunch(store, data, {}, userInput, function(err) {
                            if (err)
                                throw err;
                            log.info("Finished relaunching jobs");
                            return module.exports.filterView(store, null, filters, {}, callback);
                        });
                        break;

                    case 'u':
                        /* Update job status */
                        return BaseJob.updateJobStatus(store, {}, function(err) {
                            if (err)
                                throw err;
                            return module.exports.filterView(store, null, filters, {}, callback);
                        });
                    case 't':
                        /* Tag jobs in view */
                        return module.exports.tag(store, data.jobs, {}, function(err) {
                            if (err)
                                throw err;
                            return module.exports.filterView(store, null, filters, {}, callback);
                        });

                    default:
                        log.error("Unrecognized menu input");
                        return module.exports.filterView(store, data, filters, options, callback);
                        break;

                }
                return module.exports.filterView(store, data, filters, options, callback);
            });
        });
    },

    showLists : function(filters, data, options, what) {
        what = what[0];
        if (typeof what === "undefined")
            return;

        switch(what) {
            case 'j':
                module.exports.listJobs(data.jobs, {});
                break;
            case 'o':
                module.exports.listProblems(data.problems, data.problemIdCounts, {});
                break;
            case 'p':
                module.exports.listParameters(data.parameters, {});
                break;
            case 'f':
                console.log(JSON.stringify(filters));
                fs.writeFileSync('filters.json', JSON.stringify(filters));
                log.info("Written to filters.json");

                break;
            default:
                console.error("dont know how to show " + what);
        }
        return;
    },

    getSelectionString: function(objects, name, nSummary) {
        var string =  pad(name + ":", module.exports.labelPad) + pad(module.exports.numberPad, String(objects.length));

        if (objects.length >= 1) {
            if (objects.length < nSummary) {
                var names;
                if (typeof objects[0] === "object")
                    names = ArrayHelper.getColumn(objects, "name", {});
                else
                    names = objects;
                string += " (" + names.join(", ") + ")";
            }
        }
        return string;
    },



    /** Apply filters to get all records needed for the filterview
     *
     * if data !== null, just return data.
     * @param store
     * @param data
     * @param filters
     * @param options
     * @param callback
     * @returns {*}
     */
    getFilteredViewData : function(store, data, filters, options, callback) {
        if (data !== null) {
            return callback(null, data);
        }

        JobFilter.getJobsFiltered(store, filters, {}, function(jobs) {
            async.parallel([
                /* Get jobgroups, launchers and binaries */
                function(callback) {
                    var jobgroupIds = ArrayHelper.getColumnUnique(jobs, "jobgroup_id", {type: "int"});
                    var Jobgroup = store.Model("Jobgroup");
                    Jobgroup.where({id: jobgroupIds}).exec(function(jobgroups) {
                        var launchers = ArrayHelper.getColumnUnique(jobgroups, "launcher", {});
                        var binaryIds = ArrayHelper.getColumnUnique(jobgroups, "binary_id", {type: "int"});
                        var Binary = store.Model("Binary");
                        Binary.where({id: binaryIds}).exec(function(binaries) {
                            binaryTypes = ArrayHelper.getColumnUnique(binaries, "type", {});
                            return callback(null, {
                                jobgroups: jobgroups,
                                binaries: binaries,
                                launchers: launchers,
                                binaryTypes: binaryTypes,
                            });
                        });
                    });
                },
                /* Get problems */
                function(callback) {
                    var problemIdCounts = ArrayHelper.getColumnUniqueCounts(jobs, "problem_id", {type: "int", ignoreNaN: true });
                    var problemIds = Object.keys(problemIdCounts);
                    var Problem = store.Model("Problem");
                    Problem.where({id: problemIds}).exec(function(problems) {
                        return callback(null, {problems: problems, problemIdCounts: problemIdCounts});
                    });
                },
                /* Get ParameterValues with parameters*/
                function(callback) {
                    module.exports.getUniqueParamsAndValues(store, jobs, {}, callback);
                },
                /* Get execution statuses */
                function(callback) {
                    return callback(null, ArrayHelper.getColumnUnique(jobs, "execution_status", {}));
                },
                /* Get return statuses */
                function(callback) {
                    return callback(null, ArrayHelper.getColumnUnique(jobs, "return_status", {}));
                },
                /* Get success columns */
                function(callback) {
                    return callback(null, ArrayHelper.getColumnUnique(jobs, "success", {}));
                },
                /* Get tags */
                function(callback) {
                    return BaseTag.getJobsTags(store, ArrayHelper.getColumnUnique(jobs, "id"), {}, callback);
                },
            ], function(err, results) {
                if (err)
                    throw err;

                data = {
                    jobs: jobs,
                    jobgroups: results[0].jobgroups,
                    binaries: results[0].binaries,
                    binaryTypes: results[0].binaryTypes,
                    problems: results[1].problems,
                    problemIdCounts: results[1].problemIdCounts,
                    parameters: results[2],
                    launchers: results[0].launchers,
                    executionStatuses: results[3],
                    returnStatuses: results[4],
                    success: results[5],
                    tags: results[6],
                    tagsUnique: ArrayHelper.getColumnUnique(results[6], "name"),
                };
                return callback(null, data);
            });
        });
    },

    getUniqueParamsAndValues : function(store, jobs, options, callback) {
        var jobIds = ArrayHelper.getColumnUnique(jobs, "id", {type: "int"});
        var calls = [];
        var callClosure = function(valueModel) {
            return function(callback) {
                valueModel.where({job_id: jobIds}).join("parameter").exec(function(records) {
                    callback(null, records);
                });
            }
        };

        for (var i in BaseParameter.valueModels) {
            calls.push(callClosure(store.Model(BaseParameter.valueModels[i])));
        }

        async.parallel(calls, function(err, results) {
            if (err)
                throw err;

            /* Create a values by name that will contain an array
             of all occuring values, indexed by parameter name */
            var valuesByName = {};
            var valuesById = {};
            var allValues = [];
            var allParameters = [];
            var allParameterNames = [];
            var paramsById = {};
            var idsByName = {};


            /* First step: mark occurances by setting valuesById[id][value] = true; */
            /* - Iterate value types (int, float, string) */
            var counter = 0;
            for (var i in BaseParameter.valueModels) {
                /* Iterate parameterValues of that value type */
                for (var j = 0; j < results[counter].length; ++j) {
                    var paramVal = results[counter][j];

                    var id = paramVal.parameter.id;
                    var name = paramVal.parameter.name;
                    var value = paramVal.value;
                    paramsById[paramVal.parameter.id] = paramVal.parameter;
                    idsByName[paramVal.parameter.name] = paramVal.parameter.id;
                    if (typeof valuesById[id] === "undefined")
                        valuesById[id] = {};

                    valuesById[id][value] = true;
                }
                ++counter;
            }

            /* Second step: transform nested objects into arrays */
            /* - Iterate unique parameter names */
            for (var id in valuesById) {
                allParameterNames.push(paramsById[id].name);
                allParameters.push(paramsById[id]);
                var valArray = [];
                /* Iterate parameter values */
                for (var k in valuesById[id]) {
                    allValues.push(k);
                    valArray.push(k);
                }
                valuesById[id] = valArray;
            }

            return callback(null, {
                values: allValues,
                parameters: allParameters,
                parameterNames: allParameterNames,
                valuesById: valuesById,
                parametersById : paramsById,
                idsByName : idsByName,
            });
        });
    },

    /**
     * Process the jobs in the current filter view
     * @param store
     * @param data
     * @param options
     * @param what
     * @param callback
     */
    process : function(store, data, options, what, callback) {
        var processorId = what[0];
        var processor = BaseProcessor.registry[processorId];
        log.info("Ready to run " + processor.label + " on " + data.jobs.length + " jobs");

        MenuHelper.confirmIfTrue(false, null, function(err, confirmed) {
            if (confirmed === true) {
                return module.exports.launchProcessor(store, data, processor, {}, callback);
            } else {
                return callback(null);
            }
        });
    },

    /**
     *  Relaunches the current jobs by:
     *  - Creating a jobgroup containing copies of the jobs
     *  - Launching the jobgroup
     * @param store
     * @param data
     * @param options
     * @param what
     * @param callback
     */
    relaunch : function(store, data, options, callback) {
        async.waterfall([
            function(callback) {
                /* Create jobgroup and set binary */
                if (data.binaries.length !== 1)
                    return callback(new Error("Cant relaunch: More than one binary in selection"));
                else {
                    var Jobgroup = store.Model("Jobgroup");
                    var jobgroup = new Jobgroup({binary: data.binaries[0]});
                    return callback(null, jobgroup);
                }
            },
            function(jobgroup, callback) {
                /* Ask user for jobgroup name and save jobgroup */
                var defaultName = null;
                if (data.jobgroups.length === 1)
                    defaultName = data.jobgroups[0].name + "_relaunch";

                inquirer.prompt({
                    type: 'input',
                    name: 'name',
                    message: 'Relaunch Jobgroup Name:',
                    default: defaultName,
                }).then(function(answers) {
                    jobgroup.name = answers.name;
                    jobgroup.ready_for_launch = true;
                    jobgroup.save(function(okay) {
                        if (!okay)
                            return callback(new Error("Error creating new jobgroup"));
                        else {
                            log.verbose("Created Jobgroup " + jobgroup.name + " (id: " + jobgroup.id + ")");
                            jobgroup.setWd(store, {}, function(err) {
                                return callback(err, jobgroup);
                            });
                        }
                    });
                });
            },
            function(jobgroup, callback) {
                /* Copy jobs (and parameter values) in parallel */

                var jobCopyClosure = function(job) {
                    return function(callback) {
                        return job.copy(store, {only: ['problem_id', 'problem'], attributes: {jobgroup_id: jobgroup.id}}, callback);
                    }
                };
                calls = [];
                for (var i = 0; i < data.jobs.length; ++i)
                    calls.push(jobCopyClosure(data.jobs[i]));

                async.parallel(calls, function(err, jobs) {
                    jobgroup.job = jobs;
                    return callback(null, jobgroup);
                });
            }
        ], function(err, jobgroup) {
            if (err)
                throw err;

            /* Get the new jobgroup with all the relations we need */
            db.findByPk(store, "Jobgroup", jobgroup.id, {join: BaseJobgroup.getLaunchJoin()}, function(err, fullJobgroup) {

                /* Launch the jobgroup */
                JobgroupMenus.launchJobgroup(store, fullJobgroup, {}, function (err) {
                    if (err) {
                        log.error("An error occured launching jobgroup" + fullJobgroup.name);
                        log.verbose("You can re-try launching it manually");
                    } else {
                        log.info("Successfully launched jobgroup " + fullJobgroup.name);
                    }
                    return callback(null);
                });
            });
        });
    },

    /**
     * Ask user for tag list and then apply to given jobs
     * @param store
     * @param jobs
     * @param options
     * @param callback
     */
    tag: function(store, jobs, options, callback) {
        async.waterfall([
            /* Ask user for tag list */
            function(callback) {
                inquirer.prompt({
                    type: 'input',
                    name: 'tags',
                    message: 'Enter Tag names (separate with ",", prefix with "-" to remove existing tag)',
                }).then(function(answers) {
                    //var answers = {tags: "cool"}; //@NOCOMMIT
                    var tasks = BaseTag.stringToTagTasks(answers.tags, {});
                    var jobIds = ArrayHelper.getColumn(jobs, "id");
                    return callback(null, jobIds, tasks);
                });
            },
            function(jobIds, tasks, callback) {
                /* Create tags */
                return BaseTag.performTagTasks(store, tasks, jobIds, {}, callback);
            }
        ], callback);
    },


    /** Launch a processor on the given jobs
     *
     * @param store
     * @param filters
     * @param processor
     * @param options
     * @param callback
     */
    launchProcessor: function(store, data, processor, options, callback) {
        return processor.process(store, data, {}, callback);
    },

 }
