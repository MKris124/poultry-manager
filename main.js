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

    // 3. A NAGY CSERE: Amikor az Angular betöltött, eltüntetjük a splash-t és mutatjuk a főablakot
    mainWindow.once('ready-to-show', () => {
        if (splashWindow && !splashWindow.isDestroyed()) {
            splashWindow.close();
        }
        mainWindow.show();
        mainWindow.maximize();
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