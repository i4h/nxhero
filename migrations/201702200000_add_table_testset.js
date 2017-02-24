module.exports = function() {

    this.createTable('testsets', function(){
        this.string('name');
    });

    this.createTable('testsets_problems', function(){
        this.integer("problem_id");
        this.integer('testset_id');
    });

};


