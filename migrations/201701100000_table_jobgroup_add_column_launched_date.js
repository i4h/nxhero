module.exports = function() {
    this.addColumn('jobgroups', function () {
        this.datetime('launched_date');
    });
};
