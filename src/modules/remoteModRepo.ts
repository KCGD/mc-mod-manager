
import { recurse } from "./recursion";
import * as path from 'path';
import * as gitTools from "./gitTools";
import * as configParser from "./configParser";
import { GitTreeElement, repoUrlToApi, repoUrlToRaw } from "./gitTools";
import type { RepoData } from "./localModRepo";
import { fetchToCallback } from "./httpTools";
import { parseFromBuffer } from "./configParser-buffer";

interface localRepoCallbackInterface {
    (repoData:undefined|RepoData[], error:Error|undefined): void;
}

//get initial list of files for the git repo
export function getRemoteRepo(repoUrl:string, callback:localRepoCallbackInterface): void {
    gitTools.lsRepo(repoUrlToApi(repoUrl), function(response, error): void {
        if(error && response === undefined) {
            callback(undefined, error);
        } else {
            if(response) {
                findModpackPath(response, repoUrl, callback);
            }
        }
    })
}

//find the "modpacks" directory within the repo
function findModpackPath(repoFiles:gitTools.GitResponse, repoUrl:string, callback:localRepoCallbackInterface): void {
    repoFiles.tree.forEach(function(treeElement:GitTreeElement): void {
        if(treeElement.path === "modpacks") {
            lsModpackPath(treeElement.url, repoUrl, callback);
        }
    })
}

//once in the modpacks (consider path[] as a directory), ls the modpacks directory and generate the path for each modpack in there
function lsModpackPath(modpathUrlAsApi:string, repoUrl:string, callback:localRepoCallbackInterface): void {
    let modpackPaths:string[][] = [];
    gitTools.lsRepo(modpathUrlAsApi, function(response, error): void {
        if(response) {
            recurse(response?.tree, function(item:GitTreeElement, next:Function): void {
                modpackPaths.push(["modpacks"].concat([item.path]));
                next();
            }, function(): void {
                generateInfoUrls(modpackPaths, repoUrl, callback);
            })
        }
    })
}

//convert each modpack path to an info url (raw.githubusercontent)
function generateInfoUrls(modpackPaths:string[][], repoUrl:string, callback:localRepoCallbackInterface): void {
    let modpackInfoUrls:string[] = [];
    recurse(modpackPaths, function(currentPath:string[], next:Function): void {
        modpackInfoUrls.push(repoUrlToRaw(repoUrl, currentPath.concat(['info'])));
        next();
    }, function(): void {
        pullRepoInfo(modpackInfoUrls, repoUrl, callback);
    })
}

//pull info from the info files and export the RepoData list through the callback
function pullRepoInfo(modpackInfoUrls:string[], repoUrl:string, callback:localRepoCallbackInterface): void {
    let RepoInfoList:RepoData[] = [];
    recurse(modpackInfoUrls, function(infoUrl:string, next:Function): void {
        fetchToCallback(infoUrl, function(data, error): void {
            if(!error) {
                parseFromBuffer(data, function(parsed:any): void {
                    let infoUrlPath:string[] = new URL(infoUrl).pathname.split("/");
                    RepoInfoList.push({
                        "version":parsed.VERSION,
                        "name":parsed.NAME,
                        "error":undefined,
                        "path":path.dirname(infoUrl),
                        "reponame":`${infoUrlPath[1]}/${infoUrlPath[2]}`
                    })
                    next();
                })
            }
        })
    }, function(): void {
        callback(RepoInfoList, undefined);
    })
}