const fs = require('fs');
const http = require('http');

http.get('http://localhost:3000/api/impresion/generar-etiqueta?debug=1', (res) => {
    if (res.statusCode !== 200) {
        console.error('Failed with status code:', res.statusCode);
        return;
    }
    const chunks = [];
    res.on('data', chunk => chunks.push(chunk));
    res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        fs.writeFileSync('test_label.png', buffer);
        console.log('PNG saved as test_label.png. Size:', buffer.length, 'bytes');
    });
});
