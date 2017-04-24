var BaseParameter = require('../lib/base_parameter');
var debug       = require('debug')('nxhero');

var ArrayHelper = require('arrayhelper-yii2-style');

module.exports = function(){

    this.hasMany("binaries_parameters");
    this.hasMany('binary', {through: "binaries_parameters"});

    this.validatesPresenceOf('name');
    this.getString = function() {
        /* Indicate attached binaries */
        var binaryString = "";
        if (this.binaries_parameters) {
            var binaries = this.getBinariesFromJoin();
            var list = ArrayHelper.getColumnList(binaries, "name", {sort: true, limit: 3});
            if (typeof list === "number")
                binaryString = "\t(" + list + " Binaries)";
            else
                binaryString = "\t(" + list + ")";
        }
        return this.name + " \t(" + this.getTypeString() + ")" + binaryString;
    };


    this.getListRow= function() {
        /* Indicate attached binaries */
        var binaryList = "";
        if (this.binaries_parameters) {
            var binaries = this.getBinariesFromJoin();
            binaryList = ArrayHelper.getColumnList(binaries, "name", {sort: true});
        }
        var type = this.getTypeString();

        return [this.name, type, binaryList];
    };

    this.getTypeString = function() {
        return BaseParameter.types[this.type];
    };
    this.getValuesQuestion = function() {
        question = {
            name: "paramvals_" + this.id,
            message: 'Values for ' + this.name + ' (' + this.getTypeString() + '): ',
            default: this.default_value
        };
        switch (Number(this.type)) {
            case BaseParameter.typeString:
                question['type']  = 'checkbox';
                question['choices'] = this.values.split(",");
                break;
            case BaseParameter.typeInteger:
            case BaseParameter.typeFloat:
                question['type']  = 'input';
                break;
            default:
                throw new Error("Don't know how to get ValueQuestion for param of type:" + this.type);

        }
        return question;
    };

    this.getNewValueModel =  function(store, options) {
        var ValueModel = store.Model(BaseParameter.valueModels[this.type]);
        return new ValueModel();
    };
    
    this.getBinariesFromJoin = function() {
        var binaries = [];
        for (var i = 0; i < this.binaries_parameters.length; i++) {
            if (typeof this.binaries_parameters[i].binary !== "undefined")
                binaries.push(this.binaries_parameters[i].binary);
        }
        return binaries;
    },

    this.getValueRelation =  function(store, options) {
        return BaseParameter.valueRelations[this.type]
    };

}
