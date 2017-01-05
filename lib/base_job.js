var debug       = require('debug')('nxhero');
var BaseParameter = require('../lib/base_parameter')

var launchers = require('../launchers/module.js');

module.exports = {

    /** Create a job using the arguments
     *
     * @param store
     * @param options
     * @param jobgroup
     * @param problem
     * @param parametersById parameter records indexed by id
     * @param parameterIds array of the parameter ids corresonding to thisParamValues
     * @param thisParamValues values of parameters corresonding to parameterIds
     * @param callback
     */
    insertFromModelAndValues: function(store, options, jobgroup, problem, parametersById, paramVals, callback) {
        debug("inserting");
        debug(problem);

        Model = store.Model("Job");

        var job  = new Model({
            jobgroup_id: jobgroup.id,
            jobgroup: jobgroup,
            execution_status: "pending",
            problem_id: (problem === null ? null : problem.id),
            problem: (problem === null ? null : problem),
            //parameter_values: JSON.stringify(paramVals),
        });
        /* Add parameterValue models for each parameter */
        for (id in paramVals) {
            job.addParameterValue(store, parametersById[id], paramVals[id]);
        }

        job.save(function(okay) {
            if (okay) {
                callback(null, job);
            } else {
                log.verbose("Failed to save job");
                log.verbose(job);
            }
        });
    },

	getLauncher: function(launcher) {
        if (typeof launchers[launcher] === "undefined")
            throw new Error("Launcher " + launcher + " not known");

        return launchers[launcher];
		/*switch (launcher) {
			case "local":
				return require("./local.js");
			default:
         throw new Error("Launcher " + launcher + " not known");
		} */
	},

    joinValues: function(Job, options) {
        for (i in BaseParameter.valueRelations) {
            if (options.parameters === true) {
                var join = {};
                join[BaseParameter.valueRelations[i]] = "parameter";
                Job = Job.join(join);
            } else if (options.values === true) {
                Job = Job.join(BaseParameter.valueRelations[i]);
            }

            if (options.jobgroup === true)
                Job = Job.join({jobgroup: "binary"});
        }
        return Job;
    }
}

