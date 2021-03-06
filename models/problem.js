var fs = require('fs-extra')
const path      = require('path');
var debug       = require('debug')('nxhero');


var resolveHome = require('../lib/files').resolveHome;



module.exports = function(){

    this.models_name = "Problems";

    this.hasMany('testsets_problems');

    this.getter("absolutePath", function() {
        return path.resolve(resolveHome(this.path));
    });

    this.getString = function() {
        return this.name + " ( " + this.path + ")";
    };

    this.attribute('timeLimitFactor');
    this.attribute('timeLimit');

}
