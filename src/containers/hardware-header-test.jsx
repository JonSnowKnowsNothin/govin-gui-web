import PropTypes from 'prop-types';
import React from 'react';
import bindAll from 'lodash.bindall';

import { connect } from 'react-redux';
import { compose } from 'redux';
import { injectIntl } from 'react-intl';

import { saveAs } from 'file-saver';

import VM from 'govin-vm';


import { STAGE_SIZE_MODES } from '../lib/layout-constants';
import { openUploadProgress } from '../reducers/modals';
import { showAlertWithTimeout } from '../reducers/alerts';
import HardwareHeaderComponentTest from '../components/hardware-header-test/hardware-header-test.jsx';

import sharedMessages from '../lib/shared-messages';
class HardwareHeaderTest extends React.Component {
    constructor(props) {
        super(props);
        //GOVIN 2.2.2: Replaced handleNew with handleRunREPL, renamed handleRun to handleSave
        bindAll(this, [
            'handleUpload', 'handleSave', 'handleOpen', 'handleRunREPL'
        ]);
    }

    handleUpload() {
        if (this.props.peripheralName) {
            console.log('deviceid', this.props.codeEditorValue)
            this.props.vm.uploadToPeripheral(this.props.deviceId, this.props.codeEditorValue);
            this.props.onOpenUploadProgress();
        } else {
            this.props.onNoPeripheralIsConnected();
        }
    }

    // handleRun() {
    //     const { codeEditorValue } = this.props;
    //     const blob = new Blob([codeEditorValue], { type: 'text/plain;charset=utf-8' });
    //     saveAs(blob, 'code.py');
    //     }


    // Save current editor content using the active tab filename if available
    // Govin 2.2.0: Save using active tab filename when available, fallback by device type
    // GOVIN 2.2.2: Renamed from handleRun to handleSave for clarity
    handleSave() {
        const { codeEditorValue, deviceType } = this.props;
        // Prefer the filename exposed by the tabs component
        const activeName = typeof window !== 'undefined' ? window.currentHardwareFileName : undefined;
        let filename = activeName && String(activeName).trim();

        if (!filename) {
            // Fallback by device type
            const ext = (deviceType === 'arduino') ? 'ino' : 'py';
            filename = `code.${ext}`;
        }

        const blob = new Blob([codeEditorValue], { type: 'text/plain;charset=utf-8' });
        saveAs(blob, filename);
    }
    //CARES v2.0.5
    // handleOpen() {
    //     const input = document.createElement('input');
    //     input.type = 'file';
    //     input.accept = '.py';

    //     input.onchange = (e) => {
    //         const file = e.target.files[0];
    //         if (file && file.name.endsWith('.py')) {
    //             const reader = new FileReader();
    //             reader.onload = (e) => {
    //                 const content = e.target.result;
    //                 this.props.updateCodeEditorValue(content);  
    //                 // this.props.codeEditorValue(content);  // Dispatch content to Redux
    //             };
    //             reader.readAsText(file);
    //         } else {
    //             console.error('Please select a valid .txt file.');
    //         }
    //     };

    //     input.click();
    // }



    // Open a file and load into tabs + editor; accept type depends on device
    // Govin 2.2.0: Open file, update Redux, and notify tabs
    handleOpen() {
        const input = document.createElement('input');
        input.type = 'file';
        const { deviceType } = this.props;
        // Prefer the relevant extension but allow both as fallback
        input.accept = (deviceType === 'arduino') ? '.ino,.cpp,.h' : '.py';

        input.onchange = (e) => {
            const file = e.target.files && e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    const content = ev.target.result;
                    // Update Redux for compatibility with existing flows
                    this.props.updateCodeEditorValue(content);
                    // Notify the tabs/editor to open or replace a tab with this file
                    if (typeof window !== 'undefined') {
                        const evt = new CustomEvent('hardware.openFile', { detail: { name: file.name, content } });
                        window.dispatchEvent(evt);
                    }
                };
                reader.readAsText(file);
            } else {
                console.error('Please select a valid file.');
            }
        };

        input.click();
    }

    // GOVIN 2.2.2: New Run button - replaces "New" button
    // Run code in REPL without uploading - GUI-only solution using existing vm.writeToPeripheral
    // Similar to Arduino Lab for MicroPython - no VM changes needed
    handleRunREPL() {
        const { codeEditorValue, deviceId, deviceType, peripheralName, vm } = this.props;
        
        // Only MicroPython devices support REPL execution
        if (deviceType !== 'microPython') {
            alert('REPL execution is only available for MicroPython devices');
            return;
        }
        
        if (!peripheralName) {
            this.props.onNoPeripheralIsConnected();
            return;
        }

        if (!codeEditorValue || codeEditorValue.trim() === '') {
            this.props.onWorkspaceIsEmpty();
            return;
        }

        console.log('Running code in REPL:', codeEditorValue);
        
        // Use existing vm.writeToPeripheral - no VM changes needed!
        // MicroPython REPL protocol:
        // 1. Ctrl+C (0x03) to interrupt any running code
        // 2. Ctrl+A (0x01) to enter raw REPL mode  
        // 3. Send the code
        // 4. Ctrl+D (0x04) to execute
        
        try {
            // Step 1: Interrupt any running code
            vm.writeToPeripheral(deviceId, '\x03');
            
            setTimeout(() => {
                // Step 2: Enter raw REPL mode
                vm.writeToPeripheral(deviceId, '\x01');
                
                setTimeout(() => {
                    // Step 3: Send the code
                    vm.writeToPeripheral(deviceId, codeEditorValue);
                    
                    setTimeout(() => {
                        // Step 4: Execute with Ctrl+D
                        vm.writeToPeripheral(deviceId, '\x04');
                    }, 100);
                }, 200);
            }, 100);
            
        } catch (error) {
            console.error('Error running code in REPL:', error);
            alert('Error executing code in REPL: ' + error.message);
        }
    }
    

    render() {
        const {
            ...props
        } = this.props;
        //GOVIN 2.2.2: Changed props from onNew/onRun to onRunREPL/onSave
        return (
            <HardwareHeaderComponentTest
                onUpload={this.handleUpload}
                onSave={this.handleSave}
                onOpen={this.handleOpen}
                onRunREPL={this.handleRunREPL}
                {...props}
            />
        );
    }
}

// HardwareHeaderTest.propTypes = {
//     codeEditorValue: PropTypes.string,
//     deviceId: PropTypes.string,
//     onNoPeripheralIsConnected: PropTypes.func.isRequired,
//     onOpenUploadProgress: PropTypes.func,
//     onWorkspaceIsEmpty: PropTypes.func.isRequired,
//     peripheralName: PropTypes.string,
//     stageSizeMode: PropTypes.oneOf(Object.keys(STAGE_SIZE_MODES)),
//     vm: PropTypes.instanceOf(VM).isRequired,
//     onClickNew: PropTypes.func,
//     canSave: PropTypes.bool,
//     canCreateNew: PropTypes.bool
// };

// const mapStateToProps = state => ({
//     codeEditorValue: state.scratchGui.code.codeEditorValue,


//     deviceId: state.scratchGui.device.deviceId,
//     peripheralName: state.scratchGui.connectionModal.peripheralName,
//     stageSizeMode: state.scratchGui.stageSize.stageSize,
//     canSave: state.scratchGui.projectState.canSave,
//     canCreateNew: state.scratchGui.projectState.canCreateNew
// });

HardwareHeaderTest.propTypes = {
    codeEditorValue: PropTypes.string,
    deviceId: PropTypes.string,
    deviceType: PropTypes.string,
    onNoPeripheralIsConnected: PropTypes.func.isRequired,
    onOpenUploadProgress: PropTypes.func,
    onWorkspaceIsEmpty: PropTypes.func.isRequired,
    peripheralName: PropTypes.string,
    confirmReadyToReplaceProject: PropTypes.func,
    updateCodeEditorValue: PropTypes.func,
    stageSizeMode: PropTypes.oneOf(Object.keys(STAGE_SIZE_MODES)),
    vm: PropTypes.instanceOf(VM).isRequired,
    canSave: PropTypes.bool,
    canCreateNew: PropTypes.bool,
    isDarkTheme: PropTypes.bool,
    intl: PropTypes.object
};

const mapStateToProps = state => ({
    codeEditorValue: state.scratchGui.code.codeEditorValue,
    deviceId: state.scratchGui.device.deviceId,
    deviceType: state.scratchGui.device.deviceType,
    peripheralName: state.scratchGui.connectionModal.peripheralName,
    stageSizeMode: state.scratchGui.stageSize.stageSize,
    canSave: state.scratchGui.projectState.canSave,
    canCreateNew: state.scratchGui.projectState.canCreateNew,
    isDarkTheme: state.scratchGui.theme.isDarkTheme
});
//GOVIN 2.2.2: Removed onClickNew as Run button doesn't need it
const mapDispatchToProps = dispatch => ({
    onNoPeripheralIsConnected: () => showAlertWithTimeout(dispatch, 'connectAPeripheralFirst'),
    onOpenUploadProgress: () => dispatch(openUploadProgress()),
    onWorkspaceIsEmpty: () => showAlertWithTimeout(dispatch, 'workspaceIsEmpty'),
    // updateCodeEditorValue: (value) => dispatch({ type: 'SET_CODE_EDITOR_VALUE', value })
    updateCodeEditorValue: (value) => dispatch({ type: 'scratch-gui/code/UPDATE_CODE', value }),
    confirmReadyToReplaceProject: (message) => window.confirm(message)
});

export default compose(
    injectIntl,
    connect(
        mapStateToProps,
        mapDispatchToProps
    )
)(HardwareHeaderTest);