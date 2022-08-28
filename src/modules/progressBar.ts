export function renderBar(templateString:string, percentCompleted:number): string {
    let barFlag:string = '{bar}';
    let barLength:number = templateString.length - barFlag.length;
    let bar = new Array<string>(barLength);
    let splitSector = Math.round(barLength / percentCompleted);
    for(var i = 0; i < barLength; i++) {
        bar[i] = (i > splitSector)? "#" : " ";
    }
    return templateString.replace(`{bar}`, bar.join(''));
}