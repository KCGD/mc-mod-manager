import * as fs from "fs";
import * as path from "path";
import { recurse } from "./recursion";
import * as configParser from "./configParser";

interface localRepoCallbackInterface {
    (repoData:undefined|RepoData[], error:string|undefined): void;
}
export type RepoData = {
    "version":string,
    "name":string,
    "error":string|undefined,
    "path":string
}

export function getLocalRepo(modRepoPath:string, callback:localRepoCallbackInterface): void {
    if(fs.existsSync(modRepoPath)) {
        let localRepoIndex:string[] = fs.readdirSync(modRepoPath);
        if(localRepoIndex.length > 0) {
            let repoData:RepoData[] = [];
            recurse(localRepoIndex, function(currentModpack:string, next:Function) {
                configParser.parse(path.join(modRepoPath, currentModpack, "info"), path.join(modRepoPath, currentModpack, "info.defaults.json"), function (parsed:any) {
                    repoData.push({
                        "version":parsed.VERSION,
                        "name":parsed.NAME,
                        "error":undefined,
                        "path":currentModpack
                    })
                    next();
                })
            }, function(){
                callback(repoData, undefined);
            })
        } else {
            callback (undefined, "ERR_EMPTY_REPO")
        }
    } else {
        callback (undefined, "ERR_NO_REPO")
    }
}