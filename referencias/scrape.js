const fs = require('fs');

fetch('http://he608m8yeek.sn.mynetname.net:8032/shop')
    .then(r => r.text())
    .then(html => {
        fs.writeFileSync('shop_html.txt', html);
        console.log("Saved shop html. Total length:", html.length);
    });
