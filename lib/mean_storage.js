var extend      = require("extend");
var debug       = require('debug')('nxhero');
var in_array    = require("in_array");;
var ArrayHelper = require("arrayhelper-yii2-style");
var log = require("winston");

var filterValue = function(meanConf, value, type) {
    let fVal = value;
    if (typeof value !== "number") {
        if (meanConf.nanVal)
            fVal = meanConf.nanVal;
        else {
            throw new Error(`Can not store non-number value ${value} for mean ${type} because no nanVal is given in meanConf`);
        }
    }

    if (meanConf.maxValue)
        fVal = Math.min(meanConf.maxValue, fVal);
    if (meanConf.minValue)
        fVal = Math.max(meanConf.minValue, fVal);

    return fVal;
};

/*  === Stateless ''private'' methods  === */
var initMean = function(meanConf, value, type ) {
    /* Filter the value */
    let fVal = filterValue(meanConf, value, type);

    switch(meanConf.type) {
        case "geometric":
            return {
                nValues: 1,
                shiftProd: fVal + meanConf.shift,
            };
        case "arithmetic":
            return {
                nValues: 1,
                sum: fVal,
            };
    }
}


var getMeanConfString = function(meanConf) {
    switch(meanConf.type) {
        case "geometric":
            return "geometric (" + meanConf.shift + ")";
        default:
            return meanConf.type;
    }
}


var addValueToMean = function(meanConf, mean, value, type) {
    let fVal = filterValue(meanConf, value, type);
    switch(meanConf.type) {
        case "geometric":
            mean.nValues += 1;
            mean.shiftProd *= (fVal + meanConf.shift );
            break;
        case "arithmetic":
            mean.nValues += 1;
            mean.sum += fVal;
            break;
    }
    return mean;
}

/*  === Stateless ''private'' methods  === */
var getMean = function(meanConf, mean) {
    switch(meanConf.type) {
        case "geometric":
            return Math.pow(mean.shiftProd,1/mean.nValues) - meanConf.shift;
        case "arithmetic":
            return mean.sum / mean.nValues;
    }

}




/* ==== Performance profile object with ''public'' properties and functions */

module.exports = MeanStorage;
function MeanStorage() {
    this.options = {
        defaultShift: 10,
        valueLabel: "solution time",
        defaultMean: {
            type: "arithmetic",
        },
    };

    this.meanTypes = {};

    this.setOptions({});

    /* means[type][solver][instance/testset]*/
    this.means = {};
}




MeanStorage.prototype.addValue = function(solver, instance, testsets, type, value, options) {

    let names = [instance, ...testsets];
    names.forEach(name => {
        /* ensure object exists */
        if (typeof this.means[type] === "undefined")
            this.means[type] = {};
        if (typeof this.means[type][solver] === "undefined")
            this.means[type][solver] = {};
        if (typeof this.means[type][solver] === "undefined")
            this.means[type][solver] = {};

        let meanConf = this.getMeanConf(type);
        if (typeof this.means[type][solver][name] === "undefined") {
            this.means[type][solver][name] = initMean(meanConf, value, type);
        } else {
            let mean =  this.means[type][solver][name];
            if (typeof value === "undefined") {
                process.exit()


            }
            mean = addValueToMean(meanConf, mean, value, type);
        }
    });

};

MeanStorage.prototype.getMeanConf = function(type) {
    return this.meanTypes[type] || this.options.defaultMean;
};


MeanStorage.prototype.getMean = function(solver, name, type, options) {
    let mean =  this.means[type][solver][name];
    if (typeof mean === "undefined")
        return "no obs.";
    let meanConf = this.getMeanConf(type);
    return getMean(meanConf, mean);

};

MeanStorage.prototype.listMeans = function() {
    for (type in this.means) {
        let meanConf = this.getMeanConf(type);
        log.info(`Type ${type} (${getMeanConfString(meanConf)})`);
        for (solver in this.means[type]) {
            log.info(`  Solver ${solver}`);
            for (name in this.means[type][solver]) {
                log.info(`    ${name}: ${this.getMean(solver, name, type)}`)
            };
        };
    };
};


MeanStorage.prototype.setOptions = function(options) {
    extend(this.options, options);
    if (typeof this.options.bestComparator === "string")
        this.options.bestComparator = ArrayHelper.getComparisonFuncFromString(this.options.bestComparator);
};

MeanStorage.prototype.addMeanType= function(type, meanConf) {
    this.meanTypes[type] = meanConf;
};




