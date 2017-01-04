var debug       = require('debug')('nxhero');

module.exports = {

    label: "Binary",

    //@todo: move this to getChoices in db module */
    getBinaryChoices: function(store, options, callback) {
        store.verify();
        var Model = store.Model("Binary");
        var choices = [];
        Model.exec(function(records) {
            for (var idx = 0; idx < records.length; idx++) {
                record = records[idx];
                choices.push({name: record.getString(), value: {id: record.id, type: record.type}});
            }
            callback(null, choices);
        });
    },

}

