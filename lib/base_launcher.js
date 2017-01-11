

var debug       = require('debug')('nxhero');

var Launchers = require('../launchers/module');

module.exports = {
    label: "Launcher",
    outFileName: "out.log",
    errorFileName: "out.log",

    getLauncherQuestion : function(store, options) {
        /* To avoid circular dependency: base_launcher->launchers/module->launchers/slurm->base_launcher */
        var launchers = require('../launchers/module');
        var question = {
            type: "list",
            name: "launcher",
            message: "Select Launcher",
            choices: [],
        };
        for(id in launchers) {
            question.choices.push(
                {
                    //name: (record.name === null ? "NULL" : record.name),
                    name: launchers[id].label,
                    value: id
                }
            );
        }
        return(question);
    },

    errClosure : function(job) {
        return function(err) {
            log.verbose('Oh noez, teh errurz launching Job (id ' + job.id + "): " + err);
            job.finished = date.dbDatetime();
            job.return_status = "Launch error";
            job.save(function(okay) {
                if (!okay) {
                    throw new Error("Error saving error status in job " + job.id);
                }
            });
        }
    },

    getUnfinishedJobs : function(store, launcherId, unfinishedStatuses, callback) {
        var Job = store.Model("Job");
        Job
            .join("jobgroup")
            .where({
                jobgroup: {launcher: launcherId},
                execution_status: unfinishedStatuses,
            }).exec(function(jobs) {
            callback(jobs);
        });


    }





}

