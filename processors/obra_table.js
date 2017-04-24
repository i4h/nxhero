var debug       = require('debug')('nxhero');
var in_array = require('in_array');
const child_process = require('child_process');
var async = require('async');
var extend = require('node.extend');
var fs = require('fs-extra');
var sortBy = require('sort-by');

var ArrayHelper = require('arrayhelper-yii2-style');
var slurm = require('../launchers/slurm');
var log = require("../lib/log");
var BaseJob = require('../lib/base_job');
var BaseProcessor = require('../processors/processor');
var OBRAinfo = require("../processors/obra_info");
var LatexTable = require('latex-data-table');


var showOutfileProcessor = {
    id: "obra_table",
    label: "OBRA Table  Processor",
    binaryTypes: '*',
    generatesReports: true,

    defaultHeader : [
        {
            content: "Lookback",
            spec: "l",
        },
        {
            content: "Time",
            units: "s",
            spec: "r",

        },
        {
            content: "State Distance",
            spec: "r",
        },
        {
            content: "State Volume",
            spec: "r",
        }
    ],

    processOne : function(store, job, options, callback) {

        return callback(new Error("Processor replaced by steptimes table, don't use"));
        var processor = this;

        var message = "";

        /* Collect information of the job */
        var lookback = job.getParameterValueFromJoin('propagating/obra/lookback', 'int');
        var discretization = job.getParameterValueFromJoin('reading/sdoreader/discretization', 'string');
        var addMultiTimeCuts = job.getParameterValueFromJoin('propagating/obra/addMultiTimeCuts', 'string');
        var addCuts = job.getParameterValueFromJoin('propagating/obra/addCuts', 'string');

        /* Last line of progress file */
        var progressFile = job.wd + "/progress.log";
        cmd = "tail -n 1 " + progressFile;
        child_process.exec(cmd, null, function (err, stdout, stderr) {
            if (err)
                return callback(err);

            var line = OBRAinfo.splitProgressLine(stdout);
            var successData = job.processorData['obra_success'];
            if (successData.status !== "success_finished") {
                var tableLine = [
                    lookback,
                    line.time,
                    "-",
                    "-",
                ];
            }
            var tableLine = [
                lookback,
                line.time,
                line.stateDistance,
                line.stateVolume
            ];

            var result = {
                jobId: job.id,
                problemId: job.problem_id,
                problemName: job.problem.name,
                discretization: discretization,
                lookback: lookback,
                addMultiTimeCuts: addMultiTimeCuts,
                addCuts: addCuts,
                line: tableLine
            };

            callback(null, result);
        });
    },

    afterProcessing: function(store, jobs, options, results, callback) {
        var processor = this;
        /* One table for each problem  and discretization */
        var tables = ArrayHelper.treeify(results, ['problemName', 'discretization', 'addCuts', 'addMultiTimeCuts']);

        var header = module.exports.defaultHeader;
        header[2].formatter = {decimals: 2};
        header[3].formatter = {decimals: 2};

        var allLatex = [];

        var writeCalls = [];
        var writeClosure = function(content, outfile) {
            return function(callback) {
                fs.writeFile(outfile, content, callback);
            }
        };

        var cutString = function(addCuts, addMultiTimeCuts) {
            var names = [];
            if (addCuts === "true")
                names.push("constant time cuts");
            if (addMultiTimeCuts === "true")
                names.push("multi-time cuts");

            if (names.length === 0)
                return "";

            return ", with " + names.join(" and ");
        }

        /* Make tables */
        for (var problemName in tables) {
            for (var discretization in tables[problemName]) {
                for (var addCuts in tables[problemName][discretization]) {
                    for (var addMultiTimeCuts in tables[problemName][discretization][addCuts]) {
                        var table = tables[problemName][discretization][addCuts][addMultiTimeCuts];
                        table.sort(sortBy('lookback'));

                        var options = {
                            label: "tab:obra_" + problemName + "_" + discretization,
                            caption: "OBRA results for " + problemName.replace(/_/g, "\\_") + "\\_" + discretization + cutString(addCuts, addMultiTimeCuts) + ".",
                            //style: "ascii",
                            defaultColWidth: 15,
                        };
                        var outFile = processor.report.wd + "/obra_" + problemName + "_" + discretization + ".tex";

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

                        writeCalls.push(writeClosure(latex, outFile));
                    }
                }
            }
        }
        var outFile = processor.report.wd + "/obra_all.tex";
        writeCalls.push(writeClosure(allLatex.join("\n\n"), outFile));

        async.parallel(writeCalls, function(err, results) {
            if (err)
                return callback(err);

            log.info(processor.label + "finished, " + writeCalls.length + " files written");
            log.info("Output in " + processor.report.wd);

            return callback(null);
        });

        //log.info("Showing progress for " + jobs.length + " jobs:");
        //log.verbose(results.join(""));
        //log.info(this.label + " finished");
        //callback(null);
    },

};

var myBaseProcessor = extend(true, {}, BaseProcessor);
showOutfileProcessor = extend(true, myBaseProcessor, showOutfileProcessor);
module.exports = showOutfileProcessor;


