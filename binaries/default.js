
module.exports = {
    id: "default",
    label: "Default Binary",
    takesProblems: false,

    /** Prepare the jobgroup by doing nothing
     *
     * @param jobgroup Jobgroup model
     * @param wd working directory of the jobgroup
     * @param callback
     */
    prepareJobgroup: function (jobgroup, wd, callback) {
        return callback(null);
    },

    /** Prepare the job by doing nothing
     * @param wd
     * @param callback
     */
    prepareJob: function(wd, callback) {
        return callback(null);
    },

    /** Handle setting params by doing nothing
     * @param wd
     * @param callback
     */
    setParams: function(wd, store, parameterValues, callback) {
        return callback(null);
    }

}

