export function renderBar(templateString:string, percentCompleted:number): string {
    let barFlag:string = '{bar}';
    let barLength:number = process.stdout.columns - templateString.length;
    let bar = new Array<string>(barLength);
    let splitSector = Math.round(barLength * (percentCompleted/100));
    for(var i = 0; i < barLength; i++) {
        bar[i] = (i < splitSector)? "#" : " ";
    }
    return templateString.replace(barFlag, bar.join(''));
}