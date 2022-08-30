import * as fs from 'fs';
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
interface fetchToFileProgress {
    (progressPercent:number): void
}
interface fetchToFileDone {
    (): void
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

//function for large http requests, uses fs.writeStream to write response to file, offers progress
export function fetchToFile(address:string, outPath:string, progressCallback:fetchToFileProgress, finished:fetchToFileDone): void {
    let url = new URL(address);
    let protocol:AcceptedHttpProtocol = determineProtocol(url);
    let http = httpModules[protocol];
    let outStream:fs.WriteStream = fs.createWriteStream(outPath);
    let bytesTotal:number = 0;
    let bytesWritten:number = 0;
    const HttpOptions:_http.RequestOptions = {
        "port":url.port,
        "host":url.hostname,
        "hostname":url.hostname,
        "path":url.pathname,
        "protocol":url.protocol,
        "headers": {'User-Agent': config.API_User_Agent}
    }
    http.get(HttpOptions, function(res: _http.IncomingMessage): void {
        //recurse if response code is a redirector
        if(res.statusCode === 301 || res.statusCode === 301) {
            if(res.headers.location) {
                fetchToFile(res.headers.location, outPath, progressCallback, finished);
            } else {
                throw new Error("HTTP Redirect returned no valid location");
            }
        }
        if(res.headers['content-length']) {
            bytesTotal = parseInt(res.headers['content-length']);
            res.on('data', function(data): void {
                outStream.write(data);
                bytesWritten += Buffer.from(data).length;
                progressCallback(bytesWritten/bytesTotal);
            })
            res.on('end', function(): void {
                outStream.close();
                finished();
            })
        } else {
            throw new Error("HTTP Request returned no content-length header");
            process.exit(1);
        }
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