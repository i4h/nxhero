var debug       = require('debug')('nxhero');


module.exports = {

    label: "Testset",

    getTestsetChoices: function(store, options, callback) {
        store.verify();
        var Model = store.Model("Testset");
        var choices = [];
        var joinConf = typeof options.join === "undefined" ? {} : options.join;

        Model.join(joinConf).exec(function(records) {
            for (var idx = 0; idx < records.length; idx++) {
                record = records[idx];
                var value = {
                    id: record.id,
                    problemIds: record.getProblemIds().join(",")
                };
                choices.push({name: record.getString(), value: value});
            }
            callback(null, choices);
        });
    },

    findOrNew: function(store, testsetName, options, callback) {
        var Testset = store.Model("Testset");
        Testset.where({name: testsetName}).exec(function(records) {
            var testset;
            if (records.length === 0)
                testset = new Testset({name: testsetName});
             else
                testset = records[0];
            callback(null, testset);
        });


    }
}

