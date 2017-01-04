/**
 * Created by bzfvierh on 31.12.16.
 */
const chai = require('chai');
const assertArrays = require('chai-arrays');
chai.use(assertArrays);

var expect  = require("chai").expect;
var Store = require('openrecord/lib/store');
//var store = new Store();
var debug       = require('debug')('nxhero');
var sinon = require('sinon');

require("./__shared");
var binary = require('../models/binary')
var SharedHooks = require('./shared_hooks');




describe("Binary ", function() {
    var store;
    var testPath = "/path/to/problem";
    var job = {
        problem: {
            absolutePath: testPath
        }
    };

    before(function(done) {
        SharedHooks.createFakeStore(function (newStore) {
            store = newStore;
            done();
        });
    });

    before(function(done) {

        done();
    });

    describe("string replacements", function() {
        it("path placeholder {problem.path}", sinon.test(function(done) {
            var Binary = store.Model("Binary");
            var binary = new Binary;
            binary.args = ['{problem.path}'];
            var args = binary.getArgs(job, {});
            expect(args).to.be.array();
            expect(args).to.be.ofSize(1);
            expect(args[0]).to.equal(testPath);
            done();
        }));

        it("param placeholder {exampleParam.value}", sinon.test(function(done) {
            var Binary = store.Model("Binary");
            var binary = new Binary;
            binary.args = ['{exampleParam.value}'];
            paramValues = [
                {
                    parameter: {name: "exampleParam"},
                    value: "exampleValue"
                }
            ];
            var args = binary.getArgs(job, paramValues);
            expect(args).to.be.array();
            expect(args).to.be.ofSize(1);
            expect(args[0]).to.equal(paramValues[0].value);
            done();
        }));

        it("param and path placeholders", sinon.test(function(done) {
            var Binary = store.Model("Binary");
            var binary = new Binary;
            binary.args = ['-f {problem.path}', 'some or other {exampleParam.value}'];
            paramValues = [
                {
                    parameter: {name: "exampleParam"},
                    value: "exampleValue"
                }
            ];
            var args = binary.getArgs(job, paramValues);
            expect(args).to.be.array();
            expect(args).to.be.ofSize(2);
            expect(args[0]).to.equal("-f " + testPath);
            expect(args[1]).to.equal("some or other " + paramValues[0].value);
            done();
        }));
    });
});