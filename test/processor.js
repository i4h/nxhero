var expect  = require("chai").expect;
var Store = require('openrecord/lib/store');
var store = new Store();
var debug       = require('debug')('nxhero');
var sinon = require('sinon');

require("./__shared");
var SharedHooks = require('./shared_hooks');
var processor = require('../processors/processor');


describe("Test of processor base module", function() {

    var store;

    before(function(done) {
        SharedHooks.createFakeStore(function (newStore) {
            store = newStore;
            store.definitions.job.attribute('processor_data');
            done();
        });
    });

    describe("set and get data", function() {
        it("set data as first processor", sinon.test(function(done) {
            var content = "mydata";
            var Job = store.Model("Job");
            var job = new Job;
            job.processor_data = null;
            processor.setData(job, content);
            data = processor.getData(job);
            expect(data).to.be.equal(content);
            done();
        }));

        it("set data after other processors", sinon.test(function(done) {
            var content = "mydata";
            var Job = store.Model("Job");
            var job = new Job;
            job.processor_data = JSON.stringify({otherProcessor: "somedata"});
            processor.setData(job, content);
            data = processor.getData(job);
            expect(data).to.be.equal(content);
            expect(JSON.parse(job.processor_data).otherProcessor).to.be.equal("somedata");
            done();

        }));
    });
});

