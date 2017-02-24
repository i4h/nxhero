module.exports = function() {
    this.addColumn('jobgroups', function () {
        this.boolean('ready_for_launch');
    });
};
