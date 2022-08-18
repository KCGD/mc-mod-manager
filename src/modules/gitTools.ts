import { fetchToCallback } from "./httpTools";

export type GitTreeElement = {
    "path":string,
    "mode":string,
    "type":string,
    "sha":string,
    "size":number,
    "url":string
}
export type GitResponse = {
    "sha":string,
    "url":string,
    "truncated":boolean,
    "tree":GitTreeElement[]
}

interface LsRepoCallback {
    (response:GitResponse|undefined, error:Error|undefined): void
}

//takes the repo original url and converts it to the github api requivalent
export function repoUrlToApi(url:string): string {
    let repoUrl:URL = new URL(url);
    let parsedPathname:string[] = repoUrl.pathname.split('/').filter(function(item:string): string|undefined {
        if(item !== '') {
            return item;
        } else {
            return undefined
        }
    })
    repoUrl.host = 'api.github.com';
    repoUrl.hostname = 'api.github.com';
    parsedPathname.unshift("repos");
    parsedPathname = parsedPathname.concat(["git", "trees", "main"]);
    repoUrl.search = '?recursive=1';
    repoUrl.pathname = `/${parsedPathname.join("/")}`;
    return repoUrl.toString();
}

//takes the repo original url and a path (as string[]) and returns a raw.githubusercontent url
export function repoUrlToRaw(url:string, path:string[]): string {
    let repoUrl:URL = new URL(url);
    let parsedPathname:string[] = repoUrl.pathname.split('/').filter(function(item:string): string|undefined {
        if(item !== '') {
            return item;
        } else {
            return undefined
        }
    })
    parsedPathname = parsedPathname.concat(["main"].concat(path));
    repoUrl.pathname = `/${parsedPathname.join("/")}`; //TEST
    repoUrl.host = 'raw.githubusercontent.com';
    repoUrl.hostname = 'raw.githubusercontent.com';
    return repoUrl.toString();
}

//takes a repo's api link and returns a parsed list of it's files
export function lsRepo(repoLinkAsApi:string, callback:LsRepoCallback): void {
    fetchToCallback(repoLinkAsApi, function(data, error): void {
        if(!error) {
            try {
                //if this succeedes, the returned data matches the GitResponse structure and can be returned, else go to catch()
                let gitResponseTest:GitResponse = JSON.parse(data.toString());
                callback(gitResponseTest, undefined);
            } catch (e) {
                callback(undefined, new Error("Bad response structure from git repo"));
            }
        } else {
            callback(undefined, error);
        }
    })
}