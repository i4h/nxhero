/**
 * Created by bzfvierh on 31.12.16.
 */

var expect  = require("chai").expect;
var Store = require('openrecord/lib/store');
var store = new Store();
var sinon = require('sinon');
var debug       = require('debug')('nxhero');
var fs = require('fs-extra')
var nconf       = require('nconf');
const path      = require('path');
const child_process = require('child_process');


require("./__shared");
var SharedHooks = require('./shared_hooks');
var SharedStubs= require('./shared_stubs');
var Job = require('../models/job');

var store;
var job;
var setSubmitted = "test";


describe("Job", function() {


    before(function(done) {
        setSubmitted = function(data, callback) {
            return callback(null);
        };


        SharedHooks.createFakeStore(function(newStore) {
            store = newStore;

            /* Create a fake job */
            var Job = store.Model("Job");
            Job.definition.attribute('parameter_values');
            var Jobgroup = store.Model("Jobgroup");
            var Binary = store.Model("Binary");

            job = new Job({
                jobgroup: new Jobgroup({
                    binary: new Binary(
                        {
                            type: 'default',
                            args_string : '["test"]',
                            path: '/path/to/binary'
                        }),
                    launcher: "local",
                }),
                parameter_values : '{"1":1}'
            });
            done();
        });
    });

    after(function() {
        delete store;
    });


    describe("launch job with local launcher", function() {
        it("successfully launch a job", sinon.test(function(done) {
            this.stub(nconf, 'get', SharedStubs.nconfGet);
            var resolveStub  = this.stub(path, 'resolve', SharedStubs.resolve);
            var mkdirsStub = this.stub(fs, 'mkdirs', SharedStubs.mkdirs);
            var openSyncStub = this.stub(fs, 'openSync', SharedStubs.openSync);
            var spawnStub = this.stub(child_process, 'spawn', SharedStubs.spawn);
            var setSubmittedStub = this.stub(job, 'setSubmitted', setSubmitted);

            job.launch(store, {}, function(err) {
                expect(err).to.be.equal(null);
                expect(resolveStub.calledOnce).to.be.equal(true);
                expect(mkdirsStub.calledOnce).to.be.equal(true);
                expect(openSyncStub.calledTwice).to.be.equal(true);
                expect(spawnStub.calledOnce).to.be.equal(true);
                expect(spawnStub.calledWith(
                    '/path/to/binary',
                    ['test'],
                    {
                        cwd: '/path/to/rootdir/group_undefined/job_undefined',
                        detached: true,
                        stdio: [ 'ignore', null, null ]
                    })).to.be.equal(true);
                expect(setSubmittedStub.calledOnce).to.be.equal(true);
                done();
            })
        }));
    });
});

