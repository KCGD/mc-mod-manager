import * as _http from 'http';
import * as _https from 'https';
import * as config from "../../config";

let httpModules = {
    'http': _http,
    'https': _https
}

interface fetchToCallback {
    (data:Buffer, error:undefined|Error): void
}

type AcceptedHttpProtocol = 'http' | 'https';

//function for small https requests, returns buffer in callback
export function fetchToCallback(address:string, callback:fetchToCallback): void {
    let url = new URL(address);
    let protocol:AcceptedHttpProtocol = determineProtocol(url);
    let http = httpModules[protocol];
    let returnBuffer:any[] = [];
    const HttpOptions:_http.RequestOptions = {
        "host":url.hostname,
        "hostname":url.hostname,
        "path":url.pathname,
        "protocol":url.protocol,
        "headers": {'User-Agent': config.API_User_Agent}
    }
    http.get(HttpOptions, function(res: _http.IncomingMessage): void {
        res.on('data', function(data:any): void {
            returnBuffer.push(data);
        })
        res.on('error', function(error): void {
            callback(Buffer.alloc(0), error);
        })
        res.on('end', function(): void {
            callback(Buffer.concat(returnBuffer), undefined);
        })
    })
}

function determineProtocol(url:URL): AcceptedHttpProtocol {
    if(url.protocol === "https:") {
        return 'https';
    } else if (url.protocol === "http:") {
        return 'http';
    } else {
        throw new Error(`Invalid Protocol "${url.protocol}"`);
    }
}