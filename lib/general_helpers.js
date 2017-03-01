

module.exports = {
    compareSafe: function(a, b) {
        return (typeof a !== "undefined" && a === b);
    }
}