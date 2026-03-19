const http = require('http');

const urls = [
    'http://he608m8yeek.sn.mynetname.net:8032/web/image/product.template/671/image_1024',
    'http://he608m8yeek.sn.mynetname.net:8032/web/image/product.template/671/image_1920',
    'http://he608m8yeek.sn.mynetname.net:8032/web/image?model=product.template&id=671&field=image_1920',
    'http://he608m8yeek.sn.mynetname.net:8032/web/image?model=product.product&id=671&field=image_1920'
];

urls.forEach(url => {
    http.get(url, (res) => {
        let size = 0;
        res.on('data', chunk => size += chunk.length);
        res.on('end', () => console.log(url, '-> Status:', res.statusCode, 'Type:', res.headers['content-type'], 'Size:', size));
    }).on('error', (e) => {
        console.error('Error fetching', url, e.message);
    });
});
