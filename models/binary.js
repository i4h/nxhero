var BinaryModels = require('../binaries/module.js');
var debug       = require('debug')('nxhero');
var resolveHome = require('../lib/files').resolveHome;


module.exports = function(){
    this.validatesPresenceOf('name');

    this.hasMany("jobgroup");

    this.belongsTo("binary");

    this.getString = function() {
        return this.name + " (" + this.type + ": " + this.path + ")";
    };

    this.getter("args", function() {
        args = JSON.parse(this.args_string);
        if (args === null)
            return [];
        else
            return JSON.parse(this.args_string);
    });
    this.setter("args", function(value) {
        this.args_string = JSON.stringify(value);
    });

    this.setter("argsUserString", function(value) {
        parts = value.split(";");
        for (var i = 0; i < parts.length; ++i)
            parts[i] = parts[i].trim();
        this.args_string = JSON.stringify(parts);
    });

    this.getBinaryModel = function() {
        if (typeof BinaryModels[this.type] === "undefined")
            throw new Error("BinaryModel for type " + this.type + " not found");

        return BinaryModels[this.type];
    }

    this.prepareJob = function(wd, callback) {
        this.getBinaryModel().prepareJob(wd, callback);
    };

    this.prepareJobgroup = function(wd, callback) {
        this.getBinaryModel().prepareJobgroup(wd, callback);
    };

    this.setParams = function(wd, store, parameterValues, callback) {
            this.getBinaryModel().setParams(wd, store, parameterValues, callback);
    };

    this.getCommand = function(job) {
        return resolveHome(this.path);
    };

    /** Perform replacement of placeholders in args and return
     * @param job
     * @returns {*}
     */
    this.getArgs = function(job, parameterValues) {

        args = this.args;
        for (var i = 0; i < args.length; ++i) {
            if (typeof job.problem !== "undefined") {
                args[i] = args[i].replace("{problem.path}", job.problem.absolutePath);
            }
            for (var j = 0; j < parameterValues.length; ++j ) {
                var name = parameterValues[j].parameter.name;
                var value = parameterValues[j].value;
                args[i] = args[i].replace("{" + name + ".value}", value);
            }
        }
        return(args);
    };
}
