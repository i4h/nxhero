module.exports = function() {
    this.createTable('binaries_parameters', function(){
        this.integer("binary_id");
        this.integer('parameter_id');
    });
};


