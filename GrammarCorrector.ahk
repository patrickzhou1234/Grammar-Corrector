#Requires AutoHotkey v2.0
#SingleInstance Force

; Configuration
PYTHON_CMD := "python"
WORKER_SCRIPT := "gemini_worker.py"
InputFile := A_ScriptDir "\input.txt"
OutputFile := A_ScriptDir "\response.txt"

DecisionFile := A_ScriptDir "\decision.txt"
TriggerFile := A_ScriptDir "\trigger.txt"
HotkeyFile := A_ScriptDir "\hotkey.txt"

; Convert Electron-style hotkey to AHK format
ConvertHotkeyToAHK(electronHotkey) {
    ahkHotkey := electronHotkey
    ; Replace Electron modifiers with AHK modifiers
    ahkHotkey := StrReplace(ahkHotkey, "CommandOrControl+", "^")
    ahkHotkey := StrReplace(ahkHotkey, "Control+", "^")
    ahkHotkey := StrReplace(ahkHotkey, "Ctrl+", "^")
    ahkHotkey := StrReplace(ahkHotkey, "Alt+", "!")
    ahkHotkey := StrReplace(ahkHotkey, "Shift+", "+")
    ; Convert remaining key to lowercase
    return ahkHotkey
}

; Read hotkey from config file or use default
ReadHotkeyConfig() {
    global HotkeyFile
    defaultHotkey := "^!c"  ; Ctrl+Alt+C
    
    if FileExist(HotkeyFile) {
        try {
            electronHotkey := Trim(FileRead(HotkeyFile, "UTF-8"))
            if (electronHotkey != "") {
                return ConvertHotkeyToAHK(electronHotkey)
            }
        }
    }
    return defaultHotkey
}

; The main grammar correction function
DoGrammarCorrection(*) {
    global InputFile, OutputFile, DecisionFile, TriggerFile, PYTHON_CMD, WORKER_SCRIPT
    
    ; Save the currently active window so we can return to it later
    OriginalWindow := WinGetID("A")
    
    SavedClip := ClipboardAll()
    A_Clipboard := ""
    
    Send "^c"
    if !ClipWait(0.5) {
        MsgBox "Error: Could not copy text. Please highlight text first."
        A_Clipboard := SavedClip
        return
    }
    
    UserText := A_Clipboard
    
    ; Save input for Python (also used as original for diff)
    if FileExist(InputFile)
        FileDelete(InputFile)
    FileAppend(UserText, InputFile, "UTF-8")
    
    if FileExist(OutputFile)
        FileDelete(OutputFile)
    
    ; Clean up decision file
    if FileExist(DecisionFile)
        FileDelete(DecisionFile)

    ; Tell Electron to show thinking animation
    if FileExist(TriggerFile)
        FileDelete(TriggerFile)
    FileAppend("thinking", TriggerFile, "UTF-8")
    
    ; Run Python worker
    try {
        RunWait(PYTHON_CMD ' "' WORKER_SCRIPT '"', A_ScriptDir, "Hide")
    } catch {
        ; Tell Electron to hide overlay
        if FileExist(TriggerFile)
            FileDelete(TriggerFile)
        FileAppend("hide", TriggerFile, "UTF-8")
        MsgBox "Error: Failed to run Python.`nEnsure python is installed and " WORKER_SCRIPT " is in the folder."
        A_Clipboard := SavedClip
        return
    }
    
    if !FileExist(OutputFile) {
        if FileExist(TriggerFile)
            FileDelete(TriggerFile)
        FileAppend("hide", TriggerFile, "UTF-8")
        MsgBox "Error: Python script did not generate a response file."
        A_Clipboard := SavedClip
        return
    }

    FixedText := FileRead(OutputFile, "UTF-8")
    
    if (SubStr(FixedText, 1, 6) = "ERROR:") {
        if FileExist(TriggerFile)
            FileDelete(TriggerFile)
        FileAppend("hide", TriggerFile, "UTF-8")
        MsgBox "Python Error:`n" FixedText
        A_Clipboard := SavedClip
    } 
    else if (FixedText = "") {
        if FileExist(TriggerFile)
            FileDelete(TriggerFile)
        FileAppend("hide", TriggerFile, "UTF-8")
        MsgBox "Error: Response was empty."
        A_Clipboard := SavedClip
    }
    else {
        ; Tell Electron to show diff overlay
        if FileExist(TriggerFile)
            FileDelete(TriggerFile)
        FileAppend("show", TriggerFile, "UTF-8")
        
        ; Wait up to 60 seconds for decision
        Loop 600 {
            if FileExist(DecisionFile) {
                Decision := FileRead(DecisionFile, "UTF-8")
                if (Decision = "accept") {
                    ; Re-read the response file - Electron may have updated it with user's choices
                    FinalText := FileRead(OutputFile, "UTF-8")
                    
                    ; Reactivate the original window before pasting
                    WinActivate(OriginalWindow)
                    Sleep 100  ; Wait for window to activate
                    
                    A_Clipboard := FinalText
                    Sleep 50  ; Allow clipboard to be set
                    Send "^v"
                    Sleep 500  ; Wait for paste to complete
                }
                FileDelete(DecisionFile)
                break
            }
            Sleep 100
        }
        
        Sleep 200  ; Extra delay before restoring clipboard
        A_Clipboard := SavedClip
    }
}

; Register the hotkey dynamically
currentHotkey := ReadHotkeyConfig()
Hotkey(currentHotkey, DoGrammarCorrection)