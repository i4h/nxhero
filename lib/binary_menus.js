var inquirer    = require('inquirer');
var listDelete = require('./list_delete');
var modelInsert = require('./model_insert');
var debug       = require('debug')('nxhero');
var log = require("../lib/log");
var LatexTable = require('latex-data-table');

var BinaryModels = require('../binaries/module.js');
var db = require('./db');
var modelName = "Binary";

module.exports = {

    main: function(store, options, callback) {
        inquirer.prompt({
            type: "list",
            message: "Parameter Action:",
            name: "action",
            choices: [
                {
                    name: "Create New",
                    value: module.exports.add
                },
                {
                    name: "List",
                    value: module.exports.list,
                },
                {
                    name: "Delete",
                    value: module.exports.selectDelete,
                },
            ]
        }).then(function(answers) {
            return answers.action(store, options, callback);
        });
    },

    selectDelete: function(store, options, callback) {
        db.getModelSelectQuestion(store, modelName, {returnItem: true}, function(err, question) {
            inquirer.prompt([question]).then(function(answers) {
                if (answers.id === -1)
                    callback(null);
                else if (answers.id === -2)
                    module.exports.add(store, {}, callback);
                else {
                    Model = store.Model(modelName);
                    Model.where({id: answers.id}).delete();
                    callback(null);
                }
            });
        });
    },

    list: function(store, options, callback) {
        var options = {returnItem: true, join: {binaries_parameters: "binary"}, order: "binaries.name"};
        log.info("Binary List:")
        db.getModelList(store, modelName, options, function(err, body, header) {
            var table = LatexTable(body, header, {style: "ascii"});
            log.verbose(table);
            return callback(err);
        });
    },

    add: function(store, options, callback) {
        var choices = [];

        for (item in BinaryModels) {
            choices.push({name: BinaryModels[item].label, value: item});
        }

        var questions = [
            {
                type: 'list',
                name: 'type',
                message: 'Binary Type:',
                choices: choices,
            },
            {
                type: 'input',
                name: 'name',
                message: 'Binary Name:',
            },
            {
                type: 'input',
                name: 'path',
                message: 'Path (may start with ~):',
            },
            {
                type: 'input',
                name: 'argsUserString',
                message: 'Arguments (split with ";". You can use {problem.path} or {parametername.value}):',
            },

        ];

        inquirer.prompt(questions).then(function(answers) {

            modelInsert(store, "Binary", answers, callback);

        });
    }
}
