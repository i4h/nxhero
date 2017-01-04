var debug       = require('debug')('nxhero');
var moment = require('moment');


module.exports = {
    dbDatetime :function() {
        return moment().format('YYYY-MM-DD HH:mm:ss');
    }
}