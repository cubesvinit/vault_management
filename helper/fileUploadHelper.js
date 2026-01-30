// const extractFilePaths = (files, fieldNames) => {
//     const filePaths = {};

//     if (!files) return filePaths;

//     fieldNames.forEach(fieldName => {
//         if (files[fieldName] && files[fieldName][0]) {
//             filePaths[fieldName] = files[fieldName][0].path.replace(/\\/g, '/');
//         }
//     });

//     return filePaths;
// };


// const extractFilePath = (files, fieldName) => {
//     if (!files || !files[fieldName] || !files[fieldName][0]) {
//         return null;
//     }
//     return files[fieldName][0].path.replace(/\\/g, '/');
// };


const extractFiles = (files, fieldNames) => {
    if (!files || !fieldNames) return {};

    if (Array.isArray(fieldNames)) {
        const filePaths = {};
        fieldNames.forEach(fieldName => {
            if (files[fieldName] && files[fieldName][0]) {
                filePaths[fieldName] = files[fieldName][0].path.replace(/\\/g, '/');
            }
        });
        return filePaths;
    }
    
    if (files[fieldNames] && files[fieldNames][0]) {
        return files[fieldNames][0].path.replace(/\\/g, '/');
    }

    return Array.isArray(fieldNames) ? {} : null;
};



module.exports = {
    // extractFilePaths,
    // extractFilePath
    extractFiles
};
