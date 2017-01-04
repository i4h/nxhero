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


var ParameterMenus = require('./lib/parameter_menus');
var ProblemMenus = require('./lib/problem_menus');
var JobgroupMenus = require('./lib/jobgroup_menus');
var BinaryMenus = require('./lib/binary_menus');
var StorageMenus = require('./lib/storage_menus');

var files = require('./lib/files');
var date = require('./lib/date');

var BaseParameter = require('./lib/base_parameter');
var BaseLauncher = require('./lib/base_launcher');

var dbConnected = false;
var store;

var OpenRecord = require('openrecord');

var db = require('./lib/db');

var parseSequence = require('./lib/parse_sequence');

process.env.NODE_ENV = 'console';

function mainMenu(callback) {

    console.log(
        chalk.yellow(
            figlet.textSync('N X HERO', { horizontalLayout: 'full' })
        )
    );

    console.log("====================================");
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
                {name: 'Parameters', value: ParameterMenus.main},
                {name: 'Create Jobgroup', value: JobgroupMenus.add},
                {name: 'Launch Jobgroup', value: JobgroupMenus.launch},
                {name:  'Switch Storage' , value: 'switchStorage'},
                {name:  'Empty Storage' , value: StorageMenus.empty},
                {name:  'Quit' , value: process.exit}
            ],
            default: 0
        }
    ];

    inquirer.prompt(questions)
        .then(function(answers) {


        if (typeof(answers.action) == 'function') {
            answers.action(store, {}, mainMenu);
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

// Load configuration
nconf.argv()
    .env()
    .file({ file: path.resolve(__dirname + '/config.json' )});

var dbConf = nconf.get('database');

console.log("Startup: Opening db at " + (dbConf.type === "sqlite3" ? dbConf.file : dbConf.host));
db.open(dbConf, function(err, newStore) {
    store  = newStore;
    debug("db ready");
});


mainMenu();

