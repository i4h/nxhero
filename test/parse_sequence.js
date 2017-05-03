const chai = require('chai');
const assertArrays = require('chai-arrays');
chai.use(assertArrays);
var expect  = require("chai").expect;
var debug       = require('debug')('nxhero');
var sinon = require('sinon');
var sinonTest = require('sinon-test');
sinon.test = sinonTest.configureTest(sinon);
sinon.testCase = sinonTest.configureTestCase(sinon);
const child_process = require('child_process');

require("./__shared");
var parseSequence = require('../lib/parse_sequence');


describe("Test of parse_sequence module", function() {
    describe("single ", function() {
        it("non-number", sinon.test(function(done) {
            try {
                let res = parseSequence("funk");
                expect("this line").to.be.equal("unreachable");
            } catch(err) {
                expect(err.message).to.match(/Not a number/);
            }
            done();
        }));
        it("integer value", sinon.test(function(done) {
            expect(parseSequence(1)).to.be.deep.equal([1]);
            expect(parseSequence("1")).to.be.deep.equal([1]);
            done();
        }));
        it("float value", sinon.test(function(done) {
            expect(parseSequence(0.5)).to.be.deep.equal([0.5]);
            expect(parseSequence("0.5")).to.be.deep.equal([0.5]);
            done();
        }));
    });
    describe("sequences", function() {
        it("with integer values", sinon.test(function(done) {
            expect(parseSequence("0:4")).to.be.deep.equal([0,1,2,3,4]);
            expect(parseSequence("0:2:4")).to.be.deep.equal([0,2,4]);
            expect(parseSequence("0:3:4")).to.be.deep.equal([0,3]);
            done();
        }));
        it("with float values", sinon.test(function(done) {
            expect(parseSequence("0.5:2.5")).to.be.deep.equal([0.5,1.5,2.5]);
            expect(parseSequence("0:0.11:0.45")).to.be.deep.equal([0, 0.11, 0.22, 0.33, 0.44]);
            done();
        }));
    });
});

