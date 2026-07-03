import { GET } from '../src/app/api/pdf/[id]/route';

async function main() {
  console.log('Testing PDF generation for ID: 43b0d9fa-2e7e-42c1-8f29-d023a807aea9, type: garantia');
  
  const req = new Request('http://localhost:3000/api/pdf/43b0d9fa-2e7e-42c1-8f29-d023a807aea9?type=garantia');
  
  // Call the GET endpoint
  const res = await GET(req, { params: Promise.resolve({ id: '43b0d9fa-2e7e-42c1-8f29-d023a807aea9' }) });
  
  console.log('Response status:', res.status);
  
  if (res.status === 200) {
    console.log('PDF generated successfully!');
  } else {
    const text = await res.text();
    console.error('PDF generation failed. Response body:', text);
  }
}

main().catch(err => {
  console.error('Unhandled script error:', err);
});
