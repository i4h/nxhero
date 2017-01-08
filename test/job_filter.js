const chai = require('chai');
const assertArrays = require('chai-arrays');
chai.use(assertArrays);
var expect  = require("chai").expect;
var sinon = require('sinon');
var debug       = require('debug')('nxhero');

require("./__shared");

JobFilter = require('../lib/job_filter');

describe("Test of jobFilter module", function() {
    describe("jobgroup filters", function() {
        it("add selection filter to empty filter", sinon.test(function(done) {
            data = {
                jobgroups: [
                    {id: 1, name: "Group 1"},
                    {id: 2, name: "Group 2"},
                    {id: 5, name: "Group 3"},
                    {id: 8, name: "Group 4"},
                    {id: 12, name: "Group 5"},
                    {id: 20, name: "Group 6"},

                ]
            };
            for (var i = 0; i < data.jobgroups.length; ++i)
                data.jobgroups[i].model = {definition: {model_name: "Jobgroup"}};
            var filters = {};
            var userInput = ['g', 's', [1,5,20]];

            JobFilter.updateFilters(filters, userInput, data);

            debug(filters);

            expect(filters.jobgroup).is.an.object;
            ids = userInput[1];
            for (var i =0; i < ids.length; ++i) {
                var id = ids[i];
                for (var j = 0; j < data.jobgroups.length; ++j) {
                    jobgroup = data.jobgroups[i];
                    if (jobgroup.id === id) {
                        /* This jobgroup should be filtered */
                        expect(filters.jobgroup.selection[id]).to.equal(jobgroup.name);
                    }}



            }




            done();
        }));
    });
});

