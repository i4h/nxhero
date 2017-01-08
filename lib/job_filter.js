var debug       = require('debug')('nxhero');
var ArrayHelper       = require('../lib/array_helper');

module.exports = {

    directFilterColumns : ['execution_status', 'return_status', 'success', 'problem_id'],

    applyDirectFilters: function(store, Job, filters, callback) {
        var directFilterColumns = module.exports.directFilterColumns;

        var clause = {};
        for (var i = 0; i < directFilterColumns.length; ++i) {
            var column = directFilterColumns[i];
            if (typeof filters[column] !== "undefined") {
                clause[column] = filters[column];
            }
        }
        debug(clause);
        return Job.where(clause);

    },

    updateFilters: function(filters, userInput, data) {
        var handler = module.exports.updateHandlers[userInput[0]];
        if (typeof handler !== "function") {
            throw new Error("Unknown Top-Level Filter id: " + userInput[0]);
        }
        userInput.shift();
        return handler(filters, userInput, data);
    },

    updateHandlers: {
        g: function(filters, userInput, data) {
            module.exports.handleElementFilter(data.jobgroups, filters, userInput, data);
        },
        j: function(filters, userInput, data) {
            module.exports.handleElementFilter(data.jobs, filters, userInput, data);
        },
        r: function(filters, userInput, data) {
            module.exports.handleElementFilter(data.problems, filters, userInput, data);
        },
        b: function(filters, userInput, data) {
            module.exports.handleElementFilter(data.binaries, filters, userInput, data);
        },
        l: function(filters, userInput, data) {
            module.exports.handleElementFilter(data.launchers, filters, userInput, data);
        }
    },

    getElementFilterMenu : function(label, breadcrumb, selectionQuestion) {
        return {
            label: label,
            breadcrumb: breadcrumb,
            menu: {
                r: {
                    label: '(r)eset',
                    final: true,
                },
                s: {
                    label: 'by (s)election',
                    breadcrumb: "Selection",
                    question: selectionQuestion,
                },
                n: {
                    label: 'by (n)ame)',
                    breadcrumb: "Name",
                    question: {
                        type: 'input',
                        name: 'name',
                        message: 'Enter Name Search String',
                    }
                }
            }
        }
    },

/* Handle a filter on elements (jobgroups, jobs, problems, binaries, launchers) */
    handleElementFilter : function(models, filters, userInput, data) {
        debug("handling element filter");
        debug(userInput);

        var elementName = models[0].model.definition.model_name.toLowerCase();

        switch(userInput[0]) {
            case "s" :
                /* Build Map of models to get names */
                var idNameMap = ArrayHelper.map(models, 'id', 'name');

                /* Create objects in case this is the first such filter */
                if (typeof filters[elementName] === "undefined")
                    filters[elementName] = {selection: {}};
                else if (typeof filters[elementName].selection === "undefined")
                    filters[elementName].selection = {};

                debug(userInput);
                var ids = userInput[1];
                for (var i = 0; i < ids.length; ++i) {
                    var id = ids[i];
                    var name = idNameMap[id];
                    if (typeof name === "undefined")
                        throw new Error(elementName + " selection filter gave unknown id " + id);
                    filters[elementName].selection[id] = name;
                }
                break;

            case "r":
                delete filters[elementName];
                break;

            case "n":
                filters[elementName].name = userInput[1];
                break;
        }
    }



}