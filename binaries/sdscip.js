
var scip = require('../binaries/scip');
var extend = require('node.extend');
var debug       = require('debug')('nxhero');
var async = require('async');
var fs = require('fs-extra');

var sdscip = extend(true, {}, scip);

sdscip.id  ="sdscip";
sdscip.label =   "SD-SCIP Binary";
sdscip.takesProblems = true;

sdscip.cleanRepos = [
    '{binary.dir}/..',
    '{binary.dir}/../lib/scip',
    '~/repos/sdscip_problems',
    '~/repos/sdotools/spline',
    '~/repos/sdotools/libsdo',
    '~/repos/sdotools/simd',
    '~/repos/sdotools/cpplsq',
];

sdscip.prepareJob = function(wd, callback) {
    async.parallel([
        function(callback) {
            fs.writeFile(wd + "/sdscip.set", null, {flags:" O_TRUNC"} ,(err) => {
                callback(err);
            });
        },
        function(callback) {
            fs.mkdirs(wd + "/prop_obra");
            callback(null);
        },
        function(callback) {
            fs.mkdirs(wd + "/prop_ode");
            callback(null);
        }
    ], function(err, results) {

        callback(null);
    });
};

module.exports = sdscip;
