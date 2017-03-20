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

var processor = require('../processors/processor');
var BaseProcessor = require('../lib/base_processor');




describe("Test of static processor methods", function() {


    describe("getApplicableProcessors", function() {
        BaseProcessor.registry = {
            p1: {label: "Binary 1", binaryTypes: ['binary1']}
        };
        it("one of one applicable", sinon.test(function(done) {
            expect(BaseProcessor.getApplicableProcessorLabels(['binary1'])).to.be.deep.equal({p1: "Binary 1"});
            expect(BaseProcessor.getApplicableProcessorLabels(['binary2'])).to.be.deep.equal({});
            done();
        }));
    });
});

