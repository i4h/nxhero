var debug       = require('debug')('nxhero');

module.exports = function(){

    this.models_name = "ReportsJob";
    this.belongsTo('report');
    this.belongsTo('job');

}
