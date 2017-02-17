var debug       = require('debug')('nxhero');
var model_insert = require('./model_insert');
var in_array = require('in_array');
var async = require("async");
var log = require("../lib/log");

module.exports = {

    single: model_insert,

    multiple: function (store, modelName, attributes, callback) {
        store.verify();
        calls = [];

        var calls = [];
        var insertClosure = function (store, attributes) {
            return function (callback) {
                return model_insert(store, modelName, attributes, callback);
            };
        };

        for (var i = 0; i < attributes.length; ++i)
            calls.push(insertClosure(store, attributes[i]));

        async.parallel(calls, function(err, results) {
            if (err !== null)
                throw err;
            return callback(null);
        });
    },

    multipleIfUnique: function (store, modelName, attributes, uniqueColumn, callback) {
        store.verify();

        /* Query for possible duplicates */

        /* - Format where */
        var whereVals = [];
        for (var i = 0; i < attributes.length; ++i)
            whereVals.push(attributes[i][uniqueColumn]);
        var where = {};
        where[uniqueColumn] = whereVals;
        /* - query */
        var Model = store.Model(modelName);
        Model.where(where).exec(function(records) {
            /* - list existing values for uniqueColumn */
            var existing = [];
            for (var i = 0; i < records.length; ++i)
                existing.push(records[i][uniqueColumn]);
            /* - make array with only non-existing entries */
            var toInsert = [];
            for (var i = 0; i < attributes.length; ++i) {
                if (!in_array(attributes[i][uniqueColumn], existing))
                    toInsert.push(attributes[i]);
            }
            log.verbose("Inserting " + toInsert.length + " of " + attributes.length);
            return module.exports.multiple(store, modelName, toInsert, callback);
        });
    }
}
