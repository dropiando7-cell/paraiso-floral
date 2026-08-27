import { Resend } from 'resend';

async function main() {
  console.log('RESEND_API_KEY length:', process.env.RESEND_API_KEY?.length || 0);
  console.log('Importing actions.ts...');
  try {
    const actions = await import('../src/app/(dashboard)/admin/users/actions');
    console.log('Successfully imported actions.ts!');
  } catch (err) {
    console.error('Error importing actions.ts:', err);
  }
}

main().catch(console.error);
