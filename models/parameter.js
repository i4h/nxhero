var BaseParameter = require('../lib/base_parameter');
var debug       = require('debug')('nxhero');



module.exports = function(){
    this.validatesPresenceOf('name');
    this.getString = function() {
        if (this.type === BaseParameter.typeString)
            return this.name + " ("+this.getTypeString()+": " + this.value
        else
            return this.name + " (" + this.getTypeString() + ")";
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

    this.getValueRelation =  function(store, options) {
        return BaseParameter.valueRelations[this.type]
    };

}
