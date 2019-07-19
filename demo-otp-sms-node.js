// ================================================ Telnyx OTP SMS DEMO ================================================

// Description:
// This simple app exposes two API instructions that enable OTP (One Time Password). One
// command receives the mobile number indicated in the web and generates the token; while the
// other command will check the validity of the token added.

// Author:
// Filipe Leitão (filipe@telnyx.com)

// Application:
const g_appName = "otp-telnyx";

// ======= Conventions =======
// = g_xxx: global variable
// = f_xxx: function variable
// = l_xxx: local variable
// ===========================


// ======================================================================================================================

var express = require('express');
var fs = require("fs");
var request = require('request');
var crypto = require('crypto');


// =============== Telnyx Application Data ===============

const g_profile_secret = "<telnyx_sms_profile_secret_here>"
const g_serviceName = "OTPApp-Telnyx"


// =============== RESTful API Creation ===============

var rest = express();


// ================================================ AUXILIARY FUNCTIONS  ================================================

function get_timestamp() {

    var now = new Date();

    return 'utc|' + now.getUTCFullYear() +
        '/' + (now.getUTCMonth() + 1) +
        '/' + now.getUTCDate() +
        '|' + now.getHours() +
        ':' + now.getMinutes() +
        ':' + now.getSeconds() +
        ':' + now.getMilliseconds();

}


//function code credits from http://blog.tompawlak.org/how-to-generate-random-values-nodejs-javascript
function get_randomTokenHex(len) {
    return crypto.randomBytes(Math.ceil(len / 2))
        .toString('hex') // convert to hexadecimal format
        .slice(0, len).toUpperCase(); // return required number of characters
}

// =========================================== TELNYX MESSAGING COMMANDS  ============================================


// Call Control - Send SMS
function cc_send_sms(f_dest, f_orig, f_message, f_callback) {

    var l_cc_action = 'send-sms';

    // Set the headers
    var l_headers = {
        'Content-Type': 'application/json',
        'x-profile-secret': g_profile_secret
    }

    if (f_dest.startsWith("+1")) {
        // Set the request
        var options = {
            url: 'https://sms.telnyx.com/messages',

            headers: l_headers,

            form: {
                to: f_dest,
                // US/CAN uses poll
                body: f_message
            }
        };
    } else {
        // Set the request
        var options = {
            url: 'https://sms.telnyx.com/messages',

            headers: l_headers,

            form: {
                to: f_dest,
                from: f_orig, // non-US uses alphanumeric
                body: f_message
            }
        };
    }


    request.post(options, function (err, resp, body) {

        if (err) {
            return console.log(err);
        }
        console.log("[%s] DEBUG - Command Executed [%s]", get_timestamp(), l_cc_action);
        console.log(body);

        var l_resultinjson = JSON.parse(body);

        console.log("[%s] DEBUG - queued status [%s]", get_timestamp(), l_resultinjson.status);


        var l_sms_success = (l_resultinjson.status == 'queued');

        f_callback(err, l_sms_success);

    });

}



// =============== RESTful POST API Generate Token and Send   ===============


// POST - Receive Number: https://<your_webhook_url>:8081/otp-telnyx/gettoken?number=123456789

rest.get('/' + g_appName + '/gettoken', function (req, res) {


    // Read Tokens File
    fs.readFile("demo-tokens.json", 'utf8', function (err, data) {

        if (err) {
            return console.error(err.message);
        }

        var l_dest_number = req.query.number;
        var l_token = get_randomTokenHex(4); // custom token generation


        var obj = {
            tokens: []
        };


        obj = JSON.parse(data);


        // add token and number to the list
        obj[l_token] = {
            dest_number: l_dest_number,
            last_updated: get_timestamp,
            token: l_token
        };

        var json = JSON.stringify(obj); //convert it back to json

        fs.writeFile("demo-tokens.json", json, 'utf8', function (err, data) {
            if (err) {
                return console.error(err.message);
            }

            console.log("[%s] SERVER - token requested | [%s]:[%s] ", get_timestamp(), l_dest_number, l_token);
            //res.end('1');


            cc_send_sms(l_dest_number, "Telnyx OTP", 'Your Telnyx token is ' + l_token, function (sms_err, sms_res) {

                console.log("[%s] DEBUG - Send SMS Result [%s]", get_timestamp(), sms_res);

                if (sms_res)
                    res.writeHead(302, {
                        'Location': 'https://<YOUR_APP_URL>/telnyx-otp-token.html'
                    });
                else
                    res.writeHead(302, {
                        'Location': 'https://<YOUR_APP_URL>/telnyx-otp-number-nok.html'
                    });

                res.end();

            });

        });
    })
})


// =============== RESTful POST API CHECK TOKEN  ===============


// POST - Receive Number: https://<your_webhook_url>:8081/otp-telnyx/checktoken?token=123456

rest.get('/' + g_appName + '/checktoken', function (req, res) {


    // Read Tokens File
    fs.readFile("demo-tokens.json", 'utf8', function (err, data) {
        if (err) {
            return console.error(err.message);
        }


        var obj = {
            tokens: []
        };

        obj = JSON.parse(data); //conver it to an object

        //get token (to add)
        var l_token = req.query.token;


        // token is valid - yes
        if (obj.hasOwnProperty(l_token)) {

            console.log("[%s] SERVER - valid token received: [%s]", get_timestamp(), l_token);


            // delete token from db
            delete obj[l_token];

            var l_json = JSON.stringify(obj); //convert it back to json

            fs.writeFile("demo-tokens.json", l_json, 'utf8', function (err, data) {
                if (err) {
                    return console.error(err.message);
                }

                res.writeHead(302, {
                    'Location': 'https://<YOUR_APP_URL>/telnyx-otp-token-ok.html'
                });

                res.end();

            });
        }

        // token is NOT valid - no
        else {

            console.log("[%s] SERVER - invalid token received: [%s]", get_timestamp(), l_token);

            res.writeHead(302, {
                'Location': 'https://<YOUR_APP_URL>/telnyx-otp-token-nok.html'
            });

            res.end();

        }


    })
})




// =============== RESTful Server Start ===============

var server = rest.listen(8082, function () {

    var host = server.address().address
    var port = server.address().port


    console.log("[%s] SERVER - " + g_appName + " app listening at http://%s:%s", get_timestamp(), host, port)

})
