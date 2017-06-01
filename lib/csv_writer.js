var log = require("winston");
var os = require('os');
var debug       = require('debug')('performance_profile');
const fs = require("fs");

function CSV(body, header = []) {
    this.separator = ',';
    this.header = header;
    this.body = body;
};


CSV.prototype.getCSV = function() {
    let full;
    if (this.header.length != 0)
        full = [this.header, ...this.body];
    else
        full = this.body;

    let lines = [];

    full.forEach(line => {
        lines.push(line.join(this.separator));
    });

    return lines.join(os.EOL) + os.EOL;
};

CSV.prototype.write = function(filename) {
    return new Promise((resolve, reject) => {
        let csv = this.getCSV();
        fs.writeFile(filename, csv, (err) => {
            if (err)
                return reject(err);
            log.info("Written csv to " + filename);
            return resolve();
        });
    });
};

module.exports = CSV;