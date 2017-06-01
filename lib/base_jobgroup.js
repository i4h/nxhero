var BaseJob = require('../lib/base_job');
var debug       = require('debug')('nxhero');

module.exports = {
    label: "Jobgroup",

    listHeader: [{content:'Name', colWidth: 40}, {content:'wd', colWidth: 15} ],

    /* Get a join configuration with everything we need for a launch on a Jobgroup Model */
    getLaunchJoin: function(Jobgroup) {
        var join = {};
        join.job = BaseJob.getValueJoin(true);
        join.job.problem = null;
        join.job.tag = null;
        join.binary = null;

        return join;
    },
}

