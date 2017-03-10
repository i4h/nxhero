module.exports = function() {

    this.createTable('tags', function(){
        this.string('name');
        this.integer('job_id');
        this.string('creator');
    });
};


