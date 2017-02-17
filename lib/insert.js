var debug       = require('debug')('nxhero');
var model_insert = require('./model_insert');


module.exports = {

    single: model_insert,

    multiple: function (store, modelName, attributes, callback) {
        store.verify();
        for (var i = 0; i < attributes.length; ++i)
        {
            model_insert(store, modelName, attributes[i], callback);
        }
    },

    multipleIfUnique: function (store, modelName, attributes, callback) {
        store.verify();
        for (var i = 0; i < attributes.length; ++i)
        {
            model_insert(store, modelName, attributes[i], callback);
        }
    }


}
