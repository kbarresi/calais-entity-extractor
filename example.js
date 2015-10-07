
//Sample plaintext.
var text = "The gravity of Volkswagen's emissions scandal is sinking in as the automaker's new boss warned that the company is planning comprehensive cuts to navigate the costly crisis. We will review all planned investments, and what isn’t absolutely vital will be canceled or delayed,' Volkswagen CEO Matthias Mueller told workers at Volkswagen's headquarters in Wolfsburg, Germany. 'And that’s why we will re-adjust our efficiency program. I will be completely clear: this won’t be painless. Mueller's comment — which was made in German and confirmed by an English speaking spokesman for this story — reflects the depth of the financial crisis Volkswagen is facing after it admitted to rigging 11 million diesel cars worldwide with software that allowed cars to cheat emissions regulations. The cost cuts come amid swirling speculation over the ultimate pricettag of the scandal, which is expected to be much higher than the $7 billion Volkswagen has already set aside. In the U.S., where only 482,000 cars were fitted with the 'defeat device' software, fines and the cost of vehicle buybacks could exceed 15 billion euros, or nearly $17 billion, Sanford C. Bernstein analyst Max Warburton said Monday in a research note. The company — which passed Toyota as the world's largest automaker for the first six months of 2015 — made a global operating profit of 12.7 billion euros in 2014. Warburton posited that the scandal may not be as grave in Europe, where, he said, cars may be fitted with the cheating software yet still compliant with local emissions regulations. European standards on nitrogen oxide emissions — which can exacerbate respiratory conditions such as asthma — are not as stringent as U.S. standards. Still, the financial ripple effects of the crisis are 'potentially terrifying' if the scandal mushrooms in Europe, Warburton said. Industry observers have theorized it could reach the $30 billion range, although speculation varies widely. It was not immediately clear how cost-cuts would affect Volkswagen's only U.S. factory in Chattanooga, Tenn. A U.S.-based spokeswoman did not respond to a request for information. According to a copy of Mueller's prepared remarks, the CEO reiterated that 'it is still not possible to quantify' how much the scandal will cost. But he vowed to ensure the company's survival and regain the public's trust. 'We can and we will overcome this crisis, because Volkswagen is a group with a strong foundation,' He said. 'And above all because we have the best automobile team anyone could wish for.' Mueller admitted, however, that he does not know the full extent of the scandal, which dates back to 2009 models and led to the resignation of his predecessor, Martin Winterkorn. 'Believe me — like you, I am impatient,' he said. Volkswagen is expected to propose fixes to regulators this month. Mueller said software updates will be enough for many vehicles, but others will require hardware upgrades. In his remarks, Mueller signaled that the company won't reduce its commitment to new product development. 'We cannot afford to economize on the future,' he said. 'That is something else we will also be addressing over the coming weeks and months.' The automaker is facing a litany of investigations and lawsuits over the scandal, including a U.S. Justice Department criminal probe and numerous class-action suits filed by consumers. It has also ordered a outside law firm to conduct an investigation of its handling of the matter.";

var Calais = require('calais-entity-extractor').Calais;

//You can enter options as the second parameter.
var calais = new Calais('ENTER API KEY HERE');

// You can set options after the constructor using .set(option, value). The example below sets
// the text that we want to analyze.
calais.set('content', text);


var util = require('util'); //for printing the results.

calais.extractFromText(function(result, err) {     //perform the request
    if (err) {
        console.log('Uh oh, we got an error! : ' + err);
        return;
    }


    //The results have two fields: 'entities' and 'tags'

    //'entities' contains a list of the detected entities, and gives basic info & confidence
    console.log('Entities: ' + util.inspect(result.entities, false, null));

    //'tags' are a list of string tags (the "socialTags" from Calais).
    console.log('\nTags: ' + util.inspect(result.tags, false, null));


    //Now lets try analyzing a webpage. We supply a URL.
    calais.extractFromUrl('http://www.reuters.com/article/2015/10/07/us-iran-us-talks-idUSKCN0S10P220151007', function(result, err) {
        if (err) {
            console.log('Uh oh, we got an error! : ' + err);
            return;
        }



        //The results have the same format as the extractFromText function.

        //'entities' contains a list of the detected entities, and gives basic info & confidence
        console.log('Entities: ' + util.inspect(result.entities, false, null));

        //'tags' are a list of string tags (the "socialTags" from Calais).
        console.log('\nTags: ' + util.inspect(result.tags, false, null));
    });
});