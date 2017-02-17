var nconf       = require('nconf');
var cartesian = require('cartesian');
var OpenRecord = require('openrecord');
const path = require('path');
var debug       = require('debug')('nxhero');

var BaseParameter = require('./base_parameter');
var BaseJobgroup = require('./base_jobgroup');
var BaseBinary = require('./base_binary');
var BaseProblem = require('./base_problem');
var BaseJob = require('./base_job');
var log = require("../lib/log");


module.exports = {

    getModelSelectQuestion: function(store, modelName, options, callback) {
        store.verify();
        var Model = store.Model(modelName);
        Model.where().exec(function(records) {
            choices = [];
            if (options.returnItem === true)
                choices.push({value: -1, name: '<< Main Menu'});
            if (options.newItem === true)
                choices.push({value: -2, name: 'Create New'});
            if (options.importItem === true)
                choices.push({value: -3, name: 'Import'});

            for (var idx = 0; idx < records.length; idx++) {
                record = records[idx];
                choices.push(
                    {
                        name: record.getString(),
                        value: record.id
                    }
                );
            }
            var question = {
                type: 'rawlist',
                name: 'id',
                pageSize: 50,
                message: "Select " + store.getBaseModel(modelName).label,
                choices: choices,
            };

            callback(null, question);
        });
    },

    open: function openDB(dbConf, callback) {

        if (dbConf.type === "sqlite3")
            dbConf.file = __dirname + "/../" + dbConf.file;

        dbConf.models = path.resolve(__dirname + "/../models/*.js");
        dbConf.migrations = path.resolve(__dirname + "/../migrations/*");



        var store = new OpenRecord(dbConf);

        store.verify = function() {
            if ( typeof this.connection === 'undefined') {
                log.verbose("Error: No DB connected");
                throw new Error("DB not available but required to proceed");
            }
        }

        store.getBaseModel = function(modelName) {
            switch(modelName) {
                case "Jobgroup":
                    return BaseJobgroup;
                    break;
                case "Parameter":
                    return BaseParameter;
                    break;
                case "Problem":
                    return BaseProblem;
                    break;
                case "Binary":
                    return BaseBinary;
                    break;
                default:
                    throw new Error("unable to get Basemodel for " + modelName);
            }

        };

        store.ready(function(){
            dbConnected = true;
            //log.verbose("DB is open");
            callback(null, store);
        });
    },

    clean: function(store, options, callback) {
        modelNames = ["Parameter", "Problem", "Binary", "Job", "Jobgroup"];
        var deleteClosure = function(modelName) {
            return function(okay) {
            };
        };
        for (var i = 0; i < modelNames.length; i++) {
            modelName = modelNames[i];
            Model = store.Model(modelName);
            Model.deleteAll(deleteClosure(modelName));
        }
        callback(null);
    }

};
