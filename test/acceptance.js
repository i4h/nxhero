const chai = require('chai');
const assertArrays = require('chai-arrays');
chai.use(assertArrays);
var inquirer    = require('inquirer');
var expect  = require("chai").expect;
var OpenRecord = require('openrecord');
var Store = require('openrecord/lib/store');
var debug       = require('debug')('nxhero');
var sinon = require('sinon');
var sinonTest = require('sinon-test');
sinon.test = sinonTest.configureTest(sinon);
sinon.testCase = sinonTest.configureTestCase(sinon);
var async = require('async');
var fs = require('fs-extra')
var nconf       = require('nconf');
const child_process = require('child_process');
var db = require('../lib/db');
const path = require('path');

var SharedStubs = require('./shared_stubs');
var BinaryMenus = require('../lib/binary_menus');
var ParameterMenus = require('../lib/parameter_menus');
var JobgroupMenus = require('../lib/jobgroup_menus');
var date = require('../lib/date');
var model_insert = require('../lib/model_insert');


require("./__shared");

var store = new Store();
var promptCount = 0;

describe("Acceptance test", function() {
    describe("starting with empty db", function() {
        var store = new Store();

        /* We need a real db since we also test queries */
        before('connect and empty db', function(done) {
            this.timeout(10000);
            var file = __dirname + "/acceptance_empty.sqlite";
            var dbConf = {
                models: path.resolve(__dirname + "/../models/*.js"),
                migrations:  path.resolve(__dirname + "/../migrations/*"),
                type: "sqlite3",
                file: file
            };

            store = new OpenRecord(dbConf);
            store.verify = function() {return};

            store.ready(function(){

                dbConnected = true;
                    db.clean(store, {}, function () {
                        done();
                    });
                });
        });

        /* Mocks inquirer to create two default binaries with parameters */
        it("creates binaries and parameters", sinon.test(function(done) {
            promptCount = 0;
            this.timeout(30000);
            this.stub(inquirer, 'prompt').callsFake(function(questions) {
                promptCount++;
                var answers = {};
                switch (promptCount) {
                    case 1:
                        answers = {
                            "type":"default",
                            "name":"binaryA",
                            "path":__dirname + "/testbinaries/a.sh",
                            "argsUserString":"{message.value}; {numberA.value}"
                        };
                        break;
                    case 2:
                        answers = {
                            "type":"default",
                            "name":"binaryB",
                            "path":__dirname + "/testbinaries/b.sh",
                            "argsUserString":"{message.value}; {numberB.value}"
                        };
                        break;
                    case 3:
                        answers = {
                            "binary": [questions.choices[0].value],
                            };
                        break;
                    case 4:
                        answers = {
                            "parameter_model":"default",
                            "name":"message",
                            "type":3,
                            "values":"a,b,c",
                            "default_value":"a"
                        };
                        break;
                    case 5:
                        answers = {
                            "parameter_model":"default",
                            "name":"numberA",
                            "type":1,
                            "default_value":1
                        };
                        break;
                    case 6:
                        answers = {
                            "parameter_model":-1,
                        };
                        break;
                    case 7:
                        answers = {
                            "binary": [questions.choices[1].value],
                        };
                        break;

                    case 8:
                        answers = {
                            "parameter_model":"default",
                            "name":"numberB",
                            "type":1,
                            "default_value":2
                        };
                        break;
                    case 9:
                        answers = {
                            "parameter_model":-1,
                        };
                        break;
                    case 10:
                        answers = {
                            "binary": questions.choices[1].value,
                        };
                        break;
                    case 11:
                        answers = {
                            "params": [questions.choices[0].value], //parameter "message"
                        };
                        break;


                }
                return {
                    then: function(callback) {
                        return callback(answers);
                    }
                };
            });

            async.series([
                function(callback) {
                    BinaryMenus.add(store, {}, function(err) {
                        return callback(null);
                    });
                },
                function(callback) {
                    BinaryMenus.add(store, {}, function(err) {
                        return callback(null);
                    });
                },
                function(callback) {
                    ParameterMenus.add(store, {}, function(err) {
                        return callback(null);
                    });
                },
                function(callback) {
                    ParameterMenus.add(store, {}, function(err) {
                        return callback(null);
                    });
                },
                function(callback) {
                    ParameterMenus.attach(store, {}, function(err) {
                        return callback(null);
                    });
                },
            ], function(err) {
                expect(err).to.be.equal(null);
                /* Get binaries with parameters and test stuff */
                var Binary = store.Model("Binary");
                Binary.join({binaries_parameters: "parameter"}).exec(function(records) {
                    for (var i = 0; i < records.length; i++) {
                        var binary = records[i];
                        var params = binary.getParametersFromJoin();
                        expect(params.length).to.be.equal(2);
                        expect(params[0].name).to.be.equal("message")
                        switch (binary.name) {
                            case "binaryA":
                                expect(params[1].name).to.be.equal("numberA")
                                break;
                            case "binaryB":
                                expect(params[1].name).to.be.equal("numberB")
                                break;
                        }
                    }
                    done();
                });
            });
        }));
    });

    describe("starting with binaries and params", function() {

        var store = new Store();

        /* We need a real db since we also test queries */
        before('connect fixture db', function(done) {
            this.timeout(3000);
            var file = __dirname + "/acceptance_bins_params.sqlite";
            var dbConf = {
                models: path.resolve(__dirname + "/../models/*.js"),
                migrations:  path.resolve(__dirname + "/../migrations/*"),
                type: "sqlite3",
                file: file
            };

            store = new OpenRecord(dbConf);
            store.verify = function() {return};
            store.getBaseModel = db.getBaseModel;
            store.ready(function(){
                dbConnected = true;
                done();
            });
        });


        /* We need a real db since we also test queries */
        afterEach('remove jobgroups and jobs from db', function(done) {
            var Job = store.Model("Job");
            var Jobgroup = store.Model("Jobgroup");
            async.series([
                /* Clean up jobgroups */
                function(callback) {
                    /* Clean */
                    Jobgroup.delete(function (okay) {
                        expect(okay).to.be.equal(true);
                        return callback(null);
                    });
                },
                /* Clean up jobs */
                function(callback) {
                    /* Clean */
                    Job.delete(function (okay) {
                        expect(okay).to.be.equal(true);
                        return callback(null);
                    });
                },
            ], function(err) {
                expect(err).to.be.equal(null);
                done();
            });
        });

        /* Mocks inquirer to create two default binaries with parameters */
        it("creates a jobgroup", sinon.test(function(done) {
            promptCount = 0;
            this.timeout(3000);
            this.stub(nconf, 'get').callsFake(SharedStubs.nconfGet);
            this.stub(inquirer, 'prompt').callsFake( function(questions) {
                debug("fakeprompt");
                promptCount++;
                var answers = {};
                switch (promptCount) {
                    case 1:
                        answers = {
                            "name":"GroupA",
                            "binary_id": questions[2].choices[0].value,
                            "timelimit": 5,
                            "testset": undefined,
                        };
                        break;
                    case 2:
                        answers = {
                            paramvals_4: ["a","b"],
                            paramvals_5: "1:5",
                        };
                        break;
                }
                return {
                    then: function(callback) {
                        return callback(answers);
                    }
                };
            });

            JobgroupMenus.add(store, {}, function(err) {
                debug("doneadding");
                //nconf.get.restore();
                //inquirer.prompt.restore();
                var Jobgroup = store.Model("Jobgroup");
                Jobgroup.exec(function(records) {
                    try{
                        expect(records.length).to.be.equal(1);
                        expect(records[0].name).to.be.equal("GroupA");
                        done();
                    } catch(e) {
                        done(e);
                    }
                });
            });
        }));

        it("launches a jobgroup", sinon.test(function(done) {
            promptCount = 0;
            this.timeout(10000);
            var spawnStub = this.stub(child_process, 'spawn').callsFake( SharedStubs.spawn);
            this.stub(nconf, 'get').callsFake(SharedStubs.nconfGet);
            var mkdirsStub = this.stub(fs, 'mkdirs', SharedStubs.mkdirs);
            var openSyncStub = this.stub(fs, 'openSync', SharedStubs.openSync);
            this.stub(inquirer, 'prompt').callsFake( function(questions) {
                promptCount++;
                var answers = {};
                switch (promptCount) {
                    case 1:
                        answers = {
                            "idx": questions[0].choices[1].value, //Jobgroup
                        };
                        break;
                    case 2:
                        answers = {
                            "launcher": questions[0].choices[0].value, //Local launcher
                        };
                        break;
                    case 3:
                        answers = {
                            "continue": true,
                        };
                        break;
                }
                return {
                    then: function(callback) {
                        return callback(answers);
                    }
                };
            });

            var Job = store.Model("Job");
            var Jobgroup = store.Model("Jobgroup");
            /* Insert the jobgroup first */
            var attributes = {
                binary_id: 3,
                name: "GroupA",
                parameter_values: '{"paramvals_4":["a","b"],"paramvals_5":[1,2,3,4,5]}',
                wd: __dirname + '/test_runs/group_test',
                timelimit: 5,
            };

            async.series([
                /* create the jobgroup by attributes */
                function(callback) {
                    model_insert(store, "Jobgroup", attributes, function (err, jobgroup) {
                        debug("inserted group");
                        callback(null);
                    });
                },
                /* Launch */
                function(callback) {
                    try {
                        JobgroupMenus.launch(store, {}, function (err) {
                            debug("launched");
                            return callback(null);
                        });
                    } catch(e) {
                        return callback(e);
                    }
                },
                /* Check jobs in db */
                function(callback) {
                    Job.exec(function(records) {
                        callback(null, records);
                    });
                },
            ], function(err, results) {
                try{
                    expect(results[2].length).to.be.equal(10);
                    expect(spawnStub.callCount).to.be.equal(10);
                    expect(err).to.be.equal(null);
                    done();
                } catch(e) {
                    done(e);
                }
            });
        }));
    });

});

