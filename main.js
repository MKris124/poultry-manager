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

    mainWindow.once('ready-to-show', () => {
        if (splashWindow && !splashWindow.isDestroyed()) {
            splashWindow.close();
        }
        mainWindow.show();
        mainWindow.maximize();
        

        // +++ ITT INDÍTJUK EL A FRISSÍTÉS KERESÉSÉT +++
        setTimeout(checkForUpdates, 3000); // Adunk neki 3 mp-et, hogy nyugodtan betöltsön a felület
    });

    // FIGYELJÜK A JAVA LOGJÁT
    backendProcess.stdout.on('data', (data) => {
        const output = data.toString();
        // Ha a Java végzett, rászólunk a rejtett főablakra, hogy töltse be az URL-t
        if (output.includes('Started') || output.includes('Tomcat started on port')) {
            setTimeout(loadApp, 500); 
        }
    });

    // Biztonsági háló
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

function downloadAndInstallUpdate(downloadUrl) {
    dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Frissítés folyamatban...',
        message: 'A frissítés letöltése és telepítése megkezdődött. A program hamarosan újraindul...',
        buttons: ['Rendben']
    });

    const tempDir = process.env.TEMP;
    const zipPath = path.join(tempDir, 'baromfi_update.zip');
    const extractPath = path.join(tempDir, 'baromfi_update_files');
    const appPath = path.resolve(__dirname, '..', '..'); // A Program Files mappája
    const batPath = path.join(tempDir, 'update_baromfi.bat');

    // 1. Letöltés és kicsomagolás PowerShell segítségével
    const psCommand = `
        Invoke-WebRequest -Uri "${downloadUrl}" -OutFile "${zipPath}"
        if (Test-Path "${extractPath}") { Remove-Item "${extractPath}" -Recurse -Force }
        Expand-Archive -Path "${zipPath}" -DestinationPath "${extractPath}" -Force
    `;

    exec(`powershell -Command "${psCommand}"`, (error) => {
        if (error) {
            dialog.showErrorBox('Hiba', 'Nem sikerült letölteni a frissítést.');
            return;
        }

        // 2. Létrehozunk egy háttérben futó .bat fájlt, ami felülírja a fájlokat
        const batContent = `
@echo off
timeout /t 3 /nobreak > NUL
xcopy /s /y /e "${extractPath}\\*" "${appPath}\\"
start "" "${appPath}\\BaromfiMenedzser.exe"
del "%~f0"
        `;
        fs.writeFileSync(batPath, batContent);

        // 3. Elindítjuk a .bat fájlt Rendszergazdaként (hogy felül tudja írni a Program Files-t), majd kilépünk
        const psRunAs = `Start-Process -FilePath "${batPath}" -WindowStyle Hidden -Verb RunAs`;
        exec(`powershell -Command "${psRunAs}"`);
        
        app.quit();
    });
}