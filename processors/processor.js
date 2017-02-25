var debug       = require('debug')('nxhero');
var in_array = require('in_array');
const child_process = require('child_process');
var async = require('async');

var log = require("../lib/log");
var BaseJob = require('../lib/base_job');


module.exports = {
    id: "base_processor ",
    label: "BaseProcessor",
    binaryTypes: [],

    /** Default implementation to process the given jobs
     * calls processOne on the processor implementation for every job
     * in parallel
     * calls afterProcessing() on the processor implementation when all
     * processOne processes are finished
     *
     * @param store
     * @param jobs
     * @param options
     * @param callback
     * @returns {*}
     */
    process: function (store, jobs, options, callback) {
        var processor = this;
        log.info("Processing " + jobs.length + " with " + this.label);

        /* Prepare beforeProcessing, processEach and afterProcess as waterfall */
        var calls = [];
        /* */
        if (typeof processor.beforeProcessing === "function") {
            calls.push(function(callback) {
                return processor.beforeProcessing(store, jobs, {}, callback);
            });
        }
        calls.push(function(callback) {
            return processor.processEach(store, jobs, {}, callback);
        });

        if (typeof processor.afterProcessing === "function") {
            calls.push(function(results, callback) {
                return processor.afterProcessing(store, jobs, {}, results, callback);
            });
        }

        async.waterfall(calls, function(err, results) {
            if (err)
                throw err;

            log.info("Finished");
            callback(null);
        });
    },

    /**
     * Calls processOne on each job in parallel
     *
     * callback MUST get two arguments ( i.e. callback(null, [])  )
     * for waterfall in process() to work
     *
     * @param store
     * @param jobs
     * @param options
     * @param callback
     */
    processEach: function(store, jobs, options, callback) {
        var processor = this;
        /* Call processOne of processor on every job */
        calls = [];
        var start = 0;
        var end = jobs.length;
        for (var i = start; i < end; ++i) {
            var job = jobs[i];
            var binary = job.jobgroup.binary;
            if (   processor.binaryTypes !== '*'
                && !in_array(binary.type, processor.binaryTypes)) {
                callback(new Error("Unable to process job " + job.id + " with binary type " + binary.type))
            }

            var processClosure = function (job, i) {
                return function (callback) {
                    processor.processOne(store, job, {i: i}, callback);
                }
            }
            calls.push(processClosure(job, i));
        }
        async.parallel(calls, function (err, results) {

            if (err !== null)
                throw err;
            callback(null, results);
        });
    },

    setData : function(job, data) {
        var allData = job.processorData;
        allData[this.id] = data;
        job.processorData = allData;
    },

    getData : function(job) {
        return job.processorData[this.id];
    },
}
