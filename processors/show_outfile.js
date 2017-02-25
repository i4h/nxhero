var debug       = require('debug')('nxhero');
var in_array = require('in_array');
const child_process = require('child_process');
var async = require('async');
var extend = require('node.extend');
var fs = require('fs-extra');

var slurm = require('../launchers/slurm');
var log = require("../lib/log");
var BaseJob = require('../lib/base_job');
var BaseProcessor = require('../processors/processor');



var showOutfileProcessor = {
    id: "show_outfile",
    label: "Show Outfile Processor",
    binaryTypes: '*',

    processOne : function(store, job, options, callback) {
        var processor = this;
        var message = "=================================================\n"
        message += "=======BEGIN Outfile for job " + job.id + "==================\n";
        message += "=================================================\n";


        job.getOutfileContents(function(err, contents) {
            if (err)
                message += processor.label + ": Error reading contents of " + job.getOutFile() + "\n";
            else
                message += contents;

            message += "=================================================\n"
            message += "======END Outfile for job " + job.id + "====================\n";
            message += "=================================================\n";
            callback(null, message);
        });
    },

    afterProcessing: function(store, jobs, options, results, callback) {
        log.info("Showing outfiles for " + jobs.length + "jobs:");
        log.verbose(results.join(""));
        log.info(this.label + " finished");
        callback(null);
    },

};

var myBaseProcessor = extend(true, {}, BaseProcessor);
showOutfileProcessor = extend(true, myBaseProcessor, showOutfileProcessor);
module.exports = showOutfileProcessor;


