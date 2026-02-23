/**
 * MicroPython REPL-based file upload over Web Serial.
 * Matches the protocol used by Arduino lab-micropython-editor (micropython.js):
 * raw REPL only (no paste mode); send Python source in chunks then Ctrl+D; wait for \x04>.
 * Writes file via: f=open(...,'wb'); w=f.write; w(bytes([...])) per 48 bytes; f.close().
 *
 * govin 2.3.2: Purpose: Write main.py to device over raw REPL (exec_raw + w(bytes([...])));
 * browser-only, no g-link/ampy.
 */

const RAW_REPL_ENTER = 0x01;  // Ctrl+A
const RAW_REPL_EXIT = 0x02;   // Ctrl+B
const EXECUTE = 0x04;         // Ctrl+D
const INTERRUPT = 0x03;       // Ctrl+C

const WRITE_CHUNK_SIZE = 128;  // bytes of Python source per write (micropython.js)
const FILE_CHUNK_SIZE = 48;    // bytes of file content per w(bytes([...])) (micropython.js)
const CHUNK_DELAY_MS = 15;
const PROMPT_TIMEOUT_MS = 15000;  // Increased for Windows compatibility

/**
 * Normalize line endings to \n (micropython.js fixLineBreak).
 */
function fixLineBreak (str) {
    return str.replace(/\r\n/g, '\n');
}

/**
 * Read from the port until we see the given ending or timeout.
 * Improved for Windows compatibility with better buffering handling.
 */
async function readUntil (reader, ending, abortSignal) {
    let buffer = '';
    const deadline = Date.now() + PROMPT_TIMEOUT_MS;
    const decoder = new TextDecoder();
    while (Date.now() < deadline && (!abortSignal || !abortSignal.aborted)) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
            buffer += decoder.decode(value, { stream: true });
            if (buffer.includes(ending)) return buffer;
        }
        // Small delay to allow more data to arrive (helps with Windows buffering)
        await new Promise(r => setTimeout(r, 10));
    }
    return buffer;
}

/**
 * Send a raw REPL command: send Python source in 128-byte chunks, then Ctrl+D, then read until \x04>.
 * (Matches micropython.js exec_raw.)
 */
async function execRaw (writer, reader, pyCode, abortSignal) {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(pyCode);
    for (let i = 0; i < bytes.length; i += WRITE_CHUNK_SIZE) {
        const chunk = bytes.subarray(i, Math.min(i + WRITE_CHUNK_SIZE, bytes.length));
        await writer.write(chunk);
        if (bytes.length > WRITE_CHUNK_SIZE && CHUNK_DELAY_MS > 0) {
            await new Promise(r => setTimeout(r, CHUNK_DELAY_MS));
        }
    }
    await writer.write(new Uint8Array([EXECUTE]));
    const out = await readUntil(reader, '\x04>', abortSignal);
    if (/Traceback|SyntaxError|Error/.test(out)) {
        throw new Error(out.slice(-600));
    }
    return out;
}

/**
 * Upload code to the device as a file using the same simple approach as save button.
 * This method doesn't stop the read loop, making it more reliable on Windows.
 *
 * @param {SerialPort} serialPort - Web Serial port (already open)
 * @param {string} code - Python code to write (UTF-8)
 * @param {string} filename - target path on device, e.g. 'main.py'
 * @param {function(string)} onStdout - progress/log callback
 * @param {AbortSignal} [abortSignal] - optional, to cancel upload
 * @returns {Promise<'Success'|'Aborted'|Error>}
 */
export async function uploadCodeToDevice (serialPort, code, filename, onStdout, abortSignal) {
    let writer;
    const send = async (bytes) => {
        if (abortSignal && abortSignal.aborted) throw new Error('Aborted');
        if (!writer) {
            writer = serialPort.writable.getWriter();
        }
        await writer.write(bytes instanceof Uint8Array ? bytes : new Uint8Array([bytes]));
    };

    try {
        if (onStdout) onStdout('Preparing device...\n');

        // Use the same simple approach as save button - direct writes without stopping read loop
        // This is more reliable on Windows
        
        // Step 1: Interrupt any running code (Ctrl+C)
        await send(INTERRUPT);
        await new Promise(r => setTimeout(r, 200));
        await send(INTERRUPT);
        await new Promise(r => setTimeout(r, 150));

        // Step 2: Enter raw REPL (Ctrl+A)
        await send(RAW_REPL_ENTER);
        await new Promise(r => setTimeout(r, 200));

        if (abortSignal && abortSignal.aborted) return 'Aborted';

        if (onStdout) onStdout('Writing file...\n');

        // Step 3: Write the file using binary mode (like the original upload, but simpler)
        const contentBuffer = new TextEncoder().encode(fixLineBreak(code));
        const safeFilename = filename.replace(/'/g, "\\'");
        
        // Open file and prepare write function
        const openCmd = `f=open('${safeFilename}','wb')\nw=f.write\n`;
        await send(new TextEncoder().encode(openCmd));
        await send(EXECUTE); // Ctrl+D to execute
        await new Promise(r => setTimeout(r, 200));

        // Write file content in chunks (48 bytes at a time, like original)
        const totalChunks = Math.ceil(contentBuffer.length / FILE_CHUNK_SIZE);
        for (let i = 0; i < contentBuffer.length; i += FILE_CHUNK_SIZE) {
            if (abortSignal && abortSignal.aborted) return 'Aborted';
            
            const chunkNum = Math.floor(i / FILE_CHUNK_SIZE) + 1;
            if (onStdout && totalChunks > 1) {
                onStdout(`Writing chunk ${chunkNum}/${totalChunks}...\n`);
            }

            const slice = contentBuffer.subarray(i, Math.min(i + FILE_CHUNK_SIZE, contentBuffer.length));
            const arr = Array.from(slice).join(',');
            const writeCmd = `w(bytes([${arr}]))\n`;
            await send(new TextEncoder().encode(writeCmd));
            await send(EXECUTE); // Ctrl+D to execute
            await new Promise(r => setTimeout(r, 50)); // Small delay between chunks
        }

        // Close file and cleanup
        const closeCmd = 'f.close()\ndel f\ndel w\n';
        await send(new TextEncoder().encode(closeCmd));
        await send(EXECUTE); // Ctrl+D to execute
        await new Promise(r => setTimeout(r, 200));

        if (abortSignal && abortSignal.aborted) return 'Aborted';

        // Step 4: Exit raw REPL (Ctrl+B)
        await send(RAW_REPL_EXIT);
        await new Promise(r => setTimeout(r, 200));

        if (onStdout) onStdout('Resetting device to run main.py...\n');
        
        // Step 5: Soft reset to run main.py (Ctrl+D twice)
        await send(EXECUTE);
        await new Promise(r => setTimeout(r, 200));
        await send(EXECUTE);
        await new Promise(r => setTimeout(r, 500));

        if (onStdout) onStdout('Success\n');
        return 'Success';
    } catch (err) {
        if (err.message === 'Aborted') {
            return 'Aborted';
        }
        if (onStdout) onStdout(`Error: ${err.message}\n`);
        return err;
    } finally {
        try {
            if (writer) writer.releaseLock();
        } catch (_) {}
    }
}
