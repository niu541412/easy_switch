(function () {
  if (window.__shortcut__) {
    return;
  }
  window.__shortcut__ = true;

  const az = "abcdefghijklmnopqrstuvwxyz";

  function keydown(e) {
    const { altKey, ctrlKey, shiftKey, keyCode } = e;
    if (!altKey && !ctrlKey && !shiftKey) return;

    let keycode;
    if (keyCode >= 48 && keyCode <= 57) {
      keycode = keyCode - 48;
    } else if (keyCode >= 65 && keyCode <= 90) {
      keycode = az.charAt(keyCode - 65);
    } else {
      return;
    }
    const modifiers = [
      ctrlKey ? "ctrl+" : "",
      altKey ? "alt+" : "",
      shiftKey ? "shift+" : "",
    ].join("");
    const shortcut = modifiers + keycode;
    onShortcut(shortcut);
  }

  function onShortcut(shortcut) {
    if (chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({
        action: 'shortcut',
        value: shortcut
      });
    }
  }

  document.addEventListener("keydown", keydown, false);
})();
