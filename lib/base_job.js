var debug       = require('debug')('nxhero');

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
            var parameter = parametersById[id];
            var parameterValue = parameter.getNewValueModel(store, {});
            parameterValue.value = paramVals[id];
            parameterValue.parameter_id = id;
            parameterValue.parameter = parameter;
            var relation = parameter.getValueRelation();
            job[relation].push(parameterValue);
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
	}

}

