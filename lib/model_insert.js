var debug       = require('debug')('nxhero');


module.exports = function(store, modelName, attributes, callback) {
    store.verify();
    var Model = store.Model(modelName);
    var object = new Model;
    /* In Loop to make sure setters are called */
    for (i in attributes) {
        object[i] = attributes[i];
    }
    object.save(function(result) {
        if (result !== true)
            return callback(new Error("Error saving data", object));
        else
            return callback(null, object);
    });
}
