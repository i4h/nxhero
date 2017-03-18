module.exports = function() {

    this.createTable('reports', function(){
        this.string('name');
        this.string('processor_id');
        this.string('filters');
        this.string('created_at');
        this.string('wd');
        this.string('hostname');
    });

    this.createTable('reports_jobs', function(){
        this.integer("report_id");
        this.integer('job_id');
    });

};


