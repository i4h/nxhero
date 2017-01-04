/**
 * Created by bzfvierh on 31.12.16.
 */

var expect  = require("chai").expect;
var Store = require('openrecord/lib/store');
var sdscip = require('../binaries/sdscip');
    sdscip.printPreflightResults = false;


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

describe("SD-SCIP binary module features", function() {

    /* Get the path of the mocked greeting before mocking path.resolve */
    var greetingPath = path.resolve('./test/sdscip_greeting.txt');

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
        /* Replace running the binary with catting the pre-saved sdscip welcome */
        cmdParts = cmd.split("|");
        cmdParts[0] = 'cat ' + greetingPath;
        cmd = cmdParts.join("|");
        realExec(cmd, options, callback);
    };

    var getBinaryHashesMock = function(jobgroup, callback) {
        return callback(null, ["THEhash00", "THEhash11"]);
    };

    var hashStateMock = function(repoPath, callback) {
        if (repoPath === "/home/user/resolved/path/to")
            callback(null, {state: "clean", hash: 'THEhash00'});
        else if (repoPath === "/home/user/resolved/path/to/lib/scip")
            callback(null, {state: "clean", hash: 'THEhash11'});
        else {
            var pathParts = repoPath.split("/");
            var repoName = pathParts.slice(-1)[0];
            callback(null, {state: "clean", hash: "a0"+repoName});
        }
    };

    describe("Parse git hash from sdscip output using a ~ path", function() {
        it("Gets a the hash of a sdscip binary", sinon.test(function(done) {
            this.stub(path, 'resolve', resolveMock);
            this.stub(files, 'resolveHome', resolveHomeMock);
            this.stub(child_process, 'exec',execMock);

            /* Run test */
            var jobgroup = mockScipJobgroup();
            sdscip.getBinaryHashes(jobgroup, function(err, result) {
                expect(err).to.equal(null);

                expect(result.length).to.equal(2);
                expect(result[0]).to.equal("THEhash00");
                expect(result[1]).to.equal("THEhash11");
                done();
            });
        }));
    });

    describe("Test preflight checks of jobgroup", function() {
        it("Run successful preflight for sdscip binary", sinon.test(function(done) {
            this.stub(path, 'resolve', resolveMock);
            this.stub(files, 'resolveHome', resolveHomeMock);
            this.stub(child_process, 'exec',execMock);
            this.stub(sdscip, 'getBinaryHashes', getBinaryHashesMock);
            this.stub(Git, 'hashState', hashStateMock);


            /* Run test */
            var jobgroup = mockScipJobgroup();

            jobgroup.save = function(callback) {
                expect(this.id).to.equal(1);
                expect(this.wd).to.equal('/mock/group/wd');
                var bd = JSON.parse(this.binary_data);
                var expectedHashes = ['THEhash00', 'THEhash11', 'a0spline', 'a0libsdo', 'a0simd', 'a0cpplsq'];
                var counter = 0;
                for (var i in bd ) {
                    expect(bd[i].state).to.equal('clean');
                    expect(bd[i].hash).to.equal(expectedHashes[counter]);
                    ++counter;
                }
                callback(true);
            }

            sdscip.prepareJobgroup(jobgroup, jobgroup.wd, function(err, result) {
                expect(err).to.equal(null);
                done();
            });
        }));

        it("Run failing preflight for sdscip binary", sinon.test(function(done) {
            this.stub(path, 'resolve', resolveMock);
            this.stub(files, 'resolveHome', resolveHomeMock);
            this.stub(child_process, 'exec',execMock);
            this.stub(sdscip, 'getBinaryHashes', function(jobgroup, callback) {
                return callback(null, ["THEhash00", "THEhashXX"]);
            });
            this.stub(Git, 'hashState', hashStateMock);

            /* Run test */
            var jobgroup = mockScipJobgroup();

            sdscip.prepareJobgroup(jobgroup, jobgroup.wd, function(err, result) {
                expect(err).to.be.an('error');
                expect(err.message).to.match(/SD-SCIP Binary Preflight: Repository check was not successful/);
                done();
            });
        }));
    });
});