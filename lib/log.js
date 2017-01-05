var winston = require('winston');
var chalk       = require('chalk');
var debug       = require('debug')('nxhero');




/* Logging for console app */

var log;

switch(process.env.NODE_ENV) {
    case "console" :
        log = new (winston.Logger)({
            transports: [
                new (winston.transports.Console)({
                    level: 'verbose',
                    formatter: function (options) {
                        switch (options.level) {
                            case "error":
                                return chalk.red.bold(options.message);
                            case "info":
                                return chalk.blue.bold(options.message);
                            default:
                                return options.message;
                        }
                    }
                }),
                new (winston.transports.File)({
                    level: 'silly',
                    filename: __dirname + '/../logs/console.log',
                    formatter: function(options) {
                        return options.timestamp + ": " + options.level + ": " + options.message;
                    }
                }),
            ]
        });
        break;

    case "test" :
        log = new (winston.Logger)({
            transports: [
                new (winston.transports.Console)({
                    level: 'error',
                }),
                new (winston.transports.File)({
                    filename: __dirname + '/../logs/tests.log',
                    level: 'silly',
                    formatter: function(options) {
                        return options.timestamp + ": " + options.level + ": " + options.message;
                    }
                }),
            ]
        });
        break;
    default:
        log = winston;
}

module.exports = log;

