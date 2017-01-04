var inquirer    = require('inquirer');
var listDelete = require('./list_delete');
var modelInsert = require('./model_insert');

var db = require('./db');
var log = require("../lib/log");

var modelName = "Problem";



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
	listDelete(store, "Problem", {}, callback);
    },
    
    add: function(store, options, callback) {
	var questions = [
	    {
		type: 'input',
		name: 'name',
		message: 'Problem Name:',
	    },
	    {
		type: 'input',
		name: 'path',
		message: 'Path (relative to ~):',
	    },
	];

	inquirer.prompt(questions).then(function(answers) {
	    modelInsert(store, "Problem", answers, callback);

/*
	    store.verify();	    
	    Param = store.Model('Parameter');
	    param = new Param(answers);

	    param.save(function(result) {
		log.verbose("Saving " + answers.name + ": " + result);
		callback();
	    });
*/
	});
    }
}
