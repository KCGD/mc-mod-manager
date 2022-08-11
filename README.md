# ABOUT

This is a mod manager for minecraft! Its designed to be the successor to my previous mod manager, being more stable and having lots of new features.

## Differences

* Manager is self contained. It wont need to download and install another program
* TUI (terminal ui) instead of a GUI
* Support for custom modpack repos
* Support for easily switching between modpacks
* Better integration with minecraft's modding system (now supports configs as well as traditional mods)

# INSTALLING
## Installing regularly (not available yet)

A binary release of the program should be available in the "releases" section

## Building from source
### Installing dependencies
Install nodejs, npm git and make

### Windows:
Download and install these:

* https://nodejs.org/en/download/
* https://gitforwindows.org/
* http://gnuwin32.sourceforge.net/downlinks/make.php

### Linux:
Arch:
```bash
pacman -S --needed nodejs npm git make
```
Debian / Debian based:
```bash
apt install nodejs npm git make
```

### Downloading and building the code
Use git to download the code
```bash
git clone https://github.com/KCGD/mc-mod-manager.git
cd mc-mod-manager
```

Download the program's dependencies with `npm`
```bash
npm i
```

Build the code
``` bash
make
```

Install (Linux only... for now)
``` bash
sudo/doas make install
```

Clean (optional - can help resolve clutter if you want to contribute code)
``` bash
make clean
```