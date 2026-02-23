# Firmware Upload Documentation

## Overview

This document explains the firmware upload functionality implemented in the govin-gui-web project. The feature allows users to flash firmware to ESP devices (ESP32, ESP8266, etc.) directly from the web browser using the Web Serial API and the `esptool-js` library.

## Architecture

The firmware upload system consists of three main components:

1. **Serial Link Adapter** (`serial-link-adapter.js`) - Handles JSON-RPC requests and manages the serial port connection
2. **Firmware Uploader** (`firmware-uploader.js`) - Implements the actual firmware flashing using esptool-js
3. **esptool-js Library** - Official Espressif library for flashing ESP devices

## Files Involved

### 1. `src/lib/web-serial/serial-link-adapter.js`

**Purpose**: Main adapter that implements the JSON-RPC interface for serial communication.

**Key Responsibilities**:
- Manages Web Serial port connections
- Handles JSON-RPC requests (connect, disconnect, upload, uploadFirmware, etc.)
- Manages read loop for serial console output
- Coordinates firmware upload process
- Handles device wake-up after firmware flash

**Key Methods**:
- `_handleConnect()` - Opens serial port connection
- `_handleUploadFirmware()` - Initiates firmware upload process
- `_wakeUpDevice()` - Sends reset sequence to wake up device after firmware flash
- `_startReadLoop()` - Reads serial data and forwards to console

**Firmware Upload Flow**:
1. Receives `uploadFirmware` JSON-RPC request
2. Stops read loop to release port locks
3. Gets firmware data (from params, URL, or file picker)
4. Calls `uploadFirmwareToDevice()` from firmware-uploader.js
5. Handles cleanup and disconnection after upload
6. Sets `_justFlashedFirmware` flag for wake-up sequence on reconnect

### 2. `src/lib/web-serial/firmware-uploader.js`

**Purpose**: Core firmware flashing implementation using esptool-js.

**Key Functions**:

#### `uploadFirmwareToDevice(port, firmwareData, offset, onProgress, onLog, onError, abortSignal)`

Main function that handles firmware flashing.

**Parameters**:
- `port` - Web Serial port object (must be closed before calling)
- `firmwareData` - Firmware binary data (ArrayBuffer, Uint8Array, or base64 string)
- `offset` - Flash memory offset (default: 0x1000 for ESP32 app partition)
- `onProgress` - Progress callback (fileIndex, bytesWritten, totalBytes)
- `onLog` - Log message callback
- `onError` - Error callback
- `abortSignal` - AbortSignal for cancellation

**Process**:
1. **Port Preparation**:
   - Closes the existing port if open
   - Releases all reader/writer locks
   - Waits for port to be fully closed (1000ms)
   - Retries closing if port still appears open

2. **ESPTool Setup**:
   - Creates `Transport` wrapper for the serial port
   - Creates `ESPLoader` instance with terminal interface
   - Calls `esploader.main()` to connect and detect chip

3. **Firmware Flashing**:
   - Prepares flash options (compression enabled, progress reporting)
   - Calls `esploader.writeFlash()` to flash firmware
   - Handles progress updates

4. **Cleanup**:
   - Calls `esploader.after()` for cleanup
   - Disconnects transport
   - Closes and releases the port
   - Waits for OS to fully release port (1000ms)

**Return Values**:
- `'Success'` - Firmware uploaded successfully
- `'Aborted'` - Upload was cancelled
- Error message string - Upload failed

#### `eraseFlash(port, onLog, onError)`

Erases the entire flash memory of the ESP device.

**Parameters**:
- `port` - Web Serial port object
- `onLog` - Log message callback
- `onError` - Error callback

### 3. `esptool-js` Library

**Location**: `node_modules/esptool-js/`

**Purpose**: Official Espressif JavaScript implementation of esptool.

**Key Classes**:
- `ESPLoader` - Main class for ESP device communication and flashing
- `Transport` - Wraps Web Serial API for serial communication

**Features**:
- Automatic chip detection (ESP32, ESP8266, ESP32-S2, ESP32-S3, ESP32-C3, etc.)
- SLIP protocol encoding/decoding
- Stub loader for faster flashing
- Compression support
- Progress reporting
- Automatic baud rate adjustment

## Process Flow

### Firmware Upload Sequence

```
1. User clicks "Upload Firmware" button
   ↓
2. JSON-RPC request: uploadFirmware
   ↓
3. serial-link-adapter.js: _handleUploadFirmware()
   - Stops read loop
   - Gets firmware data (file picker or params)
   ↓
4. firmware-uploader.js: uploadFirmwareToDevice()
   - Closes existing port
   - Waits for port release
   ↓
5. esptool-js: ESPLoader setup
   - Creates Transport wrapper
   - Creates ESPLoader instance
   ↓
6. esptool-js: esploader.main()
   - Opens port with initial baudrate (115200)
   - Detects chip type
   - Loads stub loader
   - Adjusts baudrate for faster transfer
   ↓
7. esptool-js: esploader.writeFlash()
   - Erases flash region (if needed)
   - Flashes firmware with compression
   - Reports progress
   ↓
8. Cleanup
   - esploader.after()
   - transport.disconnect()
   - port.close()
   - Wait for OS port release
   ↓
9. Device resets automatically
   ↓
10. User reconnects
    ↓
11. serial-link-adapter.js: _wakeUpDevice()
    - Sends Ctrl+C (interrupt) x3
    - Sends Ctrl+D (soft reset)
    - Device enters REPL
```

### Reconnection After Firmware Upload

```
1. User clicks "Connect" button
   ↓
2. serial-link-adapter.js: _handleConnect()
   - Opens serial port
   ↓
3. Check _justFlashedFirmware flag
   ↓
4. If true: _wakeUpDevice()
   - Sends interrupts to break any running code
   - Sends soft reset to enter REPL
   ↓
5. Device is ready
   - Reboot button works immediately
   - Console shows device output
```

## Configuration

### Baud Rates

- **Initial Connection**: 115200 bps (for chip detection)
- **Firmware Upload**: 460800 bps (configurable in firmware-uploader.js)
- **esptool-js**: Automatically adjusts baudrate based on chip capabilities

### Flash Offset

- **ESP32 App Partition**: 0x1000 (default)
- **ESP32 Bootloader**: 0x0
- **ESP8266**: 0x0

The offset can be specified in the `uploadFirmware` JSON-RPC params.

## JSON-RPC Interface

### Request: `uploadFirmware`

**Parameters** (optional):
```json
{
  "firmwareData": "base64_encoded_data",  // or ArrayBuffer/Uint8Array
  "firmwareUrl": "https://example.com/firmware.bin",  // URL to download
  "offset": 4096  // Flash offset in bytes (0x1000 = 4096)
}
```

If no parameters provided, user will be prompted to select a file.

### Notifications

- `uploadProgress` - Progress updates (bytesWritten, totalBytes, percent)
- `uploadStdout` - Log messages from esptool-js
- `uploadError` - Error messages
- `uploadSuccess` - Upload completed (with aborted flag)
- `setUploadAbortEnabled` - Enable/disable abort button
- `peripheralUnplug` - Device disconnected (after firmware flash)

## Error Handling

### Common Issues

1. **"Port is already open"**
   - **Cause**: Port not fully closed before esptool-js tries to open it
   - **Solution**: Increased wait times and proper lock release

2. **"Must be handling a user gesture"**
   - **Cause**: Trying to request port without user gesture
   - **Solution**: Reuse existing port instead of requesting new one

3. **"Timed out waiting for packet header"**
   - **Cause**: Port locks or unstable baud rate
   - **Solution**: Proper port cleanup and stable baud rate (460800)

4. **Device doesn't respond after reconnect**
   - **Cause**: Device stuck after firmware flash
   - **Solution**: Automatic wake-up sequence on reconnect

5. **Need to unplug USB to reconnect**
   - **Cause**: Port not fully released by OS
   - **Status**: Known limitation, may require physical USB disconnect

## Dependencies

### npm Package

```json
{
  "esptool-js": "file:../esptool-js"
}
```

The esptool-js package is installed from a local directory.

### Webpack Configuration

The webpack config includes esptool-js in babel processing:

```javascript
include: [
    // ...
    /node_modules[\\/]esptool-js/
]
```

## Usage Example

### From JavaScript/TypeScript

```javascript
// Send firmware upload request
socket.sendMessage({
    jsonrpc: '2.0',
    method: 'uploadFirmware',
    params: {
        firmwareUrl: 'https://example.com/firmware.bin',
        offset: 0x1000
    },
    id: 1
});

// Or with base64 data
socket.sendMessage({
    jsonrpc: '2.0',
    method: 'uploadFirmware',
    params: {
        firmwareData: 'base64_encoded_firmware_data',
        offset: 0x1000
    },
    id: 1
});
```

### From UI

1. User clicks "Upload Firmware" button
2. If no firmware data provided, file picker dialog appears
3. User selects firmware file (.bin or .hex)
4. Upload progress is shown
5. Device resets after successful upload
6. User reconnects (device is automatically woken up)

## Technical Details

### Port Management

The firmware upload process requires exclusive access to the serial port:

1. **Before Upload**:
   - Stop read loop
   - Release all locks
   - Close port
   - Wait for OS release (1000ms)

2. **During Upload**:
   - esptool-js opens port
   - Uses port exclusively
   - Manages its own read loop

3. **After Upload**:
   - esptool-js closes port
   - Wait for device reset (500ms)
   - Release all locks
   - Close port again
   - Wait for OS release (1000-1500ms)

### Compression

Firmware upload uses compression by default:
- Reduces upload time significantly
- Uses deflate compression (level 9)
- Automatically handled by esptool-js

### Progress Reporting

Progress is reported via callbacks:
- `onProgress(fileIndex, bytesWritten, totalBytes)`
- Updates every 10% completion
- Sent as `uploadProgress` notifications

## Limitations

1. **USB Reconnection**: May require physical USB unplug/replug after firmware upload
2. **Browser Support**: Requires Chrome/Edge 89+ or Chrome Android 61+
3. **User Gesture**: Port selection requires user interaction
4. **Single Port**: Only one device can be connected at a time

## Future Improvements

1. **Port Reuse**: Better handling to avoid USB unplug requirement
2. **Multiple Devices**: Support for multiple simultaneous connections
3. **Firmware Validation**: Verify firmware before flashing
4. **Backup/Restore**: Save current firmware before flashing new one
5. **OTA Support**: Over-the-air firmware updates

## References

- [esptool-js GitHub](https://github.com/espressif/esptool-js)
- [Web Serial API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API)
- [ESP32 Flash Layout](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/partition-tables.html)
