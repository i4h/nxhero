var debug       = require('debug')('nxhero');
var in_array = require('in_array');

var inquirer    = require('inquirer');

module.exports = {

    /**
     * Let the user confirm if ask is true
     * if ask is false, just calls the callback
     * callback gets an err and a bool if question was confirmed:
     * callback(err, bool confirmed)
     *
     * @param ask
     * @param message
     * @param callback
     * @returns {*}
     */
    confirmIfTrue: function(ask, message, callback) {
        if (ask === false)
            return callback(null, true);

        if (typeof message !== "string" || !message.trim())
            message = "Continue?"

        var question = {type: 'confirm', name: 'continue', message: message};

        inquirer.prompt(question).then(function (answers) {
            return callback(null, answers.continue);
        });
    }


}

