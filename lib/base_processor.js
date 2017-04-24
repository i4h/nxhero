var debug       = require('debug')('nxhero');

var ArrayHelper = require('arrayhelper-yii2-style');


module.exports = {

    registry: {
        show_outfile: require("../processors/show_outfile"),
    },

    getApplicableProcessorLabels: function(binaryTypes) {

        var applicableProcessors = {};
        var processors = module.exports.registry;
        for (var processorId in processors ) {
            var processor = module.exports.registry[processorId];
            if (   processor.binaryTypes === '*'
                || ArrayHelper.containsAll(binaryTypes, processor.binaryTypes)) {
                applicableProcessors[processorId] = processor.label;
            }
        }
        return applicableProcessors;
    }
}