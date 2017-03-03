var debug       = require('debug')('nxhero');
const fs = require('fs');
const child_process = require('child_process');

var os = require("os");
var nconf       = require('nconf');
var zpad = require('zpad');
var async = require("async");


var BaseLauncher = require("../lib/base_launcher");
var log = require("../lib/log");
var date = require('../lib/date');

module.exports = {
    id: "slurm",
    label: "SLURM launcher",
    unfinishedStatuses : ['submitted', 'slurm_pending', 'slurm_running'],

    getConf: function() {
        var launcher = nconf.get('launchers');
        if (typeof launcher !== "undefined")
            return launcher['slurm'];
        else
            return {};
    },
    terminatedRegex : /srun: error: [\w-\.]*: task \d*: Terminated/,
    sbatchRegex : /Submitted batch job (\d*)/,


    launch: function(store, job, callback) {
        var conf = this.getConf();
        zpad.amount(nconf.get('runs').idpadamount);
        var jobName = "j" + zpad(job.id);
        var batchFile = job.wd + "/" +jobName + ".sh";

        /* Create string for sbatch file */
        var f = "#!/bin/bash \n\n";

        /* Add option directives */
        for (name in conf['batchFileOptions']) {
            if (conf['batchFileOptions'][name] === null)
                f = f + "#SBATCH --" + name + "\n";
            else
                f = f + "#SBATCH --" + name + "=" + conf['batchFileOptions'][name] + "\n";
        }
        f = f + "#SBATCH --output=" +  BaseLauncher.outFileName + "\n";
        f = f + "#SBATCH --error=" +  BaseLauncher.errorFileName + "\n";
        f = f + "#SBATCH --job-name=" +  jobName + "\n";

        f = f + "\n";

        /* Main command */
        f = f + "srun " + job.command + " " + '"' + job.args.join('" "') + '"' + "\n";

        //srun -n 2048 ./mycode.exe      # an extra -c 2 flag is optional for fully packed pure MPI

        fs.writeFile(batchFile, f, {flags:" O_WRONLY"} ,(err) => {
            if (err)
                throw err;
            else {
                /* Make executable */
                fs.chmodSync(batchFile, '755');

                if (conf['submit'] === true) {
                    const sbatchOut = fs.openSync(job.wd + '/sbatch_out.log', 'w');
                    var sbatchCmd = 'sbatch "' + batchFile + '"';
                    child_process.exec(sbatchCmd ,{cwd: job.wd}, function (err, stdout, stderr) {
                        if (err instanceof Error) {
                            throw err;
                        } else {
                            var launcherData = module.exports.parseSbatchResponse(stdout);
                            launcherData.slurmOptions = conf['batchFileOptions'];
                            job.setSubmitted(JSON.stringify(launcherData), function(err) {
                                if (err !== null)
                                    throw new Error("Error saving submitted data on job");
                                log.verbose("Job " + job.id + " submitted");
                                return callback(null, stdout);
                            });
                        }
                    });
                } else {
                    log.verbose("Created batch file. Not submitting according to launcher configuration.");
                    return callback(null, {});
                }
            }
        });
    },

    cancel: function(store, job, options, callback) {
        var data = job.launcherData;
        if (typeof data.slurm_job_id === "undefined")
            throw new Error("Can not cancel job " + job.id + " because no slurm_id was saved");

        var scancelCmd = 'scancel ' + data.slurm_job_id;
        var simulate = false;
        if (simulate !== true) {
        child_process.exec(scancelCmd ,{}, function (err, stdout, stderr) {
            if (err instanceof Error) {
                throw err;
            } else {
                job.execution_status = "canceled_obra_stall";
                job.finished = date.dbDatetime();
                job.success = false;
                job.save(function(okay) {
                    if (!okay)
                        throw new Error("Error setting job to finished");

                    log.info("Canceled job " + job.id);
                    return callback(null);
                });
            }
        });
        } else {
            job.execution_status = "canceled_obra_stall";
            job.finished = date.dbDatetime();
            job.success = false;
            debug("would save job");
            debug(job);
            return callback(null);
        }
    },

    parseSbatchResponse : function(stdout) {
        var matches_array = stdout.match(module.exports.sbatchRegex);
        if (matches_array === null) {
            throw new Error("Unable to parse sbatch output:\n" + stdout);
        }
        var result = {slurm_job_id: parseInt(matches_array[1])}
        return result;

    },

    checkStatus: function (job, outString) {
        /* Check for a terminated message */
        var matches_array = outString.match(module.exports.terminatedRegex);
        if (matches_array !== null) {
            job.status = "terminated_slurm";
        }
        return;
    },

    /** Update status of all jobs launcher is responsible for
     *
     * @param store
     * @param options
     * @param callback
     */
    updateJobsStatus: function (store, options, callback) {
        /* Get unfinished jobs */
        BaseLauncher.getUnfinishedJobs(store, module.exports.id, module.exports.unfinishedStatuses, function(jobs) {
            if (jobs.length === 0) {
                log.verbose("No unfinished jobs for " + module.exports.label)
                return callback(null);
            }

            var calls = [];
            var updateJobClosure = function(job) {
                return function(callback) {
                    return module.exports.updateJobStatus(store, job, {}, callback);
                }
            };
            for (var i = 0; i< jobs.length; ++i) {
                calls.push(updateJobClosure(jobs[i]));
            }
            async.parallel(calls, function(err, results) {
                if (err)
                    throw err;
                callback(null);
            })
        });
    },
    /** Update status for single job
     *
     * @param store
     * @param job
     * @param options
     * @param callback
     */
    updateJobStatus: function(store, job, options, callback) {

        var data = job.launcherData;
        if (typeof data.slurm_job_id === "undefined") {
            log.verbose("Job " + job.id + ": No slurm job id saved. Unable to query status.");
            callback(null);
        } else {
            var updated = false;
            var cmd = 'squeue --noheader -o "%T" --jobs='+ data.slurm_job_id;
            child_process.exec(cmd ,{}, function (err, stdout, stderr) {
                if (err !== null || stdout === "") {
                    /* squeue fails if the job is not in queue, we assume this means completion */
                    job.finished = date.dbDatetime();
                    job.execution_status = 'finished';
                    updated = true;
                } else {
                    /* Parse squeue response for status */
                    var status = stdout.replace(/\n$/, '').toLowerCase();
                    job.execution_status = "slurm_" + status;
                    updated = true;
                }

                if (updated === true) {
                    job.save(function(okay) {
                        if (!okay)
                            throw new Error("error updating job " + job.id);
                        return callback(null);
                    })
                } else {
                    return callback(null);
                }
            });
        }
    }
}
