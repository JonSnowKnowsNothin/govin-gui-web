import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import Box from '../box/box.jsx';
import Button from '../button/button.jsx';
import styles from './save-to-microcontroller-modal.css';
import deleteIcon from '../delete-button/icon--delete.svg';

const SaveToMicrocontrollerModal = ({ files, onUpload, onClose, onDelete }) => {
    return (
        <div className={styles.modalBackdrop}>
            <Box className={styles.modal}>
                <div className={styles.modalHeader}>
                    <FormattedMessage
                        defaultMessage="Files on Microcontroller"
                        description="Title of the modal"
                        id="gui.hardwareHeader.filesOnMicrocontroller"
                    />
                    {/* Wrapping buttons in a div for horizontal layout */}
                    <div className={styles.headerButtons}>
                        <Button
                            onClick={onUpload}
                            className={styles.uploadButton}
                        >
                            Upload
                        </Button>
                        <button onClick={onClose} className={styles.closeButton}>X</button>
                    </div>
                </div>
                <div className={styles.fileList}>
                    {files.length > 0 ? (
                        files.map((file, index) => (
                            <div key={index} className={styles.fileItem}>
                                <span>{file}</span>
                                {/* Delete button next to each file with delete icon*/}
                                <button
                                    onClick={() => onDelete(file)}
                                    className={styles.deleteButton}
                                    aria-label={`Delete ${file}`}
                                >
                                    <img
                                        src={deleteIcon}
                                        alt={`Delete ${file}`}
                                        className={styles.deleteIcon}
                                    />
                                </button>
                            </div>
                        ))
                    ) : (
                        <div className={styles.noFiles}>No File on Microcontroller</div>
                    )}
                </div>
            </Box>
        </div>
    );
};

SaveToMicrocontrollerModal.propTypes = {
    files: PropTypes.arrayOf(PropTypes.string).isRequired,
    onUpload: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
    onDelete: PropTypes.func.isRequired, // Prop for the delete function
};

export default SaveToMicrocontrollerModal;
