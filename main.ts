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
 */

let keypress = require('keypress');
import * as fs from "fs";
import * as path from "path";
import * as process from "process";
import * as config from "./config";
import * as readline from "readline";
import { createMenu } from "./src/modules/selectionMenu";
import type { menuObject } from "./src/modules/selectionMenu";
import { getLocalRepo } from "./src/modules/localModRepo";
import type { RepoData } from "./src/modules/localModRepo";
import { getAppdataPath } from "./src/modules/appdataPath";
import { recurse } from "./src/modules/recursion";


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
let args = {}

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
        }
    }
    //confirm appdata path
    confirmAppdataPath(path.join(getAppdataPath(), ".minecraft/"));
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
        if(fs.existsSync(path.join(mcPath, "mods/"))) {
            if(fs.readdirSync(path.join(mcPath, "mods/")).length > 0) {
                //mods present, ask to make backup, then select a modpack
                getRepoInfo(path.join(mcPath, "modBackupRepo"), mcPath);
            } else {
                //select a modpack
                getRepoInfo(path.join(mcPath, "modBackupRepo"), mcPath);
            }
        } else {
            //select a modpack
            getRepoInfo(path.join(mcPath, "modBackupRepo"), mcPath);
        }
    }
    //pull index from the repo (special case for local repo)
    function getRepoInfo(modRepoPath:string, mcPath:string): void {
        let menuItems:menuObject[] = [];
        recurse(config.RepoList, function(repoType:string, next:Function) {
            if(repoType === "local") {
                getLocalRepo(modRepoPath, function(repoData, error): void {
                    if(!error && repoData) {
                        //merge into menu list
                        for(var j = 0; j < repoData.length; j++) {
                            menuItems.push({
                                "path":path.join(modRepoPath, repoData[j].path),
                                "type":"local",
                                "version":repoData[j].version,
                                "name":repoData[j].name
                            })
                        }
                        next();
                    } else {
                        switch(error) {
                            case "ERR_NO_REPO":
                                throw new Error (error);
                            break;
                            default:
                                throw new Error(error);
                            break;
                        }
                    }
                })
            } else {
                //git repo
                next();
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
            console.log(selection);
        }, function(): void {
            console.log(`Menu canceled`);
        }, "Please select a modpack (use the up/down arrow to navigate, and return to select):",
        10);
    }
}