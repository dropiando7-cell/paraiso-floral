const http = require('http');

http.get('http://he608m8yeek.sn.mynetname.net:8032/web/image/product.template/1242/image', (res) => {
    let size = 0;
    res.on('data', chunk => size += chunk.length);
    res.on('end', () => console.log('1242(image):', res.statusCode, size));
});
