
module.exports = {
    id: "default",
    label: "Default Binary",
    takesProblems: false,

    /** Prepare the jobgroup
     * (e.g. collect version information or run
     * checks before launching). If an error is returned,
     * the launch of the jobgropu will be aborted
     *
     * @param jobgroup Jobgroup model
     * @param wd working directory of the jobgroup
     * @param callback(err)
     */
    runPreflightChecks: function (jobgroup, wd, callback) {
        return callback(null);
    },

    /** Prepare the jobs working directory
     *
     * e.g. create files and directories for the job
     *
     * @param wd
     * @param callback
     */
    prepareJob: function(wd, callback) {
        return callback(null);
    },

    /** Set parameters in the working directory
     * @param wd
     * @param callback
     */
    setParams: function(wd, store, parameterValues, callback) {
        return callback(null);
    }

}

