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
var ParamModels = require('../parameters/module.js');
var BaseParameter = require('../lib/base_parameter.js');
const path = require('path');
var modelInsert = require('../lib/model_insert');
var db = require('../lib/db');
var StorageMenus = require('../lib/storage_menus');



var store;

 describe("Model insert for different cases", function() {
     beforeEach('connect and empty db', function(done) {
         db.open(
             {
                 type: "sqlite3",
                 file: "test/nxhero.test.sqlite",
             }
             , function(err, newStore) {
                 store = newStore;
                 db.clean(store, {}, function () {
                     done();
                 });
             }
         );
     });

     var checkInsert = function(attribs, expectedAttribs, model, done) {
         modelInsert(store, model, attribs, function(err, object) {
             expect(err).to.equal(null);
             for (i in  expectedAttribs) {
                 expect(object[i]).to.equal(expectedAttribs[i]);
             }
             done();
         });
     }

     describe("Model insert for binary", function() {
         it("Inserts a binary model", sinon.test(function(done) {
             var attribs =  { type: 'default', name: 'asdf', path: 'a', argsUserString: 'a;b' };
             var expectedAttribs =  { type: 'default', name: 'asdf', path: 'a', args_string: '["a","b"]' };
             checkInsert(attribs, expectedAttribs, "Binary", done);
         }));

         it("Checks trim of arguments ", sinon.test(function(done) {
             var attribs =  { type: 'default', name: 'asdf', path: 'a', argsUserString: 'a;  b  ' };
             var expectedAttribs =  { type: 'default', name: 'asdf', path: 'a', args_string: '["a","b"]' };
             checkInsert(attribs, expectedAttribs, "Binary", done);
         }));

     });
 });

