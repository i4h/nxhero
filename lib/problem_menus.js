var inquirer    = require('inquirer');
var listDelete = require('./list_delete');
var modelInsert = require('./model_insert');
var fs = require('fs-extra')
const path      = require('path');
var db = require('./db');
var log = require("../lib/log");
var modelName = "Problem";
var debug       = require('debug')('nxhero');

var resolveHome = require('../lib/files').resolveHome;
var insert = require('../lib/insert');

module.exports = {

    main: function(store, options, callback) {
	db.getModelSelectQuestion(store, modelName, {
		returnItem: true,
		newItem: true,
		importItem: true,
	}, function(err, question) {
	    inquirer.prompt([question]).then(function(answers) {
		if (answers.id === -1)
		    callback(null);
		else if (answers.id === -2)
		    module.exports.add(store, {}, callback);
        else if (answers.id === -3)
            module.exports.import(store, {}, callback);
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
	});
    },

    import: function(store, options, callback) {
        var questions = [
            {
                type: 'input',
                name: 'fileName',
                message: 'Path to problem list:',
            },
        ];

        inquirer.prompt(questions).then(function(answers) {
        	module.exports.importFile(store, {}, answers.fileName, callback);
        });
    },

    importFile(store, options, listFile, callback) {
    	var baseDir = path.dirname(listFile);
        var listFilePath = resolveHome(listFile);

        fs.readFile(listFilePath, {encoding: "utf8"}, (err, data) => {
        	lines = data.split("\n");
        	var problems = [];
			for (var i = 0; i < lines.length; ++i) {
				var line = lines[i].trim();
				if (line) {
					var problemName = path.dirname(line);
					var problemPath = baseDir + "/" + line;
					//debug(problemName + ": " + problemPath);
					problems.push({
						'name': problemName,
						'path': problemPath
					});
                }
			}
			return insert.multipleIfUnique(store, "Problem", problems, "path", callback);
        });
	}
}
