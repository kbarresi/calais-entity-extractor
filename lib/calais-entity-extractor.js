var request = require('request');

var Calais = function (apiKey, options) {
    this.initialize(apiKey, options);
};

Calais.prototype = {


    initialize: function (apiKey, options) {

        this.apiKey = apiKey;
        this.defaults = {
            'apiHost'                : 'api.thomsonreuters.com',
            'apiPath'                : '/permid/calais',
            'contentType'            : 'text/raw',
            'language'               : 'English', // alts: Spanish, French
            'minConfidence'      : 0.75
        };

        this._setDefaultOptions(options);
    },

    _setDefaultOptions: function (options) {

        options = options || {};
        this.options = {};

        var keys = Object.keys(this.defaults);
        for (var i = 0, l = keys.length; i < l; i++) {
            var index = keys[i];
            this.options[index] = (this._undefinedOrNull(options[index])) ? this.defaults[index] : options[index];
        }
    },

    _undefinedOrNull: function (value) {
        return value === undefined || value === null;
    },

    set: function (key, value) {
        this.options[key] = value;
    },

    validateOptions: function () {
        return true;
    },


    //cb = function(resultData, error);
    extract: function (cb) {
        var calais = this;

        if (!calais.validateOptions())
            return cb({}, 'Bad options');

        var outputFormat = calais.options.outputFormat;
        var params = {
            'Host'                   : calais.options.apiHost,
            'x-ag-access-token'      : calais.apiKey,
            'x-calais-language'      : calais.options.language,
            'Content-Type'           : calais.options.contentType,
            'Accept'                 : outputFormat,
            'Content-Length'         : calais.options.content.length,
            'OutputFormat'           : 'application/json'
        }


        var options = {
            uri    : 'https://' + this.options.apiHost + this.options.apiPath,
            method : 'POST',
            body   : this.options.content,
            headers: params
        };


        //Send the response
        request(options, function (error, response, calaisData) {
            if (error)
                return cb({}, error);

            if (response === undefined) {
                return cb({}, 'Undefined Calais response');
            } else if (response.statusCode === 200) {

                // take note of whether Javascript object output was requested
                var jsOutput = (calais.options.outputFormat === 'object');
                // parse to a Javascript object if requested
                var result = (jsOutput) ? JSON.parse(calaisData) : calaisData;

                result = (typeof result === 'string') ? JSON.parse(result) : result;

                var entities = [ ];
                var tags = [ ];
                for(var i in result) {
                    var p = result[i];

                    for (var key in p) {
                        if (p.hasOwnProperty(key) && (key == "name")) {
                            if (!p.hasOwnProperty('_typeGroup'))
                                continue;

                            if (p._typeGroup === 'socialTag') {
                                var name = p[key];
                                tags.push(name);
                            } else if (p._typeGroup == 'entities') { //if it's an entity, grab that

                                if (p.hasOwnProperty('_type')) {
                                    var type = p._type;
                                    var confidenceLevel = 0.0;
                                    var name = "";
                                    var fullName = "";

                                    if (p.hasOwnProperty('confidencelevel'))
                                        confidenceLevel = p.confidencelevel;

                                    if (p.hasOwnProperty('resolutions')) {
                                        name = p[key];
                                        fullName = p.resolutions[0].name;

                                    } else
                                        name = p[key];

                                    //No further full name? Use the 'short' name
                                    if (fullName.length == 0)
                                        fullName = name;

                                    if (confidenceLevel >= calais.options.minConfidence)
                                        entities.push({
                                            'type': type,
                                            'name': name,
                                            'fullName': fullName,
                                            'confidence': confidenceLevel
                                        });
                                }
                            }
                        }
                    }
                }

                return cb({'entities' : entities, 'tags' : tags }, calais.errors);
            } else
                return cb({}, 'Request error: ' + (typeof response === 'string' ? response : JSON.stringify(response)));

        });
    }
};

exports.Calais = Calais;