const chai = require('chai');
const assertArrays = require('chai-arrays');
chai.use(assertArrays);
var expect  = require("chai").expect;
var Store = require('openrecord/lib/store');
var store = new Store();
var debug       = require('debug')('nxhero');
var sinon = require('sinon');
var async = require('async');
var fs = require('fs-extra')
var nconf       = require('nconf');
const child_process = require('child_process');


require("./__shared");
var date = require('../lib/date');


describe("Test of date module", function() {
    describe("current date", function() {
        it("current date in sandbox is unix time 0", sinon.test(function(done) {
            expect(date.dbDatetime()).to.be.equal("1970-01-01 01:00:00");
            done();
        }));
    });
});

