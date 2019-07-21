# Telnyx OTP SMS Demo 
Telnyx OTP SMS demo built on Telnyx Messaging APIs and node.js.

## Front End
To facilitate usage of this Telnyx Media Forking demo we are including a set of `HTML` files that simulate the typical Two-Factor-Authentication or One-Time-Password flow:

1. demo-otp-sms-index.html: front page requesting for phone number;
2. demo-otp-sms-token.html: token validation page;
3. demo-otp-sms-token-ok.html: token valid page;
4. demo-otp-sms-token-nok.html: token incorrect page;
5. demo-otp-sms-number-nok.html: number non-valid;

## Usage
This series of `HTML` files will call for the `DEMO OTP WEBHOOK` and the hosting domain for these files.
Make sure to edit all files and modify the URL paths when necessary.

For the HTML flow:
```
https://YOUR_DOMAIN/demo-otp-sms-index.html
https://YOUR_DOMAIN/demo-otp-sms-token.html
```

For the Webhook:
```
https://YOUR_DOMAIN/otp-telnyx/gettoken
https://YOUR_DOMAIN/otp-telnyx/checktoken
```

