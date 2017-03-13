var debug       = require('debug')('nxhero');
var moment = require('moment');


module.exports = {
    dbDatetime :function() {
        return moment().format('YYYY-MM-DD HH:mm:ss');
    },

    durationParts: {
        "s": 1,
        "m": 60,
        "h": 3600,
    },

    parseDurationString: function(input) {
        /* Remove (repeated) multiple spaces by commas*/
        var parts = input.trim().replace(/[ *]/g,',').split(",");
        var seconds = 0;

        for (var i = 0; i < parts.length; ++i)
            seconds += module.exports.parseDurationStringElement(parts[i]);

        return seconds;
    },

    parseDurationStringElement: function(element) {
        debug("parsing " + element );
        var unit = element.charAt(element.length - 1);
        var number = element.substring(0, element.length - 1);

        if (typeof module.exports.durationParts[unit] !== "undefined")
            return parseInt(number) * module.exports.durationParts[unit];
        else if (typeof parseInt(element) === "number")
            return parseInt(element);
        else
            throw new Error("unable to parse duration element " + element);
    },

    secondsToDurationString: function(seconds) {
        var remainingSeconds = seconds;
        var units = Object.keys(module.exports.durationParts);
        var parts = [];
        for (var i = units.length - 1; i >= 0; i--) {
            var unit = units[i];
            var factor = module.exports.durationParts[unit];
            var number = Math.floor(remainingSeconds / factor);
            if (factor === 1)
                number = remainingSeconds;
            else
                remainingSeconds -= number * factor;

            if (number !== 0)
                parts.push(number+unit);
        }
        return parts.join(" ");
    },

    secondsToHMS: function(seconds) {
        var remainingSeconds = seconds;
        var parts = [];
        var factors = [3600, 60];
        for (var i = 0; i < factors.length; i++) {
            var factor = factors[i];
            var number = Math.floor(remainingSeconds / factor);
            remainingSeconds -= number * factor;

            if (number < 10)
                parts.push("0" + number);
            else
                parts.push(number);
        }
        if (Math.ceil(remainingSeconds) < 10)
            parts.push("0" + Math.ceil(remainingSeconds));
        else
            parts.push(Math.ceil(remainingSeconds));

        return parts.join(":");
    }



}