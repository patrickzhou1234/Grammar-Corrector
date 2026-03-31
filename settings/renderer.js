const psidInput = document.getElementById('psid');
const psidtsInput = document.getElementById('psidts');
const hotkeyDisplay = document.getElementById('hotkeyDisplay');
const hotkeyText = document.getElementById('hotkeyText');
const opacitySlider = document.getElementById('opacitySlider');
const opacityValue = document.getElementById('opacityValue');
const closeBtn = document.getElementById('closeBtn');
const cancelBtn = document.getElementById('cancelBtn');
const saveBtn = document.getElementById('saveBtn');

let isRecordingHotkey = false;
let currentHotkey = 'CommandOrControl+Alt+C';

async function loadSettings() {
  const settings = await window.api.getSettings();
  
  psidInput.value = settings.cookies.secure1psid || '';
  psidtsInput.value = settings.cookies.secure1psidts || '';
  currentHotkey = settings.hotkey || 'CommandOrControl+Alt+C';
  hotkeyText.textContent = formatHotkeyForDisplay(currentHotkey);
  opacitySlider.value = (settings.opacity || 0.92) * 100;
  opacityValue.textContent = `${Math.round(opacitySlider.value)}%`;
}

function formatHotkeyForDisplay(hotkey) {
  return hotkey
    .replace('CommandOrControl', 'Ctrl')
    .replace('Command', 'Cmd')
    .replace('Control', 'Ctrl');
}

function formatHotkeyForElectron(keys) {
  const modifiers = [];
  const regularKeys = [];
  
  keys.forEach(key => {
    if (key === 'Control' || key === 'Ctrl') {
      modifiers.push('CommandOrControl');
    } else if (key === 'Alt') {
      modifiers.push('Alt');
    } else if (key === 'Shift') {
      modifiers.push('Shift');
    } else {
      regularKeys.push(key);
    }
  });
  
  return [...modifiers, ...regularKeys].join('+');
}

hotkeyDisplay.addEventListener('click', () => {
  isRecordingHotkey = true;
  hotkeyDisplay.classList.add('recording');
  hotkeyText.textContent = 'Press keys...';
});

hotkeyDisplay.addEventListener('blur', () => {
  if (isRecordingHotkey) {
    isRecordingHotkey = false;
    hotkeyDisplay.classList.remove('recording');
    hotkeyText.textContent = formatHotkeyForDisplay(currentHotkey);
  }
});

document.addEventListener('keydown', (e) => {
  if (!isRecordingHotkey) {
    if (e.key === 'Escape') window.api.closeSettings();
    return;
  }
  
  e.preventDefault();
  const modifiers = [];
  let mainKey = null;
  
  if (e.ctrlKey) modifiers.push('Ctrl');
  if (e.altKey) modifiers.push('Alt');
  if (e.shiftKey) modifiers.push('Shift');
  
  const keyName = e.key.toUpperCase();
  // Only count non-modifier keys as the main key
  if (!['CONTROL', 'ALT', 'SHIFT', 'META'].includes(keyName)) {
    mainKey = keyName === ' ' ? 'Space' : keyName;
  }
  
  // Update display to show current modifiers being held
  if (modifiers.length > 0 && !mainKey) {
    hotkeyText.textContent = modifiers.join('+') + '+...';
  }
  
  // Only complete recording when we have at least one modifier AND a main key
  if (modifiers.length >= 1 && mainKey) {
    const keys = [...modifiers, mainKey];
    currentHotkey = formatHotkeyForElectron(keys);
    hotkeyText.textContent = formatHotkeyForDisplay(currentHotkey);
    isRecordingHotkey = false;
    hotkeyDisplay.classList.remove('recording');
    hotkeyDisplay.blur();
  }
});

opacitySlider.addEventListener('input', () => {
  opacityValue.textContent = `${opacitySlider.value}%`;
});

closeBtn.addEventListener('click', () => window.api.closeSettings());
cancelBtn.addEventListener('click', () => window.api.closeSettings());

saveBtn.addEventListener('click', async () => {
  const settings = {
    cookies: {
      secure1psid: psidInput.value.trim(),
      secure1psidts: psidtsInput.value.trim()
    },
    hotkey: currentHotkey,
    opacity: opacitySlider.value / 100
  };
  
  await window.api.saveSettings(settings);
  window.api.closeSettings();
});

loadSettings();
