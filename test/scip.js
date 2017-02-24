/**
 * Created by bzfvierh on 31.12.16.
 */

var expect  = require("chai").expect;
var Store = require('openrecord/lib/store');
var scip = require('../binaries/scip');
    scip.printPreflightResults = false;

require("./__shared");


var store = new Store();
var debug       = require('debug')('nxhero');
var sinon = require('sinon');
var path = require('path');
var child_process = require('child_process');
var fs = require('fs');


var files = require('../lib/files');
var Git = require('../lib/git');

function mockScipJobgroup() {
    var binary = {
        path: '~/unresolved/path/to/binary',
    };

    var jobgroup = {
        id: 1,
        wd: "/mock/group/wd",
        binary: binary,
        binary_data: null,
    };
    return jobgroup;
}

describe("SCIP binary module features", function() {

    /* Get the path of the mocked greeting before mocking path.resolve */
    var greetingPath = path.resolve('./test/scip_greeting.txt')
    /* Mock resolveHome */
    var resolveHomeMock = function(path) {
        return(path.replace("~", '/home/user'));
    };

    /* Mock path.resolve */
    var resolveMock = function(path) {
        return path.replace("unresolved","resolved").replace("/binary/..","");
    };

    /* Mock child_process.exec */
    var realExec = child_process.exec;
    var execMock = function(cmd, options, callback) {
        /* Replace running the binary with catting the pre-saved scip welcome */
        cmdParts = cmd.split("|");
        cmdParts[0] = 'cat ' + greetingPath;
        cmd = cmdParts.join("|");
        realExec(cmd, options, callback);
    };

    describe("Parse git hash from scip output using a ~ path", function() {
        it("Gets a the hash of a scip binary", sinon.test(function(done) {
            this.stub(path, 'resolve', resolveMock);
            this.stub(files, 'resolveHome', resolveHomeMock);
            this.stub(child_process, 'exec',execMock);

            /* Run test */
            var jobgroup = mockScipJobgroup();
            scip.getBinaryHashes(jobgroup, function(err, result) {
                expect(err).to.equal(null);

                expect(result.length).to.equal(1);
                expect(result[0]).to.equal("THEhash00");
                done();
            });
        }));
    });

    describe("Test preflight checks of jobgroup", function() {
        it("Run successful preflight for scip binary", sinon.test(function(done) {
            this.stub(path, 'resolve', resolveMock);
            this.stub(files, 'resolveHome', resolveHomeMock);
            this.stub(child_process, 'exec',execMock);
            this.stub(scip, 'getBinaryHashes', function(jobgroup, callback) {
                return callback(null, ["THEhash00"]);
            });
            this.stub(Git, 'hashState', function(repoPath, callback) {
                if (repoPath === "/home/user/resolved/path/to/..")
                    callback(null, {state: "clean", hash: 'THEhash00'});
                else
                    throw Error("git hashstate mock got unexpected input path: " + repoPath);
            });




            /* Run test */
            var jobgroup = mockScipJobgroup();

            jobgroup.save = function(callback) {
                expect(this.id).to.equal(1);
                expect(this.wd).to.equal('/mock/group/wd');
                expect(this.binary_data).to.equal('{"{binary.dir}/..":{"state":"clean","hash":"THEhash00"}}');
                callback(true);
            }
            scip.runPreflightChecks(jobgroup, jobgroup.wd, function(err, result) {
                expect(err).to.equal(null);
                done();
            });
        }));

        it("Run failing preflight for scip binary", sinon.test(function(done) {
            this.stub(path, 'resolve', resolveMock);
            this.stub(files, 'resolveHome', resolveHomeMock);
            this.stub(child_process, 'exec',execMock);
            this.stub(scip, 'getBinaryHashes', function(jobgroup, callback) {
                return callback(null, ["THEhash11"]);
            });
            this.stub(Git, 'hashState', function(repoPath, callback) {
                if (repoPath === "/home/user/resolved/path/to/..")
                    callback(null, {state: "clean", hash: 'THEhash00'});
                else
                    throw Error("git hashstate mock got unexpected input path: " + repoPath);
            });

            /* Run test */
            var jobgroup = mockScipJobgroup();

            scip.runPreflightChecks(jobgroup, jobgroup.wd, function(err, result) {
                expect(err).to.be.an('error');
                expect(err.message).to.match(/SCIP Binary Preflight: Repository check was not successful/);
                done();
            });
        }));
    });
});