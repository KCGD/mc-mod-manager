/**
 * TODO:
 *      Make config file (config.ts), use exports to store settings (like dwm)
 *      When backing up mods, make a local repo where they can be restored / installed from. (mark as local in modpack menu)
 *          Mark official repos too, allow config to pull from multiple repos
 * 
 *      How this will probably work:
 *          The local repo support is good right now. Git and other remotes are non-existant
 *          Download the config zip and the mod list from the git repo
 *          Download the actual mod from curseforge using their API
 *          Store the mods and unpacked config in the local repo    
 * 
 *      Other possible method (best current method)
 *          DO host the mod repo on github, but have it give a link to where to download the mods zip from
 *      
 */

let keypress = require('keypress');
import * as fs from "fs";
import { tmpdir, homedir } from "os";
import * as path from "path";
import * as fsExt from "fs-extra";
import * as process from "process";
import * as readline from "readline";
import * as config from "./config";
import { recurse } from "./src/modules/recursion";
import { renderBar } from "./src/modules/progressBar";
import { ZipDir, Unzip } from './src/modules/zipFiles';
import { FuzzySearch } from "./src/modules/fuzzySearch";
import { createMenu } from "./src/modules/selectionMenu";
import { getLocalRepo } from "./src/modules/localModRepo";
import type { RepoData } from "./src/modules/localModRepo";
import { getAppdataPath } from "./src/modules/appdataPath";
import { getRemoteRepo } from './src/modules/remoteModRepo';
import type { menuObject } from "./src/modules/selectionMenu";
import type { FuzzySearchResult } from "./src/modules/fuzzySearch";
import { fetchToFile, fetchToCallback } from "./src/modules/httpTools";


//create template for user argument parsing
//only flags that require aditional arguments will be assigned here
let knownFlags:string[] = ["--help", "-h"];

//create readline interface
const rl = readline.createInterface({
    input:process.stdin,
    output:process.stdout
})

//setup stdin
keypress(process.stdin);
process.stdin.setRawMode(true);
process.stdin.resume();

//store process arguments
let args = {};

//setup and unpack config
type globalConfig = {
    "RepoList":string[],
    "SearchThreshhold":number,
    "SearchSampleSize":number,
    "API_User_Agent":string,
    "Use_Cached_Git_Response":boolean
}
let configPath:string = path.join(homedir(), ".config/mcModInstaller/config.ts");
if(!fs.existsSync(path.dirname(configPath))) {
    fs.mkdirSync(path.dirname(configPath), {"recursive": true});
    fs.copyFileSync(path.join(__dirname, "src/assets/defaults/config.ts"), configPath);
}

//main function
Main();
function Main(): void {
    //parse process arguments
    for(let i:number = 0; i < process.argv.length; i++) {
        if(process.argv[i].startsWith("-") && !knownFlags.includes(process.argv[i])) {
            console.log(`[WARNING]: Unknown option "${process.argv[i]}"`);
        }
        switch(process.argv[i]) {
            case "--help":
            case "-h":
                console.log(fs.readFileSync(path.join(__dirname, "./src/HelpFile")).toString());
                process.exit(0);
            break;
            
            default:
                confirmAppdataPath(path.join(getAppdataPath(), ".minecraft/"));
            break;
        }
    }
    //confirm appdata path
    function confirmAppdataPath(mcPath:string): void {
        rl.question(`Minecraft is stored in "${mcPath}". Is this correct? [y/n]: `, function(answer:string): void {
            if(answer.toLowerCase().replace(/(\r\n|\n|\r)/gm, "") === "y") {
                //procees
                verifyMcPathExistance(mcPath);
            } else {
                rl.question(`What is the correct directory for minecraft?: `, function(correctPath:string): void {
                    verifyMcPathExistance(correctPath.replace(/(\r\n|\n|\r)/gm, ""));
                })
            }
        })
    }
    //verify minecraft path exists
    function verifyMcPathExistance(mcPath:string): void {
        if(fs.existsSync(mcPath)) {
            createBackupIfNeeded(mcPath);
        } else {
            rl.question(`This directory does not exist. What is Minecraft's directory?: `, function(mcPath:string): void {
                confirmAppdataPath(mcPath.replace(/(\r\n|\n|\r)/gm, ""));
            })
        }
    }
    //createBackupIfNeeded
    function createBackupIfNeeded(mcPath:string): void {
        if(fs.existsSync(path.join(mcPath, "mods"))) {
            if(fs.readdirSync(path.join(mcPath, "mods")).length > 0) {
                //mods present, ask to make backup, then select a modpack
                rl.question(`It looks like you already have some mods installed. Would you like to create a backup? [y/n]: `, function(answer:string): void {
                    if(answer.toLocaleLowerCase() === "y") {
                        BackupCurrentMods(mcPath);
                    } else {
                        getRepoInfo(path.join(mcPath, "modBackupRepo"), mcPath);
                    }
                })
            } else {
                //select a modpack
                getRepoInfo(path.join(mcPath, "modBackupRepo"), mcPath);
            }
        } else {
            //select a modpack
            getRepoInfo(path.join(mcPath, "modBackupRepo"), mcPath);
        }
    }

    //create backup of current mods and configs, add to local repo
    function BackupCurrentMods(mcPath:string): void {
        rl.question("What name would you like to assign to this backup?: ", function(backupName:string): void {
            rl.question("What game version and client are your mods for? (eample: 1.19 Forge): ", function(backupVersion:string): void {
                let modPath:string = path.join(mcPath, "mods");
                let configPath:string = path.join(mcPath, "config");
                let localRepo:string = path.join(mcPath, "modBackupRepo");
                let modList:string[] = fs.readdirSync(modPath);
                let configList:string[] = fs.readdirSync(configPath);
                let backupPath = path.join(localRepo, `${backupName} - ${backupVersion}`);
                //index the correct configs according to the mods list (using fuzzy search)
                //generates a list of files in the config folder to be added to the modpack zip
                let configSearchResults:FuzzySearchResult[] = [];
                for(var modIter = 0; modIter < modList.length; modIter++) {
                    configSearchResults = configSearchResults.concat(FuzzySearch(configList, modList[modIter], config.SearchThreshhold, config.SearchSampleSize));
                }
                console.log(configSearchResults);
                let currentBackupPath:string = path.join(localRepo, `${backupName} - ${backupVersion}`);
                fs.mkdirSync(currentBackupPath);
                console.log("Compressing configs...");
                ZipDir(configPath, configSearchResults.map(function(item): string {return item.contestant}), path.join(currentBackupPath, "configs.zip"), function(): void {
                    console.log("Compressing mods (this may take a while)...");
                    ZipDir(modPath, modList, path.join(currentBackupPath, "mods.zip"), function(): void {
                        console.log("Writing info...");
                        fs.writeFileSync(path.join(currentBackupPath, "info"), fs.readFileSync(path.join(__dirname, "src/assets/templates/modPackInfo/info")).toString()
                            .replace('{version}', backupVersion)
                            .replace("{name}", backupName)
                        )
                        fs.copyFileSync(path.join(__dirname, "src/assets/templates/modPackInfo/info.defaults.json"), path.join(currentBackupPath, "info.defaults.json"));
                        rl.question("Backup created - no issues reported. Proceed to modpack installer menu? [y/n]: ", function(answer:string): void {
                            if(answer.toLowerCase() === "y") {
                                getRepoInfo(path.join(mcPath, "modBackupRepo"), mcPath);
                            } else {
                                process.exit(0);
                            }
                        })
                    })
                });
            })
        })
    }

    //pull index from the repo (special case for local repo)
    function getRepoInfo(modRepoPath:string, mcPath:string): void {
        let menuItems:menuObject[] = [];
        console.log("Getting modpack info from repositories...");
        recurse(config.RepoList, function(repo:string, next:Function) {
            if(repo === "local") {
                getLocalRepo(modRepoPath, function(repoData, error): void {
                    if(!error && repoData) {
                        //merge into menu list
                        for(var j = 0; j < repoData.length; j++) {
                            menuItems.push({
                                "path":path.join(modRepoPath, repoData[j].path),
                                "type":"local",
                                "version":repoData[j].version,
                                "name":repoData[j].name,
                                "local":true
                            })
                        }
                        next();
                    } else {
                        switch(error) {
                            case "ERR_NO_REPO":
                                //create repo and proceed to remote repos, this will prevent this error from firing again.
                                fs.mkdirSync(path.join(mcPath, "modBackupRepo"));
                                next();
                            break;
                            case "ERR_EMPTY_REPO":
                                //this can be ignored, no local repos will be present in modpack search
                                next();
                            break;
                            default:
                                throw new Error(error);
                            break;
                        }
                    }
                })
            } else {
                //git repo
                getRemoteRepo(repo, function(response, error){
                    if(error) {
                        throw error;
                    } else if(response) {
                        for(var i = 0; i < response.length; i++) {
                            menuItems.push({
                                "local":false,
                                "name":response[i].name,
                                "version":response[i].version,
                                "path":response[i].path,
                                "type":response[i].reponame
                            })
                        }
                        next();
                    }
                });
            }
        }, function() {
            selectModpack(mcPath, menuItems);
        })
    }
    //select a modpack
    function selectModpack(mcPath:string, menu:menuObject[]): void {
        console.log(menu);
        //test modpack function: Array.apply(null, Array(20)).map(function(x, i) {return `Modpack ${i}`})
        createMenu(menu, function(selection:menuObject): void {
            if(selection.local) {
                installLocalRepo(mcPath, selection);
            } else {
                downloadRemoteRepo(mcPath, selection);
            }
        }, function(): void {
            console.log(`Abort.`);
            process.exit(0);
        }, "Please select a modpack (use the up/down arrow to navigate, and return to select):",
        10);
    }
}

function downloadRemoteRepo(mcPath:string, repo:menuObject): void {
    let localRepoPath:string = path.join(mcPath, "modBackupRepo", repo.name);
    fs.mkdirSync(localRepoPath);
    //download modpack files
    console.log("Download modpack info...");
    fetchToCallback(path.join(repo.path, "info"), function(data, error): void {
        fs.writeFileSync(path.join(localRepoPath, "info"), data);
        fetchToCallback(path.join(repo.path, "info.defaults.json"), function(data, error): void {
            fs.writeFileSync(path.join(localRepoPath, "info.defaults.json"), data);
            fetchToCallback(path.join(repo.path, "modArchiveLink"), function(data, error): void {
                fetchToFile(data.toString(), path.join(localRepoPath, "mods.zip"), function(progressPercent:number): void {
                    let roundedPercent:number = Math.round(progressPercent*100);
                    process.stdout.cursorTo(0);
                    process.stdout.write(renderBar(`Downloading mods [{bar}] - ${roundedPercent}%`, roundedPercent)); 
                }, function(): void {
                    console.log(""); //new line
                    fetchToFile(path.join(repo.path, "configs.zip"), path.join(localRepoPath, "configs.zip"), function(progressPercent:number): void {
                        let roundedPercent:number = Math.round(progressPercent*100);
                        process.stdout.cursorTo(0);
                        process.stdout.write(renderBar(`Downloading configs [{bar}] - ${roundedPercent}%`, roundedPercent)); 
                    }, function(): void {
                        console.log(""); //new line
                        installLocalRepo(mcPath, repo);
                    });
                });
            })
        })
    })
}

function installLocalRepo(mcPath:string, repo:menuObject): void {
    let localRepoPath:string = path.join(mcPath, "modBackupRepo", repo.name);
    let tmpPath:string = path.join(tmpdir(), "mcModInstaller");
    fs.mkdirSync(tmpPath);
    let modsPath:string = path.join(mcPath, "mods");
    let configsPath:string = path.join(mcPath, "config");
    let tmpConfigsPath:string = path.join(tmpPath, "config");
    fs.mkdirSync(tmpConfigsPath);
    let modsList:string[] = fs.readdirSync(modsPath);
    //clear the mods folder
    console.log("Unpacking mods...");
    for(var i=0; i < modsList.length; i++) {
        fs.unlinkSync(path.join(modsPath, modsList[i]));
    }
    Unzip(path.join(localRepoPath, "mods.zip"), modsPath, function(error): void {
        if(error) {throw error};
        //unpack configs into tmp
        console.log("Unpacking configs...");
        Unzip(path.join(localRepoPath, "configs.zip"), tmpConfigsPath, function(error): void {
            if(error) {throw error};
            let configList:string[] = fs.readdirSync(tmpConfigsPath);
            //fuzzy search configs to find older / incorrect versions
            let configSearchResults:FuzzySearchResult[] = [];
            for(var modIter = 0; modIter < modsList.length; modIter++) {
                configSearchResults = configSearchResults.concat(FuzzySearch(configList, modsList[modIter], config.SearchThreshhold, config.SearchSampleSize));
            }
            console.log("Removing old configs...");
            for(var i = 0; i < configSearchResults.length; i++) {
                try {
                    fs.unlinkSync(path.join(configsPath, configSearchResults[i].contestant));
                } catch (e) {
                    //config files may or may not exist. this error can be ignored. 
                }
            }
            console.log("Installing new configs...");
            fsExt.copySync(tmpConfigsPath, configsPath);
            console.log("Removing temporaries...");
            fs.rmdirSync(tmpPath, { recursive: true });
            console.log("Modpack installed - no issues reported.");
            process.exit(0);
        })
    })
}