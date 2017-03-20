var nconf       = require('nconf');
var cartesian = require('cartesian');
var OpenRecord = require('openrecord');
const path = require('path');
var debug       = require('debug')('nxhero');
var in_array = require("in_array");
var async = require('async');

var BaseParameter = require('./base_parameter');
var BaseJobgroup = require('./base_jobgroup');
var BaseTestset = require('./base_testset');
var BaseBinary = require('./base_binary');
var BaseProblem = require('./base_problem');
var BaseJob = require('./base_job');
var log = require("../lib/log");


module.exports = {

    copyAttributes: function(source, options) {
        result = {};
        /* Only specified attributes */
        if (typeof options.only !== "undefined") {
            for (var i = 0; i < options.only.length; ++i) {
                var name = options.only[i];
                result[name] = source[name];
            }
        } else {
        /* All except ''options.except'' attributes */
            for (var name in source.attributes) {
                if (typeof options.except === "undefined" || !in_array(name, options.except))
                    result[name] = source[name];
            }
        }

        /* Possibly override with options.attributes */
        if (typeof options.attributes !== "undefined") {
            for (var name in options.attributes) {
                result[name] = options.attributes[name];
            }
        }
        return result;
    },

    copyModel: function(source, options, callback) {
        var attribs = module.exports.copyAttributes(source, options);

        var Model = store.Model(source.model_name);
        var newModel = new Model(attribs);
        newModel.save(function(okay) {
            if (!okay)
                return callback(new Error("Unable to create new " + source.model_name ));
            else
                return callback(null, newModel);
        });
    },

    getModelSelectQuestion: function(store, modelName, options, callback) {
        store.verify();
        var Model = store.Model(modelName);
        var joinConf = typeof options.join === "undefined" ? {} : options.join;
        Model.where().join(joinConf).exec(function(records) {
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

        store.getBaseModel = module.exports.getBaseModel;

        store.ready(function(){
            dbConnected = true;
            //log.verbose("DB is open");
            callback(null, store);
        });
    },

    getBaseModel: function(modelName) {
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
            case "Testset":
                return BaseTestset;
                break;
            case "Binary":
                return BaseBinary;
                break;
            default:
                throw new Error("unable to get Basemodel for " + modelName);
        }

    },



    clean: function(store, options, callback) {
        var modelNames = [
            "BinariesParameter",
            "Binary",
            "Job",
            "Jobgroup",
            "Parameter",
            "Parametervaluefloat",
            "Parametervalueint",
            "Parametervaluestring",
            "Problem",
            "Report",
            "Reportsjob",
            "Tag",
            "Testset",
            "Testsetsproblem"
            ];

        var deleteClosure = function(modelName) {
            return function(callback) {
                Model = store.Model(modelName);
                Model.deleteAll(function(okay) {
                    callback(null);
                });
            };
        };
        var calls = [];
        for (var i = 0; i < modelNames.length; i++) {
            modelName = modelNames[i];
            calls.push(deleteClosure(modelName));
        }
        async.parallel(calls, function(err) {
            return callback(err);
        });
    },

    findByPk: function(store, modelName, id, options, callback) {
        var Model = store.Model(modelName);

        if (typeof options.join !== "undefined")
            Model = Model.join(options.join);


        Model.where({id: id}).exec(function(records) {
            return callback(null, records[0]);
        });
    },

    /** Massively assign attributes and
     * potentially save afterwards
     *
     * @param model
     * @param attributes
     * @param save
     * @returns {*}
     */
    setAttributes: function(model, attributes, options, save, callback) {
        for (var name in attributes)
            model[name] = attributes[name];

        if (save === true) {
            model.save(function(okay) {
                if (!okay)
                    return callback(new Error("Error saving model"));
                return callback(null);
            });
         } else {
            return callback(null);
        }
    }
};
