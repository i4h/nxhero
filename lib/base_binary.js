var debug       = require('debug')('nxhero');

module.exports = {

    label: "Binary",

    listHeader: [{content:'Name', colWidth: 40}, {content: 'Path', colWidth: 40}, {content: 'Arguments', colWidth:60, lineWrap: true, wordSep: " "} ],

    //@todo: move this to getChoices in db module */
    getBinaryChoices: function(store, options, callback) {
        store.verify();
        var Model = store.Model("Binary");
        var choices = [];
        Model.exec(function(records) {
            for (var idx = 0; idx < records.length; idx++) {
                record = records[idx];
                if (options.fullRecord === true)
                    choices.push({name: record.getString(), value: record});
                else if (options.fullRecordInArray === true)
                    choices.push({name: record.getString(), value: [record]});
                else
                    choices.push({name: record.getString(), value: {id: record.id, type: record.type}});
            }
            callback(null, choices);
        });
    },

}

