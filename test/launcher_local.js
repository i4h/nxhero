/**
 * Created by bzfvierh on 31.12.16.
 */

var expect  = require("chai").expect;
var Store = require('openrecord/lib/store');
var store = new Store();
var debug       = require('debug')('nxhero');
var sinon = require('sinon');
var sinonTest = require('sinon-test');
sinon.test = sinonTest.configureTest(sinon);
sinon.testCase = sinonTest.configureTestCase(sinon);

require("./__shared");



describe("'Local launcher", function() {
    var job = {

    }
    describe("launch job", function() {
        it("successfully launch a job", sinon.test(function(done) {


            done();

        }));
    });
});

