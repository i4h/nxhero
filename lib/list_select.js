var inquirer    = require('inquirer');
var OpenRecord = require('openrecord');
var debug       = require('debug')('nxhero');



module.exports = function(store, modelName, options, callback) {

    store.verify();
    var Model = store.Model(modelName);
    joinConf = typeof options.join === "undefined" ? {} : options.join;
    var where = options.where || null;
    if (options.order)
        Model = Model.order(options.order, options.DESC || false);
    Model.where(where).join(joinConf).exec(function(records) {
        choices = [{name: "<< Return", value: -1}];

        for (var idx = 0; idx < records.length; idx++) {
            record = records[idx];
            choices.push(
                {
                    //name: (record.name === null ? "NULL" : record.name),
                    name: record.getString(),
                    value: idx
                }
            );
        }

        var type ="rawlist";
        if (typeof options.type !== "undefined")
            type = options.type;

        var questions = [
            {
                type: type,
                name: 'idx',
                message: "Select " + store.getBaseModel(modelName).label,
                choices: choices,
            }
        ];

        if (options.pageSize)
            questions[0].pageSize = options.pageSize;

        inquirer.prompt(questions).then(function(answers) {
            if (answers.idx === -1)
                callback(null, 'Return');
            else
                callback(null, records[answers.idx]);
        });
    });

}
