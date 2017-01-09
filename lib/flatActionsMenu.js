var debug       = require('debug')('nxhero');
var inquirer    = require('inquirer');

var log = require("../lib/log");


module.exports = {

    singleCharMode : true,

    /** Process quick menu traversion
     *  if singleCharMode is true, entering 'abc'
     *  will be processed like entering a, b, c
     *  in three submenus
     *
      * @param selections
     * @returns {*}
     */
    singleCharSelections : function(selections) {
        if (module.exports.singleCharMode !== true)
            return selections;

        var newSelections = [];
        for (var i = 0; i < selections.length; ++i) {
            newSelections = newSelections.concat(selections[i].split(''));
        }

        return newSelections;
    },

    render: function(menuActions, selections, data, callback) {
        /* Find current Menu  in menuActions */
        var currentAction = menuActions;
        var breadcrumbs = [];
        for (var i = 0; i < selections.length; ++i) {
            currentAction = currentAction.menu[selections[i]];

            /* If last selection does not exist */
            if (typeof currentAction === "undefined") {
                /* x works on any level */
                if (selections[i] === "x") {
                    return callback(null, "x");
                }
                /* , let user enter again */
                log.error("Input " + selections[i] + " not recognized");
                selections.splice(-1,1);
                return module.exports.render(menuActions, selections, data, callback);
            }

            /* If current item is final finish*/
            if (currentAction.final === true ) {
                return callback(null, selections);
            }
            breadcrumbs.push(currentAction.breadcrumb);
        }

        /* Get and process user input */
        module.exports.renderCurrent(currentAction, breadcrumbs.join("-"), data, function(selection) {
            selections.push(selection);
            /* If this was a menu, process quick-selection */
            if (typeof currentAction.menu !== "undefined")
                selections = module.exports.singleCharSelections(selections);

            /* If this was a final question, finish */
            if (typeof currentAction.question !== "undefined") {
                return callback(null, selections);
            }

            /* Recurse to process new input */
            return module.exports.render(menuActions, selections, data, callback);
        });
    },

    renderCurrent:function(currentAction, breadcrumbs, data, callback) {
        var messageParts = [];

        var question;
        if (typeof currentAction.question === "object")
            question = currentAction.question;
        else if (typeof currentAction.question === "function")
            question = currentAction.question(data);
        else if (typeof currentAction.menu !== "undefined" ){
            for (i in currentAction.menu) {
                messageParts.push(currentAction.menu[i].label);
            }
            message = "Actions: "+ messageParts.join("/") + "/e(x)it";
            var question = {
                type: "input",
                name: "currentSelection",
                message: message,
            };
        }
        question.message = breadcrumbs + " " + question.message;

        inquirer.prompt(question).then(function(answers) {
            if (Array.isArray(question))
                callback(answers)
            else
                callback(answers[question.name])
        });
    }


};