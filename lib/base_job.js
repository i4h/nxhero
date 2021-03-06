var debug       = require('debug')('nxhero');
var async = require("async");
var extend = require('node.extend');

var BaseParameter = require('../lib/base_parameter')
var Launchers = require('../launchers/module.js');
var log = require("../lib/log");


module.exports = {

    defaultAttributes: {
        execution_status: "pending"
    },

    /** Create a job using the arguments
     *
     * @param store
     * @param options
     * @param jobgroup
     * @param problem
     * @param parametersById parameter records indexed by id
     * @param parameterIds array of parameter models
     * @param paramVals parameter Values by id
     * @param callback
     */
    insertFromModelAndValues: function(store, options, jobgroup, problem, parametersById, paramVals, callback) {
        Model = store.Model("Job");

        //@todo: user defaultAttributes here
        var job  = new Model({
            jobgroup_id: jobgroup.id,
            jobgroup: jobgroup,
            execution_status: "pending",
            problem_id: (problem === null ? null : problem.id),
            problem: (problem === null ? null : problem),
            timelimit: (problem === null ? null : (problem.timeLimit === null ? null : problem.timeLimit)),
            //parameter_values: JSON.stringify(paramVals),
        });
        /* Add parameterValue models for each parameter */
        for (id in paramVals) {
            job.addParameterValue(store, parametersById[id], paramVals[id]);
        }

        /* Set attributes given in options, using setters/getters */
        if (typeof options.attributes !== "undefined") {
            for (name in options.attributes) {
                job[name] = options.attributes[name];
            }
        }

        if (typeof options.processorData !== "undefined")
            job.processor_data = JSON.stringify(options.processorData);

        job.save(function(okay) {
            if (okay)
                return callback(null, job);
            else
                return callback(new Error("Failed to save job:" + job));
        });
    },

	getLauncher: function(launcher) {
        if (typeof Launchers[launcher] === "undefined")
            throw new Error("Launcher " + launcher + " not known");

        return Launchers[launcher];
		/*switch (launcher) {
			case "local":
				return require("./local.js");
			default:
         throw new Error("Launcher " + launcher + " not known");
		} */
	},

    getValueJoin(parameters) {
        var join = {};
        if (Object.keys(BaseParameter.valueRelations).length === 0)
            throw new Error("no valueRelations found, circular dependency?");

        for (i in BaseParameter.valueRelations) {
            if (parameters === true)
                join[BaseParameter.valueRelations[i]] = "parameter";
            else
                join[BaseParameter.valueRelations[i]] = null
        }
        return join;
    },

    joinValues: function(Job, options) {
        if (options.parameters === true) {
            var join = module.exports.getValueJoin(true);
            Job = Job.join(join);
        } else {
            var join = module.exports.getValueJoin(false);
            Job = Job.join(join);
        }
        if (options.jobgroup === true)
            Job = Job.join({jobgroup: "binary"});

        return Job;
    },

    updateJobStatus : function(store, options, callback) {
        /* Call updatejobs on individual launchers in parallel */
        var calls = [];
        var updateJobsClosure = function (store, launcher) {
            return function (callback) {
                return launcher.updateJobsStatus(store, {}, callback);
            };
        };
        for (launcherId in Launchers) {
            launcher = Launchers[launcherId];
            if (typeof launcher.updateJobsStatus !== "function") {
                log.error("Unable to update Status for jobs launched with " + launcher.label);
            } else {
                log.info("Updating jobs of " + launcher.label);
                calls.push(updateJobsClosure(store, launcher));
            }
        }
        async.parallel(calls, function(err, results) {
            if (err !== null)
                throw err;
            log.info("Finished updating jobs");
            return callback(null);
        });
    },


}

