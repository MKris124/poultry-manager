const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn, execSync } = require('child_process');

let mainWindow;
let backendProcess;

function createWindow() {
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
        // JAVÍTVA: process.resourcesPath helyett __dirname!
        // Így a main.js pontosan maga mellett fogja keresni a backend_bin mappát.
        backendPath = path.join(__dirname, 'backend_bin', 'BaromfiMenedzser.exe');
        
        // JAVÍTVA: A munkakönyvtár legyen az exe saját mappája
        workingDirectory = path.join(__dirname, 'backend_bin');
        springArgs = ['--spring.profiles.active=prod']; 
        
    } else {
        backendPath = path.join(__dirname, 'backend_bin', 'BaromfiMenedzser.exe');
        workingDirectory = path.join(__dirname, 'backend_bin');
        springArgs = ['--spring.profiles.active=desktop'];
    }

    console.log("Inditasi profil: " + springArgs[0]);
    console.log("Backend inditasa innen: " + backendPath);
    console.log("Munkakonyvtar (DB helye): " + workingDirectory);

    backendProcess = spawn(backendPath, springArgs, {
        cwd: workingDirectory
    });

    backendProcess.stdout.on('data', (data) => console.log(`Log: ${data}`));
    backendProcess.stderr.on('data', (data) => console.error(`Err: ${data}`));
    
    const loadApp = () => {
        mainWindow.loadURL('http://localhost:8080')
            .then(() => {
                mainWindow.show(); 
                mainWindow.maximize();
            })
            .catch((err) => {
                setTimeout(loadApp, 8000);
            });
    };

    loadApp();

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
                        console.log(`Backend megtalalva a 8080-as porton. PID: ${pid}. Leallitas...`);
                        execSync(`taskkill /PID ${pid} /F`);
                    }
                }
            });
        } catch (e) {
            console.log("Nem talalható folyamat a 8080-as porton, vagy mar leallt.");
        }
    } else {
        try {
            execSync('lsof -ti:8080 | xargs kill -9');
        } catch (e) {}
    }
}

app.on('ready', createWindow);

app.on('will-quit', () => {
    if (backendProcess) {
        backendProcess.kill(); 
    }
    
    killJavaOnPort8080();
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});