const fs = require('fs');
const content = fs.readFileSync('src/pages/Success.jsx', 'utf8');

// Find the line: if (status === 'success' && !downloading && !autoDownloaded) {
// Replace with: if (status === 'success' && !downloading && !autoDownloaded && !searchParams.get('session_id')?.startsWith('credit_redemption_')) {

const oldLine = "if (status === 'success' && !downloading && !autoDownloaded) {";
const newLine = "if (status === 'success' && !downloading && !autoDownloaded && !searchParams.get('session_id')?.startsWith('credit_redemption_')) {";

if (content.includes(oldLine)) {
  const updatedContent = content.replace(oldLine, newLine);
  fs.writeFileSync('src/pages/Success.jsx', updatedContent, 'utf8');
  console.log('Successfully patched Success.jsx');
} else {
  console.log('Failed to find target line in Success.jsx');
}
