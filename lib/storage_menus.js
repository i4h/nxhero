var inquirer    = require('inquirer');
var db = require('./db');
var debug       = require('debug')('nxhero');




module.exports = {

    empty: function(store, options, callback) {
    	var answers = {continue: "yes"};
        inquirer.prompt({name: "continue", type: "list", message : "Delete all data?", choices: ['Yes', 'No']}).then(function(answers) {
        	if (answers.continue === "no")
        		callback(null);
        	else {
        		db.clean(store, {}, function() {
        			callback(null);
				})
			}
        });
    },
}
