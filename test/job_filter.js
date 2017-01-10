const chai = require('chai');
const assertArrays = require('chai-arrays');
chai.use(assertArrays);
var expect  = require("chai").expect;
var sinon = require('sinon');
var debug       = require('debug')('nxhero');
var extend = require("extend");

require("./__shared");

JobFilter = require('../lib/job_filter');

describe("job_filter module", function() {

    describe("makeWhereClause", function() {
        it("make a normal where clause", sinon.test(function (done) {
            var clause = JobFilter.makeWhereClause("id", 1, null);
            expect(clause).to.be.an.object;
            expect(clause.id).to.be.equal(1);
            done();
        }));

        it("make a related where clause", sinon.test(function (done) {
            var clause = JobFilter.makeWhereClause("problem.id", 1, null);
            expect(clause).to.be.an.object;
            expect(clause.problem).to.be.an.object;
            expect(clause.problem.id).to.be.equal(1);
            done();
        }));

        it("make a related where like clause", sinon.test(function (done) {
            var clause = JobFilter.makeWhereClause("problem.id", 1, "like");
            expect(clause).to.be.an.object;
            expect(clause.problem).to.be.an.object;
            expect(clause.problem.id_like).to.be.equal(1);
            done();
        }));
    });

        var data = {
            jobgroups: [
                {id: 1, name: "Group 1"},
                {id: 2, name: "Group 2"},
                {id: 5, name: "Group 3"},
                {id: 8, name: "Group 4"},
                {id: 12, name: "Group 5"},
                {id: 20, name: "Group 6"},

            ],
            jobs: [
                {id: 101, name: "Job 1"},
                {id: 102, name: "Job 2"},
                {id: 105, name: "Job 3"},
                {id: 108, name: "Job 4"},
                {id: 112, name: "Job 5"},
                {id: 120, name: "Job 6"},
            ],
            parameters: {
                parameters: [{id: 1, name: "param1"},{id: 2, name: "param2"}],
                valuesByName: {param1: ['value1', 'value2'], param2: ['value3', 'value4']},
                parametersById: {1 : {id: 1, name: "param1"}, 2: {id: 2, name: "param2"}},
                idsByName : {param1: 1, param2: 2},
                namesById : {1: "param1", 2: "param2"}
            }
        };
    for (var i = 0; i < data.jobgroups.length; ++i) {
        data.jobgroups[i].definition = {model_name: "Jobgroup"};
        data.jobgroups[i].models_name = "Jobgroups";
    }
    for (var i = 0; i < data.jobs.length; ++i) {
        data.jobs[i].definition = {model_name : "Job"};
        data.jobs[i].models_name = "Jobs";
    }

    describe("handle parameter filter Update", function() {
        it("adds a single parameter filter", sinon.test(function (done) {
            var userInput = [ 'p', { paramId: 1, values: [ '0', '1', '3' ] } ];
            var userInputSaved = userInput.slice();
            var filters = {};

            JobFilter.updateFilters(filters, userInput, data);
            debug(filters);

            expect(filters.parameters).to.be.an.object;
            expect(filters.parameters["1"]).to.be.an.object;
            expect(filters.parameters["1"].name).to.be.equal("param1");
            expect(filters.parameters["1"].values).to.deep.equal(userInputSaved[1].values);
            done();

        }));

        it("overwrites a parameter filter", sinon.test(function (done) {
            /* Create filter */
            var userInput = [ 'p', { paramId: 1, values: [ '0', '1', '3' ] } ];
            var userInputSaved = userInput.slice();
            var filters = {};
            JobFilter.updateFilters(filters, userInput, data);
            expect(filters.parameters).to.be.an.object;
            expect(filters.parameters["1"]).to.be.an.object;
            expect(filters.parameters["1"].name).to.be.equal("param1");
            expect(filters.parameters["1"].values).to.deep.equal(userInputSaved[1].values);

            /* Overwrite filter */
            var userInput = [ 'p', { paramId: 1, values: [ 'alpha', 'beta', 'gamma'] } ];
            var userInputSaved = userInput.slice();
            var filters = {};
            JobFilter.updateFilters(filters, userInput, data);
            expect(filters.parameters).to.be.an.object;
            expect(filters.parameters["1"]).to.be.an.object;
            expect(filters.parameters["1"].name).to.be.equal("param1");
            expect(filters.parameters["1"].values).to.deep.equal(userInputSaved[1].values);
            done();
        }));

        it("adds two parameter filters", sinon.test(function (done) {
            var filters = {};
            var userInputSaved = [];

            var userInput = [ 'p', { paramId: 1, values: [ '0', '1', '3' ] } ];
            userInputSaved.push(userInput.slice());
            JobFilter.updateFilters(filters, userInput, data);

            userInput = [ 'p', { paramId: 2, values: [ 'a','b' ] } ];
            userInputSaved.push(userInput.slice());
            JobFilter.updateFilters(filters, userInput, data);

            for (var i = 0; i < 2; ++i) {
                debug(i);
                expect(filters.parameters).to.be.an.object;
                expect(filters.parameters[i+1]).to.be.an.object;
                expect(i+1).to.be.equal(userInputSaved[i][1].paramId);
                expect(filters.parameters[i+1].name).to.be.equal(data.parameters.parametersById[userInputSaved[i][1].paramId].name );
                expect(filters.parameters[i+1].values).to.deep.equal(userInputSaved[i][1].values);
            }

            done();

        }));
    });

    describe("updateFilters", function() {
        it("add selection filter to empty filter", sinon.test(function(done) {
            var filters = {};
            var userInput = ['g', 's', [1,5,20]];
            JobFilter.updateFilters(filters, userInput, data);

            expect(filters.jobgroups).is.an.object;
            ids = userInput[1];
            for (var i =0; i < ids.length; ++i) {
                var id = ids[i];
                for (var j = 0; j < data.jobgroups.length; ++j) {
                    jobgroup = data.jobgroups[i];
                    if (jobgroup.id === id) {
                        /* This jobgroup should be filtered */
                        expect(filters.jobgroups.selection[id]).to.equal(jobgroup.name);
                    }}
            }
            done();
        }));

        it("add name filter to empty filter", sinon.test(function(done) {
            var filters = {};
            var userInput = ['g', 'n', "searchstring"];

            JobFilter.updateFilters(filters, userInput, data);

            expect(filters.jobgroups).is.an.object;
            expect(filters.jobgroups.name).to.be.equal('searchstring');
            done();
        }));

        it("add id filter and name filter to empty filter", sinon.test(function(done) {
            var filters = {};
            var userInput = ['g', 's', [1,5,20]];
            JobFilter.updateFilters(filters, userInput, data);
            ids = userInput[1];
            userInput = ['g', 'n', "searchstring"];
            JobFilter.updateFilters(filters, userInput, data);


            expect(filters.jobgroups).is.an.object;
            for (var i =0; i < ids.length; ++i) {
                var id = ids[i];
                for (var j = 0; j < data.jobgroups.length; ++j) {
                    jobgroup = data.jobgroups[i];
                    if (jobgroup.id === id) {
                        /* This jobgroup should be filtered */
                        expect(filters.jobgroups.selection[id]).to.equal(jobgroup.name);
                    }}
            }
            expect(filters.jobgroups.name).to.be.equal('searchstring');

            done();
        }));

        it("add direct success filter to empty filter", sinon.test(function(done) {
            var filters = {};
            var userInput = ['c', 's', [null, true]];
            JobFilter.updateFilters(filters, userInput, data);
            expect(filters.successes).to.be.an.object;
            expect(filters.successes.selection).to.be.an.array();
            expect(filters.successes.selection[0]).to.be.equal(null);
            expect(filters.successes.selection[1]).to.be.equal(true);
            done();
        }));

        it("merge two direct success selection filters", sinon.test(function(done) {
            var filters = {};
            var userInput = ['c', 's', [null, true]];
            JobFilter.updateFilters(filters, userInput, data);
            userInput = ['c', 's', [false, true]];
            expect(filters.successes).to.be.an.object;
            JobFilter.updateFilters(filters, userInput, data);

            expect(filters.successes.selection).to.be.an.array();
            expect(filters.successes.selection[0]).to.be.equal(null);
            expect(filters.successes.selection[1]).to.be.equal(true);
            expect(filters.successes.selection[2]).to.be.equal(false);
            done();
        }));

    });


    describe("elementFilterToString", function() {
        it("jobgroup selection filter for one group to string", sinon.test(function (done) {
            var filters = {};
            var userInput = ['g', 's', [1]];
            JobFilter.updateFilters(filters, userInput, data);
            ids = userInput[1];
            var string = JobFilter.elementFilterToString(filters, "jobgroups");

            expect(string).to.match(/Group 1/);
            expect(string).to.match(/jobgroups/i);
            expect(string).to.match(/Selected/i);
            done();


        }));
        it("jobgroup selection filter for two groups to string", sinon.test(function (done) {
            var filters = {};
            var userInput = ['g', 's', [1, 8]];
            JobFilter.updateFilters(filters, userInput, data);
            ids = userInput[1];
            var string = JobFilter.elementFilterToString(filters, "jobgroups");

            expect(string).to.match(/Group 1, Group 4/);
            expect(string).to.match(/jobgroups/i);
            expect(string).to.match(/Selected/i);
            done();


        }));
    });
    describe("filtersToString", function() {
        it("jobgroup and job selection filters  to string", sinon.test(function(done) {
            var filters = {};
            var userInput = ['g', 's', [1, 8]];
            JobFilter.updateFilters(filters, userInput, data);
            userInput = ['j', 's', [101, 108]];
            JobFilter.updateFilters(filters, userInput, data);

            var string = JobFilter.filtersToString(filters);

            expect(string).to.match(/Group 1, Group 4/);
            expect(string).to.match(/jobgroups/i);
            expect(string).to.match(/Selected/i);
            done();
        }));

        it("jobgroup and job selection and name filters  to string", sinon.test(function(done) {
            var filters = {};
            var userInput = ['g', 's', [1, 8]];
            JobFilter.updateFilters(filters, userInput, data);
            userInput = ['j', 's', [101, 108]];
            JobFilter.updateFilters(filters, userInput, data);
            userInput = ['g', 'n', 'groupsearch'];
            JobFilter.updateFilters(filters, userInput, data);
            userInput = ['j', 'n', 'jobsearch'];
            JobFilter.updateFilters(filters, userInput, data);

            var string = JobFilter.filtersToString(filters);

            expect(string).to.match(/Group 1, Group 4/);
            expect(string).to.match(/jobgroups/i);
            expect(string).to.match(/Selected/i);
            expect(string).to.match(/Name filter for jobgroups/i);
            expect(string).to.match(/groupsearch/i);
            expect(string).to.match(/Name filter for jobs/i);
            expect(string).to.match(/jobsearch/i);


            done();
        }));

        it("success filter to string", sinon.test(function(done) {
            var filters = {};
            var userInput = ['c', 's', ['true']];
            JobFilter.updateFilters(filters, userInput, data);
            var string = JobFilter.filtersToString(filters);

            expect(string).to.match(/Selected/i);
            expect(string).to.match(/successes/);
            expect(string).to.match(/true/i);
            done();
        }));

        it("success and status filter to string", sinon.test(function(done) {
            var filters = {};
            var userInput = ['c', 's', ['true']];
            JobFilter.updateFilters(filters, userInput, data);
            userInput = ['s', 's', ['pending', 'submitted']];
            JobFilter.updateFilters(filters, userInput, data);
            var string = JobFilter.filtersToString(filters);

            expect(string).to.match(/Selected/i);
            expect(string).to.match(/successes/);
            expect(string).to.match(/true/i);
            expect(string).to.match(/Selected/i);
            expect(string).to.match(/execution_statuses/);
            expect(string).to.match(/pending, submitted/i);

            done();
        }));

    });




});

