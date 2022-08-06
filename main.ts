let keypress = require('keypress');
import * as fs from "fs";
import * as path from "path";
import * as process from "process";
import * as readline from "readline";
import { getAppdataPath } from "./src/modules/appdataPath";
import { createMenu } from "./src/modules/selectionMenu";

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
                selectModpack(mcPath);
            } else {
                //select a modpack
                selectModpack(mcPath);
            }
        } else {
            //select a modpack
            selectModpack(mcPath);
        }
    }
    //select a modpack
    function selectModpack(mcPath:string): void {
        createMenu(Array.apply(null, Array(20)).map(function(x, i) {return `Modpack ${i}`}), function(selection:string): void {
            console.log(`Selected: ${selection}`);
        }, function(): void {
            console.log(`Menu canceled`);
        }, "Please select a modpack (use the up/down arrow to navigate, and return to select):",
        10);
    }
}