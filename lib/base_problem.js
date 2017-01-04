
module.exports = {
    getProblemChoices: function(store, options, callback) {
        store.verify();
        var Model = store.Model("Problem");
        var choices = [];
        Model.exec(function(records) {
            for (var idx = 0; idx < records.length; idx++) {
                record = records[idx];
                choices.push({name: record.getString(), value: record.id});
            }
            callback(null, choices);
        });
    }
}

