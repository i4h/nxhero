var BinaryModels = require('../binaries/module.js');
var debug       = require('debug')('nxhero');
var resolveHome = require('../lib/files').resolveHome;


module.exports = function(){
    this.validatesPresenceOf('name');

    this.hasMany("jobgroup");
    this.hasMany("binaries_parameters");
    this.hasMany('parameter', {through: "binaries_parameters"});

    this.models_name = "Binaries";

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

    this.runPreflightChecks = function(wd, callback) {
        this.getBinaryModel().runPreflightChecks(wd, callback);
    };

    this.setParams = function(store, job, parameterValues, callback) {
        var wd = job.wd;
        this.getBinaryModel().setParams(store, job, parameterValues, callback);
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

            if (job.timelimit !== null)
                args[i] = args[i].replace("{timelimit}", job.timelimit);

            for (var j = 0; j < parameterValues.length; ++j ) {
                var name = parameterValues[j].parameter.name;
                var value = parameterValues[j].value;
                args[i] = args[i].replace("{" + name + ".value}", value);
            }
        }
        return(args);
    };

    this.getParametersFromJoin = function() {
        var parameters = [];
        for (var i = 0; i < this.binaries_parameters.length; i++) {
            if (typeof this.binaries_parameters[i].parameter !== "undefined")
                parameters.push(this.binaries_parameters[i].parameter);
        }
        return parameters;
    };

    this.getListRow= function() {
        var argsString = this.args.map(function(arg){
            return "\"" + arg + "\"";
        })
        /* Indicate attached binaries */
        return [this.name, this.path, argsString.join(" ")];
    };

}
