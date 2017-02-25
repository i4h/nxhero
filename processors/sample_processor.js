var extend = require('node.extend');
var log = require("../lib/log");

var BaseProcessor = require('../processors/processor');

var sampleProcessor = {
    id: "sample",
    label: "sample processor",
    binaryTypes: ['testbinary'],

    /**
     * Hook called before processing individual jobs
     *
     * @param store
     * @param jobs
     * @param options
     * @param callback
     */
    beforeProcessing: function(store, jobs, options, callback) {
        callback(null);
    },

    /** Process a single job
     *
     * @param store
     * @param job
     * @param options
     * @param callback
     */
    processOne : function(store, job, options, callback) {
        callback(null, job.id);
    },

    /**
     * Called after processing each job. A good place to process
     * or display results
     * @param store
     * @param jobs
     * @param options
     * @param results
     * @param callback
     */
    afterProcessing: function(store, jobs, options, results, callback) {
        log.verbose(results);
        callback(null);

    },
};

/* Copy BaseProcessor */
var myBaseProcessor = extend(true, {}, BaseProcessor);
sampleProcessor = extend(true, myBaseProcessor, sampleProcessor);

module.exports = sampleProcessor;


