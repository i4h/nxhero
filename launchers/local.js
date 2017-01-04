var debug       = require('debug')('nxhero');
const fs = require('fs-extra');
const child_process = require('child_process');
var date = require('../lib/date');
var os = require("os");

var BaseJob = require("../lib/base_job");
var BaseLauncher = require("../lib/base_launcher");


module.exports = {
    label: "Local launcher",

    launch: function(job, callback) {
        const out = fs.openSync(job.wd + '/out.log', 'w');
        const err = fs.openSync(job.wd + '/error.log', 'w');

        try {
            child = child_process.spawn(job.command, job.args, {
                cwd: job.wd,
                detached: true,
                stdio: ['ignore', out, out]
            });
        } catch( err) {
            throw err;
        }

        var processInfo = {pid: child.pid};
        child.on('error', BaseLauncher.errClosure(job));
        child.unref();

        job.setSubmitted(JSON.stringify(processInfo), function(err) {
            if (err !== null)
                throw new Error("Error saving submitted data on job");
            return callback(null, processInfo);
        });
    }
}
