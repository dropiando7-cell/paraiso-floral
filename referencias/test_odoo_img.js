const http = require('http');

const url = 'http://he608m8yeek.sn.mynetname.net:8032/web/image/product.template/816/image_1024/';
console.log('Fetching:', url);

http.get(url, (res) => {
    console.log('Status Code:', res.statusCode);
    console.log('Headers:', res.headers);
    let size = 0;
    res.on('data', chunk => size += chunk.length);
    res.on('end', () => console.log('Total Size (bytes):', size));
}).on('error', (e) => {
    console.error('Got error:', e.message);
});
