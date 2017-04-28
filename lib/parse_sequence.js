var debug       = require('debug')('nxhero');

module.exports = function(string) {

    if (typeof string === "number")
        return [string];

    var parts = string.split(",");
    var result = [];
    for (p in parts) {
        let part = parts[p];
        debug(part);
        let partParts = part.split(":");
        debug(partParts.length);
        if (partParts.length === 1) {
            debug("length 1");
            debug(parseFloat(part));
            if (isNaN(parseFloat(part)))
                throw new Error("Not a number");
            result.push(parseFloat(part));
        } else {
            let start = parseFloat(partParts[0]);
            let end = parseFloat(partParts.slice(-1)[0]);
            let step = 1;
            if (partParts.length === 3)
                step = parseFloat(partParts[1]);
            if (isNaN(start) || isNaN(end)  || isNaN(step))
                throw new Error("Not a number");

            for (var i = start; i <= end; i = i + step) {
                result.push(i);
            }
        }
    }
    return result;
}
