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

    _parseCalaisData: function(result, minConfidence) {
        var entities = [ ];
        var tags = [ ];
        var industries = [ ];

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

                            if (confidenceLevel >= minConfidence)
                                entities.push({
                                    'type': type,
                                    'name': name,
                                    'fullName': fullName,
                                    'confidence': confidenceLevel
                                });
                        }
                    } else if (p._typeGroup == 'industry') {
                        var industry = {
                            'name' : p['name'],
                            'rcscode' : p['rcscode'],
                            'trbccode' : p['trbccode'],
                            'permid' : p['permid'],
                            'relevance' : p['relevance']
                        };
                        industries.push(industry);
                    }
                }
            }
        }

        return {'entities' : entities, 'tags' : tags, 'industries' : industries };
    },

    set: function (key, value) {
        this.options[key] = value;
    },

    validateOptions: function () {
        return true;
    },


    /**
     * Perform the analysis request with Calais. If no |text| is given or |text| is empty,
     * then we fall back to the set options.content value. If that is also empty, an error is
     * returned.
     *
     * @param cb Callback function of form function(resultData, error);
     * @param text Optional, the text to perform extraction on. If not set, the options.content
     * value is used.
     * @returns nothing
     */
    extractFromText: function (cb, text) {
        var calais = this;

        if (!calais.validateOptions())
            return cb({}, 'Bad options');

        if (this._undefinedOrNull(text) || typeof text != 'string' || text.length == 0)
            text = this.options.content;
        if (this._undefinedOrNull(text) || typeof text != 'string' || text.length == 0)
            return cb({}, 'No text given in options or parameter');


        var params = {
            'Host'                   : calais.options.apiHost,
            'x-ag-access-token'      : calais.apiKey,
            'x-calais-language'      : calais.options.language,
            'Content-Type'           : calais.options.contentType,
            'Accept'                 : 'application/json',
            'Content-Length'         : text.length,
            'OutputFormat'           : 'application/json'
        }


        var options = {
            uri    : 'https://' + calais.options.apiHost + calais.options.apiPath,
            method : 'POST',
            body   : text,
            headers: params
        };


        //Send the response
        request(options, function (error, response, calaisData) {
            if (error)
                return cb({}, error);

            if (response === undefined) {
                return cb({}, 'Undefined Calais response');
            } else if (response.statusCode === 200) {

                // parse to a Javascript object if requested
                var result = JSON.parse(calaisData);
                result = (typeof result === 'string') ? JSON.parse(result) : result;

                var parsedResult = calais._parseCalaisData(result, calais.options.minConfidence);

                return cb(parsedResult, calais.errors);
            } else
                return cb({}, 'Request error: ' + (typeof response === 'string' ? response : JSON.stringify(response)));

        });
    },

    /**
     * Extract tags and entities from a given URL. We download the HTML from the URL, and submit
     * that to Calais using the extractFromText function
     *
     * @param url The URL to analyze.
     * @param cb The callback function, of form function(result, error)
     */
    extractFromUrl: function(url, cb) {
        var calais = this;

        if (!calais.validateOptions())
            return cb({}, 'Bad options');

        //Make sure we were given a URL.
        if (this._undefinedOrNull(url) || typeof url != 'string' || url.length == 0)
            return cb({}, 'No URL given.');

        //Make sure it's a valid URL.
        if (!(/^(https?|ftp):\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i.test(url)))
            return cb({}, 'Bad URL');


        request(url, function(error, response, html) {
            if (error)
                return cb({}, error);

            //Limts to just under 100kb....
            html = html.substring(0, 95000);
            
            //We can upload the html directly to Calais if we set the contentType as text/html
            var params = {
                'Host'                   : calais.options.apiHost,
                'x-ag-access-token'      : calais.apiKey,
                'x-calais-language'      : calais.options.language,
                'Content-Type'           : 'text/html',
                'Accept'                 : 'application/json',
                'Content-Length'         : html.length,
                'OutputFormat'           : 'application/json'
            };

            var options = {
                uri    : 'https://' + calais.options.apiHost + calais.options.apiPath,
                method : 'POST',
                body   : html,
                headers: params
            };


            request(options, function(error, response, calaisData) {

                if (error)
                    return cb({}, error);

                if (response === undefined) {
                    return cb({}, 'Undefined Calais response');
                } else if (response.statusCode === 200) {

                    // parse to a Javascript object if requested
                    var result = JSON.parse(calaisData);
                    result = (typeof result === 'string') ? JSON.parse(result) : result;

                    var parsedResult = calais._parseCalaisData(result, calais.options.minConfidence);

                    return cb(parsedResult, calais.errors);
                } else
                    return cb({}, 'Request error: ' + (typeof response === 'string' ? response : JSON.stringify(response)));


            });

        });

    }
};

exports.Calais = Calais;
