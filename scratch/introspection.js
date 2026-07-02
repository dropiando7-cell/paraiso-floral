const HEADERS = {
    'Content-Type': 'application/json',
    'x-api-key': 'c5412744e3264ed39d928d73cbb0c729',
    'magento-environment-id': '95267588-3a4b-4f03-ab99-424c48ed4f4c',
    'magento-website-code': 'base',
    'magento-store-code': 'main_website_store',
    'magento-store-view-code': 'default'
};

const query = `
query IntrospectProductSearchArgs {
  __schema {
    queryType {
      fields {
        name
        args {
          name
          type {
            name
            kind
            ofType {
              name
              kind
            }
          }
        }
      }
    }
  }
}
`;

async function main() {
    try {
        console.log("Introspecting Query fields and arguments...");
        const res = await fetch('https://catalog-service.adobe.io/graphql', {
            method: 'POST',
            headers: HEADERS,
            body: JSON.stringify({ query })
        });
        
        const data = await res.json();
        const searchField = data.data?.__schema?.queryType?.fields?.find(f => f.name === 'productSearch');
        console.log("productSearch arguments:");
        console.log(JSON.stringify(searchField?.args, null, 2));
    } catch (e) {
        console.error(e);
    }
}

main();
