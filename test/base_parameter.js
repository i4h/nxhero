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
