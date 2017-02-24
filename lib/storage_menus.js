var inquirer    = require('inquirer');
var db = require('./db');
var debug       = require('debug')('nxhero');




module.exports = {

    empty: function(store, options, callback) {
        inquirer.prompt({name: "continue", type: "list", message : "Delete all data?", choices: ['Yes', 'No']}).then(function(answers) {
        	if (answers.continue !== "Yes")
        		return callback(null);
        	else
        		return db.clean(store, {}, callback);
        });
    },
}
