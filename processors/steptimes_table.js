var debug       = require('debug')('nxhero');
var in_array = require('in_array');
const child_process = require('child_process');
var async = require('async');
var extend = require('node.extend');
var fs = require('fs-extra');
var sortBy = require('sort-by');

var TableParser = require("../lib/table_parser");
var ArrayHelper = require('arrayhelper-yii2-style');
var slurm = require('../launchers/slurm');
var log = require("../lib/log");
var BaseJob = require('../lib/base_job');
var BaseProcessor = require('../processors/processor');
var OBRAinfo = require("../processors/obra_info");
var LatexTable = require('latex-data-table');
var SCIPstatsParser = require('../lib/scip_statistics_parser');


var showOutfileProcessor = {
    id: "steptimes_table",
    label: "Steptimes Table  Processor",
    binaryTypes: ['sdscip'],
    generatesReports: false,

    defaultHeader : [
        {
            content: "Time Steps",
            spec: "l",
        },
        {
            content: "Time",
            units: "s",
            spec: "r",
            formatter: {decimals: 2},
        },
        {
            content: "Primal Bound",
            formatter: {decimals: 4},
            spec: "r",
        },
        {
            content: "Dual Bound",
            formatter: {decimals: 4},
            spec: "r",
        },
        {
            content: "Gap",
            unit: "%",
            formatter: {decimals: 2},
            spec: "r",
        }

    ],

    boundChecks: {},

    beforeProcessing : function(store, job, options, callback) {
        module.exports.boundChecks = [];
        return callback(null);
    },


    processOne : function(store, job, options, callback) {
        var processor = this;
        var processorData = job.processorData;
        try {
            var stats = processorData.scip_collector.statistics;
        } catch (e) {
            return callback(new Error("Unable to get scip stats on job " + job.id));
        }
        var isFollowup = false;
        var followupData = processorData.obra_followup_collector || null;

        if (job.execution_status.indexOf("finished") === -1 ) {
            console.error("Skipping unfinished job " + job.id + " (status: " + job.execution_status);
            return callback(null);
        }

        /* Collect information of the job */
        var stepOverride = job.getParameterValueFromJoin('reading/sdoreader/stepOverride', 'int');
        var discretization = job.getParameterValueFromJoin('reading/sdoreader/discretization', 'string');
        var lookback = followupData ? followupData['propagating/obra/lookback'] : "-";
        var propODEfreq = job.getParameterValueFromJoin('propagating/ode/freq', 'int') || "N/A";

        /* Save bounds for consistency check */
        module.exports.boundChecks.push({
            jobId: job.id,
            stepOverride: stepOverride,
            discretization: discretization,
            problemName: job.problem.name,
            dualBound: stats["Solution"].data.dual_bound,
            primalBound: stats["Solution"].data.primal_bound,
        });

        var binaryName = job.jobgroup.binary.name;
        if (binaryName === "undefined") {
            return callback(new Error("binaryName is undefined on job " + job.id))
        }



        var tableLine = [];
        var totalTime = followupData ? followupData.total_time : stats["<unsectioned>"].data.total_time;
        switch (stats["<unsectioned>"].data.scip_status ) {
            case "optimal":
            case "gap_limit":
                tableLine = [
                    stepOverride,
                    //stats["<unsectioned>"].data.total_time,
                    totalTime,
                    stats["Solution"].data.primal_bound,
                    stats["Solution"].data.dual_bound,
                    stats["Solution"].data.gap,
                ];
                break;
            case "time_limit":
                tableLine = [
                    stepOverride,
                    "limit",
                    stats["Solution"].data.primal_bound,
                    stats["Solution"].data.dual_bound,
                    stats["Solution"].data.gap,
                ];
                break;
            case "infeasible":
                tableLine = [
                    stepOverride,
                    "infeasible",
                    "-",
                    "-",
                    "-",
                ];
                break;
            default:
                throw new Error("Unknown scip status " + stats["<unsectioned>"].data.scip_status)
        }

        var result = {
            jobId: job.id,
            problemId: job.problem_id,
            problemName: job.problem.name,
            binaryName: binaryName,
            discretization: discretization,
            stepOverride: stepOverride,
            line: tableLine,
            lookback: lookback,
            propODEfreq: propODEfreq,
        };

        callback(null, result);
    },

    afterProcessing: function(store, jobs, options, results, callback) {
        var processor = this;


         /* Filter results from jobs that had the wrong status */
        results = results.filter(function( element ) {
            return element !== undefined;
        });

        /* One table for each problem  and discretization */
        var tables = ArrayHelper.treeify(results, ['problemName', 'discretization', 'binaryName', 'lookback', 'propODEfreq']);
        var header = module.exports.defaultHeader;
        var allLatex = [];

        var writeCalls = [];
        var writeClosure = function(content, outfile) {
            return function(callback) {
                fs.writeFile(outfile, content, callback);
            }
        };

        /* Make tables */
        for (var problemName in tables) {
            for (var discretization in tables[problemName]) {
                for (var binaryName in tables[problemName][discretization]) {
                    for (var lookback in tables[problemName][discretization][binaryName]) {
                        for (var propODEfreq in tables[problemName][discretization][binaryName][lookback]) {
                            var table = tables[problemName][discretization][binaryName][lookback][propODEfreq];
                            table.sort(sortBy('stepOverride'));

                            var options = {
                                label: "tab:obra_" + problemName + "_" + discretization,
                                caption: binaryName + " solving times for " + problemName.replace(/_/g, "\\_") + "\\_" + discretization + "(h = " + lookback + ", odefreq: " + propODEfreq + ")",
                                //style: "ascii",
                                defaultColWidth: 15,
                            };
                            //var outFile = processor.report.wd + "/obra_" + problemName + "_" + discretization + ".tex";

                            /* Collect lines in array */
                            var lines = [];

                            for (var k = 0; k < table.length; k++) {
                                var comment = "jobId: " + table[k].jobId;
                                lines.push({
                                    comment: comment,
                                    cells: table[k].line
                                });
                            }

                            var latex = LatexTable(lines, header, options);
                            allLatex.push(latex);
                            options.style = "ascii";
                            var ascii = LatexTable(lines, header, options);
                            log.verbose(ascii);
                            log.verbose("");
                            log.verbose("");
                            //writeCalls.push(writeClosure(latex, outFile));
                        }
                    }
                }
            }
            //var outFile = processor.report.wd + "/obra_all.tex";
            //writeCalls.push(writeClosure(allLatex.join("\n\n"), outFile));

            /*async.parallel(writeCalls, function(err, results) {
             if (err)
             return callback(err);

             log.info(processor.label + "finished, " + writeCalls.length + " files written");
             log.info("Output in " + processor.report.wd);

             return callback(null);
             });
             */

            //log.info("Showing progress for " + jobs.length + " jobs:");
            //log.verbose(results.join(""));
            //log.info(this.label + " finished");

        }

        /* Run consistency checks */
        module.exports.runBoundChecks();
        debug("finished running boundchecks");

        return callback(null);
    },

    runBoundChecks: function() {
        /* Map problemNames to bool optimization sense */
        var minimize = {};
        var bestPrimals = {};
        var bestDuals = {};
        var properties = ['problemName', 'discretization', 'stepOverride'];
        var boundTree = ArrayHelper.treeify(module.exports.boundChecks, properties);
        var flatBounds = ArrayHelper.flattenTree(boundTree, properties);

        for (var i = 0; i < flatBounds.length; i++) {
            var bounds = flatBounds[i];
            var leaf = bounds.leaf;
            var shortKey = bounds.keys.join("_");

            /* Determine optimization sense */
            for (var j = 0; j < leaf.length; j++) {
                var boundObj = leaf[j];
                if (leaf.dualBound != boundObj.primalBound) {
                    minimize = (boundObj.dualBound < boundObj.primalBound);
                    break;
                }
                if (minimize === null)
                    throw new Error("Unable to determine optimization sense for " + shortKey);
            }

            //debug("Checking bounds for " + shortKey + " minimize " + minimize);
            var primalOptions = {filter: function(obj) { return obj.primalBound !== "none"}};
            var dualOptions = {filter: function(obj) { return obj.dualBound !== "none"}};
            var primalMap = ArrayHelper.map(leaf,'jobId', 'primalBound', primalOptions);
            var dualMap = ArrayHelper.map(leaf,'jobId', 'dualBound', dualOptions);

            var bestPrimal = ArrayHelper.findByComparison(primalMap, minimize ? "min" : "max", {returnBoth: true});
            var bestDual = ArrayHelper.findByComparison(dualMap, minimize? "max" : "min", {returnBoth: true});

            var isConsistent = function(primal, dual, minimize) {
                if (minimize && dual <= primal)
                    return true;
                if (!minimize && dual >= primal)
                    return true;
                return false;
            }
            if (!isConsistent(bestPrimal.value, bestDual.value)) {
                log.error("Best dual and primal are inconsistent for " + shortKey  + (minimize ? " (minimize)" : " (maximize)") + "\n"
                    + "bestDual: " + bestDual.value + " (job: " + bestDual.property + "), "
                    + " bestPrimal: " + bestPrimal.value + " (job: " + bestPrimal.property + ")"
                );
            } else
                log.verbose(shortKey + " is conistent");
        }
        debug("end of boundchecks");
    }

};

var myBaseProcessor = extend(true, {}, BaseProcessor);
showOutfileProcessor = extend(true, myBaseProcessor, showOutfileProcessor);
module.exports = showOutfileProcessor;


