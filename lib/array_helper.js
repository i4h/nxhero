var debug       = require('debug')('nxhero');
var in_array = require('in_array');

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
            if (typeof options !== "undefined" && options.type === "int") {
                var int = parseInt(val);
                if (!isNaN(int) || options.ignoreNaN !== true)
                    result.push(parseInt(val));
            } else if (typeof options !== "undefined" && options.type === "bool")
                result.push(val === "true");
            else
                result.push(val)
        }
        return result;
    },

    /** Get an object with ne unique values of property 'column'
     * of the objects as keys and the count of these values as value
     * Values true, false, null will be converted to
     * 'true, 'false', 'null'
     *
     * @param objects
     * @param column
     * @param options
     * @returns {Array}
     */
    getColumnUniqueCounts: function(objects, column, options) {
        vals = {};
        result = [];
        for (var i = 0; i < objects.length; ++i) {
            if (typeof  vals[objects[i][column]] === "undefined")
                vals[objects[i][column]] = 1;
            else
                ++vals[objects[i][column]];
        }
        return vals;
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

    /** Builds an object (key-value pairs) from an array of objects.
     *
     * @param objects
     * @param from
     * @param to
     */
    map: function(objects, from, to ) {
        result = {};
        for (var i = 0; i < objects.length; ++i) {
            result[objects[i][from]] = objects[i][to];
        }
        return result;
    },


    /** Builds an array of objects containing the
     * remapped  properties of objects
     *
     *
     * @param objects either an array of objects or an object containing objects
     * @param fromProperties array of names of properties in the input objects
     * if objects is a object of objects, elements of fromProperties can be set to true
     * Then, the value of the object key will be used
     * @param toProperties array of names of properties in the new returned
     */
    reMap: function(objects, fromProperties, toProperties ) {

        if (fromProperties.length !== toProperties.length)
            throw new Error("Expect fromProperties and toProperties to have the same length");

        var result = [];

        if (Array.isArray(objects)) {
            for (var i = 0; i < objects.length; ++i) {
                newObject = {};
                for (var j = 0; j < fromProperties.length; ++j) {
                    newObject[toProperties[j]] = objects[i][fromProperties[j]];
                }
                result.push(newObject);
            }
        } else {
            for (var i in objects) {
                newObject = {};
                for (var j = 0; j < fromProperties.length; ++j) {
                    if (fromProperties[j] === true) {
                        newObject[toProperties[j]] = objects[i][fromProperties[j]];
                    } else {
                        newObject[toProperties[j]] = objects[i][fromProperties[j]];
                    }
                }
                result.push(newObject);
            }
        }
        return result;
    },

    /** Builds an array of objects from a map
     *
     * Example Input: {k1: v1, k2: v2}
     * Output: of unMap(objects, "prop1", "prop2"):
     * [{prop1: k1, prop2: v1}, {prop1: k2, prop2: v2}]
     *
     * @param objects
     * @param keyProperty
     * @param valueProperty
     * @returns {Array}
     *
     */
    unMap: function(objects, keyProperty, valueProperty ) {
        var result = [];
        for (var i in objects) {
            var newObject = {};
            newObject[keyProperty] = i;
            newObject[valueProperty] = objects[i];
            result.push(newObject);

        }
        return result;
    },

    stringToBool: function(arr) {
        var result = [];
        for (var i = 0; i < arr.length; ++i) {
            result.push(arr[i] === "true");
        }
        return result;
    },

    containsAll: function(needles, haystack) {
        foundNeedles = {};
        for (var i = 0; i < haystack.length; ++i) {
            if (in_array(haystack[i], needles))
                foundNeedles[haystack[i]] = true;
        }
        return (Object.keys(foundNeedles).length === needles.length)
    }
}

