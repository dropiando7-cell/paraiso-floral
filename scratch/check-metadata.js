const HEADERS = {
    'Content-Type': 'application/json',
    'x-api-key': 'c5412744e3264ed39d928d73cbb0c729',
    'magento-environment-id': '95267588-3a4b-4f03-ab99-424c48ed4f4c',
    'magento-website-code': 'base',
    'magento-store-code': 'main_website_store',
    'magento-store-view-code': 'default'
};

const query = `
query GetFilterableAttributes {
  attributeMetadata {
    filterableInSearch {
      attribute
      label
      frontendInput
      numeric
    }
  }
}
`;

async function main() {
    try {
        console.log("Fetching filterable attributes from Adobe Catalog Service...");
        const res = await fetch('https://catalog-service.adobe.io/graphql', {
            method: 'POST',
            headers: HEADERS,
            body: JSON.stringify({ query })
        });
        
        console.log("Response Status:", res.status);
        const data = await res.json();
        console.log("Filterable Attributes response:");
        console.log(JSON.stringify(data, null, 2));
    } catch (e) {
        console.error(e);
    }
}

main();
