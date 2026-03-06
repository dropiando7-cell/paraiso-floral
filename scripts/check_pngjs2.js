const fs = require('fs');
const PNG = require('pngjs').PNG;

fs.createReadStream('test_label.png')
    .pipe(new PNG())
    .on('parsed', function () {
        let rowPixels = [];
        for (let x = 0; x < this.width; x++) {
            let idx = (this.width * 100 + x) << 2;
            let r = this.data[idx];
            let g = this.data[idx + 1];
            let b = this.data[idx + 2];

            rowPixels.push(r < 50 && g < 50 && b < 50 ? '#' : '-');
        }

        let str = rowPixels.join('');
        let initialHashes = str.match(/(^#+)/);

        console.log(`Initial sequence of #: ${initialHashes ? initialHashes[1].length : 0}`);
        console.log(`String length: ${str.length}`);

        // Check top left pixel color
        console.log(`Top left pixel: RGB(${this.data[0]}, ${this.data[1]}, ${this.data[2]})`);
    });
