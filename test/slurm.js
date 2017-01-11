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
var slurm = require('../launchers/slurm');



describe("Test of slurm launcher", function() {
    describe("checkStatus", function() {
        it("identify a slurm terminated message", sinon.test(function(done) {
            job = {
                status: "running"
            };
            message = "srun: error: host-axfg1234: task 5: Terminated";
            slurm.checkStatus(job, message);
            expect(job.status).to.be.equal("terminated_slurm");
            done();
        }));
        it("identify another slurm terminated message", sinon.test(function(done) {
            job = {
                status: "running"
            };
            message = "srun: error: host.at.place: task 500: Terminated";
            slurm.checkStatus(job, message);
            expect(job.status).to.be.equal("terminated_slurm");
            done();
        }));
        it("identify a slurm terminated message in a longer string", sinon.test(function(done) {
            job = {
                status: "running"
            };
            message = "a\nb\nc\nd\nsrun: error: host-axfg1234: task 5: Terminated";
            slurm.checkStatus(job, message);
            expect(job.status).to.be.equal("terminated_slurm");
            done();
        }));
        it("dont identify a slurm terminated message in a string", sinon.test(function(done) {
            job = {
                status: "running"
            };
            message = "a\nb\nc\nd\n";
            slurm.checkStatus(job, message);
            expect(job.status).to.be.equal("running");
            done();
        }));
    });
    describe("parseSbatchResonse", function() {
        it("parse expected response", sinon.test(function(done) {
            var response = "Submitted batch job 28";
            expect(slurm.parseSbatchResponse(response)).to.be.deep.equal({
                job_id: 28
            });
            done();

        }));
        it("catch error from unknown response", sinon.test(function(done) {
            var response = "Something went wrong";
            var localErr = null;
            try {
                slurm.parseSbatchResponse(response);
            } catch(err) {
                localErr = err
            }
            expect(localErr).to.be.an('error');
            expect(localErr.message).to.match(/Unable to parse sbatch output/);
            expect(localErr.message).to.match(/Something went wrong/);
            done();

        }));
    });

});

