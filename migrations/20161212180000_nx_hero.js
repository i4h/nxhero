module.exports = function(){
    this.createTable('binaries', function(){
        this.string('name');
        this.string('path');
        this.text('args_string');
        this.string('type');

    });

    this.createTable('jobgroups', function(){
        this.integer('binary_id');
        this.string('problem_ids');
        this.string('name');
        this.text('binary_data');
        this.string('launcher');
        this.text('description');
        this.datetime('created_at');
        this.datetime('updated_at');

    });

    this.createTable('jobs', function(){
        this.integer('jobgroup_id');
        this.integer('problem_id');
        this.datetime('submitted');
        this.string('execution_status');
        this.datetime('finished');
        this.string('return_status');
        this.text('parameter_values');
        this.string('command');
        this.text('launcher_data');
        this.string('hostname');
        this.datetime('created_at');
        this.datetime('updated_at');
        this.string('full_command');
    });

    this.createTable('parameters', function(){
        this.integer('binary_id');
        this.string('name');
        this.string('model');
        this.text('model_data');
        this.string('type');
        this.string('values');
        this.string('default_value');
    });

    this.createTable('parameter_value_ints', function(){
        this.integer('job_id');
        this.integer('parameter_id');
        this.integer('value');
    });

    this.createTable('parameter_value_floats', function(){
        this.integer('job_id');
        this.integer('parameter_id');
        this.float('value');


    });

    this.createTable('parameter_value_strings', function(){
        this.integer('job_id');
        this.integer('parameter_id');
        this.string('value');
    });



    this.createTable('problems', function(){
        this.string('name');
        this.string('path');
    });
 };