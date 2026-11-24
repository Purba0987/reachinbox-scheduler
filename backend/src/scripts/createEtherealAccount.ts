import nodemailer from 'nodemailer';

async function main() {
  console.log('Generating new Ethereal Email test account...');
  try {
    const testAccount = await nodemailer.createTestAccount();
    console.log('\n=============================================');
    console.log('🎉 Ethereal Email Account Created Successfully!');
    console.log('=============================================');
    console.log(`User: ${testAccount.user}`);
    console.log(`Pass: ${testAccount.pass}`);
    console.log(`SMTP Host: ${testAccount.smtp.host}`);
    console.log(`SMTP Port: ${testAccount.smtp.port}`);
    console.log(`Web Login: https://ethereal.email/login`);
    console.log('=============================================\n');
    console.log('You can paste these values into your backend .env file:');
    console.log(`ETHEREAL_USER="${testAccount.user}"`);
    console.log(`ETHEREAL_PASS="${testAccount.pass}"`);
    console.log(`ETHEREAL_HOST="${testAccount.smtp.host}"`);
    console.log(`ETHEREAL_PORT=${testAccount.smtp.port}\n`);
  } catch (err: any) {
    console.error('Failed to create Ethereal account:', err.message);
  }
}

main();
