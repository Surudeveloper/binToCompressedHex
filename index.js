const fs = require('fs');
const path = require('path');
const express = require('express');
const dotenv = require('dotenv');
const fileUpload = require('express-fileupload');
const bodyParser = require('body-parser');
const app = express();
dotenv.config()
const PORT = process.env.port || 3000;

app.use(express.static(__dirname + '/public')); // Serve static files from 'public' folder
app.set('view engine', 'ejs');
app.use(express.json());
app.use(fileUpload());
app.use(bodyParser.json());

app.get('/', (req, res) => {
    res.render('ind');
});
function showLoader(isLoader){
    if(isLoader==true){
        return 'Loading...'
    }
}

app.post('/download', async (req, res) => {
    var isLoader = true
    
    if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).send('No files were uploaded.');
    }

    // The uploaded file
    const uploadedFile = req.files.upldFile;

    // Check if the uploaded file has a .bin extension
    const fileExtension = path.extname(uploadedFile.name);
    if (fileExtension !== '.bin') {
        return res.status(400).send('Invalid file extension. Only .bin files are allowed.');
    }

    // Filepath for saving the file to the 'public' directory
    const filePath = path.join(__dirname, 'public', uploadedFile.name);

    // Move the uploaded file to the 'public' folder
    uploadedFile.mv(filePath, (err) => {
        if (err) {
            console.error('Error moving the uploaded file:', err);
            return res.status(500).send('Failed to upload the file.');
        }

        console.log('File uploaded and saved successfully to public folder!');

        // Now read and process the file
        fs.readFile(filePath, (err, data) => {
            if (err) {
                console.error('Error reading file:', err);
                return res.status(500).send('Error reading the file.');
            }

            // Convert each byte to a hex string and store in an array
            const byteArrayAsString = Array.from(data, byte => byte.toString(16).padStart(2, '0')); // Convert to hex string with padding
            let arr = byteArrayAsString;

            // Find all indices of 'ff'
            let indicesOfFF = [];
            arr.forEach((value, index) => {
                if (value === 'ff') {
                    indicesOfFF.push(index);
                }
            });

            let resultArray = [], count = 0;

            indicesOfFF.forEach((index, ind) => {
                if (index !== -1 && index >= count) {
                    const nextElements = arr.slice(index, index + 256); // Take 256 elements
                    resultArray.push(...nextElements);
                }

                function hexToGroupedBinary(newA) {
                    let concatenatedLastChars = '';
                    newA.forEach(hex => {
                        if (hex.length >= 2) {
                            const secondChar = hex[1];
                            const decimalValue = parseInt(secondChar, 16);
                            const binaryValue = decimalValue.toString(2).padStart(4, '0');
                            concatenatedLastChars += binaryValue[binaryValue.length - 1]; // Take the last binary character
                        }
                    });
                    const groupedBinary = concatenatedLastChars.match(/.{1,4}/g); // Group the concatenated string into chunks of 4
                    return groupedBinary || [];
                }

                const finalResult = hexToGroupedBinary(resultArray);
                const hexArray = finalResult.map(binaryString => parseInt(binaryString, 2).toString(16).toUpperCase());

                function clusterAndConcatenate(arr, clusterSize) {
                    const clusters = [];
                    for (let i = 0; i < arr.length; i += clusterSize) {
                        clusters.push(arr.slice(i, i + clusterSize).join(''));
                    }
                    return clusters;
                }

                const finalResult1 = clusterAndConcatenate(hexArray, 4);
                const outputData = finalResult1.join(' ');

                count += 256;

                if (ind === indicesOfFF.length - 1) { // When the last index of 'ff' is processed
                    const fileName = 'output.txt'; // Output file to save result in 'public' folder
                    const outputFilePath = path.join(__dirname, 'public', fileName);

                    // Write the final output to a text file
                    fs.writeFile(outputFilePath, outputData, (err) => {
                        if (err) {
                            console.error('Error writing to file:', err);
                            return res.status(500).send('Error writing the file.');
                        } else {
                            console.log('File has been created successfully!');

                            // // Set headers to prompt the download
                            // res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
                            // res.setHeader('Content-Type', 'text/plain');

                            // // Send the file to the client
                            // res.sendFile(outputFilePath, (err) => {
                            //     if (err) {
                            //         console.error('Error sending file:', err);
                            //         // res.status(500).send('Error sending the file.');
                            //     } else {
                            // res.status(200).send({success:true, data: outputFilePath });
                            res.render('disp', { data: outputData })
                            //         console.log('File sent successfully!');
                            //     }
                            // });
                        }
                    });
                }
            });
        });
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
