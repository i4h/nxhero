var debug       = require('debug')('nxhero');
var ArrayHelper = require('arrayhelper-yii2-style');

module.exports = function(){

    this.models_name = "Testsets";

    this.hasMany('testsets_problems');
    this.hasMany('problem', {through: "testsets_problems"});

    this.getString = function() {
        return this.name + " ( " + this.getNproblems() + " Probs)";
    };

    this.getProblems = function() {
        var problems = [];

        for (var i = 0; i < this.testsets_problems.length; ++i) {
            problems.push(this.testsets_problems[i].problem);
        }
        return problems;
    };

    this.getNproblems = function() {
        return this.getProblems().length;
    };

    this.getProblemIds = function() {
        return ArrayHelper.getColumn(this.getProblems(), 'id', {});
    };


}
