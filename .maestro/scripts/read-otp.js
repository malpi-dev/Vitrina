// Reads the latest 6-digit code from the local Mailpit inbox (Supabase local, port 54324).
// Maestro runs scripts on the Mac, so 127.0.0.1 is the Mac here (not the emulator).
var response = http.get('http://127.0.0.1:54324/api/v1/message/latest');
var message = json(response.body);
var match = /\b(\d{6})\b/.exec(message.Text || '');
if (!match) {
  throw new Error('No 6-digit code found in the latest Mailpit message');
}
output.code = match[1];
