const fs = require('fs');
const PNG = require('pngjs').PNG;

fs.createReadStream('test_label.png')
    .pipe(new PNG())
    .on('parsed', function () {
        console.log(`Image Size: ${this.width} x ${this.height}`);

        // Check horizontal slice at y=100
        let rowPixels = [];
        for (let x = 0; x < this.width; x++) {
            let idx = (this.width * 100 + x) << 2;
            let r = this.data[idx];
            let g = this.data[idx + 1];
            let b = this.data[idx + 2];

            if (r < 50 && g < 50 && b < 50) {
                rowPixels.push('#');
            } else {
                rowPixels.push('-');
            }
        }

        console.log("Horizontal slice at y=100:");
        console.log(rowPixels.join(''));
    });
