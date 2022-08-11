export type FuzzySearchResult = {
    "search":string,
    "contestant":string,
    "match":number,
    "normalizedSearch":string|undefined,
    "normalizedContestant":string|undefined
}

export function FuzzySearch(input:string[], searchTerm:string, threshHold:number, sampleAmount:number): FuzzySearchResult[] {
    let results:FuzzySearchResult[] = [];
    for(var i = 0; i < input.length; i++) {
        results.push({"search":searchTerm, "contestant": input[i], "match": Fuzz(normalize(searchTerm), normalize(input[i]), sampleAmount), "normalizedSearch":normalize(searchTerm), "normalizedContestant":normalize(input[i])});
    }
    //filter the results
    let filteredResults = [];
    for(var i = 0; i < results.length; i++) {
        if(results[i].match > threshHold) {
            filteredResults.push(results[i]);
        }
    }
    return filteredResults;
}

//removes version info, special characters and flattens case
function normalize(input:string): string {
    input = input.replace(/[0-9]/g, '');
    input = input.replace(/[^a-zA-Z ]/g, "");
    input = input.toLowerCase();
    return input;
}

//gets random samples of the input and term, calculates to what % the two strings match
function Fuzz(term:string, candidate:string, samples:number): number {
    let confidence = 0;
    for(let i=0; i < samples; i++) {
        if(candidate.includes(term.substring(randomNumber(0, term.length), randomNumber(0, term.length)))) {
            confidence++;
        }
    }
    return confidence/samples;
}

function randomNumber(min:number, max:number): number { 
    return Math.floor(Math.random() * (max - min) + min);
} 