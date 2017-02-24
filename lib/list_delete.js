var inquirer    = require('inquirer');
var OpenRecord = require('openrecord');


module.exports = function(store, modelName, options, callback) {

    store.verify();
    var Model = store.Model(modelName);
    joinConf = typeof options.join === "undefined" ? {} : options.join;
    Model.where().join(joinConf).exec(function(records) {
        choices = [{name: "<< Return", value: -1}];

        for (var idx = 0; idx < records.length; idx++) {
            record = records[idx];
            choices.push({
                //name: (record.name === null ? "NULL" : record.name),
                name: record.getString(),
                value: idx}
            );
        }

        var questions = [
            {
                type: 'rawlist',
                name: 'idx',
                message: 'Model löschen?',
                choices: choices,
            }
        ];

        inquirer.prompt(questions).then(function(answers) {
            if (answers.idx !== -1) {
                Model = store.Model(modelName);
                Model.where({id: records[answers.idx].id}).delete(function() {
                });
            }
            callback();
        });
    });


}
