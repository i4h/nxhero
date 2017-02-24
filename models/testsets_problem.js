var debug       = require('debug')('nxhero');

module.exports = function(){

    this.models_name = "TestsetProblem";

    this.belongsTo('testset');
    this.belongsTo('problem');

}
