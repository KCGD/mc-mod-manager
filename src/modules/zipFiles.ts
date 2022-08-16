import * as fs from "fs";
import * as path from "path";
import * as yazl from 'yazl';
import { recurse } from "./recursion";
import type { ZipFile } from "yazl";

export function ZipDir(rootPath:string, files:string[], output:string, callback:Function): void {
    let zip = new yazl.ZipFile();
    zip.outputStream.pipe(fs.createWriteStream(output)).on('close', function(): void {
        callback();
    })
    recursiveAddFiles(zip, rootPath, rootPath, files, function(): void {
        zip.end();
    })

    //recurses a directory to add to a  zip file
    //zip: the yazl zip file object
    //realRoot: the base directory (what will be "/" in the zip file)
    //currentRoot: the current folder that is being recursed
    //files: a list of files / directories to be indexed in the currentRoot
    //callback: function to be called once recursion finishes
    function recursiveAddFiles(zip:ZipFile, realRoot:string, currentRoot:string, files:string[], callback:Function): void {
        recurse(files, function(item:string, next:Function): void {
            let currentFile:string = path.join(currentRoot, item);
            if(fs.statSync(currentFile).isDirectory()) {
                zip.addEmptyDirectory(path.relative(realRoot, currentFile));
                recursiveAddFiles(zip, realRoot, currentFile, fs.readdirSync(currentFile), function(): void {
                    next();
                })
            } else {
                zip.addFile(currentFile, path.relative(realRoot, currentFile));
                next();
            }
        },function() {
            callback();
        })
    }
}