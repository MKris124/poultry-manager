const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn, execSync } = require('child_process');

let mainWindow;
let splashWindow; // ÚJ: Töltőképernyő változó
let backendProcess;

function createWindow() {
    // 1. TÖLTŐKÉPERNYŐ LÉTREHOZÁSA (Azonnal megjelenik)
    splashWindow = new BrowserWindow({
        width: 450,
        height: 300,
        frame: false,       // Ne legyen Windows ablakkerete (szebb így)
        alwaysOnTop: true,  // Maradjon legfelül, amíg tölt
        center: true,
        transparent: false,
        icon: path.join(__dirname, 'gooseicon.ico')
    });
    splashWindow.loadFile('splash.html');

    // 2. FŐABLAK LÉTREHOZÁSA (De egyelőre rejtve tartjuk!)
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        show: false, // FONTOS: Rejtve indul!
        title: "Baromfi Menedzser",
        icon: path.join(__dirname, 'gooseicon.ico'), 
        webPreferences: {
            nodeIntegration: false
        }
    });

    mainWindow.setMenuBarVisibility(false);

    let springArgs = [];
    let backendPath;
    let workingDirectory;

    if (app.isPackaged) {
        backendPath = path.join(__dirname, 'backend_bin', 'BaromfiMenedzser.exe');
        workingDirectory = path.join(__dirname, 'backend_bin');
        springArgs = ['--spring.profiles.active=prod']; 
    } else {
        backendPath = path.join(__dirname, 'backend_bin', 'BaromfiMenedzser.exe');
        workingDirectory = path.join(__dirname, 'backend_bin');
        springArgs = ['--spring.profiles.active=desktop'];
    }

    backendProcess = spawn(backendPath, springArgs, {
        cwd: workingDirectory
    });

    let isAppLoaded = false;

    const loadApp = () => {
        if (isAppLoaded) return;
        isAppLoaded = true;

        mainWindow.loadURL('http://localhost:8080')
            .catch((err) => {
                isAppLoaded = false;
                setTimeout(loadApp, 2000);
            });
    };

    let hasReloaded = false;

    mainWindow.on('ready-to-show', () => {
        if (!hasReloaded) {
            console.log("Elso betoltes kesz. Titkos hatter-frissites (Ctrl+R) inditasa...");
            hasReloaded = true;
            mainWindow.webContents.reload();
            
        } else {
            console.log("Masodik betoltes kesz. Ablak megjelenitese.");
            
            if (splashWindow && !splashWindow.isDestroyed()) {
                splashWindow.close();
            }
            
            mainWindow.show();
            mainWindow.maximize();

            setTimeout(checkForUpdates, 3000);
        }
    });

    backendProcess.stdout.on('data', (data) => {
        const output = data.toString();
        if (output.includes('Started') || output.includes('Tomcat started on port')) {
            setTimeout(loadApp, 500); 
        }
    });

    setTimeout(() => {
        if (!isAppLoaded) loadApp();
    }, 15000);

    mainWindow.on('closed', function () {
        mainWindow = null;
        app.quit();
    });
}

function killJavaOnPort8080() {
    if (process.platform === 'win32') {
        try {
            const output = execSync('netstat -ano | findstr :8080').toString();
            const lines = output.trim().split(/[\r\n]+/);
            lines.forEach(line => {
                if (line.includes('LISTENING')) {
                    const parts = line.trim().split(/\s+/);
                    const pid = parts[parts.length - 1];
                    if (pid && parseInt(pid) > 0) {
                        execSync(`taskkill /PID ${pid} /F`);
                    }
                }
            });
        } catch (e) {}
    } else {
        try { execSync('lsof -ti:8080 | xargs kill -9'); } catch (e) {}
    }
}

app.on('ready', createWindow);

app.on('will-quit', () => {
    if (backendProcess) backendProcess.kill(); 
    killJavaOnPort8080();
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

// ==========================================
// AUTOMATIKUS FRISSÍTÉS (AUTO-UPDATER) MODUL
// ==========================================
const https = require('https');
const fs = require('fs');
const { dialog } = require('electron');
const AdmZip = require('adm-zip');

const GITHUB_USER = 'MKris124'; 
const GITHUB_REPO = 'poultry-manager';              

function checkForUpdates() {
    if (!app.isPackaged) return; 

    const options = {
        hostname: 'api.github.com',
        path: `/repos/${GITHUB_USER}/${GITHUB_REPO}/releases/latest`,
        headers: { 'User-Agent': 'BaromfiMenedzser-AutoUpdater' }
    };

    https.get(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            if (res.statusCode === 200) {
                try {
                    const release = JSON.parse(data);
                    const latestVersion = release.tag_name.replace('v', '');
                    const currentVersion = app.getVersion().replace('v', '');

                    if (isNewerVersion(currentVersion, latestVersion)) {
                        const updateAsset = release.assets.find(a => a.name === 'update.zip');
                        if (updateAsset) {
                            promptForUpdate(updateAsset.browser_download_url, latestVersion);
                        }
                    }
                } catch (e) { console.error("Frissítés hiba:", e); }
            }
        });
    }).on('error', (err) => console.log("Hálózati hiba a frissítésnél", err));
}

function isNewerVersion(current, latest) {
    const c = current.split('.').map(Number);
    const l = latest.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
        if ((l[i] || 0) > (c[i] || 0)) return true;
        if ((l[i] || 0) < (c[i] || 0)) return false;
    }
    return false;
}

function promptForUpdate(downloadUrl, latestVersion) {
    dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Frissítés elérhető!',
        message: `Egy új verzió (v${latestVersion}) érhető el a Baromfi Menedzserből.\nSzeretnéd most letölteni és telepíteni?`,
        buttons: ['Igen, frissítés most', 'Később']
    }).then(result => {
        if (result.response === 0) {
            downloadAndInstallUpdate(downloadUrl);
        }
    });
}

function downloadZipFile(url, dest) {
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            if (response.statusCode === 301 || response.statusCode === 302) {
                return resolve(downloadZipFile(response.headers.location, dest));
            }
            if (response.statusCode !== 200) {
                return reject(new Error(`Sikertelen letöltés. Hálózati kód: ${response.statusCode}`));
            }
            
            const file = fs.createWriteStream(dest);
            response.pipe(file);
            
            file.on('finish', () => {
                file.close();
                resolve();
            });
            file.on('error', (err) => {
                fs.unlink(dest, () => {}); // Töröljük a hibás fájlt
                reject(err);
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => {});
            reject(err);
        });
    });
}

// Az új, PowerShell-mentes frissítő
async function downloadAndInstallUpdate(downloadUrl) {
    dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Frissítés letöltése...',
        message: 'A program letölti és előkészíti a frissítést. Kérlek, várj türelemmel!',
        buttons: ['Rendben']
    });

    const tempDir = process.env.TEMP;
    const zipPath = path.join(tempDir, 'baromfi_update.zip');
    const extractPath = path.join(tempDir, 'baromfi_update_files');
    const appPath = path.resolve(__dirname, '..', '..'); 
    const batPath = path.join(tempDir, 'update_baromfi.bat');

    try {
        // 1. Tiszta Node.js letöltés
        await downloadZipFile(downloadUrl, zipPath);

        // 2. Tiszta Node.js kicsomagolás (adm-zip)
        const zip = new AdmZip(zipPath);
        zip.extractAllTo(extractPath, true); // A 'true' felülírja a korábbi maradékokat

        // 3. A CMD .bat fájl létrehozása (Ezt nem tudjuk megúszni, mert a futó exe-t 
        // a Windows nem engedi felülírni, amíg be nem zárjuk a programot).
        const batContent = `
@echo off
title Frissites...
color 0A
timeout /t 3 /nobreak > NUL
taskkill /F /IM "BaromfiMenedzser.exe" > NUL 2>&1
taskkill /F /IM "java.exe" > NUL 2>&1
timeout /t 2 /nobreak > NUL

xcopy /s /y /e "${extractPath}\\*" "${appPath}\\"

start "" "${appPath}\\BaromfiMenedzser.exe"
del "%~f0"
        `;
        
        fs.writeFileSync(batPath, batContent);

        // 4. BAT fájl futtatása (Rendszergazdaként, de már NEM PowerShellből!)
        const { exec } = require('child_process');
        // VBScript-et használunk, hogy csendben, fekete ablak nélkül kérjen Rendszergazdai jogot
        const vbsPath = path.join(tempDir, 'run_admin.vbs');
        const vbsContent = `CreateObject("Shell.Application").ShellExecute "${batPath}", "", "", "runas", 1`;
        fs.writeFileSync(vbsPath, vbsContent);
        
        exec(`cscript //nologo "${vbsPath}"`);
        
        // 5. Kilépés, hogy a BAT fájl felülírhassa a fájlokat
        app.quit();

    } catch (error) {
        dialog.showErrorBox('Hiba a frissítés során', `Nem sikerült letölteni vagy kicsomagolni a fájlt.\n\nOk: ${error.message}`);
    }
}