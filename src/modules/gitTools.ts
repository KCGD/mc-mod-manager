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
                console.log(data.toString());
                callback(undefined, new Error("Bad response structure from git repo"));
            }
        } else {
            callback(undefined, error);
        }
    })

    //CACHED RESPONSE
    // let cachedGitResponseTest:GitResponse = JSON.parse(`{"sha":"f26942da3432f804f6c7d4b622b1a14aef1fc71e","url":"https://api.github.com/repos/KCGD/modpack-repository/git/trees/f26942da3432f804f6c7d4b622b1a14aef1fc71e","tree":[{"path":".gitattributes","mode":"100644","type":"blob","sha":"7c32d5f79cd37d63f8ee88ddcb90f4ec82dc5c8b","size":42,"url":"https://api.github.com/repos/KCGD/modpack-repository/git/blobs/7c32d5f79cd37d63f8ee88ddcb90f4ec82dc5c8b"},{"path":"README.md","mode":"100644","type":"blob","sha":"212b9eae2db25c5659aa5c6633513212111c111a","size":332,"url":"https://api.github.com/repos/KCGD/modpack-repository/git/blobs/212b9eae2db25c5659aa5c6633513212111c111a"},{"path":"genIndex.sh","mode":"100755","type":"blob","sha":"480b555213d8df41eff3b52cceaa97db2769e0b5","size":27,"url":"https://api.github.com/repos/KCGD/modpack-repository/git/blobs/480b555213d8df41eff3b52cceaa97db2769e0b5"},{"path":"index","mode":"100644","type":"blob","sha":"3adef33c9b0e632e1eeb8c18714d1f4bf523f42a","size":24,"url":"https://api.github.com/repos/KCGD/modpack-repository/git/blobs/3adef33c9b0e632e1eeb8c18714d1f4bf523f42a"},{"path":"modpacks","mode":"040000","type":"tree","sha":"d9f240c25bfe2fe2db93fdf3d191d9e15943f39c","url":"https://api.github.com/repos/KCGD/modpack-repository/git/trees/d9f240c25bfe2fe2db93fdf3d191d9e15943f39c"}],"truncated":false}`);
    // callback(cachedGitResponseTest, undefined);
}