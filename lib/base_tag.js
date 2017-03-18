var debug       = require('debug')('nxhero');
var async = require('async');

var log = require("../lib/log");
var ArrayHelper = require('../lib/array_helper');


module.exports = {

    /**
     * Convert a string as accepted by the jobfilter menu
     * into an object of tag tasks
     * @param string
     * @param options
     */
    stringToTagTasks: function(input, options) {

        /* Remove spaces from values list */
        input = input.trim().replace(/ *, */g,',');

        var allTasks = input.split(",");
        var tasks = {
            add: [],
            remove: []
        };
        /* Empty input: No tasks */
        if (!input.trim())
            return tasks;

        for (var i = 0; i < allTasks.length; ++i) {
            var task = allTasks[i];
            if (task.charAt(0) === '-')
                tasks.remove.push(task.substring(1));
            else
                tasks.add.push(task);
        }
        return tasks;
    },

    performTagTasks: function(store, tasks, jobIds, options, callback) {
        var calls = [];
        /* Define closures */
        var addClosure = function(name, jobId) {
            return function(callback) {
                return module.exports.tag(store, name, jobId, options, callback);
            }
        };
        var removeClosure = function(name, jobId) {
            return function(callback) {
                return module.exports.removeTag(store, name, jobId, options, callback);
            }
        };

        /* Add remove calls */
        if (typeof tasks.remove !== "undefined") {
            for (var i = 0; i < tasks.remove.length; ++i) {
                var name = tasks.remove[i];
                for (var j = 0; j < jobIds.length; ++j) {
                    calls.push(removeClosure(name, jobIds[j]));
                }
            }
        }

        /* Add tag calls */
        if (typeof tasks.add !== "undefined") {
            for (var i = 0; i < tasks.add.length; ++i) {
                var name = tasks.add[i];
                for (var j = 0; j < jobIds.length; ++j) {
                    calls.push(addClosure(name, jobIds[j]));
                }
            }
        }

        /* Run in parallel */
        async.series(calls, function(err, tags) { //@NOCOMMIT ->toParallel
            if (err)
                callback(err);

            /* Remove results from remove calls */
            if (typeof tasks.remove !== "undefined")
                tags.splice(0, tasks.remove.length * jobIds.length);

            callback(null, tags);
        });
    },

    /**
     * Find and return the tag record if it exists
     * null if not
     * @param store
     * @param name
     * @param jobId
     * @param options
     * @param callback
     */
    findTag: function(store, name, jobId, options, callback) {
        var Tag = store.Model("Tag");
        Tag.where({name: name, job_id: jobId}).exec(function(records) {
            if (records.length === 0) {
                return callback(null, null);
            } else {
                return callback(null, records[0]);
            }
        });
    },

    /**
     * Creates the tag if the job does not have that tag yet
     * @param store
     * @param name
     * @param jobId
     * @param options
     * @param callback
     */
    tag: function(store, name, jobId, options, callback ) {
        /* Check if tag exists */
        module.exports.findTag(store, name, jobId, {}, function(err, tag) {
            if (err)
                return callback(err);
            if (tag !== null) {
                return callback(null, tag);
            } else {
                return module.exports.createTag(store, name, jobId, options, callback);
            }
        });
    },

    /**
     * Creates a tag (may create duplicates, use tag by default)
     * @param store
     * @param name
     * @param jobId
     * @param options
     * @param callback
     */
    createTag: function(store, name, jobId, options, callback) {
        if (!name.trim())
            throw new Exception("Tag name is empty");

        var Tag = store.Model("Tag");
        var tag = new Tag({job_id: jobId, name: name, creator: "user"});

         if (typeof options.creator !== "undefined")
            tag.creator = options.creator;

        tag.save(function(okay) {
            if (okay) {
                return callback(null, tag);
            } else {
                return callback(new Error("Unable to save tag"));
            }
        });
    },

    /**
     * Remove a tag from a job
     * @param store
     * @param name
     * @param jobId
     * @param options
     * @param callback
     */
    removeTag: function(store, name, jobId, options, callback ) {
        var Tag = store.Model("Tag");
        if (name === "*") {
            log.verbose("Removing all tags from job "+ jobId);
            Tag = Tag.where({job_id: jobId});
        } else
            Tag = Tag.where({name: name, job_id: jobId});

        Tag.delete(function(okay) {
            if (okay)
                return callback(null);
            else
                return callback(new Error("Unable to remove tag " + name + "from job " + jobId));
        });
    },

    getJobsTags: function(store, jobIds, options, callback) {
        var Tag = store.Model("Tag");
        Tag.where({job_id: jobIds}).exec(function(records) {
            //var tags = ArrayHelper.getColumnUnique(records, "name");
            //debug(tags);
            return callback(null, records);
        });
    },


}

