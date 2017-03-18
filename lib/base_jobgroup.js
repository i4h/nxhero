var BaseJob = require('../lib/base_job');
var debug       = require('debug')('nxhero');

module.exports = {
    label: "Jobgroup",

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

