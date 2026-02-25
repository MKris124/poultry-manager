[Setup]
AppName=Baromfi Menedzser
AppVersion=1.2
AppPublisher=MKris124
DefaultDirName={autopf}\BaromfiMenedzser
DefaultGroupName=Baromfi Menedzser
OutputBaseFilename=BaromfiMenedzser_Telepito
; Relatív útvonal az ikonhoz
SetupIconFile=gooseicon.ico
Compression=lzma2/max
SolidCompression=yes
PrivilegesRequired=admin
ArchitecturesInstallIn64BitMode=x64compatible

[Files]
; Relatív útvonal az Electron által kidobott kész fájlokhoz
Source: "build_temp\dist\BaromfiMenedzser-win32-x64\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "gooseicon.ico"; DestDir: "{app}"; DestName: "app_icon.ico"; Flags: ignoreversion

[Icons]
Name: "{autodesktop}\Baromfi Menedzser"; \
    Filename: "{app}\baromfi-menedzser.exe"; \
    IconFilename: "{app}\app_icon.ico"

Name: "{group}\Baromfi Menedzser"; \
    Filename: "{app}\baromfi-menedzser.exe"; \
    IconFilename: "{app}\app_icon.ico"

Name: "{group}\Baromfi Menedzser Eltávolítása"; \
    Filename: "{uninstallexe}"

[UninstallDelete]
Type: filesandordirs; Name: "{app}"