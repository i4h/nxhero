var inquirer    = require('inquirer');
var listDelete = require('./list_delete');
var modelInsert = require('./model_insert');
var debug       = require('debug')('nxhero');

var BinaryModels = require('../binaries/module.js');
var db = require('./db');
var modelName = "Binary";

module.exports = {

    main: function(store, options, callback) {
        db.getModelSelectQuestion(store, modelName, {returnItem: true, newItem: true}, function(err, question) {
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
        listDelete(store, "Binary", {}, callback);
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
