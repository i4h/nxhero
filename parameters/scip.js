var fs = require('fs-extra');
var path = require('path');

module.exports = {
    id :"scip",
    label:  "SCIP Parameter",
    binaryTypes: ['scip', 'sdscip'],


    getLabel : function getLabel() {
        return this.label;
    }
};
