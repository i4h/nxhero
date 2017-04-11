var debug       = require('debug')('nxhero');
var in_array = require('in_array');
var extend = require("extend");

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

    /** Searches an object and by comparing adjacent objects
     * with the comparator and keeping the first one if the comparison is true
     * and the second one if the comparison is false
     * Handy to find key of max/min value in object (see test for example usage)
     * @param object
     * @param compare
     * @param options
     */
    findByComparison: function(object, compare, options) {
        var first = true;
        var prop = null;
        var val = null;
        options = options || {};

        if (typeof compare === "string") {
            switch (compare) {
                case "min":
                    compare = function(a,b) {
                        return a < b
                    };
                    break;
                case "max":
                    compare = function(a,b) {
                        return a > b
                    };
                    break;
                default:
                    throw new Error("Unknown comparator string " + compare);
            }
        }

        for (var curProp in object) {
            var curVal = object[curProp];
            if (first || compare(curVal, val)) {
                val = curVal;
                prop = curProp;
            }
            first = false;
        }

        if (options.returnValue === true)
            return val;
        else if (options.returnBoth === true)
            return {value: val, property: prop}
        else
            return prop;
    },

    /** Builds an object (key-value pairs) from an array of objects.
     *
     * @param objects
     * @param from
     * @param to
     */
    map: function(objects, from, to, options ) {
        result = {};
        options = options || {};
        for (var i = 0; i < objects.length; ++i) {
            if (typeof options.filter === "function") {
                if (!options.filter(objects[i]))
                    continue;
            }
            if (typeof to === "undefined")
                result[objects[i][from]] = objects[i];
            else
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
     * if objects is an array of objects, elements of from fromProperties can be set to true
     * then, the full original object will be assigned to the corresponding fromProperty
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
                    if (fromProperties[j] === true)
                        newObject[toProperties[j]] = objects[i];
                    else
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

    /**
     * Creates an array object with properties from a an array
     * where there will be as many objects in the array as the array
     * had entries, and each of those objects will have properites properties
     * with the corresponding array value as value
     * Example:
     *  objectify([1,2,3], {a,b})
     *  will return
     *  [{a: 1, b:1}, {a:2, b:2}, {a:3, b:3}]
     *
     * @param arr
     * @param properties
     */
    objectify: function(arr, properties, options) {
        var result = [];
        for (var i = 0; i < arr.length; ++i) {
            var obj = {};
            for (var j = 0; j < properties.length; ++j) {
                obj[properties[j]] = arr[i];
            }
            result.push(obj);
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

    /** Makes an ''object-tree'' from an array of
     * objects, using the specified properties
     *
     * @param array objects
     * @param array properties
     */
    treeify: function(objects, properties) {
        var result = [];

        for (var i = 0; i < objects.length; i++) {
            var obj = objects[i];
            var leaf = result;
            /* Create tree structure for all but the last element of properties */
            for (var j = 0; j < properties.length - 1; j++) {
                var prop = properties[j];
                var propVal = obj[prop];
                if (typeof leaf[propVal] === "undefined")
                    leaf[propVal] = {};

                leaf = leaf[propVal];
            }

            /* Insert object in the lowest level of the tree */
            var prop = properties.slice(-1)[0];
            var propVal = obj[prop];

            if (typeof leaf[propVal] === "undefined")
                leaf[propVal] = [obj];
            else
                leaf[propVal].push(obj);
        }
        return result;
    },

    /** ''Flattens'' an object tree:
     * Returns an array with one entry for each leaf of
     * the tree. Each entry is an object containing the leaf
     * as well as tehe keys leading to that leaf
     *
     * @param array tree
     * @param array properties, array of property names or depth
     * of tree
     */
    flattenTree: function(tree, properties) {
        var result = [];
        var depth = typeof properties === "number" ? properties : properties.length;

        var keys = [];
        var keysObj = {};

        var propName = typeof properties === "number" ? null : properties[0];
        var keys = Object.keys(tree);
        for (var j = 0; j < keys.length; j++) {
            var key = keys[j];
            var keyObj = {};
            if (propName !== null)
                keyObj[propName] = key;
            var subtree = tree[key];
            var subtreeProperties;
            if (typeof properties === "number")
                subtreeProperties = properties -1;
            else
                subtreeProperties = properties.slice(1);

            if (depth === 1) {
                var subtree = {

                    keys: [key],
                    leaf: subtree,
                };
                if (propName !== null)
                    subtree.keysObj = keyObj;

                result.push(subtree);
            } else {
                /* Handle tree with real subtree */

                /* - Get subtree recursively */
                var flatSubTree = module.exports.flattenTree(subtree, subtreeProperties);

                /* Amend keys and keysObj in subtree */
                for (var i = 0; i < flatSubTree.length; i++) {
                    var subTreeObject = flatSubTree[i];
                    subTreeObject.keys = [key].concat(subTreeObject.keys);
                    if (propName !== null)
                        subTreeObject.keysObj[propName] = key;
                }
                result = result.concat(flatSubTree);
            }
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
    },

    getColumnList: function(objects, column, userOptions) {
        var options = {
            seperator: ", "
        };
        extend(options, userOptions);

        var values = module.exports.getColumn(objects, column);
        if (typeof options.limit !== "undefined") {
            if (values.length > options.limit)
                return values.length;
        }

        if (typeof options.sort !== "undefined") {
            values.sort();
        }

        return values.join(options.seperator);
    },


}

