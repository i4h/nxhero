var debug       = require('debug')('nxhero');

module.exports = function(){

    this.models_name = "BinariesParameter";
    this.belongsTo('binary');
    this.belongsTo('parameter');

}
