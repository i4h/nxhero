var debug       = require('debug')('nxhero');

var ArrayHelper = require('../lib/array_helper');


module.exports = {

    registry: {
        obra_success: {
            processor: require("../processors/obra_success"),
            binaryTypes: ['sdscip'],
        },
    },

    getApplicableProcessorLabels: function(binaryTypes) {

        var applicableProcessors = {};
        var processors = module.exports.registry;

        for (var processor in processors ) {
            if (ArrayHelper.containsAll(binaryTypes, processors[processor].binaryTypes)) {
                applicableProcessors[processor] = processors[processor].processor.label;
            }
        }
        return applicableProcessors;
    }
}