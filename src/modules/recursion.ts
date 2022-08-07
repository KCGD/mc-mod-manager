export function recurse (_array:any[], _fnctn:Function, _done:Function): void {
    Main([..._array], _fnctn, _done);
}

function Main(array:any[], fnctn:Function, done:Function): any {
    if(array.length !== 0) {
        fnctn(array[0], function() {
            array.shift();
            Promise.resolve().then(Main(array, fnctn, done));
        })
    } else {
        done();
    }
}