var extend = require('util')._extend;
var chalk       = require('chalk');
var fs = require('fs-extra');
var path = require('path');
var async = require('async');
var debug       = require('debug')('nxhero');
var child_process = require('child_process');
var clui = require('clui');
var Line = clui.Line;


var files = require('../lib/files');
var Git = require('../lib/git');
var log = require("../lib/log");

var gh = require('../lib/general_helpers.js');




function Scip() {

    var id  = "scip";
    var label =  "SCIP Binary";
    var takesProblems = true;

    var printPreflightResults = true;

    /** Array of paths to repositories that should be clean
     * for pre-flight checks to pass
     * hashes  for each repo will be saved in jobgropus binary_data
     * can use  ~ and {binary.path} as placeholders
     */
    var cleanRepos = [
        '{binary.dir}/..',
    ];
    var setFile = "scip.set";

    function getLabel() {
        return this.label;
    };

    /** Runs the executable and parses all hashes xxxxxxx contained in
     * strings that look like [GitHash: xxxxxxxx]
     * Returns results as array in second argument of callback
     *
     * @param jobgroup
     * @param callback
     */
    function getBinaryHashes(jobgroup, callback) {
        binaryPath = path.resolve(files.resolveHome(jobgroup.binary.path));
        var cmd = binaryPath + ' -c "quit" '+"| grep -E -o '\\[GitHash: [[:alnum:]\-]*\\]'  | sed 's/\\[GitHash: //' | sed 's/\\]//'";
        child_process.exec(cmd ,{}, function (err, stdout, stderr) {
            result = stdout.split('\n');
            // Remove last element if empty
            if  (result.slice(-1)[0] == "")
                result.splice(-1);
            return callback(err, result);
        })
    };

    /** Prepare the jobgroup by
     *  - Running the preflight checks
     *  - Saving the collected data or aborting the jobgroup launch
     *
     * @param jobgroup Jobgroup model
     * @param wd working directory of the jobgroup
     * @param callback
     */
    function runPreflightChecks(jobgroup, wd, callback) {
        var scip = this;
        var cleanRepos = this.cleanRepos;
        var printPreflightResults = this.printPreflightResults;

        log.info(this.label + " running preflight checks");
        var calls  = [];

        /* Closure for call to Git.hashState */
        var makeCall = function(repoPath) {
            return function(callback) {
                Git.hashState(repoPath, function(err, res) {
                    return callback(err, res);
                });
            }
        };


        /* Prepare calls to get repo status */
        for (var i = 0; i < this.cleanRepos.length; ++i) {
            var unresolved = this.cleanRepos[i].replace("{binary.dir}", path.dirname(jobgroup.binary.path));
            var repoPath = path.resolve(files.resolveHome(unresolved));
            ff = makeCall(repoPath);
            calls.push(ff);
        }

        /* Add call to get hash from running scip */
        calls.push(function(callback) {
            scip.getBinaryHashes(jobgroup, callback);
        });

        /* Execute  calls to get repo status */
        async.parallel(
            calls,
            function(err, results) {
                if (err !== null)
                    return callback(err);

                /* Seperate binaryHashes from repo status */
                binaryHashes = results.slice(-1)[0];
                results.splice(-1);

                /* Check States, compare with binaryhashes, build output table */
                var okay = true;
                var problems = [];
                var cellWidth = 14;
                var binaryData = {};
                if (printPreflightResults) {
                    var line = new Line().padding(2)
                        .column("Repo", 3 * cellWidth).column("State", cellWidth).column("Hash", cellWidth).column("Binary ", cellWidth).column("Binary Hash", cellWidth)
                        .fill().output();
                    totalWidth = 3 * cellWidth + 4 * cellWidth + 0;
                    line = new Line().padding(2).column(Array(totalWidth + 1).join("-")).output();
                }


                for (var i = 0; i < cleanRepos.length; ++i) {
                    var repo = cleanRepos[i];

                    if (printPreflightResults)
                        var line = new Line().padding(2).column(cleanRepos[i], 3*cellWidth);

                    binaryData[repo] = results[i];
                    if (results[i].state !== "clean" ) {
                        okay = false;
                        problems.push(repo);
                    }
                    okay = okay && (results[i].state === "clean");
                    if (printPreflightResults) {
                        line.column(results[i].state, cellWidth);
                        line.column(typeof results[i].hash === "undefined" ? "" : results[i].hash, cellWidth);
                    }
                    if (typeof binaryHashes[i] !== "undefined") {
                        /* Compare binary hash */
                        if (results[i].hash  !== binaryHashes[i]) {
                            problems.push(repo);
                            if (printPreflightResults) {
                                line.column("mismatch", cellWidth);
                            }
                            okay = false;
                        } else {
                            if (printPreflightResults)
                                line.column("match", cellWidth);
                        }
                        if (printPreflightResults)
                            line.column(binaryHashes[i],cellWidth);
                    }
                    if(printPreflightResults)
                        line.output();
                }

                if (!okay)
                    return callback(new Error(scip.label + " Preflight: Repository check was not successful.\nProblems detected in:" + problems.join(", ")));

                /* Everything okay, save hashes in binary_data of jobgroup */
                if (jobgroup.binary_data !== null ) {
                    oldBinData = JSON.parse(jobgroup.binary_data);
                    binaryData = extend(oldBinData,{runPreflightChecks: binaryData});
                }

                jobgroup.binary_data = JSON.stringify(binaryData);
                jobgroup.save(function(okay) {
                    return callback(null);
                });
            });
    };

    /** Prepare the job by
     * - Creating a settings file
     * @param wd
     * @param callback
     */
    function prepareJob(wd, callback) {
        log.info("Preparing " + this.label + " execution");
        async.parallel([
            function(callback) {
                fs.writeFile(wd + "/" + setFile, null, {flags:" O_TRUNC"} ,(err) => {
                    callback(err);
            });
            }
            // Do more things in parallel here
        ], function(err, results) {
            callback(null);
        });
    };

    /** Set paramaeters for the job
     * if the parameter is a scip parameter, save it to the settings file
     * @param wd
     * @param store
     * @param parameterValues
     * @param callback
     */
    function setParams(wd, store, parameterValues, callback) {
        var settings = "";
        for (var i = 0; i < parameterValues.length; ++i) {
            var record = parameterValues[i];
            /* Write scip parameters to settings file */
            if (gh.compareSafe(record.parameter.parameter_model,"scip")) {
                var value = record.value;
                if (typeof value === "string")
                    value = value.trim();

                if (value !== "true" && value !== "false" && isNaN(value))
                    value = '"' + value + '"';

                settings += record.parameter.name + " = " + value + "\n";
            }
        }
        var file = wd + "/" + this.setFile;
        fs.writeFile(file, settings, {flags:" O_WRONLY"} ,(err) => {
            if (err)
                throw err;
            return callback(null);
        });
    };

    return {
        id: id,
        label: label,
        takesProblems: takesProblems,
        getLabel: getLabel,
        cleanRepos: cleanRepos,
        setFile: setFile,
        printPreflightResults: printPreflightResults,
        getBinaryHashes: getBinaryHashes,
        runPreflightChecks: runPreflightChecks,
        prepareJob: prepareJob,
        setParams: setParams
    };


};

module.exports = Scip();
