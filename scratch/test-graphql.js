const HEADERS = {
    'Content-Type': 'application/json',
    'x-api-key': 'c5412744e3264ed39d928d73cbb0c729',
    'magento-environment-id': '95267588-3a4b-4f03-ab99-424c48ed4f4c',
    'magento-website-code': 'base',
    'magento-store-code': 'main_website_store',
    'magento-store-view-code': 'default'
};

const query = `
query GetCategoryProducts($categoryId: String!) {
  productSearch(
    phrase: ""
    filter: [
      {
        attribute: "categoryIds"
        eq: $categoryId
      }
    ]
  ) {
    items {
      productView {
        sku
        name
        url
        description
        shortDescription
        metaDescription
        images {
          url
          label
        }
        attributes {
          name
          value
        }
      }
    }
    total_count
  }
}
`;

async function main() {
    try {
        console.log("Querying Adobe Live Search for Category ID: 820...");
        const res = await fetch('https://catalog-service.adobe.io/graphql', {
            method: 'POST',
            headers: HEADERS,
            body: JSON.stringify({
                query,
                variables: { categoryId: "820" }
            })
        });
        
        console.log("Response Status:", res.status);
        const data = await res.json();
        const firstProduct = data.data?.productSearch?.items?.[0]?.productView;
        console.log("Sample Product Details:");
        console.log(JSON.stringify(firstProduct, null, 2));
    } catch (e) {
        console.error("Failed:", e);
    }
}

main();
