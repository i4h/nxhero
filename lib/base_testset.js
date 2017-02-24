var debug       = require('debug')('nxhero');


module.exports = {
    getTestsetChoices: function(store, options, callback) {
        store.verify();
        var Model = store.Model("Testset");
        var choices = [];
        var joinConf = typeof options.join === "undefined" ? {} : options.join;

        Model.join(joinConf).exec(function(records) {
            for (var idx = 0; idx < records.length; idx++) {
                record = records[idx];
                debug(record);
                choices.push({name: record.getString(), value: record.getProblemIds().join(",")});
            }
            callback(null, choices);
        });
    }
}

