import { join } from "path";
import { platform, homedir } from "os";
export function getAppdataPath(): string {
    //get platform
    switch(platform()) {
        case "win32":
            return join(homedir(), "AppData", "Roaming");
        break;
        case "darwin":
            return join(homedir(), "Library", "Application Support");
        break;
        case "linux":
            return homedir();
        break;
        default:
            throw new Error(`Unknown platform "${platform()}"`);
        break;
    }
}