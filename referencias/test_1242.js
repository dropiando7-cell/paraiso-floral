const http = require('http');

http.get('http://he608m8yeek.sn.mynetname.net:8032/web/image/product.template/1242/image_1920', (res) => {
    let size = 0;
    res.on('data', chunk => size += chunk.length);
    res.on('end', () => console.log('1242(1920):', res.statusCode, size));
});
http.get('http://he608m8yeek.sn.mynetname.net:8032/web/image/product.template/1242/image_1024', (res) => {
    let size = 0;
    res.on('data', chunk => size += chunk.length);
    res.on('end', () => console.log('1242(1024):', res.statusCode, size));
});
