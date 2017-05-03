var debug       = require('debug')('nxhero');
var log = require("../lib/log");
const path      = require('path');
var resolveHome = require('../lib/files').resolveHome;
fs = require('fs-extra');
var nconf       = require('nconf');

module.exports = function(){

    this.models_name = "Reports";

    this.hasMany("reports_jobs");
    this.hasMany('job', {through: "reports_jobs"});

    this.getString = function() {
        return "Report " + this.id;
    };

    this.getListRow= function() {
        return [this.name];
    };

    this.deleteDeep = function (store, options, callback) {
        var report = this;

        var promises = [];
        /* Check if wd exists before adding the call */
        let wdExists = true;
        try {
            fs.statSync(report.wd);
        } catch (e) {
            wdExists = false;
            log.verbose("Reports working directory " + report.wd + " does not exist.");
        }

        if (wdExists) {
            /* Add call to move groups wd if it exists */
            var trashdir = path.resolve(resolveHome(nconf.get('runs').rootdir) + "/.report_trash");
            var target = trashdir + "/" + path.basename(report.wd);
            promises.push(new Promise(function(resolve, reject) {
                    log.verbose("Moving " + report.wd + " to " + target);
                    /* Create runs/.report_trash if needed*/
                    fs.mkdirs(trashdir, function (err) {
                        if (err)
                            return reject(err);

                        /* Move report dir to trash */
                        log.verbose("Moving " + report.wd + " to " + target);
                        fs.move(report.wd, target, function (err) {
                            if (err)
                                return reject(err)
                            return resolve();
                        });
                    });

            }));
        }

        /* Delete report pivots */
        promises.push(new Promise(function(resolve, reject) {
            var ReportsJob = store.Model("ReportsJob");
            ReportsJob.where({report_id: report.id}).deleteAll(function (okay) {
                if (!okay)
                    return reject("Error deleting report privots of report");
                console.info("Deleted report pivots of report");
                return resolve();
            });
        }));

        Promise.all(promises).then(() => {
            report.delete(function (okay) {
                if (!okay)
                    throw new Error("Error deleting report");
                log.info("Deleted report");
                return callback(null);
            });
        }, (err) => {
            return callback(err);
        });
    }
}
