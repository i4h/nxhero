var async = require('async');
var nconf       = require('nconf');
const path      = require('path');
var zpad = require('zpad');
var fs = require('fs-extra')
var debug       = require('debug')('nxhero');
var date = require('../lib/date');
var os = require("os");


var resolveHome = require('../lib/files').resolveHome;
var BaseJob     = require("../lib/base_job");
var BaseParameter     = require("../lib/base_parameter");
var log = require("../lib/log");


//@todo: Set launched flag on launch
//@todo: Add copy menu
//@todo: Add multiselect delete menu

module.exports = function(){

    this.stampable();

    this.hasMany('parameter_value_int');
    this.hasMany('parameter_value_float');
    this.hasMany('parameter_value_string');

    this.belongsTo('jobgroup');
    this.belongsTo('problem');

    /** Non-persistent storage of flags for this job */
    this.attribute("flags");

    this.scope('active', function(){
        this.where({active: true});
    });


    this.getParameterValues = function() {
        vals = [];
        for (i in BaseParameter.valueRelations) {
            var relation = BaseParameter.valueRelations[i];
            for (var j = 0; j < this[relation].length; ++j) {
                vals.push(this[relation][j]);
            }
        }
        return vals;
    };

    /** Adds a parameterValue to the correct relation
     *
     * Does not save the change to the store
     *
     * @param store
     * @param parameter
     * @param value
     */
    this.addParameterValue = function(store, parameter, value) {
        var parameterValue = parameter.getNewValueModel(store, {});
        parameterValue.value = value;
        parameterValue.parameter_id = parameter.id;
        parameterValue.parameter = parameter;
        var relation = parameter.getValueRelation();
        this[relation].push(parameterValue);
    }

    this.getJobgroup = function(store, callback) {
        var Model = store.Model("Jobgroup");
        Model.find(this.jobgroup_id).exec(function(jobgroup) {
            callback(null, jobgroup);
        });
    };

    /** Launch the job:
     * - Let the binary model prepare the working directory
     * - Get the command from the binary
     * - Let the selected launchers run the command
     *
     *  Expects paramValue(Int|Float|String)s to be loaded with their
     *  respective parameter relation
     * @param store
     * @param options
     * @param callback(err)
     */
    this.launch = function(store, options, callback) {

        zpad.amount(nconf.get('runs').idpadamount);
        var binary = this.jobgroup.binary;
        var job = this;
        binary.job = job;

        this.wd = path.resolve(resolveHome(nconf.get('runs').rootdir) + "/group_" + zpad(this.jobgroup.id) + "/job_" + zpad(this.id));
        var wd = this.wd;
        var params = this.getParameterValues();

        async.series([
            function (callback) {
                /* Create working directory */
                fs.mkdirs(wd, callback)
            },
            function (callback) {
                /* Let binaryModel prepare the job */
                binary.prepareJob(wd, callback)
            },
            function (callback) {
                /* Let binaryModel set the jobs parameters */
                binary.setParams(wd, store, params, callback)
            },
            function (callback) {
                /* Get the command and the launcher, launch */
                job.command = binary.getCommand(job);
                job.args = binary.getArgs(job, params);

                var launcher = BaseJob.getLauncher(job.jobgroup.launcher);
                launcher.launch(job, function (err, processInfo) {
                    if (err !== null) {
                        log.verbose("Error launching job " + job.id);
                    }
                    return callback(err);
                });
            }
        ], function(err) {
            return callback(err);
        });
    };

    this.setSubmitted = function(launcherData, callback) {
        this.launcher_data = launcherData;
        this.submitted = date.dbDatetime();
        this.execution_status = "submitted";
        this.hostname = os.hostname();
        this.full_command = this.command + " " + '"' + this.args.join('" "') + '"';
        this.save(function(okay) {
            if (!okay)
                callback(new Error("Error updating this " + this.id));
            else
                callback(null);
        });
    };


}

