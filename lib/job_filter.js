var debug       = require('debug')('nxhero');
var ArrayHelper       = require('../lib/array_helper');
var unique_concat = require('unique-concat');



/** job_filter module
 *
 * Manages the filter object for jobfilter_menu
 * - Updates filters using userInput from actions menu
 * - Creates string representation of active filters
 *
 *  Filter types:
 *   Element filter: filter relations of job (problem, binary, ...)
 *     In the filters array, element filters contain [{id: name}, {id: name}] arrays
 *   Direct filter: filter on properties of job (return_status, success, ...)
 *     In the filters array, direct filters contain arrays of values ([value, value])
 */
module.exports = {

    /** Map direct filter chars to names */
    directFilters: {
        l: "launchers",
        s: "execution_statuses",
        r: "return_statuses",
        c: "successes",
    },

    /* Map direct filter names to columns */
    directFilterColumns : {
        launchers: 'jobgroup.launcher',
        execution_statuses: 'execution_status',
        return_statuses: 'return_status',
        successes: 'success'
    },

    /** element filter chars to names */
    elementFilters : {
        g: "jobgroups",
        j: "jobs",
        o: "problems",
        b: "binaries",
    },

    /** element filter names to id columns */
    elementFilterIdColumns : {
        jobgroups : 'jobgroup_id',
        jobs : 'id',
        problems: 'problem_id',
        binaries: 'jobgroup.binary_id'
    },

    /** element filter names to relations */
    elementFilterRelations : {
        jobgroups : 'jobgroup.name',
        problems: 'problem.name',
        binaries: 'jobgroup.binary.name'
    },

    filtersToString: function(filters) {
        debug("filterstoString");
        debug(filters);

        var result = "";
        for (var i in module.exports.elementFilters) {
            var prop = module.exports.elementFilters[i];
            if (typeof filters[prop] !== "undefined") {
                result += module.exports.elementFilterToString(filters, prop);
            }
        }

        for (var i in module.exports.directFilters) {
            var prop = module.exports.directFilters[i];
            if (typeof filters[prop] !== "undefined") {
                result += module.exports.elementFilterToString(filters, prop);
            }
        }
        return result;
    },

    elementFilterToString(filters, prop) {
        result = "";
        if (typeof filters[prop].selection !== "undefined") {
            result += "Selected " + prop + ": ";
            var names = [];

            debug(typeof filters[prop].selection);
            for (var i in filters[prop].selection) {
                names.push(filters[prop].selection[i]);
            }
            result = result + names.join(", ") + "\n";
        }
        if (typeof filters[prop].name !== "undefined") {
            result += "Name filter for " + prop + ": " + filters[prop].name + "\n";
        }
        return result;
    },

    makeWhereClause(column, value, operator) {
        var cols = column.split(".");
        var clause = {};
        var lastCol = cols[cols.length - 1];

        if (operator !== null)
            lastCol = lastCol + "_like";
        clause[lastCol] = value;

        /* Build relation by wrapping object into objects */
        for (var i = cols.length - 2 ; i >= 0; --i ) {
            oldClause = clause;
            clause = {};
            clause[cols[i]] = oldClause;
        }
        return clause;
    },

    applyDirectFilters: function(store, Job, filters, callback) {
        debug("applying direct filters");
        var directFilterColumns = module.exports.directFilterColumns;
        for (var filter in directFilterColumns) {
            var column = directFilterColumns[filter];
            Job = module.exports.applyFilter(store, Job, filters[filter], column, column);
        }
        return Job;
    },

    applyElementFilters: function(store, Job, filters, options) {
        debug("applying element filters");
        for (var char  in module.exports.elementFilters) {
            var filter = module.exports.elementFilters[char];
            var idColumn = module.exports.elementFilterIdColumns[filter];
            var searchColumn = module.exports.elementFilterRelations[filter];
            Job = module.exports.applyFilter(store, Job, filters[filter], idColumn, searchColumn);
        }
        return Job;
    },

    applyFilter: function(store, Job, filter, column, searchColumn) {
        if (typeof filter !== "undefined") {
            debug("applying filter ");
            debug(filter);
            debug(column);
            debug(searchColumn);
            /* Selection filter */
            if (typeof filter.selection !== "undefined") {
                var selection = filter.selection;
                /* Element filters are id: name objects */
                if (!Array.isArray(selection))
                    selection = Object.keys(selection);

                if (   typeof Job.definition.attributes[column] !== "undefined"
                    && Job.definition.attributes[column].type.name === "boolean")
                    selection = ArrayHelper.stringToBool(selection);

                var clause = module.exports.makeWhereClause(column, selection, null);
                Job = Job.where(clause);
            }
            /* value search filter */
            if (typeof filter.name !== "undefined") {
                var clause = module.exports.makeWhereClause(searchColumn, filter.name, 'like');
                Job = Job.where(clause);
            }
        }
        return Job;
    },

    /* Update filters using userInput */
    updateFilters: function(filters, userInput, data) {
        var handler = module.exports.updateHandlers(userInput[0]);
        if (typeof handler !== "function") {
            throw new Error("Top-Level Filter for character  " + userInput[0] + " not found.");
        }
        userInput.shift();
        return handler(filters, userInput, data);
    },

    /** Get the filter update handler depending on the input actionmenu character */
    updateHandlers: function(character) {
        if (typeof module.exports.elementFilters[character] !== "undefined") {
            /* character belongs to element filter */
            return function(filters, userInput, data) {
                return module.exports.handleElementFilterUpdate(data[module.exports.elementFilters[character]], filters, userInput, data);
            };
        } else if (typeof module.exports.directFilters[character] !== "undefined") {
            /* character belongs to direct filter */
            return function(filters, userInput, data) {
                return module.exports.handleDirectFilterUpdate(module.exports.directFilters[character], filters, userInput, data, {});
            };

        }
    },

/* Handle a filter on elements (jobgroups, jobs, problems, binaries, launchers) */
    handleElementFilterUpdate : function(models, filters, userInput, data) {
        debug("handling element filter");

        var elementName = models[0].models_name.toLowerCase();
        switch(userInput[0]) {
            case "s" :
                /* Build Map of models to get names */
                var idNameMap = ArrayHelper.map(models, 'id', 'name');

                /* Create objects in case this is the first such filter */
                if (typeof filters[elementName] === "undefined")
                    filters[elementName] = {selection: {}};
                else if (typeof filters[elementName].selection === "undefined")
                    filters[elementName].selection = {};

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
                /* Create object in case this is the first such filter */
                if (typeof filters[elementName] === "undefined")
                    filters[elementName] = {};

                filters[elementName].name = userInput[1];
                break;
        }
    },

    /* Handle a filter on elements (jobgroups, jobs, problems, binaries, launchers) */
    handleDirectFilterUpdate : function(filterName, filters, userInput, options) {
        debug("handling direct filter for " + filterName);

        switch(userInput[0]) {
            case "s" :
                if (typeof filters[filterName] === "undefined")
                    /* Set valus in case this is the first such filter */
                    filters[filterName] = {selection: userInput[1]};
                else if (typeof filters[filterName].selection === "undefined") {
                    filters[filterName].selection = userInput[1];
                } else {
                    filters[filterName].selection = unique_concat(filters[filterName].selection, userInput[1]);
                }
                break;

            case "r":
                delete filters[filterName];
                break;

            case "n":
                /* Create object in case this is the first such filter */
                if (typeof filters[filterName] === "undefined")
                    filters[filterName] = {};

                filters[elementName].name = userInput[1];
                break;
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

    /** Get jobs  satisfying filters
     *
     * @param store
     * @param filters
     * @param options
     * @param callback
     */
    getJobsFiltered : function(store, filters, options, callback) {
        debug("getjobsfilter, filters:");
        debug(filters);
        var Job = store.Model("Job");
        Job = Job.join({jobgroup: "binary"});
        if (typeof options.joinValues !== "undefined")
            Job = BaseJob.joinValues(Job, options.joinValues);

        /* Apply element filters */
        Job = module.exports.applyElementFilters(store, Job, filters, {});

        /* Apply direct filters */
        Job = module.exports.applyDirectFilters(store, Job, filters, {});

        Job.exec(function(jobs) {
            return callback(jobs);
        });
    },




}