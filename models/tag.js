var debug       = require('debug')('nxhero');
var ArrayHelper = require('../lib/array_helper');

module.exports = function(){

    this.models_name = "Tags";

    this.hasMany('jobs');

    this.getString = function() {
        return this.name;
    };

}
