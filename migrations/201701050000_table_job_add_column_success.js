module.exports = function() {
    this.addColumn('jobs', function () {
        this.boolean('success', {default: false});
    });
};
