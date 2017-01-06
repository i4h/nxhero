var debug       = require('debug')('nxhero');

module.exports = {


    /** Get an array of the unique values of property 'column'
     * of the objects.
     * Values true, false, null will be converted to
     * 'true, 'false', 'null'
     *
     * @param objects
     * @param column
     * @param options
     * @returns {Array}
     */
    getColumnUnique: function(objects, column, options) {
        vals = {};
        result = [];
        for (var i = 0; i < objects.length; ++i) {
            vals[objects[i][column]] = true;
        }
        for (val in vals) {
            if (options.type === "int")
                result.push(parseInt(val));
            else
                result.push(val)
        }
        return result;
    },

    /** Get the array of values of property 'column'
     * of the objects
     *
     * @param objects
     * @param column
     * @param options
     * @returns {Array}
     */
    getColumn: function(objects, column, options) {
        result = [];
        for (var i = 0; i < objects.length; ++i)
            result.push(objects[i][column]);
        return result;
    },


}

