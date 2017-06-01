var fs = require('fs-extra');
var path = require('path');
var debug       = require('debug')('nxhero');


module.exports = {
    id :"default",
    label:  "Default Argument",
    binaryTypes: ['default', 'scip'],

    getLabel : function getLabel() {
        return this.label;
    },

/*    getModelQuestions : function() {
        var id = this.id;
        return [
            {
                type: 'input',
                name: 'modelData_order',
                message: 'Place of Argument (1,2,...)',
                when: function (answers) {
                    return answers.model === id;
                },
            }
        ];
    },
*/


};
