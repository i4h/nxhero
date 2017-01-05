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

require("./__shared");
var ArrayHelper = require('../lib/array_helper');


describe("Array Helper ", function() {
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
    });
});
