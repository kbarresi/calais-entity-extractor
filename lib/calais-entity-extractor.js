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

        this.entitySearchUrl = "https://api.thomsonreuters.com:443/permid/search";
        this.entityLookupUrl = "https://permid.org:443/";

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

                            var entity = { 'type' : p._type, 'name' : p[key] };
                            if (p.hasOwnProperty("confidencelevel"))
                                entity['confidence'] = p.confidencelevel;

                            if (entity.confidence < minConfidence)
                                continue;

                            var resolution = null;
                            if (p.hasOwnProperty('resolutions'))
                                resolution = p.resolutions[0];

                            if (entity.type == 'Person') {
                                if (p.hasOwnProperty("persontype") && p.persontype != "N/A")
                                    entity.persontype = p.persontype;
                                if (p.hasOwnProperty("nationality") && p.nationality != "N/A")
                                    entity.nationality = p.nationality;
                                if (p.hasOwnProperty("commonname"))
                                    entity.commonname = p.commonname;
                                if (p.hasOwnProperty("firstname"))
                                    entity.firstname = p.firstname;
                                if (p.hasOwnProperty("middlename"))
                                    entity.middlename = p.middlename;
                                if (p.hasOwnProperty("lastname"))
                                    entity.lastname = p.lastname;
                            } else if (entity.type == "Company") {
                                if (p.hasOwnProperty("CompanyFounded"))
                                    entity.companyFounded = p.CompanyFounded;
                                if (p.hasOwnProperty("CompanyTicker"))
                                    entity.ticker = p.CompanyTicker;
                                if (resolution) {
                                    if (resolution.hasOwnProperty("name"))
                                        entity.fullName = resolution.name;
                                    if (resolution.hasOwnProperty("permid"))
                                        entity.permid = "1-" + resolution.permid;
                                    if (resolution.hasOwnProperty("primaryric"))
                                        entity.ric = resolution.primaryric;
                                    if (resolution.hasOwnProperty("commonname"))
                                        entity.name = resolution.commonname;
                                }
                            } else if (entity.type == "City") {
                                if (resolution) {
                                    if (resolution.hasOwnProperty("name"))
                                        entity.fullName = resolution.name;
                                    if (resolution.hasOwnProperty("shortname"))
                                        entity.name = resolution.shortname;
                                    if (resolution.hasOwnProperty("containedbycountry"))
                                        entity.country = resolution.containedbycountry;
                                    if (resolution.hasOwnProperty("permid"))
                                        entity.permid = "1-" + resolution.permid;
                                }
                            } else
                                continue;


                            if (!p.hasOwnProperty("fullName") || p.fullName.length == 0 && p.name.length != 0)
                                p['fullName'] = entity.name;


                            entities.push(entity);
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

    _parseCalaisSearchResult: function(data) {
        var organizations = [];
        var instruments = [];
        var quotes = [];

        if (!data.hasOwnProperty('result'))
            return { 'organizations' : organizations, 'instruments' : instruments, 'quotes' : quotes };

        if (data.result.hasOwnProperty('organizations') && data.result.organizations.hasOwnProperty('entities')) {
            var orgs = data.result.organizations.entities;
            for (var i = 0, len = orgs.length; i < len; i++) {
                var entity = { };

                if (orgs[i]["@id"]) {
                    entity['id'] = orgs[i]["@id"];
                    if(entity['id'].indexOf("/") != -1)
                        entity['id'] = entity['id'].substring(entity['id'].lastIndexOf("/")+1);
                }
                if (orgs[i].hasOwnProperty("organizationName"))
                    entity['name'] = orgs[i].organizationName;
                if (orgs[i].hasOwnProperty("primaryTicker"))
                    entity['ticker'] = orgs[i].primaryTicker;
                if (orgs[i].hasOwnProperty("orgSubtype"))
                    entity['type'] = orgs[i].orgSubtype;
                if (orgs[i].hasOwnProperty("hasHoldingClassification"))
                    entity['public'] = true;
                else
                    entity['public'] = false;
                if (orgs[i].hasOwnProperty("hasURL"))
                    entity['url'] = orgs[i].hasURL;

                organizations.push(entity);
            }
        }

        if (data.result.hasOwnProperty('instruments') && data.result.instruments.hasOwnProperty('entities')) {
            var ins = data.result.instruments.entities;
            for (var i = 0, len = ins.length; i < len; i++) {
                var entity = { };
                if (ins[i].hasOwnProperty("@id")) {
                    entity['id'] = ins[i]["@id"];
                    if(entity['id'].indexOf("/") != -1)
                        entity['id'] = entity['id'].substring(entity['id'].lastIndexOf("/")+1);
                }
                if (ins[i].hasOwnProperty("hasName"))
                    entity['name'] = ins[i].hasName;
                if (ins[i].hasOwnProperty("assetClass"))
                    entity['assetClass'] = ins[i].assetClass;
                if (ins[i].hasOwnProperty("isIssuedByName"))
                    entity['issuerName'] = ins[i].isIssuedByName;
                if (ins[i].hasOwnProperty("isIssuedBy")) {
                    entity['issuerId'] = ins[i].isIssuedBy;
                    if(entity.issuerId.indexOf("/") != -1)
                        entity.issuerId = entity.issuerId.substring(entity.issuerId.lastIndexOf("/")+1);
                }
                if (ins[i].hasPrimaryQuote) {
                    entity['primaryQuoteId'] = ins[i].hasPrimaryQuote;
                    if (entity.primaryQuoteId.indexOf("/") != -1)
                        entity.primaryQuoteId = entity.primaryQuoteId.substring(entity.primaryQuoteId.lastIndexOf("/")+1);
                }
                if (ins[i].hasOwnProperty("primaryTicker"))
                    entity['primaryTicker'] = ins[i].primaryTicker;

                instruments.push(entity);
            }
        }

        if (data.result.hasOwnProperty('quotes') && data.result.quotes.hasOwnProperty('entities')) {
            var quo = data.result.quotes.entities;
            for (var i = 0, len = quo.length; i < len; i++) {
                var entity = { };

                if (quo[i]["@id"]) {
                    entity['id'] = ins[i]["@id"];
                    if(entity['id'].indexOf("/") != -1)
                        entity['id'] = entity['id'].substring(entity['id'].lastIndexOf("/")+1);
                }
                if (quo[i].hasName)
                    entity['name'] = quo[i].hasName;
                if (quo[i].assetClass)
                    entity['class'] = quo[i].assetClass;
                if (quo[i].isQuoteOfInstrumentName)
                    entity['instrumentName'] = quo[i].isQuoteOfInstrumentName;
                if (quo[i].isIssuedByName)
                    entity['issuer'] = quo[i].isIssuedByName;
                if (quo[i].hasRIC)
                    entity["ric"] = quo[i].hasRIC;
                if (quo[i].hasMic)
                    entity["mic"] = quo[i].hasMic;
                if (quo[i].hasExchangeTicker)
                    entity["ticker"] = quo[i].hasExchangeTicker;
                if (quo[i].isQuoteOf) {
                    entity["quoteId"] = quo[i].isQuoteOf;
                    if (entity.quoteId.indexOf("/") != -1)
                        entity.quoteId = entity.quoteId.substring(entity.quoteId.lastIndexOf("/")+1);
                }

                quotes.push(entity);
            }
        }

        return { 'organizations' : organizations, 'instruments' : instruments, 'quotes' : quotes };
    },


    _parseCalaisLookupResult: function(data) {

        var result = { };
        if (data.hasOwnProperty("@id")) {
            result['id'] = data["@id"];
            if(result.id.indexOf("/") != -1)
                result.id = result.id.substring(result.id.lastIndexOf("/")+1);
        }

        if (data.hasOwnProperty("@type")) {
            result['type'] = data["@type"];
            if(result.type.indexOf(":") != -1)
                result.type = result.type.substring(result.type.lastIndexOf(":")+1);
        }

        if (data.hasOwnProperty("mdaas:HeadquartersAddress"))
            result.headquarters = data["mdaas:HeadquartersAddress"];
        if (data.hasOwnProperty("mdaas:RegisteredAddress"))
            result.address = data["mdaas:RegisteredAddress"];
        if (data.hasOwnProperty("hasOrganizationPrimaryQuote")) {
            result.primaryQuoteId = data["hasOrganizationPrimaryQuote"];
            if(result.primaryQuoteId.indexOf("/") != -1)
                result.primaryQuoteId = result.primaryQuoteId.substring(result.primaryQuoteId.lastIndexOf("/")+1);
        }
        if (data.hasOwnProperty("hasPrimaryInstrument")) {
            result.primaryInstrumentId = data["hasPrimaryInstrument"];
            if(result.primaryInstrumentId.indexOf("/") != -1)
                result.primaryInstrumentId = result.primaryInstrumentId.substring(result.primaryInstrumentId.lastIndexOf("/")+1);
        }
        if (data.hasOwnProperty("hasActivityStatus")) {
            result.status = data["hasActivityStatus"];
            if(result.status.indexOf("status") != -1)
                result.status = result.status.substring(result.status.lastIndexOf("status")+6).toLowerCase();
        }
        if (data.hasOwnProperty("tr-org:hasHeadquartersPhoneNumber"))
            result.headquartersPhoneNumber = data["tr-org:hasHeadquartersPhoneNumber"];
        if (data.hasOwnProperty("hasHoldingClassification"))
            result.public = true;
        if (data.hasOwnProperty("hasIPODate"))
            result.ipoDate = data["hasIPODate"];
        if (data.hasOwnProperty("hasLatestOrganizationFoundedDate"))
            result.founded = data["hasLatestOrganizationFoundedDate"];
        if (data.hasOwnProperty("tr-org:hasRegisteredPhoneNumber"))
            result.registeredPhoneNumber = data["tr-org:hasRegisteredPhoneNumber"];
        if (data.hasOwnProperty("isIncorporatedIn"))
            result.incorporatedLocation = data["isIncorporatedIn"];
        if (data.hasOwnProperty("isDomiciledIn"))
            result.domiciledLocation = data["isDomiciledIn"];
        if (data.hasOwnProperty("hasURL"))
            result.url = data["hasURL"];
        if (data.hasOwnProperty("vcard:organization-name"))
            result.name = data["vcard:organization-name"];

        return result;
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
                if (!calaisData)
                    return cb({}, calais.errors);

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
                    if (!calaisData)
                        return cb({}, calais.errors);

                    // parse to a Javascript object if requested
                    var result = JSON.parse(calaisData);
                    result = (typeof result === 'string') ? JSON.parse(result) : result;

                    var parsedResult = calais._parseCalaisData(result, calais.options.minConfidence);

                    return cb(parsedResult, calais.errors);
                } else
                    return cb({}, 'Request error: ' + (typeof response === 'string' ? response : JSON.stringify(response)));


            });

        });

    },

    search: function(query, cb) {
        var calais = this;

        if (!calais.validateOptions())
            return cb({}, 'Bad options');

        //Make sure we were given a URL.
        if (this._undefinedOrNull(query) || typeof query != 'string' || query.length == 0)
            return cb({}, 'Invalid query given.');


        var compositeUrl = calais.entitySearchUrl + "?q=" + query;

        //We can upload the html directly to Calais if we set the contentType as text/html
        var params = {
            'Host'                   : calais.options.apiHost,
            'x-ag-access-token'      : calais.apiKey,
            'x-calais-language'      : calais.options.language,
            'Accept'                 : 'application/json',
            'OutputFormat'           : 'application/json'
        };

        var options = {
            uri    : compositeUrl,
            method : 'GET',
            headers: params
        };


        request(options, function(error, response, calaisData) {

            if (error)
                return cb({}, error);

            if (response === undefined) {
                return cb({}, 'Undefined Calais response');
            } else if (response.statusCode === 200) {
                if (!calaisData)
                    return cb({}, calais.errors);

                // parse to a Javascript object if requested
                var result = JSON.parse(calaisData);
                result = (typeof result === 'string') ? JSON.parse(result) : result;

                var parsedResult = calais._parseCalaisSearchResult(result);

                return cb(parsedResult, calais.errors);
            } else
                return cb({}, 'Request error: ' + (typeof response === 'string' ? response : JSON.stringify(response)));


        });
    },

    lookup: function(identifier, cb) {
        var calais = this;

        if (!calais.validateOptions())
            return cb({}, 'Bad options');

        //Make sure we were given a URL.
        if (this._undefinedOrNull(identifier) || typeof identifier != 'string' || identifier.length == 0)
            return cb({}, 'Invalid identifier given.');


        var compositeUrl = calais.entityLookupUrl + identifier + "?format=json-ld&access-token=" + calais.apiKey;

        var options = {
            uri    : compositeUrl,
            method : 'GET'
        };

        request(options, function(error, response, calaisData) {
            if (error)
                return cb({}, error);

            if (response === undefined) {
                return cb({}, 'Undefined Calais response');
            } else if (response.statusCode === 200) {
                if (!calaisData)
                    return cb({}, calais.errors);

                // parse to a Javascript object if requested
                var result = JSON.parse(calaisData);
                result = (typeof result === 'string') ? JSON.parse(result) : result;

                var parsedResult = calais._parseCalaisLookupResult(result);
                return cb(parsedResult, calais.errors);
            } else
                return cb({}, 'Request error: ' + (typeof response === 'string' ? response : JSON.stringify(response)));


        });


    }
};

exports.Calais = Calais;
