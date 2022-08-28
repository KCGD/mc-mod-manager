import * as columnify from "columnify";

interface onSelectionInterface {
    (selection:menuObject): void;
}
interface onCancelInterface {
    (): void;
}

//setup menuObject type
export type menuObject = {
    "path":string,
    "type": string,
    "version":string,
    "name":string,
    "local":boolean
}

//setup menu table
type menuTable = {
    "Selected:":string,
    "Name:":string,
    "Version:":string,
    "Repo:":string,
    "Installed:":string
}

//create menu function: menu (string[]), on selection function (selection), on cancel function, message, max items
export function createMenu(menu:menuObject[], onSelection:onSelectionInterface, onCancel:onCancelInterface, message:string|undefined, maxRenderedItems:number) {
    //set up menu
    let currentSelection:number=0;
    let renderOffset = 0;
    renderMenu();
    process.stdin.on('keypress', keyPressHandler);
    function keyPressHandler (char:any, key:any): void {
        //console.log(key.name);
        switch(key.name) {
            case "up":
                if(currentSelection > 0) {
                    currentSelection--;
                    renderMenu();
                }
            break;
            case "down":
                if(currentSelection < menu.length - 1) {
                    currentSelection++;
                    renderMenu();
                }
            break;
            case "return":
                process.stdin.removeListener('keypress', keyPressHandler);
                onSelection(menu[currentSelection]);
            break;
            case "escape":
                process.stdin.removeListener('keypress', keyPressHandler);
                onCancel();
            break;
        }
    }
    function renderMenu() {
        //if the current selection is not rendered by default, set the offset to have the current selection at the bottom, else set it to 0
        if(currentSelection + 1 > maxRenderedItems ) {
            renderOffset = Math.abs(maxRenderedItems - (currentSelection + 1));
        } else {
            renderOffset = 0;
        }
        //render the menu (clear -> message -> menu items)
        console.clear();
        if(message) {
            console.log(message);
        }
        let renderedItemsCount = 0; //seperate counter for rendered items, i can be offset
        let table:menuTable[] = []
        for(let i=renderOffset; i < menu.length && renderedItemsCount < maxRenderedItems; i++) {
            renderedItemsCount++;
            let selectionChar = " ";
            if(i === currentSelection){
                selectionChar = "*";
            }
            //console.log(`[${selectionChar}] ${menu[i].name} on Minecraft ${menu[i].version} (${menu[i].type.toUpperCase()})`);
            table.push({
                "Selected:":`[${selectionChar}]`,
                "Name:":menu[i].name,
                "Version:":menu[i].version,
                "Repo:":menu[i].type,
                "Installed:":menu[i].local.toString()
            })
        }
        //cleanerTable(table);
        console.log("");
        console.log(columnify.default(table, 
            {
                columns:["Selected:", "Name:", "Version:", "Repo:", "Installed:"],
                "minWidth":17
            }));
        console.log(`\nmore...`);
    }
}