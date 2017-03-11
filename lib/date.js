var debug       = require('debug')('nxhero');
var moment = require('moment');


module.exports = {
    dbDatetime :function() {
        return moment().format('YYYY-MM-DD HH:mm:ss');
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
        var unit = element.charAt(element.length - 1);
        var number = element.substring(0, element.length - 1);
        switch(unit) {
            case "s":
                return parseInt(number);
            case "m":
                return parseInt(number) * 60;
            case "h":
                return parseInt(number) * 3600;
            default:
                if (typeof parseInt(element) !== "number")
                    throw new Error("unable to parse duration element " + element);
                return parseInt(element);
        }
    },

}