/**
 * Created by bzfvierh on 31.12.16.
 */

const chai = require('chai');
const assertArrays = require('chai-arrays');
chai.use(assertArrays);
var expect  = require("chai").expect;
var Store = require('openrecord/lib/store');
var store = new Store();
var debug       = require('debug')('nxhero');
var sinon = require('sinon');
var sinonTest = require('sinon-test');
sinon.test = sinonTest.configureTest(sinon);
sinon.testCase = sinonTest.configureTestCase(sinon);


require("./__shared");
var ArrayHelper = require('../lib/array_helper');


describe("Array Helper ", function() {

    describe("treeify", function() {
        var objs = [];
        objs.push({
            id: 1,
            prop1: "a",
            prop2: "x",
            prop3: "alpha",
        });
        objs.push({
            id: 2,
            prop1: "b",
            prop2: "y",
            prop3: "alpha",
        });
        objs.push({
            id: 3,
            prop1: "b",
            prop2: "y",
            prop3: "alpha"
        });
        it("one-level tree", sinon.test(function(done) {
            var result = ArrayHelper.treeify(objs, ['prop1']);
            expect(result.a[0]).to.be.deep.equal(objs[0]);
            expect(result.b[0]).to.be.deep.equal(objs[1]);
            expect(result.b[1]).to.be.deep.equal(objs[2]);
            done();
        }));

        it("another one-level tree", sinon.test(function(done) {
            var result = ArrayHelper.treeify(objs, ['prop3']);
            expect(result.alpha[0]).to.be.deep.equal(objs[0]);
            expect(result.alpha[1]).to.be.deep.equal(objs[1]);
            expect(result.alpha[2]).to.be.deep.equal(objs[2]);
            done();
        }));

        it("two-level tree", sinon.test(function(done) {
            var result = ArrayHelper.treeify(objs, ['prop1', 'prop2']);
            expect(result.a.x[0]).to.be.deep.equal(objs[0]);
            expect(result.b.y[0]).to.be.deep.equal(objs[1]);
            expect(result.b.y[1]).to.be.deep.equal(objs[2]);
            done();
        }));
    });

    describe("containsAll", function() {
        it("one needle in haystack ", sinon.test(function(done) {
            expect(ArrayHelper.containsAll([1], [1])).to.equal(true);
            expect(ArrayHelper.containsAll([1], [1,2,3])).to.equal(true);
            expect(ArrayHelper.containsAll([1], [5,1,2,3])).to.equal(true);
            expect(ArrayHelper.containsAll([1], [])).to.equal(false);
            expect(ArrayHelper.containsAll([1], [2,3,4])).to.equal(false);
            expect(ArrayHelper.containsAll(['alpha'], ['omega'])).to.equal(false);
            expect(ArrayHelper.containsAll(['peter'], ['paul','and','mary'])).to.equal(false);
            expect(ArrayHelper.containsAll(['peter'], ['peter', 'paul','and','mary'])).to.equal(true);

            done();
        }));
        it("two needles in haystack ", sinon.test(function(done) {
            expect(ArrayHelper.containsAll([1,2], [1,2,3,4,5])).to.equal(true);
            expect(ArrayHelper.containsAll([2,1], [1,2,3,4,5])).to.equal(true);
            expect(ArrayHelper.containsAll([2,1], [10,11,1,2,3,4,5])).to.equal(true);
            expect(ArrayHelper.containsAll([2,1], [])).to.equal(false);
            expect(ArrayHelper.containsAll([2,1], ['alpha'])).to.equal(false);
            done();
        }));

    });
    describe("gets unique column ids", function() {
        it("from jobs from different jobgroups", sinon.test(function(done) {
            jobs = [
                {jobgroup_id: 1},
                {jobgroup_id: 2},
                {jobgroup_id: 3},
            ];

            ids = ArrayHelper.getColumnUnique(jobs, "jobgroup_id", {type: "int"});
            expect(ids).to.be.array();
            expect(ids).to.be.ofSize(3);
            for (var i = 0; i< 3; ++i ) {
                expect(ids[i]).to.be.equal(i+1);
            }
            done();
        }));

        it("from jobs from the same jobgroup", sinon.test(function(done) {
            jobs = [
                {jobgroup_id: 1},
                {jobgroup_id: 1},
                {jobgroup_id: 1},
            ];

            ids = ArrayHelper.getColumnUnique(jobs, "jobgroup_id", {type: "int"});
            expect(ids).to.be.array();
            expect(ids).to.be.ofSize(1);
            expect(ids[0]).to.be.equal(1);
            done();
        }));

        it("from jobs from the same and different jobgroup", sinon.test(function(done) {
            jobs = [
                {jobgroup_id: 2},
                {jobgroup_id: 2},
                {jobgroup_id: 1},
                {jobgroup_id: 1},
                {jobgroup_id: 3},

            ];

            ids = ArrayHelper.getColumnUnique(jobs, "jobgroup_id", {type: "int"});
            expect(ids).to.be.array();
            expect(ids).to.be.ofSize(3);
            for (var i = 0; i< 3; ++i ) {
                expect(ids[i]).to.be.equal(i+1);
            }
            done();
        }));

        it("from an object with null and bool values", sinon.test(function(done) {
            var objects = [
                {mixed: true},
                {mixed: false},
                {mixed: null},
            ];

            vals = ArrayHelper.getColumnUnique(objects, "mixed", {});
            expect(vals).to.be.array();
            expect(vals).to.be.ofSize(3);
            for (var i = 0; i< 3; ++i ) {
                expect(vals[i]).to.be.equal(String(objects[i].mixed));
            }
            done();
        }));

    });

    describe("getColumnList", function() {
        var objects = [
            { val: "e" },
            { val: "a" },
            { val: "b" },
            { val: "c" },
            { val: "d" },
        ];
        var expectNoLimit = "e, a, b, c, d";
        var expectSorted = "a, b, c, d, e";
        it("no options ", sinon.test(function(done) {
            expect(ArrayHelper.getColumnList(objects, "val")).to.equal(expectNoLimit);
            done();
        }));
        it("sort ", sinon.test(function(done) {
            expect(ArrayHelper.getColumnList(objects, "val", {sort: true})).to.equal(expectSorted);
            done();
        }));

        it("limit that is not hit", sinon.test(function(done) {
            expect(ArrayHelper.getColumnList(objects, "val", {limit: 10})).to.equal(expectNoLimit);
            done();
        }));
        it("limit that is hit", sinon.test(function(done) {
            expect(ArrayHelper.getColumnList(objects, "val", {limit: 2})).to.equal(5);
            expect(typeof ArrayHelper.getColumnList(objects, "val", {limit: 2})).to.equal("number");
            done();
        }));


    });

    describe("findByComparison", function() {
        var objects = {
            key0: 1.5,
            key1: 1,
            key2: 2,
            key3: 3,
            key4: 2.5,
        };
        it("find max element ", sinon.test(function(done) {
            var func = function(a,b) {
                return a > b
            };
            expect(ArrayHelper.findByComparison(objects, func)).to.equal("key3");
            done();
        }));
        it("find min element ", sinon.test(function(done) {
            var func = function(a,b) {
                return a < b
            };
            expect(ArrayHelper.findByComparison(objects, func)).to.equal("key1");
            done();
        }));
        it("use min string as comparator ", sinon.test(function(done) {
            expect(ArrayHelper.findByComparison(objects, "min")).to.equal("key1");
            done();
        }));
        it("use max string as comparator ", sinon.test(function(done) {
            expect(ArrayHelper.findByComparison(objects, "max")).to.equal("key3");
            done();
        }));


    });
});
