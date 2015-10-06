var Calais = require('../lib/calais-entity-extractor').Calais;
var assert = require('assert');

module.exports = {
    'test api key setting': function () {
        var calais = new Calais('blank key');
        assert.equal(calais.apiKey, 'blank key');
    },

    'test option setting': function () {
        var calais = new Calais('blank key', {'contentType': 'text/html'});
        assert.equal(calais.options.contentType, 'text/html');
    }
};
