var debug       = require('debug')('nxhero');
const fs = require('fs');
const spawn = require('child_process').spawn;
var date = require('../lib/date');
var os = require("os");
var nconf       = require('nconf');
var zpad = require('zpad');


var BaseLauncher = require("../lib/base_launcher");
var log = require("../lib/log");


module.exports = {
    label: "SLURM launcher",
    getConf: function() {
        var launcher = nconf.get('launchers');
        if (typeof launcher !== "undefined")
            return launcher['slurm'];
        else
            return {};
    },

    launch: function(job, callback) {

        var conf = this.getConf();

        zpad.amount(nconf.get('runs').idpadamount);
        var jobName = "job_" + zpad(job.id);
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
                    process.exit();

                    const sbatchOut = fs.openSync(job.wd + '/sbatch_out.log', 'w');
                    var sbatchCmd = 'sbatch';
                    var sbtachArgs = [batchFile];

                    try {

                        child = spawn(sbatchCmd, sbatchArgs, {
                            cwd: job.wd,
                            detached: true,
                            stdio: ['ignore', sbatchOut, sbatchOut]
                        });
                    } catch (err) {
                        throw err;
                    }

                    job.setSubmitted("", function(err) {
                        if (err !== null)
                            throw new Error("Error saving submitted data on job");
                    });
                    child.on('error', BaseLauncher.errClosure(job));
                    child.unref();
                } else {
                    console.log("Created batch file. Not submitting according to launcher configuration.");
                }
                return callback(null, {});
            }
        });
    }
}
