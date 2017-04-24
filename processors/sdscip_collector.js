

var debug       = require('debug')('nxhero');
var in_array = require('in_array');
const child_process = require('child_process');
var async = require('async');
var extend = require('node.extend');

var log = require("../lib/log");
var ArrayHelper = require("arrayhelper-yii2-style");
var LatexTable = require('latex-data-table');

var BaseProcessor = require('../processors/processor');
var OBRAfollowupCollector = require('../processors/obra_followup_collector');
var OBRAcollector = require('../processors/obra_collector');
var SCIPcollector = require('../processors/scip_collector');

var SCIPstatsParser = require('../lib/scip_statistics_parser');

var OBRAsuccessProcessor = {
    id: "sdscip_collector",
    label: "SDSCIP data collector processor",
    binaryTypes: ['sdscip'],

    callLevels: null,

    beforeProcessing: function(store, jobs, {}, callback)  {
	module.exports.callLevels =   [[], [], []];
	return callback(null);
    },

    /** Process a single job
     * Checks tag and delegates processing to the
     * correct module
     *
     * @param store
     * @param job
     * @param options
     * @param callback
     */
    processOne : function(store, job, options, callback) {
        var processor = this;

        if (job.hasTagFromJoin("obra_followup")) {
            this.callLevels[2].push(function(callback) {
                //debug("followup collector");
                OBRAfollowupCollector.collect(store, processor, job, {}, function(err, result) {
                    return callback(err, {type: "obra_followup", result: result});
                });
            });
        } else if (job.hasTagFromJoin("obra")) {
            this.callLevels[1].push(function(callback) {
                //debug("OBRA collector");
                OBRAcollector.collect(store, processor, job, {}, function(err, result) {
                    return callback(err, {type: "obra", result: result});
                });
            });
        }
        this.callLevels[0].push(function(callback) {
            //debug("scip  collector");
            SCIPcollector.collect(store, processor, job, {}, function (err, result) {
                return callback(err, {type: "scip", result: result});
            });
        });

        return callback(null);
    },

    afterProcessing: function(store, jobs, options, results, callback) {
        var processor = this;
        var seriesCalls = [];
        var seriesClosure = function(calls) {
            return function(callback) {
                return async.parallel(calls, callback);
            }
        }
        for (var i = 0; i < this.callLevels.length; i++) {
            var calls = this.callLevels[i];
            seriesCalls.push(seriesClosure(calls));
        }

        async.series(seriesCalls, function(err, levelResults) {
            if (err)
                return callback(err);

            var results  = [].concat.apply([], levelResults);
            log.info(processor.label + " finished");
            var tree = ArrayHelper.treeify(results, ["type"]);
            var header = [
                "Type",
                {content: "Success", colWidth: 10},
                {content: "Failed", colWidth: 10},
                {content: "Total", colWidth: 10},
            ];
            var body = [];
            for (var type in tree) {
                var success = 0;
                for (var i = 0; i < tree[type].length; i++) {
                    if (tree[type][i].result)
                        success++;
                }
                body.push([type, success, tree[type].length - success, tree[type].length]);
            }

            log.verbose(LatexTable(body, header, {style: "ascii"}));
            return callback(null);
        });
    },

};

/* Copy BaseProcessor */
var myBaseProcessor = extend(true, {}, BaseProcessor);
OBRAsuccessProcessor = extend(true, myBaseProcessor, OBRAsuccessProcessor);

module.exports = OBRAsuccessProcessor;


