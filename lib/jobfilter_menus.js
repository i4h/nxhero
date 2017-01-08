var inquirer    = require('inquirer');
var debug       = require('debug')('nxhero');
var async = require('async');
var pad = require('pad');


var BaseJob = require('../lib/base_job');
var BaseParameter = require('../lib/base_parameter');
var JobFilter = require('../lib/job_filter');

var Menu = require('../lib/flatActionsMenu');

var ArrayHelper = require('../lib/array_helper');
var log = require("../lib/log");




module.exports = {

    labelPad : 16,
    numberPad: 5,

    menuActions : {
        menu: {
            l: {
                label: '(l)ist',
                breadcrumb: "List",
                menu: {
                    j: {
                        label: '(j)obs',
                        final: true
                    }
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
                            choices: ArrayHelper.reMap(input.data.jobgroups, ['id', 'name'], ['value', 'name'])
                        };
                    }),
                    p: {
                        label : '(p)arameter',
                        breadcrumb: "Parameter",
                        menu: {

                        }
                    },
                    b: JobFilter.getElementFilterMenu('(b)inary', 'Binary', function (input) {
                        return {
                            type: 'checkbox',
                            name: 'ids',
                            message: 'Binaries:',
                            choices: ArrayHelper.reMap(input.data.binaries, ['id', 'name'], ['value', 'name'])
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
                    r: JobFilter.getElementFilterMenu('(r)et. status', 'Return Status', function (input) {
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




                }
            },
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
        module.exports.getFilteredViewData(store, data, filters, {}, function(err, data) {

            /* Show the summary of current selection */
            console.info( pad("Jobs:",module.exports.labelPad) + pad(module.exports.numberPad, String(data.jobs.length)));
            var elements    = {
                jobgroups: "Jobgroups",
                problems: "Problems",
                binaries: "Binaries",
                launchers: "Launchers",
                executionStatuses: "Exec. Statuses",
                returnStatuses: "Return Values",
                success: "Success",
            };
            debug(data.launchers);
            for (var prop in elements) {
                var label = elements[prop];
                log.verbose(module.exports.getSelectionString(data[prop], label, 5));
            }
            log.verbose(module.exports.getSelectionString(data.parameters.parameters, "Parameters", 5));
            log.verbose(module.exports.getSelectionString(data.parameters.values, "ParameterValues", 0));


            Menu.render(module.exports.menuActions, [], {data: data}, function(err, userInput) {
                if (userInput.slice(-1)[0]  === "x")
                    return callback(null);

                var first = userInput[0];
                userInput.shift();
                switch(first) {
                    case 'f':
                        filters = JobFilter.updateFilters(filters, userInput, data);
                        break;
                    case 'l':
                        /* Perform ''list ''actions */
                        module.exports.showLists(data, {}, userInput);
                        break;
                    default:
                        log.error("Unrecognized menu input");
                        return callback(null);
                        break;
                }
                return module.exports.filterView(store, data, filters, options, callback);
            });
        });
    },



    showLists : function(data, options, what) {
        what = what[0];
        if (typeof what === "undefined")
            return;

        switch(what) {
            case 'j':
                module.exports.listJobs(data.jobs, {});
                break
            default:
                console.error("dont know how to show " + what);
        }
        return;
    },

    getSelectionString: function(objects, name, nSummary) {
        var string =  pad(name + ":", module.exports.labelPad) + pad(module.exports.numberPad, String(objects.length));
        if (objects.length < nSummary) {
            var names;
            if (typeof objects[0] === "object")
                names = ArrayHelper.getColumn(objects, "name", {});
            else
                names = objects;
            string += " (" + names.join(", ") + ")";
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
        if (data !== null)
            return callback(null, data);

        module.exports.getJobsFiltered(store, filters, {}, function(jobs) {

            async.parallel([
                /* Get jobgroups and binaries */
                function(callback) {
                    var jobgroupIds = ArrayHelper.getColumnUnique(jobs, "jobgroup_id", {type: "int"});
                    var Jobgroup = store.Model("Jobgroup");
                    Jobgroup.where({id: jobgroupIds}).exec(function(jobgroups) {
                        var launchers = ArrayHelper.getColumnUnique(jobgroups, "launcher", {});
                        var binaryIds = ArrayHelper.getColumnUnique(jobgroups, "binary_id", {type: "int"});
                        var Binary = store.Model("Binary");
                        Binary.where({id: binaryIds}).exec(function(binaries) {
                            return callback(null, {
                                jobgroups: jobgroups,
                                binaries: binaries,
                                launchers: launchers
                            });
                        });
                    });
                },
                /* Get problems */
                function(callback) {
                    var problemIds = ArrayHelper.getColumnUnique(jobs, "problem_id", {type: "int"});
                    var Problem = store.Model("Problem");
                    Problem.where({id: problemIds}).exec(function(problems) {
                        return callback(null, problems);
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
                /* Get launchers */
                function(callback) {
                    return callback(null, ArrayHelper.getColumnUnique(jobs, "launcher", {}));
                },
            ], function(err, results) {
                if (err)
                    throw err;

                data = {
                    jobs: jobs,
                    jobgroups: results[0].jobgroups,
                    binaries: results[0].binaries,
                    problems: results[1],
                    parameters: results[2],
                    launchers: results[0].launchers,
                    executionStatuses: results[3],
                    returnStatuses: results[4],
                    success: results[5],
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
            var allValues = [];
            var allParameters = [];
            var counter = 0;
            /* Iterate value types (int, float, string) */
            for (var i in BaseParameter.valueModels) {
                /* - First step: mark occurances by setting valuesByName[name][value] = true; */

                /* Iterate parameterValues of that value type */
                for (var j = 0; j < results[counter].length; ++j) {
                    var paramVal = results[counter][j];
                    var name = paramVal.parameter.name;
                    var value = paramVal.value;
                    if (typeof valuesByName[name] === "undefined")
                        valuesByName[name] = {};
                    valuesByName[name][value] = true;
                }
                /* - Second step: transform nested objects into arrays */
                /* Iterate unique parameter names */
                for (var name in valuesByName) {
                    allParameters.push(name);
                    var valArray = [];
                    /* Iterate parameter values */
                    for (var k in valuesByName[name]) {
                        allValues.push(k);
                        valArray.push(k);
                    }
                    valuesByName[name] = valArray;
                }
                ++counter;
            }

            return callback(null, {
                values: allValues,
                parameters: allParameters,
                valuesByName: valuesByName
            });
        });
    },


    /** Get jobs  satisfying filters
     *
     * @param store
     * @param filters
     * @param options
     * @param callback
     */
    getJobsFiltered : function(store, filters, options, callback) {
        var Job = store.Model("Job");
        if (typeof options.joinValues !== "undefined")
            Job = BaseJob.joinValues(Job, options.joinValues);

        /* Apply jobgroup filters */
        if (typeof filters.jobgroup !== "undefined") {
            if (typeof filters.jobgroup.selection !== "undefined") {
                var ids = filters.jobgroup.selection.keys();
                Job = Job.where({jobgroup_id: ids});
            }
            if (typeof filters.jobgroup.name !== "undefined") {
                Jobgroup.where('name LIKE "%' + filter.jobgroup.name + '%"').exec(function (jobgroups) {
                    return callback(null, jobgroups);
                });
            }
        }

        /* Apply direct filters */
        Job = JobFilter.applyDirectFilters(store, Job, filters, {});



        Job.exec(function(jobs) {
            return callback(jobs);
        });
    },

    /** Launch a processor on all jobs satisfying the filters
     *
     * @param store
     * @param filters
     * @param processor
     * @param options
     * @param callback
     */
    launch: function(store, filters, processor, options, callback) {
        module.exports.getJobsFiltered(store, filters, {joinValues: {parameters: true, jobgroup: true}}, function(jobs) {
            processor.process(store, jobs, {}, callback);
        });
    },



}
