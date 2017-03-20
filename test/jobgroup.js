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
var sinonTest = require('sinon-test');
sinon.test = sinonTest.configureTest(sinon);
sinon.testCase = sinonTest.configureTestCase(sinon);

var async = require('async');
var fs = require('fs-extra')
var nconf       = require('nconf');
const child_process = require('child_process');

require("./__shared");

var ParamModels = require('../parameters/module.js');
var BaseParameter = require('../lib/base_parameter.js');
const path = require('path');
var modelInsert = require('../lib/model_insert');
var db = require('../lib/db');
var StorageMenus = require('../lib/storage_menus');
var SharedStubs = require('./shared_stubs');
var date = require('../lib/date');
var log = require("../lib/log");


var store;
var jobgroup;
var parameters = [];
var binary;
var problems = [];

var mkdirsStub = function(path, callback) {
    parts = path.split("_");

    expect(path).to.be.oneOf(
        [
            '/path/to/rootdir/group_001',
            '/path/to/rootdir/group_001/job_001'
        ]);
    callback(null);
};

 describe("Jobgroup::launch and related methods", function() {

     var expectOneOneSuccess = function(err, jobs) {
         expect(err).to.be.equal(null);

         expect(jobs).to.be.array();
         expect(jobs).to.be.ofSize(1);
         expect(jobs[0].submitted).to.be.not.equal(null);
         expect(jobs[0].problem_id).to.be.equal(1);
         expect(jobs[0].execution_status).to.be.equal("submitted");
         expect(jobs[0].full_command).to.be.equal('/path/to/testbin "constarg" "1" "-f" "/path/to/testprob"');

         expect(JSON.parse(jobs[0].launcher_data).pid).to.be.equal("12345");

         expect(jobs[0].parameter_value_int).to.be.array();
         expect(jobs[0].parameter_value_int).to.be.ofSize(1);
         expect(jobs[0].parameter_value_int[0].value).to.be.equal(1);
         expect(jobs[0].parameter_value_int[0].job_id).to.be.a("number");
         expect(jobs[0].parameter_value_int[0].parameter_id).to.be.equal(1);
     };

     var expectTwoOneSuccess = function(err, jobs) {
         expect(err).to.be.equal(null);

         expect(jobs).to.be.array();
         expect(jobs).to.be.ofSize(2);
         expect(jobs[0].problem_id).to.be.equal(1);
         expect(jobs[0].full_command).to.be.equal('/path/to/testbin "constarg" "1" "-f" "/path/to/testprob"');
         expect(jobs[1].problem_id).to.be.equal(2);
         expect(jobs[1].full_command).to.be.equal('/path/to/testbin "constarg" "1" "-f" "/path/to/second/testprob"');

         for (var i = 0; i < 2; i++)
         {
             expect(jobs[0].submitted).to.be.not.equal(null);
             expect(jobs[0].execution_status).to.be.equal("submitted");
             expect(jobs[i].parameter_value_int).to.be.array();
             expect(jobs[i].parameter_value_int).to.be.ofSize(1);
             expect(jobs[i].parameter_value_int[0].value).to.be.equal(1);
             expect(jobs[i].parameter_value_int[0].job_id).to.be.a("number");
             expect(jobs[i].parameter_value_int[0].parameter_id).to.be.equal(1);
             expect(JSON.parse(jobs[i].launcher_data).pid).to.be.equal("12345");
         }
     };

     var expectOneTwoSuccess = function(err, jobs) {
         expect(err).to.be.equal(null);

         expect(jobs).to.be.array();
         expect(jobs).to.be.ofSize(2);
         for (var i = 0; i < 2; i++) {
             expect(jobs[i].problem_id).to.be.equal(1);
             expect(jobs[i].full_command).to.be.equal('/path/to/testbin "constarg" "1" "-f" "/path/to/testprob"');
             expect(jobs[0].submitted).to.be.not.equal(null);
             expect(jobs[0].execution_status).to.be.equal("submitted");
             expect(JSON.parse(jobs[i].launcher_data).pid).to.be.equal("12345");
             expect(jobs[i].parameter_value_int).to.be.array();
             expect(jobs[i].parameter_value_int).to.be.ofSize(1);
             expect(jobs[i].parameter_value_string).to.be.array();
             expect(jobs[i].parameter_value_string).to.be.ofSize(1);
             expect(jobs[i].parameter_value_int[0].value).to.be.equal(1);
             expect(jobs[i].parameter_value_int[0].job_id).to.be.a("number");
             expect(jobs[i].parameter_value_int[0].parameter_id).to.be.equal(1);
             expect(jobs[i].parameter_value_string[0].job_id).to.be.a("number");
             expect(jobs[i].parameter_value_string[0].parameter_id).to.be.equal(2);
         }
         expect(jobs[0].parameter_value_string[0].value).to.be.equal("alpha");
         expect(jobs[0].parameter_value_string[0].job_id).to.be.a("number");
         expect(jobs[0].parameter_value_string[0].parameter_id).to.be.equal(2);
         expect(jobs[1].parameter_value_string[0].value).to.be.equal("omega");
     };


     /* We need a real db since we also test queries */
     before('connect and empty db', function(done) {
         this.timeout(3000);

         fs.unlink(__dirname + "/nxhero.test.sqlite", function (err) {

             /* ENOENT is fine, there may be no database */
             if (err !== null && err.code !== "ENOENT")
                 throw err;

             db.open(
                 {
                     type: "sqlite3",
                     file: "/test/nxhero.test.sqlite",
                 }
                 , function (err, newStore) {
                     store = newStore;

                     var Jobgroup = store.Model("Jobgroup");
                     jobgroup = new Jobgroup();

                     //db.clean(store, {}, function () {
                     async.parallel([
                         /* Create Jobgroup */
                         function (callback) {
                             return modelInsert(store, "Jobgroup",
                                 {
                                     binary_id: 1,
                                     problem_ids: [1],
                                     parameter_values: JSON.stringify({
                                         paramvals_1: [1]
                                     }),
                                     name: 'demo',
                                     launcher: "local",
                                     wd: '/path/to/rootdir/group_001'
                                 },
                                 callback
                             );
                         },
                         /* Create Problem */
                         function (callback) {
                             return modelInsert(store, "Problem",
                                 {
                                     name: "testprob",
                                     path: "/path/to/testprob"
                                 },
                                 callback
                             );
                         },
                         /* Create Binary */
                         function (callback) {
                             return modelInsert(store, "Binary",
                                 {
                                     name: "testbin",
                                     path: "/path/to/testbin",
                                     argsUserString: "constarg; {testparam.value}; -f; {problem.path}",
                                     type: "default",
                                 },
                                 callback
                             );
                         },
                         /* Create Parameter */
                         function (callback) {
                             return modelInsert(store, "Parameter",
                                 {
                                     binary_id: 1,
                                     name: "testparam",
                                     model: "default",
                                     type: BaseParameter.typeInteger,
                                     default_value: 1,
                                 },
                                 callback
                             );
                         },
                         /* Create Another Parameter */
                         function (callback) {
                             return modelInsert(store, "Parameter",
                                 {
                                     binary_id: 1,
                                     name: "teststringparam",
                                     model: "default",
                                     type: BaseParameter.typeString,
                                     default_value: "moin!",
                                 },
                                 callback
                             );
                         },
                         /* Create Another Problem */
                         function (callback) {
                             return modelInsert(store, "Problem",
                                 {
                                     name: "secondprob",
                                     path: "/path/to/second/testprob"
                                 },
                                 callback
                             );
                         },

                     ], function (err, results) {
                         jobgroup = results[0];
                         problems.push(results[1]);
                         jobgroup.binary = results[2];
                         parameters.push(results[3]);
                         parameters.push(results[4]);
                         problems.push(results[5]);
                         done();
                     });
                 }
             );
         });
     });

     /*after("Delete the sqlite3 file", function(done) {
         fs.unlink(__dirname + "/nxhero.test.sqlite", function(err) {
             if (err !== null)
                 throw err;
             done();
         });
     });*/

     describe("test prepareLaunch", function() {
         it("get launch data with 1 problem, 1 parameter", sinon.test(function(done) {
             this.stub(nconf, 'get').callsFake(SharedStubs.nconfGet);
             this.stub(path, 'resolve').callsFake(SharedStubs.resolve);
             this.stub(fs, 'mkdirs').callsFake(mkdirsStub);

             jobgroup.prepareLaunch(store, {}, function(err, data) {
                 expect(data.problems).to.be.array();
                 expect(data.problems).to.be.ofSize(1);
                 expect(data.problems[0].name).to.be.equal('testprob');


                 expect(data.parametersById).to.be.an("object");
                 expect(data.parametersById[1].name).to.be.equal('testparam');
                 done();
             });
         }));

         it("get launch data with 2 problems, 1 parameter", sinon.test(function(done) {
             this.stub(nconf, 'get').callsFake(SharedStubs.nconfGet);
             this.stub(path, 'resolve').callsFake(SharedStubs.resolve);
             this.stub(fs, 'mkdirs').callsFake(mkdirsStub);

             jobgroup.problem_ids = '1,2';
             jobgroup.prepareLaunch(store, {}, function(err, data) {
                 expect(data.problems).to.be.array();
                 expect(data.problems).to.be.ofSize(2);
                 expect(data.problems[0].name).to.be.equal('testprob');
                 expect(data.problems[1].name).to.be.equal('secondprob');

                 expect(data.parametersById).to.be.an("object");
                 expect(data.parametersById[1].name).to.be.equal('testparam');

                 jobgroup.problem_ids = [1];
                 done();
             });
         }));

         it("get launch data with 1 problem, 2 parameters", sinon.test(function(done) {
             this.stub(nconf, 'get').callsFake(SharedStubs.nconfGet);
             this.stub(path, 'resolve').callsFake(SharedStubs.resolve);
             this.stub(fs, 'mkdirs').callsFake(mkdirsStub);

             jobgroup.parameter_values = JSON.stringify({
                 paramvals_1: [1],
                 paramvals_2: ['alpha', 'omega']
             });

             jobgroup.prepareLaunch(store, {}, function(err, data) {
                 expect(data.problems).to.be.array();
                 expect(data.problems).to.be.ofSize(1);
                 expect(data.problems[0].name).to.be.equal('testprob');

                 expect(data.parametersById).to.be.an("object");
                 expect(data.parametersById[1].name).to.be.equal('testparam');
                 expect(data.parametersById[2].name).to.be.equal('teststringparam');

                 jobgroup.parameter_values = JSON.stringify({
                     paramvals_1: [1]
                 });
                 done();
             });
         }));
     });

     describe("createAndLaunchJobs", function() {
         it("with 1 problem, 1 parameter", sinon.test(function(done) {
             this.stub(nconf, 'get').callsFake(SharedStubs.nconfGet);
             var resolveStub  = this.stub(path, 'resolve').callsFake(SharedStubs.resolve);
             var mkdirsStub = this.stub(fs, 'mkdirs').callsFake(SharedStubs.mkdirs);
             var openSyncStub = this.stub(fs, 'openSync').callsFake(SharedStubs.openSync);
             var spawnStub = this.stub(child_process, 'spawn').callsFake(SharedStubs.spawn);

             jobgroup.createAndLaunchJobs(store, [problems[0]], {1: parameters[0]}, function(err, jobs) {
                 expectOneOneSuccess(err, jobs);
                 expect(spawnStub.calledOnce).to.be.equal(true);
                 expect(openSyncStub.calledTwice).to.be.equal(true);
                 expect(mkdirsStub.calledOnce).to.be.equal(true);
                 done();
             });
         }));

         it("with 2 problems, 1 parameter", sinon.test(function(done) {
             this.timeout(3000);
             this.stub(nconf, 'get').callsFake(SharedStubs.nconfGet);
             var resolveStub  = this.stub(path, 'resolve').callsFake(SharedStubs.resolve);
             var mkdirsStub = this.stub(fs, 'mkdirs').callsFake(SharedStubs.mkdirs);
             var openSyncStub = this.stub(fs, 'openSync').callsFake(SharedStubs.openSync);
             var spawnStub = this.stub(child_process, 'spawn').callsFake(SharedStubs.spawn);

             jobgroup.createAndLaunchJobs(store, problems, {1: parameters[0]}, function(err, jobs) {
                 expectTwoOneSuccess(err, jobs);
                 expect(spawnStub.calledTwice).to.be.equal(true);
                 expect(openSyncStub.callCount).to.be.equal(4);
                 expect(mkdirsStub.callCount).to.be.equal(2);
                 done();
             });
         }));

         it("with 1 problem, 2 parameters", sinon.test(function(done) {
             this.stub(nconf, 'get').callsFake(SharedStubs.nconfGet);
             var resolveStub  = this.stub(path, 'resolve').callsFake(SharedStubs.resolve);
             var mkdirsStub = this.stub(fs, 'mkdirs').callsFake(SharedStubs.mkdirs);
             var openSyncStub = this.stub(fs, 'openSync').callsFake(SharedStubs.openSync);
             var spawnStub = this.stub(child_process, 'spawn').callsFake(SharedStubs.spawn);

             jobgroup.parameter_values = JSON.stringify({
                 paramvals_1: [1],
                 paramvals_2: ['alpha', 'omega']
             });
             jobgroup.createAndLaunchJobs(store, [problems[0]], {1: parameters[0], 2: parameters[1]}, function(err, jobs) {
                 expectOneTwoSuccess(err, jobs);
                 expect(spawnStub.calledTwice).to.be.equal(true);
                 expect(openSyncStub.callCount).to.be.equal(4);
                 expect(mkdirsStub.callCount).to.be.equal(2);

                 /* Reset */
                 jobgroup.parameter_values = JSON.stringify({
                     paramvals_1: [1]
                 });

                 done();
             });
         }));
     });



     describe("launch", function() {
         it("with 2 problems, 1 parameter", sinon.test(function(done) {
             this.timeout(3000);
             this.stub(nconf, 'get').callsFake(SharedStubs.nconfGet);
             var resolveStub  = this.stub(path, 'resolve').callsFake(SharedStubs.resolve);
             var mkdirsStub = this.stub(fs, 'mkdirs').callsFake(SharedStubs.mkdirs);
             var openSyncStub = this.stub(fs, 'openSync').callsFake(SharedStubs.openSync);
             var spawnStub = this.stub(child_process, 'spawn').callsFake(SharedStubs.spawn);
             jobgroup.problem_ids = [1,2];
             jobgroup.confirmLaunch = false;
             jobgroup.launch(store, {}, function(err, jobs) {
                 try{
                     expectTwoOneSuccess(err, jobs);
                     expect(spawnStub.calledTwice).to.be.equal(true);
                     expect(openSyncStub.callCount).to.be.equal(4);
                     expect(mkdirsStub.callCount).to.be.equal(3);
                     /* Reset */
                     jobgroup.problem_ids = [1];
                     done();

                 } catch(e) {
                     done(e);
                 }
             });
         }));
         it("with 1 problem, 2 parameters", sinon.test(function(done) {
             this.stub(nconf, 'get').callsFake(SharedStubs.nconfGet);
             var resolveStub  = this.stub(path, 'resolve').callsFake(SharedStubs.resolve);
             var mkdirsStub = this.stub(fs, 'mkdirs').callsFake(SharedStubs.mkdirs);
             var openSyncStub = this.stub(fs, 'openSync').callsFake(SharedStubs.openSync);
             var spawnStub = this.stub(child_process, 'spawn').callsFake(SharedStubs.spawn);

             jobgroup.parameter_values = JSON.stringify({
                 paramvals_1: [1],
                 paramvals_2: ['alpha', 'omega']
             });
             jobgroup.save(function(okay) {
                 jobgroup.launch(store, {}, function(err, jobs) {
                     expectOneTwoSuccess(err, jobs);
                     expect(spawnStub.calledTwice).to.be.equal(true);
                     expect(openSyncStub.callCount).to.be.equal(4);
                     expect(mkdirsStub.callCount).to.be.equal(3);

                     /* Reset */
                     jobgroup.parameter_values = JSON.stringify({
                         paramvals_1: [1]
                     });
                     jobgroup.save(function(okay) {
                         done();
                     });
                 });
             });
         }));

     });


 });

