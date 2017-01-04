var fs = require('fs');
var path = require('path');

module.exports = {
    getCurrentDirectoryBase : function() {
        return path.basename(process.cwd());
    },

    directoryExists : function(filePath) {
        try {
            return fs.statSync(filePath).isDirectory();
        } catch (err) {
            return false;
        }
    },
    resolveHome: function(filepath) {
        if (filepath[0] === '~') {
            return path.join(process.env.HOME, filepath.slice(1));
        }
        return filepath;
    }
};
