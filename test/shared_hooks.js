var debug       = require('debug')('nxhero');

var Store = require('openrecord/lib/store');

module.exports = {
    createFakeStore: function(callback) {
        var store_conf = {};
        store_conf.throw_errors = false;
        store_conf.type = "sqlite3";
        var store = new Store(store_conf);
        store.setMaxListeners(0);
        store.on('exception', function(){});
        store.loadModels(__dirname + '/../models/*js');


        store.ready(function() {
            /* Add attributes that would come from db structure via migrations */
            store.definitions.jobgroup.attribute('launcher');
            store.definitions.job.attribute('parameter_values');
            store.definitions.binary.attribute('type');
            store.definitions.binary.attribute('args_string');
            store.definitions.binary.attribute('path');


            callback(store);
        });
    }

}