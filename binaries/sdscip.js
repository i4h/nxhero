
var scip = require('../binaries/scip');
var extend = require('node.extend');
var debug       = require('debug')('nxhero');

var sdscip = extend(true, {}, scip);

sdscip.id  ="sdscip";
sdscip.label =   "SD-SCIP Binary";
sdscip.cleanRepos = [
    '{binary.path}/..',
    '{binary.path}/../lib/scip',
    '{binary.path}/../sdotools/spline',
    '{binary.path}/../sdotools/libsdo',
    '{binary.path}/../sdotools/simd',
    '{binary.path}/../sdotools/cpplsq',
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
