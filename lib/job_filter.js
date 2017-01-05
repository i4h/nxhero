var debug       = require('debug')('nxhero');

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



}