var debug       = require('debug')('nxhero');

module.exports = function(string) {
    var parts = string.split(",");
    result = [];
    for (p in parts) {
        part = parts[p];

        partParts = part.split(":");
        if (partParts.length === 1) {
            if (parseInt(part) === NaN)
                throw new Error("Not of type number");
            result.push(parseInt(part));
        } else {
            start = parseInt(partParts[0]);
            end = parseInt(partParts.slice(-1)[0]);
            step = 1;
            if (partParts.length === 3)
                step = parseInt(partParts[1]);

            if (typeof start !== "number" || typeof end !== "number" || typeof step !== "number")
                throw new Error("Not of type number");

            for (var i = start; i <= end; i = i + step) {
                result.push(i);
            }
        }
    }
    return result;
}
