var expect  = require("chai").expect;
var Store = require('openrecord/lib/store');
var store = new Store();
var debug       = require('debug')('nxhero');
var sinon = require('sinon');
var sinonTest = require('sinon-test');
sinon.test = sinonTest.configureTest(sinon);
sinon.testCase = sinonTest.configureTestCase(sinon);

require("./__shared");
var SharedHooks = require('./shared_hooks');
var sampleProcessor = require('../processors/sample_processor');


describe("Test of sample processor", function() {

    var store = null;
    var options = {};

    before(function(done) {
        done();
    });

    describe("function calls", function() {
        it("are all executed", sinon.test(function(done) {
            var beforeSpy = sinon.spy(sampleProcessor, "beforeProcessing");
            var afterSpy = sinon.spy(sampleProcessor, "afterProcessing");
            var oneSpy = sinon.spy(sampleProcessor, "processOne");
            var eachSpy = sinon.spy(sampleProcessor, "processEach");

            var jobgroup = {
                binary: {
                    type: "testbinary"
                }
            };

            jobs = [
                {
                    id: 1,
                    jobgroup: jobgroup
                },
                {
                    id: 2,
                    jobgroup: jobgroup
                }
            ];

            sampleProcessor.process(store, {jobs: jobs}, options, function(err, results) {
                expectedEachResult = [1,2];

                expect(err).to.be.equal(null);
                expect(beforeSpy.calledOnce).to.be.true;
                expect(afterSpy.calledOnce).to.be.true;
                expect(eachSpy.calledOnce).to.be.true;
                expect(oneSpy.calledTwice).to.be.true;

                expect(afterSpy.calledWith(store, jobs, options, expectedEachResult)).to.be.true;
                done();
            });
        }));


    });
});

