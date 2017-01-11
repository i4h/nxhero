var gitState = require('git-state');
var exec = require('child_process').exec
var debug       = require('debug')('nxhero');


/* Includes some copy-paste from (git-rev)[https://github.com/tblobaum/git-rev] */


function _command (cmd, dirname,  callback) {
    exec(cmd, { cwd: dirname }, function (err, stdout, stderr) {
	callback(err, stdout.split('\n').join(''))
  })
}


module.exports = {

    hash : function (dir, callback) {
        _command('git rev-parse --short HEAD', dir,  callback)
    },

    hashState : function (dir, callback) {
        var result = {err: null};
        gitState.isGit(dir, function (exists) {
			/* Check if repo exists at dir */
            if (!exists) {
                result.state = "no repo";
                callback(null, result);
            } else {
				/* Get hash */
                module.exports.hash(dir, function(err, hash) {
                    if (err !== null) {
                        callback(err, result);
                    } else {
                        result.hash = hash;
						/* Check clean */
                        gitState.dirty(dir, function(err, nDirty) {
                            if (err === null)
                                result.state = nDirty === 0 ? "clean" : "dirty (" + nDirty + ")";
                            callback(err, result);
                        });
                    }
                });
            }
        });
    }
}
