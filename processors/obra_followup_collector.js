var debug       = require('debug')('nxhero');
var async = require("async");

var db = require("../lib/db");
var BaseJob = require('../lib/base_job');

module.exports = {

    collect: function(store, processor, job, options, callback) {
        var processorData = job.processorData;
        var myData = {};
        var tags = [];

        async.waterfall([
            /* Get the source job */
            function(callback) {
                var sourceJobId = job.processorData.obra_followup.sourceJob;
                var join = BaseJob.getValueJoin(true);
                join.jobgroup = true;
                db.findByPk(store, "Job", sourceJobId, {join: join}, callback);
            },
            /* Write my data */
            function(sourceJob, callback) {
                var sourceData = sourceJob.processorData;

                /* Get parameters of source job */
                var paramNames = ['propagating/obra/lookback', 'propagating/obra/addCuts', 'propagating/obra/addMultiTimeCuts'];

                for (var i = 0; i < paramNames.length; i++) {
                    var paramName = paramNames[i];
                    myData[paramName] = sourceJob.getParameterValueFromJoin(paramName);
                }
                /* Compute total time */
                if(typeof  sourceData.scip_collector === "undefined" )
                    return callback(new Error("No scip_collector data found on sourcejob " + sourceJob.id + "(Group " + sourceJob.jobgroup.name + ")"));
                if( typeof  processorData.scip_collector === "undefined" )
                    return callback(new Error("No scip_collector data found on obra_followup job " + job.id + "(Group " + job.jobgroup.name + ")"));

                /* Try to compute the combined time */
                var obraTime;
                var followupTime;
                try {
                    obraTime = parseFloat(sourceData.scip_collector.statistics['<unsectioned>'].data.total_time);
                } catch(e) {
                    return callback(new Error("Unable to get obraTime on on sourcejob " + sourceJob.id + "(Group " + sourceJob.jobgroup.name + ")\n" + e.message));
                }
                try {
                    followupTime = parseFloat(processorData.scip_collector.statistics['<unsectioned>'].data.total_time);
                } catch(e) {
                    return callback(new Error("Unable to get total_time time on obra_followup job " + job.id + "(Group " + job.jobgroup.name + ")\n" + e.message));
                }
                var totalTime = obraTime + followupTime;

                myData.status = processorData.scip_collector.statistics['<unsectioned>'].data.scip_status;
                myData.total_time = totalTime;
                tags.push(myData.status);
                return callback(null);
            }
        ], function(err) {
            if (err)
                return callback(err);
            /* Set updated processorData */
            processorData.obra_followup_collector = myData;
            job.processorData = processorData;

            job.saveWithTags(store, tags, {creator: "obra_followup_collector"}, function (err, tags) {
                return callback(null, job.success);
            });
        });
    },

}