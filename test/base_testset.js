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

var BaseTestset = require('../lib/base_testset');




describe("Test base_testset", function() {

    var store = {Model: null};

    var modelStub = function(modelName) {
        var Model = function FakeModel(attributes) {
            this.id = null;
            for (var i in attributes) {
                this[i] = attributes[i];
            }
        };
        Model.findRecord = false;
        Model.where = function(search) {
            if (search.name === "existingTestset") {
                this.findRecord = true;
            }
            return this;
        };
        Model.exec =  function(callback) {
            if (this.findRecord === true)
                return callback([{id: 1, name: "existingTestset"}]);
            else
                return callback([]);
        };
        return Model;
    };

    describe("method findOrNew", function() {
        it("returns new if no testset exists", sinon.test(function(done) {
            /* Testset Model stub */
            this.stub(store, "Model", modelStub);
            BaseTestset.findOrNew(store, "newTestset", {}, function(err, testset) {
                expect(err).is.equal(null);
                expect(testset.id).is.equal(null);
                done();
            });
        }));
        it("returns an existing model", sinon.test(function(done) {
            /* Testset Model stub */
            this.stub(store, "Model", modelStub);
            BaseTestset.findOrNew(store, "existingTestset", {}, function(err, testset) {
                expect(err).is.equal(null);
                expect(testset.id).is.equal(1);
                done();
            });
        }));
    });
});

