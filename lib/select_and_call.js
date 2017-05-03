const inquirer    = require('inquirer');
const debug = require("debug")("nxhero");
const in_array = require("in_array");
const log = require("./log");

const checkReturn = function(answers, options) {
    if (!options.returnItem)
        return false;
    let answer = answers.idx

    return  (answer === -1 || Array.isArray(answer) && in_array(-1, answer));
};

const getRecords = function(records, answer) {
    /* single selection */
    if (!Array.isArray(answer))
        return [ records[answer] ];

    /* multiple selection */
    let result = [];
    for (var i = 0; i < answer.length; i++) {
        result.push(records[answer[i]]);
    }
    return result;
};

module.exports = function(store, modelName, call, options, callback) {
    return new Promise(function(resolve, reject) {
        let Model = store.Model(modelName);
        let joinConf = typeof options.join === "undefined" ? {} : options.join;
        let order = options.order || "id";

        Model.order(order).join(joinConf).exec(function(records) {
            let choices = [];
            if (options.returnItem)
                choices.push({name: "<< Return", value: -1});

            for (var idx = 0; idx < records.length; idx++) {
                let record = records[idx];
                choices.push({
                    name: record.getString(),
                    value: idx,
                });
            }
            let type = options.listType || "rawlist";
            let pageSize = options.pageSize || 20;
            var questions = [
                {
                    type,
                    pageSize,
                    name: 'idx',
                    message: 'Model löschen?',
                    choices: choices,
                }
            ];

            inquirer.prompt(questions).then((answers) => {
                //let answers = { idx: [ 1,2,3 ] };
                if (checkReturn(answers, options)) {
                    log.verbose("Returning");
                    return resolve();
                }
                debug(answers);
                let selectedRecords = getRecords(records, answers.idx);
                debug(selectedRecords);

                if (options.series) {
                    let callClosure = (record, options) => {
                        return () => {
                            return call(store, record, options);
                        }
                    };
                    debug("series");
                    /* Execute call on all selected records in series */
                    let p = null;
                    for (var i = 0; i < selectedRecords.length; i++) {
                        if (p === null) {
                            p = call(store, selectedRecords[i], {});
                        } else {
                            p = p.then(callClosure(selectedRecords[i], {}));
                        }
                    }
                    /* Finally.... */
                    p.then(() => {
                        debug("done calling on " + selectedRecords.length + " selected records in series");
                        return resolve();
                    });

                } else {
                    debug("parallel");
                    /* Execute call on all selected records in parallel */
                    let promises = [];
                    for (var i = 0; i < selectedRecords.length; i++) {
                        promises.push(call(store, selectedRecords[i], {}));
                    }
                    Promise.all(promises).then(() => {
                        debug("done calling on " + selectedRecords.length + " selected records in parallel");
                        return resolve();
                    });
                }
            }, (err) => {
                log.error(err);
            });
        });
    });
}
