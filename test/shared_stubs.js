var debug       = require('debug')('nxhero');

module.exports = {
    nconfGet: function(field) {
        if (field == "runs")
            return {
                idpadamount: 3,
                rootdir: '/path/to/rootdir',
            };
    },

    resolve : function(path) {
        return path;
    },

    mkdirs : function(path, callback) {
        return callback(null);
    },

    openSync : function(path, flags) {
        return null;
    },

    spawn : function(cmd, args, options) {
        return {
            pid: "12345",
            on: function(what, func) {},
            unref: function() {}
        }
    },
}