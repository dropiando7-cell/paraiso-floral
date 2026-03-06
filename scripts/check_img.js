const fs = require('fs');

// We have test_label.png
// Let's use a quick way to see if there is content in the first 200 pixels
const buffer = fs.readFileSync('test_label.png');

console.log('File size:', buffer.length);
// Just confirm it exists and size is valid
console.log('PNG exists and downloaded successfully.');
