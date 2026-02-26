const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const { spawn, execSync } = require('child_process');
const https = require('https');
const fs = require('fs');
const AdmZip = require('adm-zip');

let mainWindow;
let splashWindow; 
let backendProcess;

function createWindow() {
    // 1. TÖLTŐKÉPERNYŐ LÉTREHOZÁSA
    splashWindow = new BrowserWindow({
        width: 450,
        height: 300,
        frame: false,       
        alwaysOnTop: true,  
        center: true,
        transparent: false,
        icon: path.join(__dirname, 'gooseicon.ico')
    });
    splashWindow.loadFile('splash.html');

    // 2. FŐABLAK LÉTREHOZÁSA
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        show: false, 
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
                fs.unlink(dest, () => {}); 
                reject(err);
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => {});
            reject(err);
        });
    });
}

// +++ A VÉGLEGES, GRAFIKUS, LÁTHATATLAN FRISSÍTŐ +++
async function downloadAndInstallUpdate(downloadUrl) {
    const userChoice = dialog.showMessageBoxSync(mainWindow, {
        type: 'question',
        title: 'Frissítés telepítése',
        message: 'A program most letölti és telepíti a frissítést.\nKözben a főablak bezáródik. Folytathatjuk?',
        buttons: ['Igen, induljon a frissítés', 'Mégsem']
    });

    if (userChoice !== 0) return;

    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.hide();
    }

    const updateWindow = new BrowserWindow({
        width: 450,
        height: 300,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        webPreferences: { nodeIntegration: false }
    });

    const updateHtml = `
    <!DOCTYPE html>
    <html lang="hu">
    <head>
        <meta charset="UTF-8">
        <style>
            body { 
                font-family: 'Segoe UI', sans-serif; 
                background: #ffffff; 
                display: flex; flex-direction: column; align-items: center; justify-content: center; 
                height: 100vh; margin: 0; 
                border: 2px solid #10b981; border-radius: 12px; 
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                overflow: hidden; 
                box-sizing: border-box;
            }
            .spinner { 
                border: 4px solid #f3f3f3; border-top: 4px solid #10b981; 
                border-radius: 50%; width: 60px; height: 60px; 
                animation: spin 1s linear infinite; margin-bottom: 20px; 
            }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            h2 { color: #1f2937; margin: 0 0 10px; font-size: 1.4rem; }
            p { color: #6b7280; margin: 0; font-size: 0.95rem; text-align: center; padding: 0 20px; }
            .icon { font-size: 3rem; margin-bottom: 15px; }
        </style>
    </head>
    <body>
        <div class="icon">🐔</div>
        <div class="spinner"></div>
        <h2>Frissítés letöltése...</h2>
        <p>Kérlek várj, az új verzió előkészítése folyamatban van. Ez beletelhet néhány másodpercbe.</p>
    </body>
    </html>
    `;

    updateWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(updateHtml));

    const tempDir = process.env.TEMP;
    const zipPath = path.join(tempDir, 'baromfi_update.zip');
    const extractPath = path.join(tempDir, 'baromfi_update_files');
    const appPath = path.resolve(__dirname, '..', '..'); 
    const batPath = path.join(tempDir, 'update_baromfi.bat');

    try {
        await downloadZipFile(downloadUrl, zipPath);
        const zip = new AdmZip(zipPath);
        zip.extractAllTo(extractPath, true); 

        const batContent = `
@echo off
timeout /t 3 /nobreak > NUL
taskkill /F /IM "BaromfiMenedzser.exe" > NUL 2>&1
taskkill /F /IM "java.exe" > NUL 2>&1
timeout /t 2 /nobreak > NUL
xcopy /s /y /e "${extractPath}\\*" "${appPath}\\"
start "" "${appPath}\\BaromfiMenedzser.exe"
del "%~f0"
        `;
        fs.writeFileSync(batPath, batContent);

        const { exec } = require('child_process');
        const vbsPath = path.join(tempDir, 'run_admin.vbs');
        // A végén a 0 jelenti azt, hogy REJTETT ABLAKBAN fusson!
        const vbsContent = `CreateObject("Shell.Application").ShellExecute "${batPath}", "", "", "runas", 0`;
        fs.writeFileSync(vbsPath, vbsContent);
        
        exec(`cscript //nologo "${vbsPath}"`);
        
        if (!updateWindow.isDestroyed()) updateWindow.close();
        app.quit();

    } catch (error) {
        if (!updateWindow.isDestroyed()) updateWindow.close();
        dialog.showErrorBox('Hiba a frissítés során', `Nem sikerült letölteni a fájlt.\n\n${error.message}`);
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.show(); 
    }
}