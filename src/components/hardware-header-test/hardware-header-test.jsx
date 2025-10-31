import React from 'react';
import PropTypes from 'prop-types';
import Box from '../box/box.jsx';
import classNames from 'classnames';
import { defineMessages, FormattedMessage, intlShape } from 'react-intl';

import styles from './hardware-header-test.css';

import uploadIcon from './icon--upload.svg';
import saveIcon from './icon--save.svg';

//CARES 2.16 ADDED TO ADD NEW BUTTON TEXT PROGRAMMING
//GOVIN 2.2.2: Replaced "New" button with "Run" button for REPL execution
const messages = defineMessages({
    uploadMessage: {
        defaultMessage: 'Upload',
        description: 'Button to upload program',
        id: 'gui.hardwareHeader.upload'
    },
    saveToMicrocontrollerMessage: {
        defaultMessage: 'Save to Microcontroller',
        description: 'Button to save program to microcontroller',
        id: 'gui.hardwareHeader.saveToMicrocontroller'
    },
    //GOVIN 2.2.2: New "Run" message replaces "New" message
    runMessage: {
        defaultMessage: 'Run',
        description: 'Button to run program in REPL',
        id: 'gui.hardwareHeader.run'
    },
    saveMessage: {
        defaultMessage: 'Save',
        description: 'Button to save program',
        id: 'gui.hardwareHeader.save'
    },
    openMessage: {
        defaultMessage: 'Load from Computer',
        description: 'Button to open a saved program',
        id: 'gui.hardwareHeader.open'
    }
});

//GOVIN 2.2.2: Changed props from onNew/onRun to onRunREPL/onSave
const HardwareHeaderComponentTest = props => {
    const {
        onUpload,
        onSave,
        onOpen,
        onRunREPL,
        isDarkTheme = false
    } = props;

    return (
        <Box>
            <div className={classNames(styles.hardwareHeaderWrapperTest, isDarkTheme ? styles.darkTheme : null)}>
                {/* Upload Button */}
                <div
                    className={classNames(styles.uploadButton)}
                    onClick={onUpload}
                >
                    <img
                        alt={props.intl.formatMessage(messages.uploadMessage)}
                        className={styles.uploadIcon}
                        draggable={false}
                        src={uploadIcon}
                    />
                    <FormattedMessage {...messages.uploadMessage} />
                </div>


                {/* Run Button - runs code in REPL without uploading */}
                <div
                    className={classNames(styles.runButton)}
                    onClick={onRunREPL}
                >
                    <FormattedMessage {...messages.runMessage} />
                </div>

                {/* Save Button */}
                <div
                    className={classNames(styles.runButton)}
                    onClick={onSave}
                >
                    <FormattedMessage {...messages.saveMessage} />
                </div>

                {/* Load from Computer Button */}
                <div
                    className={classNames(styles.openButton)}
                    onClick={onOpen}
                >
                    <FormattedMessage {...messages.openMessage} />
                </div>
            </div>
        </Box>
    );
};

//GOVIN 2.2.2: Updated PropTypes - onNew->onRunREPL, onRun->onSave
HardwareHeaderComponentTest.propTypes = {
    intl: intlShape,
    onUpload: PropTypes.func.isRequired,
    onSave: PropTypes.func.isRequired,
    onOpen: PropTypes.func.isRequired,
    onRunREPL: PropTypes.func.isRequired,
    isDarkTheme: PropTypes.bool
};

export default HardwareHeaderComponentTest;
