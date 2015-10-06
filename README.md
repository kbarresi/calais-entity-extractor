calais-entity-extractor
=======================

An npm package that provides an easy way to extract entities from blocks of text using Open Calais. A valid Calais key is required. You can get a free one at the [Open Calais site](http://new.opencalais.com). This module was inspired by [node-calais](https://github.com/mcantelon/node-calais), but that project doesn't (as of 10/6/2015) support the Calais API changes.

We perform *named entity recognition* and output clean *entity markup tags*  and *socialTags* in JSON.

## Installation

  npm install calais-entity-extractor

## Usage 


    var Calais = require('calais-entity-extractor').Calais;
    var calais = new Calais('ACCESS TOKEN');  //See valid options below

    // You can set options after the constructor using .set(option, value). The example below sets
    // the text that we want to analyze.
    calais.set('content', 'The awesome text to analyze. News stories work great.');


    calais.extract(function(result, err) {     //perform the request
        if (err) {
            console.log('Uh oh, we got an error! : ' + err);
            return;
        }

        //Take a look at the results!
        var util = require('util');

        //The results have two fields: 'entities' and 'tags'

        //'entities' contains a list of the detected entities, and gives basic info & confidence
        console.log('Entities: ' + util.inspect(result.entities, false, null));

        //'tags' are a list of string tags (the "socialTags" from Calais).
        console.log('\nTags: ' + util.inspect(result.tags, false, null));
    });

Example output of the above example on a news story:

    Entities: [ { type: 'Company',
            name: 'Toyota',
            fullName: 'Toyota Motor Corp',
            confidence: '0.903' },
        { type: 'Person',
            name: 'Matthias Mueller',
            fullName: 'Matthias Mueller',
            confidence: '0.999' },
        { type: 'Company',
                name: 'Volkswagen',
            fullName: 'Volkswagen AG',
            confidence: '0.985' },
        { type: 'Person',
            name: 'Max Warburton',
            fullName: 'Max Warburton',
            confidence: '0.997' },
        { type: 'Person',
            name: 'Martin Winterkorn',
            fullName: 'Martin Winterkorn',
            confidence: '0.995' },
        { type: 'Company',
            name: 'Sanford C. Bernstein',
            fullName: 'Sanford C Bernstein Fund II Inc',
            confidence: '0.999' 
        } 
    ]

    Tags: [ 'Volkswagen Group',
        'Volkswagen',
        'Martin Winterkorn',
        'Volkswagen emissions violations' 
    ]



Valid options and their default values are: 

    apiHost                 : 'api.thomsonreuters.com',
    apiPath                 : '/permid/calais',
    contentTy pe            : 'text/raw',          // [text/html, text/xml, text/raw, application/pdf]
    language                : 'English'            // [English, Spanish, French],
    minConfidence           : 0.75                 // Anything that has less than this confidence level is ignored



## Tests

    expresso test/calais.test.js
    
    
   

