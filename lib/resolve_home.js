const path = require('path');

module.exports = function resolveHome(filepath) {
    if (typeof filepath === "string" && filepath[0] === '~') {
        return path.join(process.env.HOME, filepath.slice(1));
    }
    return filepath;
}
