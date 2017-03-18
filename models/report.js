var debug       = require('debug')('nxhero');

module.exports = function(){

    this.models_name = "Reports";

    this.hasMany("reports_jobs");
    this.hasMany('job', {through: "reports_jobs"});

    this.getString = function() {
        return "Report " + this.id;
    };

}
