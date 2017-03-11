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

var _           = require('lodash');
var git         = require('simple-git')();
var touch       = require('touch');
var fs          = require('fs');
var nconf       = require('nconf');
var debug       = require('debug')('nxhero');
var winston = require('winston');
var in_array = require('in_array');

process.env.NODE_ENV = 'console';

var BaseJob = require('./lib/base_job');
var BaseParameter = require('./lib/base_parameter');
var BaseLauncher = require('./lib/base_launcher');
var BaseProcessor = require('./lib/base_processor');
var BaseJobgroup = require('./lib/base_jobgroup');

var JobFilter = require('./lib/job_filter');

var ParameterMenus = require('./lib/parameter_menus');
var ProblemMenus = require('./lib/problem_menus');
var TestsetMenus = require('./lib/testset_menus');
var JobgroupMenus = require('./lib/jobgroup_menus');
var JobFilterMenus = require('./lib/jobfilter_menus');
var BinaryMenus = require('./lib/binary_menus');
var StorageMenus = require('./lib/storage_menus');

var files = require('./lib/files');
var date = require('./lib/date');




var dbConnected = false;
var store;

var OpenRecord = require('openrecord');

var db = require('./lib/db');
var log = require("./lib/log");

var parseSequence = require('./lib/parse_sequence');

process.on('unhandledRejection', function(reason, p){
    console.log("Possibly Unhandled Rejection at: Promise ", p, " reason: ", reason);
    // application specific logging here
});


function mainMenu(options, callback) {

    if (typeof options.splash === "undefined" || options.splash === true) {
        console.log(
            chalk.yellow(
                figlet.textSync('N X HERO', { horizontalLayout: 'full' })
            )
        );
        console.log("====================================");

    }
    console.log("");
    console.log("----------- MAIN MENU --------------");
    console.log("");

    var questions = [
        {
            type: 'list',
            name: 'action',
            message: 'Choose action:',
            choices: [
                //Signature of mainMenu callbacks: function(store, options, callback)
                {name: 'Binaries', value: BinaryMenus.main},
                {name: 'Problems', value: ProblemMenus.main},
                {name: 'Testsets', value: TestsetMenus.main},

                {name: 'Parameters', value: ParameterMenus.main},
                {name: 'Jobgroups', value: JobgroupMenus.main},
                {name: 'Launch Jobgroup', value: JobgroupMenus.launch},
                {name: 'Filter Jobs', value: JobFilterMenus.filter},
                {name:  'Switch Storage' , value: 'switchStorage'},
                {name:  'Empty Storage' , value: StorageMenus.empty},
                {name:  'Quit' , value: process.exit}
            ],
            default: 0,
            pageSize: 9,

        }
    ];

    inquirer.prompt(questions)
        .then(function(answers) {

        if (typeof answers.action === 'function') {
            answers.action(store, {}, function(err) {
                if (err)
                    log.error("Error: " + err.message);

                mainMenu({splash: false}, callback);
            });
        } else {
            switch(answers.action) {
                default:
                    console.log("Unknown selection");
            }
        }

        }).catch(function(error) {
           console.log(error);
    });
}

var handleCommands = function() {
    if (typeof process.argv[2] !== "undefined") {
        switch( process.argv[2]) {
            case "process":
                /* Get processor */
                processorId = nconf.get("processor");
                if (typeof processorId === "undefined")
                    throw new Error("--processor= flag required");
                var processor = BaseProcessor.registry[processorId];
                if (typeof processor === "undefined")
                    throw new Error("Processor " + processorId + "not found.");

                JobFilter.getJobsFromCmdLineArgs(store, {joinValues: true, join: {jobgroup: "binary", problem: true}}, function(err, jobs) {
                    processor.process(store, jobs, {}, function() {
                        log.info("Finished Processing");
                        process.exit();
                    });
                });
                break;

            case "launch":
                /* Get processor */
                jobgroupId = process.argv[3];
                launcherId = nconf.get("launcher");
                if (typeof launcherId === "undefined") {
                    launcherId = "local";
                    console.info("using " + launcherId + " by default.")
                }

                db.findByPk(store, "Jobgroup", jobgroupId, {join: BaseJobgroup.getLaunchJoin()}, function(err, jobgroup) {
                    /* Save launcher in jobgroup */
                    db.setAttributes(jobgroup, {launcher: launcherId}, {}, true, function(err) {
                        if (err)
                            throw err;

                        jobgroup.launch(store, {}, function(err) {
                            if (err)
                                throw err;
                            log.info("Launch successful");
                            process.exit();
                        });
                    });
                });

            case "import-testset":
                fileName = process.argv[3];

                TestsetMenus.importFile(store, {}, fileName, function(err) {
                    if (err)
                        throw err;
                    log.info("Import successful");
                    process.exit();
                });
                break;
        }
    }
}

// Load configuration
nconf.argv()
    .env()
    .file({ file: path.resolve(__dirname + '/config.json' )});

var dbConf = nconf.get('database');

console.log("Startup: Opening db at " + (dbConf.type === "sqlite3" ? dbConf.file : dbConf.host));
db.open(dbConf, function(err, newStore) {
    store  = newStore;
    debug("db ready");

    handleCommands();
});

/* Show mainMenu if no command was given */
var commands = ['process', 'launch', 'import-testset'];
if (typeof process.argv[2] === "undefined" || !in_array(process.argv[2], commands)) {
    mainMenu({}, process.exit);
}

