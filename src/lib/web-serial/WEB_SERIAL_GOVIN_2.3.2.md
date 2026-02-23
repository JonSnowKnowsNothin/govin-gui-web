# Web Serial support — Govin 2.3.2

**Version:** Govin 2.3.2  
**Purpose:** Browser-only MicroPython code upload and serial connection using the Web Serial API, without changing the desktop app (which continues to use g-link, esptool, and ampy).

---

## 1. Overview

In the **browser** build (e.g. opening the built GUI in Chrome/Edge), users can:

- **Connect** to a serial device by choosing a port in the browser’s serial port picker.
- **Upload** MicroPython code (e.g. `main.py`) over the same connection via the MicroPython raw REPL; no g-link, esptool, or ampy.
- **Use the serial console** (read loop) to see device output.

In the **desktop** (Govin Desktop / Electron) build, behaviour is **unchanged**: connection and upload still go through g-link (WebSocket to `ws://127.0.0.1:20111/govin/serialport`). Upload there uses **ampy** (see §2.B).

---

## 2. How code is uploaded

There are **two different upload paths** depending on where the GUI runs.

### 2.A Browser upload (Web Serial + raw REPL)

When you run the GUI in a **browser** (Chrome/Edge, not Govin Desktop), upload does **not** use g-link or ampy. The GUI talks to the board over the **Web Serial API** and sends the file using the **MicroPython raw REPL** only.

**Flow in short:**

1. User clicks Upload in the GUI.
2. The VM sends an **upload** JSON-RPC request to the serial “socket”. In the browser, that socket is the **Web Serial adapter** (`serial-link-adapter.js`).
3. The adapter gets the code (e.g. the current editor content for `main.py`), then:
   - Stops the serial **read loop** (so only one reader is active), closes the port, reopens it.
   - Calls **repl-uploader.js** `uploadCodeToDevice(port, code, 'main.py', ...)`.
4. **repl-uploader.js** does the actual transfer:
   - Sends **Ctrl+C** twice to interrupt any running program.
   - Sends **Ctrl+A** to enter **raw REPL**; waits for the device to reply `"raw REPL; CTRL-B to exit"`.
   - Sends **Python commands** to the device in small chunks (128 bytes of source per chunk), each time followed by **Ctrl+D** to execute; waits for the device to respond (e.g. `\x04>`).
   - To write the file it uses the same pattern as Arduino’s micropython.js:
     - First command: open the file and bind `w = f.write` → `f=open('main.py','wb')\nw=f.write\n`
     - For each **48-byte** chunk of the file content: send `w(bytes([...]))\n` (list of byte values), then Ctrl+D.
     - Last command: close and clean up → `f.close()\ndel f\ndel w\n`, then Ctrl+D.
   - Sends **Ctrl+B** to leave raw REPL; waits for `>>>`.
   - Sends **Ctrl+D** twice to **soft reset** the board so it runs `main.py`.
5. The adapter starts the read loop again so the serial console shows device output.

So in the browser, the **same serial connection** is used for both console and upload; the file is “typed” into the REPL as Python that opens a file and writes bytes in chunks.

### 2.B Desktop upload (g-link + ampy)

When you run the GUI inside **Govin Desktop** (Electron), the VM uses the **g-link WebSocket** for the SERIALPORT peripheral, not Web Serial. Upload is handled by the **desktop main process** (or g-link), which runs the **ampy** command-line tool to push the file to the device.

**Flow in short:**

1. User clicks Upload in the GUI.
2. The VM sends an **upload** request over the WebSocket to g-link (e.g. `ws://127.0.0.1:20111/govin/serialport`).
3. The desktop app (or g-link) receives the request and **spawns** the `ampy` executable (e.g. `ampy --port /dev/ttyUSB0 put main.py ...`).
4. **ampy** opens the serial port itself and uses its own protocol (REPL-based) to write the file to the board.

**Important:** On desktop, **ampy must be installed and on the system PATH**. If it is not, you get:

- **Error: spawn ampy ENOENT**

That means the system could not find the `ampy` executable. Fix by installing it, e.g.:

- `pip install adafruit-ampy` (or `pip3 install adafruit-ampy`)
- Ensure the directory containing the `ampy` script is on your PATH (e.g. `~/.local/bin`), or run with `python3 -m ampy` if the app supports it.
- Restart Govin Desktop after installing.

The **govin-gui** repo does not spawn ampy; only the desktop/g-link side does. So this doc only describes behaviour; fixing ENOENT is an environment/setup task on the machine where Govin Desktop runs.

---

## 3. How it works (implementation)

### 3.1 When Web Serial is used

- The VM is configured with a **socket factory** that, for the `SERIALPORT` peripheral type, can return either:
  - **Browser:** a Web Serial adapter (same JSON-RPC interface as g-link).
  - **Desktop:** the default g-link WebSocket.
- The choice is made by `shouldUseWebSerial()`: `true` only when running in a browser (e.g. `window` and `navigator.serial` exist) and **not** in Govin Desktop (no `window.GOVIN_DESKTOP`, no `process.versions.electron`).

### 3.2 Connection and RPC

- The Web Serial adapter implements the same **JSON-RPC** contract as the g-link WebSocket used for SERIALPORT:
  - **discover** → `navigator.serial.requestPort()`, then notify `didDiscoverPeripheral`.
  - **connect** → open the selected port with the requested baud rate (default 115200).
  - **disconnect** → close the port.
  - **write** → send base64 or UTF-8 message on the port.
  - **read** → start a read loop that forwards device output as `onMessage` (base64).
  - **upload** → run the REPL uploader (see §2.A), then restart the read loop.
  - **uploadFirmware** → report that firmware upload is not supported in the browser.
  - **abortUpload** → abort the current upload.

- So the VM and GUI treat the Web Serial adapter like any other SERIALPORT socket; only the transport (Web Serial vs WebSocket to g-link) changes.

### 3.3 Serial console (read loop)

- When the VM sends a **read** request, the adapter starts a loop: it takes a reader on `port.readable`, reads chunks, encodes them as base64, and emits `onMessage` with that payload so the VM can show output in the console.
- Only one reader can be active at a time. Before **upload**, the adapter stops this read loop, waits for the reader to be released, closes the port, reopens it (same baud rate), runs the upload (which uses its own getWriter/getReader), then starts the read loop again so the console continues to receive output after upload.

### 3.4 Browser upload protocol (raw REPL detail)

- Browser upload uses the **MicroPython raw REPL** protocol, aligned with **Arduino lab-micropython-editor** (micropython.js). No paste mode (Ctrl+E); only raw REPL.
- Steps (see also §2.A):
  1. Interrupt the device (Ctrl+C twice).
  2. Enter raw REPL: send `\x01` (Ctrl+A), read until `"raw REPL; CTRL-B to exit"`.
  3. Execute Python in chunks: send the **Python source** in 128-byte segments, then `\x04` (Ctrl+D), then read until `\x04>` (device echoes and signals completion).
  4. File write uses the same pattern as micropython.js `fs_save`:
     - One block: `f=open('main.py','wb')\nw=f.write\n`
     - For each 48-byte chunk of file content: `w(bytes([...]))\n`
     - Final block: `f.close()\ndel f\ndel w\n`
  5. Exit raw REPL: send `\x02` (Ctrl+B), read until `\r\n>>>`.
  6. Soft reset: send Ctrl+D twice so `main.py` runs.
- Line endings in the code are normalized to `\n` before encoding (same idea as `fixLineBreak` in micropython.js).

---

## 4. Implementation: files changed (Govin 2.3.2)

All of the following files include a **govin 2.3.2** comment describing their purpose.

| File | Purpose (govin 2.3.2) |
|------|------------------------|
| `src/lib/web-serial/serial-link-adapter.js` | Browser-only serial connection and MicroPython upload via Web Serial API; drop-in replacement for g-link SERIALPORT socket. |
| `src/lib/web-serial/socket-factory.js` | Select Web Serial socket for SERIALPORT in browser only; desktop continues to use g-link. |
| `src/lib/web-serial/repl-uploader.js` | Write `main.py` to device over raw REPL (`exec_raw` + `w(bytes([...]))`); browser-only, no g-link/ampy. |
| `src/reducers/vm.js` | Use Web Serial for SERIALPORT in browser; desktop keeps g-link. |

Supporting documentation:

| File | Purpose |
|------|---------|
| `src/lib/web-serial/README.md` | Short overview of Web Serial behaviour and file roles. |
| `src/lib/web-serial/WEB_SERIAL_GOVIN_2.3.2.md` | This document: working and implementation for Govin 2.3.2. |

---

## 5. Optional: desktop flag

If the desktop app ever loads the GUI in a context where `process.versions.electron` is not available, it can set `window.GOVIN_DESKTOP = true` before the GUI runs so the VM keeps using g-link and does not switch to Web Serial.

---

## 6. Reference

- Protocol and chunk sizes (raw REPL, 128-byte source chunks, 48-byte file chunks, `w(bytes([...]))`) follow **Arduino lab-micropython-editor** and its dependency **micropython.js** (e.g. `exec_raw`, `fs_save`).
- Web Serial API: [MDN Web Serial API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API).
