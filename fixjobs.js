#!/usr/bin/env node


var chalk       = require('chalk');
var clear       = require('clear');
var CLI         = require('clui');
var figlet      = require('figlet');
var inquirer    = require('inquirer');
var Preferences = require('preferences');
var Spinner     = CLI.Spinner;
var Git         = require('./lib/git.js');
const spawn = require('child_process').spawn;
const path = require('path');
var zpad = require('zpad');

var _           = require('lodash');
var git         = require('simple-git')();
var touch       = require('touch');
var fs          = require('fs');
var nconf       = require('nconf');
var debug       = require('debug')('nxhero');
var winston = require('winston');
var async = require('async');


process.env.NODE_ENV = 'console';

var ParameterMenus = require('./lib/parameter_menus');
var ProblemMenus = require('./lib/problem_menus');
var JobgroupMenus = require('./lib/jobgroup_menus');
var BinaryMenus = require('./lib/binary_menus');
var StorageMenus = require('./lib/storage_menus');
var resolveHome = require('./lib/files').resolveHome;

var files = require('./lib/files');
var date = require('./lib/date');

var BaseParameter = require('./lib/base_parameter');
var BaseLauncher = require('./lib/base_launcher');
var BaseJob = require('./lib/base_job');

var dbConnected = false;
var store;

var OpenRecord = require('openrecord');

var db = require('./lib/db');
var log = require("./lib/log");

var parseSequence = require('./lib/parse_sequence');




// Load configuration
nconf.argv()
    .env()
    .file({ file: path.resolve(__dirname + '/config.json' )});

var dbConf = nconf.get('database');

console.log("Startup: Opening db at " + (dbConf.type === "sqlite3" ? dbConf.file : dbConf.host));
db.open(dbConf, function(err, newStore) {
    store  = newStore;
    debug("db ready");

    /* Transfer old to new */
    var transfer = false;
    /* Clean old */
    var clean = false;

    /* Set working directory */
    var setWd = true;

    /* Get parameters */
    BaseParameter.getParametersById(store, {}, function(err, params) {
        var Job = store.Model("Job");
        Job.exec(function(jobs) {
            for (var i = 0; i < jobs.length; ++i) {
                var job = jobs[i];
                if (transfer) {
                    var oldvals = JSON.parse(job.parameter_values);
                    for (id in oldvals) {
                        var val = oldvals[id];
                        var parameter = params[id];
                        job.addParameterValue(store, parameter, val);
                        debug("Adding " + parameter.type + " parameter " + parameter.name + " = " + val);
                    }
                }
                if (clean) {
                    jobs[i].parameter_values = "";
                }

                if (setWd) {
                    zpad.amount(nconf.get('runs').idpadamount);
                    job.wd = path.resolve(resolveHome(nconf.get('runs').rootdir) + "/group_" + zpad(job.jobgroup_id) + "/job_" + zpad(job.id));
                    debug(job.wd);
                }
            }

            /* Save in parallel */
            calls = [];
            var saveClosure = function(job) {
                return function(callback) {
                    job.save(function(okay) {
                        if (okay) {
                            debug("Done saving job " + job.id);
                            return callback(null);
                        } else
                        return callback(new Error("error saving job " + job.id));
                    });
                }
            };

            for (var i = 0; i < jobs.length; ++i)
                calls.push(saveClosure(jobs[i]));

            async.parallel(calls, function(err, result) {
                if (err !== null)
                    throw err;

                debug("saved all jobs");
                process.exit();
            });
        });
    })
});



