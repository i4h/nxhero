var debug       = require('debug')('nxhero');
var ArrayHelper = require('arrayhelper-yii2-style');

module.exports = function(){

    this.models_name = "Tags";

    this.hasMany('jobs');

    this.getString = function() {
        return this.name;
    };

}
