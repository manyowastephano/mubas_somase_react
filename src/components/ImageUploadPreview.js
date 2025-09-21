import React from 'react';

const ImageUploadPreview = ({ file, onFileChange, fileName }) => {
    return (
        <>
            <label className="file-upload-label" htmlFor="profilePhoto">
                <i className="fas fa-cloud-upload-alt"></i>
                <span>Upload Profile Photo</span>
            </label>
            <input 
                type="file" 
                id="profilePhoto" 
                name="profilePhoto"
                className="file-upload-input" 
                accept="image/*"
                onChange={onFileChange}
            />
            <span className="file-name">{fileName}</span>
        </>
    );
};

export default ImageUploadPreview;