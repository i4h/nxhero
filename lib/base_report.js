var debug       = require('debug')('nxhero');
var async = require('async');
var nconf       = require('nconf');
const path      = require('path');
var fs = require('fs-extra');
var resolveHome = require('../lib/files').resolveHome;
var zpad = require('zpad');

var log = require("../lib/log");
var ArrayHelper = require('../lib/array_helper');


module.exports = {

    create: function(store, attributes, options, callback) {

        async.waterfall([
            /* Create a report */
            function(callback) {
                var Report = store.Model("Report");
                var report = new Report();
                for (var name  in attributes)
                    report[name] = attributes[name];

                report.save(function(okay) {
                    if (!okay)
                        return callback(new Error("Unable to create new report in db"));
                    return callback(null, report);
                });
            },
            /* Create working directory */
            function(report, callback) {
                var baseDir = path.resolve(resolveHome(nconf.get('reporting').rootdir));
                zpad.amount(nconf.get('reporting').idpadamount);
                report.wd = baseDir + "/" + report.processor_id + "_" + zpad(report.id);

                fs.mkdirs(report.wd, function (err) {
                    if (err)
                        return callback(err);
                    return callback(null, report);
                });
            },
            /* Write filtrs to file */
            function(report, callback) {
                var filterFile = report.wd + "/report_filters.js";
                fs.writeFile(filterFile, report.filters, function(err) {
                    if (err)
                        return callback(err);
                    return callback(null, report);
                });
            },
            /* Write a recreation file */
            function(report, callback) {
                var rerunFile = report.wd + "/report_rerun.sh";
                var lines = ["#/bin/bash"];
                lines.push("nxhero process --processor=" + report.processor_id + " --jobids=\"" + ArrayHelper.getColumn(report.job, "id").join(",")+ "\"");
                lines.push("\n");
                fs.writeFile(rerunFile, lines.join("\n"), function(err) {
                    if (err)
                        return callback(err);
                    return callback(null, report);
                });
            },
            /* Save changes to report */
            function(report, callback) {
                report.save(function(okay) {
                    if (!okay)
                        return callback(new Error("Unable to create new report in db"));
                    return callback(null, report);

                });
            },
        ], callback);
    }
}

