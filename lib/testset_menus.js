var inquirer    = require('inquirer');
var listDelete = require('./list_delete');
var modelInsert = require('./model_insert');
var fs = require('fs-extra')
const path      = require('path');
var db = require('./db');
var log = require("../lib/log");
var modelName = "Testset";
var debug       = require('debug')('nxhero');

var resolveHome = require('../lib/files').resolveHome;
var insert = require('../lib/insert');

var BaseTestset = require('../lib/base_testset');

module.exports = {

    main: function(store, options, callback) {
	db.getModelSelectQuestion(store, modelName, {
		returnItem: true,
		newItem: true,
		join: {testsets_problems: "problem"},
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
                Model.where({id: answers.id}).delete(function(okay) {
                    log.info("Testset deleted");
                    callback(null);
                });
            }
        });
	});
    },
    
    list: function(store, options, callback) {
		listDelete(store, "Problem", {join: "problems"}, callback);
    },

    add: function(store, options, callback) {
        var questions = [
            {
                type: 'input',
                name: 'fileName',
                message: 'Path to problem list:',
            },
        ];

        inquirer.prompt(questions).then(function(answers) {
            return module.exports.importFile(store, {}, answers.fileName, callback);
        });
    },

    importFile(store, options, listFile, callback) {
    	var baseDir = path.dirname(listFile);
        var listFilePath = resolveHome(listFile);
        var filenameparts = path.basename(listFile).split(".");
        if (filenameparts.length > 1)
        	filenameparts.splice(-1,1);
        var testsetName = filenameparts.join(".");

        fs.readFile(listFilePath, {encoding: "utf8"}, (err, data) => {
        	lines = data.split("\n");
        	var problems = [];
        	var timeLimitFactors = {};
			for (var i = 0; i < lines.length; ++i) {
				var line = lines[i].trim();
				var parts = line.split(" ");
				var timeLimitFactor = 1;
				if (parts.length >= 3)
				    return callback(new Error("Unable to parse line " + line));
				else if (parts.length === 2)
				    timeLimitFactor = parts[1];

                line = parts[0];

				if (line) {
					var problemName = path.dirname(line);
					var problemPath = baseDir + "/" + line;
					problems.push({
						'name': problemName,
						'path': problemPath,
					});
					timeLimitFactors[problemPath] = timeLimitFactor;
                }
			}
			insert.multipleIfUnique(store, "Problem", problems, "path", function(err, records) {
				var Testset = store.Model("Testset");
				var testset = new Testset;
                BaseTestset.findOrNew(store, testsetName, {clean: true}, function(err, testset) {
                    var action = testset.id === null ? "Imported" : "Updated existing";
                    testset.problem = records.new.concat(records.existing);

                    /* Set timelimit_factors on timelimit_problems */
                    for (var i = 0; i < testset.testsets_problems.length; ++i) {
                        var path = testset.testsets_problems[i].problem.path;
                        testset.testsets_problems[i].timelimit_factor = timeLimitFactors[path];
                    }

                    /* Save everything */
                    testset.save(function(okay) {
                        if (!okay)
                            throw new Error("unable to save testset");

                        log.info(action + " testset \"" + testset.name + "\" with " + records.existing.length
                            + " old and " + records.new.length + " new problems");
                        return callback(null);
                    });
                });
			});
        });
	}
}
