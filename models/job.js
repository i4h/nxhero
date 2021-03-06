var async = require('async');
var nconf       = require('nconf');
const path      = require('path');
var zpad = require('zpad');
var fs = require('fs-extra')
var debug       = require('debug')('nxhero');
var date = require('../lib/date');
var os = require("os");
var in_array = require('in_array');
var extend = require('node.extend');
const child_process = require('child_process');

var resolveHome = require('../lib/files').resolveHome;
var BaseJob     = require("../lib/base_job");
var BaseParameter     = require("../lib/base_parameter");
var BaseTag = require("../lib/base_tag");
var log = require("../lib/log");
var db = require("../lib/db");
var model_insert = require("../lib/model_insert");


//@todo: Set launched flag on launch
//@todo: Add copy menu
//@todo: Add multiselect delete menu

module.exports = function(){

    this.stampable();

    this.getter("processorData", function() {
        if (this.processor_data === null || this.processor_data === "") {
            return {};
        } else {
            return (JSON.parse(this.processor_data));
        }
    });

    this.setter("processorData", function(value) {
        this.processor_data = JSON.stringify(value);
    });

    this.getter("launcherData", function() {
        if (this.launcher_data === null)
            return {};
        else
            return (JSON.parse(this.launcher_data));
    });
    this.setter("launcherData", function(value) {
        this.launcher_data = JSON.stringify(value);
    });

    this.hasMany('parameter_value_int');
    this.hasMany('parameter_value_float');
    this.hasMany('parameter_value_string');

    this.hasMany('tag');

    this.belongsTo('jobgroup');
    this.belongsTo('problem');

    /** Non-persistent storage of flags for this job */
    this.attribute("flags");

    this.scope('active', function(){
        this.where({active: true});
    });

    this.models_name = "Jobgroups";

    this.getParameterValues = function() {
        vals = [];
        paramIds = [];
        for (i in BaseParameter.valueRelations) {
            var relation = BaseParameter.valueRelations[i];
            for (var j = 0; j < this[relation].length; ++j) {
                var val = this[relation][j];
                /* Looks like openrecord adds some linker models and duplicates we should ignore */
                if (val.id !== null && !in_array(val.parameter_id, paramIds)) {
                    paramIds.push(val.parameter_id);
                    vals.push(val);
                }
            }
        }
        return vals;
    };

    this.copy = function(store, options, callback) {
        var job = this;
        if (typeof options.except === "undefined")
            options.except = ["id"];
        else
            options.except.push(id);

        var jobAttributes = extend({}, BaseJob.defaultAttributes);
        jobAttributes = extend(jobAttributes, db.copyAttributes(this, options));

        model_insert(store, "Job", jobAttributes, function(err, newJob) {
            if (err)
                return callback(err);

            log.verbose("Created job " + newJob.id);

            BaseParameter.copyParameterValues(store, job.id, newJob.id, {}, function(err, results) {
                callback(err, {job: newJob, values: results});
            });
        });
    },

    /** Get parameter values of this job by id*/
    this.getParameterValuesById = function() {
        vals = {};
        for (i in BaseParameter.valueRelations) {
            var relation = BaseParameter.valueRelations[i];
            for (var j = 0; j < this[relation].length; ++j) {
                vals[this[relation][j].parameter_id] = this[relation][j].value;
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
    };

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

        this.wd = this.jobgroup.wd + "/job_" + zpad(this.id);
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
                binary.setParams(store, job, params, callback)
            },
            function (callback) {
                /* Get the command and the launcher, launch */
                job.command = binary.getCommand(job);
                job.args = binary.getArgs(job, params);

                var launcher = BaseJob.getLauncher(job.jobgroup.launcher);
                launcher.launch(store, job, function (err, processInfo) {
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

    this.cancel = function(store, options, callback) {
        var launcher = BaseJob.getLauncher(this.jobgroup.launcher);
        if (typeof launcher.cancel !== "function") {
            throw new Error("cancel not implemented for launcher " + launcher.label);
        } else {
            return launcher.cancel(store, this, {}, callback);
        }
    }

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

    this.getOutFile = function() {
        return this.wd + "/out.log";
    };

    this.getOutfileContents = function(callback) {
        var outfile = this.getOutFile();

        fs.readFile(this.getOutFile(), (err, data) => {
            callback(err, data);
        });
    };

    this.getOutfileTail = function(callback) {
        var outfile = this.getOutFile();
        let n = 8;
        cmd = "tail -n " + n + " " + outfile;
        child_process.exec(cmd, null, function (err, stdout, stderr) {
            return callback(err, stdout);
        });
    };

    this.saveWithTags = function(store, tags, options, callback) {
        var job = this;
        job.save(function(okay) {
            if (!okay)
                return callback(new Error("Unable to save job"));
            BaseTag.performTagTasks( store, {add: tags}, [job.id], options, function(err, tags) {
                if (err === null)
                    job.tag = tags;
                return callback(err);
            });
        });
    };

    this.addTags = function(taggs, callback) {
        for (var i = 0; i < tags.length; ++i) {

        }
    };

    this.getParameterValueFromJoin = function(name, type) {
        var relations = ["parameter_value_" + type];
        if (!type)
            relations = BaseParameter.valueRelations;

        var job = this;
        for (var r in relations) {
            var relation = relations[r];
            for (var i = 0; i < job[relation].length; ++i) {
                if (job[relation][i].parameter.name === name)
                    return job[relation][i].value;
            }
        }
        return null;
    };

    this.hasTagFromJoin = function(tagName) {
        for (var i = 0; i < this.tag.length; i++) {
            var tag = this.tag[i];
            if (tag.name === tagName)
                return true;
        }
        return false;
    };

}

