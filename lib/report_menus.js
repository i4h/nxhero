var inquirer    = require('inquirer');
var selectAndCall = require('./select_and_call');
var modelInsert = require('./model_insert');
var BaseJobgroup = require('./base_jobgroup');
var BaseProblem = require('./base_problem');
var BaseTestset = require('./base_testset');
var BaseBinary = require('./base_binary');
var BaseParameter = require('./base_parameter');
var BaseLauncher = require('./base_launcher');
var extend = require('util')._extend;
var async = require('async');
var in_array = require('in_array');
const path      = require('path');
var resolveHome = require('../lib/files').resolveHome;
var debug       = require('debug')('nxhero');
var nconf       = require('nconf');
var zpad = require('zpad');
var LatexTable = require('latex-data-table');


var MenuHelper = require('../lib/menu_helpers');
var listSelect = require('./list_select');
var parseSequence = require('./parse_sequence');
var ParamModels = require('../parameters/module.js');
var BinaryModels = require('../binaries/module.js');

var date = require('./date');
var log = require("../lib/log");
var db = require('./db');

var modelName = "Jobgroup";


module.exports = {

    main: function(store, options, callback) {
        inquirer.prompt({
            type: "list",
            message: "Parameter Action:",
            name: "action",
            choices: [
                {
                    name: "List",
                    value: module.exports.list,
                },
                {
                    name: "Clean",
                    value: module.exports.clean,
                },
            ]
        }).then(function(answers) {
            return answers.action(store, options, callback);
        });
    },


    list: function(store, options, callback) {
        var options = {};
        log.info("Report List:")
        db.getModelList(store, modelName, options, function(err, body, header) {
            var table = LatexTable(body, header, {style: "ascii"});
            log.verbose(table);
            return callback(err);
        });
    },

    clean: function(store, options, callback) {
        console.info("Looking for reports without keep file")
        var options = {};
        var Model = store.Model("Report");
        Model.exec((records) => {
            var statKeepFile = function(dir) {
                return new Promise((resolve, reject) => {
                    if (dir === null)
                        resolve(false);

                    let keepFileExists = true;
                    try {
                        fs.statSync(dir + "/keep");
                    } catch (e) {
                        keepFileExists = false;
                    }
                    return resolve(keepFileExists);
                });
            };

            /* Run all checks in parallel */
            let promises = [];
            for (var i = 0; i < records.length; i++) {
                var report = records[i];
                promises.push(statKeepFile(report.wd));
            }

            Promise.all(promises).then((keep) => {
                /* Count reports without keep flag */
                let nClean = 0;
                for (var i = 0; i < keep.length; i++) {
                    if (keep[i] === false)
                        nClean++;
                }
                MenuHelper.confirmIfTrue(false, "Clean " + nClean + " / " + records.length + " reports?", function(err, confirmed) {
                    //if (!confirmed)
                      //  return callback(null);

                    let deleteClosure = function(report) {
                        return new Promise((resolve, reject) => {
                            report.deleteDeep(store,{}, function(err) {
                                if (err)
                                    return reject(err);
                                return resolve(null);
                            });
                        });
                    };

                    let promises = [];
                    for (var i = 0; i < records.length; i++) {
                        if (!keep[i])
                            promises.push(deleteClosure(records[i]));
                    };

                    Promise.all(promises).then(() => {
                        return callback(null);
                    }, (err) => {
                        debug(err);
                        return callback(err);
                    });
                });
            });
        });
    },

}
