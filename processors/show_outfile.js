var debug       = require('debug')('nxhero');
var in_array = require('in_array');
const child_process = require('child_process');
var async = require('async');
var extend = require('node.extend');

var slurm = require('../launchers/slurm');
var log = require("../lib/log");
var BaseJob = require('../lib/base_job');
var BaseProcessor = require('../processors/processor');



var processor = {
    id: "obra_success",
    label: "OBRA success processor",
    binaryTypes: ['sdscip'],

    /** Process a single job
     *
     * @param store
     * @param job
     * @param options
     * @param callback
     */
    processOne : function(store, job, options, callback) {
        var outfile = job.wd + "/out.log";
        var processor = this;
        async.series([
            /* Grep for errors in outfile */
            function(callback) {
                cmd = "cat " + outfile + ' | grep -i error';
                child_process.exec(cmd, null, function (err, stdout, stderr) {
                    if (err instanceof Error) {
                        if (err.code === 1) {
                            /* No errors found */
                            return callback(null);
                        } else
                            throw err;
                    } else {
                        return callback(null, stdout);
                    }
                });
            },
            function(callback) {
                /* Grep obra statistics from the outfile */
                cmd = "cat " + outfile + ' | grep -B 2 -A 44 "General Statistics"';
                child_process.exec(cmd, null, function(err, stdout, stderr) {
                    if (err !== null)
                        return callback(null);
                    //debug(stdout);
                    //debug(stderr);
                    return callback(null, stdout);
                });
            }
        ], function(err, results) {
            if ( err !== null) {
                throw err;
            }

            var success = false;
            if (typeof results[0] !== "undefined") {
                /* Error message found */
                var launcher = BaseJob.getLauncher(job.jobgroup.launcher);
                launcher.checkStatus(job, results[0]);
                processor.setData(job, "Error messages found in " + outfile + "\n" + results[0]);
                job.success = false;
            } else {
                if (typeof results[1] !== "string") {
                    /* No statistics found */
                    processor.setData(job, "No statistics found");
                    job.success = false;
                } else {
                    /* All good */
                    job.success = true;
                }
            }

            debug("Saving job" + job.id);
            job.save(function(okay) {
                return callback(null, job.success);
            });
        });
    },

    afterProcessing(jobs, results, callback) {
        log.info(this.label + " finished");
        var counts = {success: 0, failure: 0};
        for (var i = 0; i < jobs.length; ++i) {
            var job = jobs[i];
            if (job.success === false) {
                counts.failure++;
            } else
                counts.success++;
        }
        log.verbose("Success: " + counts.success);
        log.verbose("Failure: " + counts.failure);
        callback(null);
    },

};

processor = extend(true, BaseProcessor, processor);


module.exports = processor;


