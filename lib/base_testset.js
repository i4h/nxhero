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
            if (records.length === 0) {
                /* Name is new, return new testset */
                testset = new Testset({name: testsetName});
                return callback(null, testset);
            }  else {
                /* Testset exists clean of problems if required and return */
                testset = records[0];
                if (options.clean === true) {
                    var TestsetProblem = store.Model("Testsetsproblem");
                    debug(TestsetProblem);
                    TestsetProblem.where({testset_id: testset.id}).delete(function(okay){
                        if (!okay)
                            return callback(new Error("Unalbe to empty testset"));

                        return callback(null, testset);
                    });
                } else {
                    return callback(null, testset);
                }
            }
        });


    }
}

