module.exports = function() {
    this.addColumn('testsets_problems', function () {
        this.float('timelimit_factor');
    });
};
