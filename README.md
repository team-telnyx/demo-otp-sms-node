# Telnyx Media Forking Demo
Telnyx Media Forking demo built on Call Control and node.js.


In this tutorial, you’ll learn how to:

1. Set up your development environment for sending SMS using Node.
2. Build an SMS Two Factor Authentication App using Node.


---

- [Prerequisites](#prerequisites)
- [Send an SMS](#send-an-sms)
- [Generating the Token](#generating-the-token)
- [Temporarily Storing the Tokens](#temporarily-storing-the-tokens)
- [Requesting Tokens](#requesting-tokens)
- [Lightning-Up the Application](#lightning-up-the-application)
- [Application Front-End](#application-front-end)


---

## Prerequisites

Before you get started, you’ll need to complete these steps:

1. Go through the Telnyx Setup Guide for Messaging. 
2. You’ll need to have Node installed to continue. You can check this by running the following:

```shell
$ node -v
```

If Node isn’t installed, follow the [official installation instructions](https://nodejs.org/en/download/) for your operating system to install it.

You’ll need to have the following Node dependencies installed for the SMS API:

```js
require(express);
require(request);
require(fs);
```

You’ll need to have the following Node dependencies installed for the 2FA app:

```js
require('crypto');
```


## Send an SMS

For the 2FA application you’ll need to get a basic function that sends the SMS Token. For that we’re using Telnyx Messaging API.

This function uses Node ‘request’ to use Telnyx Messaging API, so make sure you have it installed. If not you can install it with the following command:

```shell
$ npm install request --save
```

After that you’ll be able to use ‘request’ as part of your app code as follows:

```js
var request = require('request');
```

To make use of the Telnyx Messaging API you’ll need to set the Profile Secret for the Messaging Profile from which you’d like to send messages. 

To find your Profile Secret in the  Mission Control Portal, click the edit symbol next to your Messaging Profile. The Profile Secret can be found under `Outbound` in your settings. 

Once you have it, you can include it as `const` variable in your code:

```js
const g_profile_secret     = "2iRDblA7PiMW860W9Mnukwp9"
```

Once all dependencies are set, create a new function like the following:

```js
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
                // US/CAN will use poll
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
                from: f_orig, // international will use alphanumeric
                body: f_message
            }
        };
    }


    request.post(options, function (err, resp, body) {

        if (err) {
            return console.log(err);
        }

        var l_resultinjson = JSON.parse(body);

        var l_sms_success = (l_resultinjson.status == 'queued');

        f_callback(err, l_sms_success);

    });

}
```

### Understanding the SEND-SMS function

There are several aspects of this function that deserve some attention:

Setting the Post Request Headers: following the Telnyx Messaging API convention, the first thing to be set are POST Request headers to be used. That would include the Profile Secret defined earlier:
```js
var l_headers = {
    'Content-Type': 'application/json',
    'x-profile-secret': g_profile_secret
}
```

US/CA Destination vs International Destinations: following local regulations Telnyx Messaging API allows international destinations to have an alphanumeric sender (the SMS ‘from’ value) but not for US and Canada. For the latter you may use a Long/Short Code E164 formatted number that you can enforce in the corresponding Messaging Profile used (Mission Control Portal).
Because of the difference between US/CA and International destinations, we have different parameters being set as the ‘from’ value. The ‘to’ value will consume the regular E164 formatted number that was passed along with the function call, as well as the ‘body’ of the message (that will be the token message).
For US/CA destinations, we’re omitting the ‘from’ parameter, so it will force the API to use a Long/Short Code E164 formatted number from the Telnyx pool of numbers:
```js
if (f_dest.startsWith("+1")){
    var options = {
        url: 'https://sms.telnyx.com/messages',

        headers: l_headers,

        form: {
            to:     f_dest,
            // US/CAN uses poll
            body:   f_message 
        } 
};
```
For international destinations, we’re enforcing the alphanumeric sender id that’s being pushed by the function call:
```js
 else {
    var options = {
        url: 'https://sms.telnyx.com/messages',

        headers: l_headers,

        form: {
            to:     f_dest,
            from:   f_orig, // non-US uses alphanumeric
            body:   f_message 
        } 
    };
}
```

Calling the Telnyx SMS Messaging API: Having the request  `headers` and `options`/`body` set, the only thing left is to execute the POST Request to send the message. For that we’re making use of the Node.JS `request` module:
```js
request.post(options,function(err,resp,body){

    if (err) { return console.log(err);}

    var l_resultinjson = JSON.parse(body);            
    var l_sms_success = (l_resultinjson.status == 'queued');

    f_callback(err, l_sms_success);
}); 
```

You’ll notice that we’re defining this function including a `callback` function. This is to deal with the asynchronism of the API call and make sure we receive the API call response before we break out the function. 

In this particular case we’re interested in returning as callback the result value (`true`/`false`) of the API call executed, that would tell us if sending the SMS was successful or not. We would know that if the API call response included `status` as `queued`. That means the short message is lined up to be forwarded and delivered. 

## Generating the Token

The second main function to be defined in this tutorial is the Token Generation function. There are several ways to make this work, but for this tutorial example we’ll simply to generate an alphanumeric string/code with a specific length to be instructed within the function call.

In this example we’re using Node.JS `crypto` so we generate a buffer with randomly generated bytes. `Crypto` should come as part of the Node.JS base library set, i.e. no need to install it manually. 

```js
function get_randomTokenHex (length) {
    return crypto.randomBytes(Math.ceil(length/2))
        .toString('hex')
        .slice(0,length).toUpperCase();   
}
```

As a result it will return a buffer of hexadecimal bytes with the specified length.

## Temporarily Storing the Tokens

To keep this example as simple as possible we’re temporarily storing newly generated tokens in a JSON array using the own token as key. An example of `tokens.json` could be:

```
{ "DFE5":{"dest_number":"+12345678910",
          "token":"DFE529"},
  "205B":{"dest_number":"+441234567890",
          "token":"205B"}
}
```

## Requesting Tokens

Requesting Tokens is naturally part of a Two-Factor Authentication process associated with some transaction or SMS device validation. 

To exemplify this process we created a simple API call that can be integrated into any HTML static web-page with a form. For this we’ll use `express`:
``` shell
$ npm install request --save
```

With `express` we can create an API wrapper that uses HTTP GET to call our Request Token method:
```js
rest.get('/'+g_appName+'/gettoken', function (req, res) {
   fs.readFile( "PATH_TO_JSON/tokens.json", 'utf8', function (err, data) {
   if (err) {
        return console.error(err.message);
     }
    var l_dest_number  = req.query.number;
    var l_token        = get_randomTokenHex(4); 
    var obj = {tokens: []};
    obj = JSON.parse(data); 
    obj[l_token] = {dest_number:l_dest_number,
                    last_updated:get_timestamp,
                    token:l_token};
    var json = JSON.stringify(obj); 
   fs.writeFile("PATH_TO_JSON/tokens.json", json, 'utf8', 
     function (err, data) {
        if (err) {return console.error(err.message);}
        cc_send_sms(l_dest_number,
           "Telnyx OTP", 
          'Your Telnyx token is ' + l_token, function(sms_err, sms_res){
            if (sms_res)
                res.writeHead(302,{'Location':’DOMAIN/token.html'});
            else 
                res.writeHead(302, {'Location': ’DOMAIN/nok.html'});
        res.end();
        });
    });
  })
})
```

### Understanding the Get-Token method
There are several aspects of this method that deserve some attention:

Reading the Token’s JSON File: simply opening up the JSON file to be able to temporarily save the new token and destination number on it
```js
fs.readFile( "PATH_TO_JSON/tokens.json", 'utf8', function (err, data) 
...
```

Getting the Destination Number: this piece of code assumes the HTTP GET request will have a `form` with the number introduced by the token request entity. So we’ll need to extract that number here:
```js
var l_dest_number = req.query.number;
```

Generating the Token: we can generate the token instantly by calling out our function and indicating that we want a 4 character token:
```js
var l_token = get_randomTokenHex(4);
```

Adding the Token to the List: once we have the token we’ll add it to the temporary JSON list so we can check it later for validation:
```js
obj = JSON.parse(data); 

obj[l_token] = {dest_number:l_dest_number,
                last_updated:get_timestamp,
                token:l_token};

var json = JSON.stringify(obj); 
fs.writeFile("PATH_TO_JSON/tokens.json", json, 'utf8', 
    function (err, data)
...
```

Sending the SMS Token: as part of the previous callback, we’re sending out the message with the Token by calling our SEND-SMS function. As part of that call we’re adding: the destination number, “Telnyx OTP” as the alphanumeric origin (the ‘from’ value), and the message itself that will be 'Your Telnyx token is ####“. 
Please note that in this call we’re adding the alphanumeric value as default, but that would only be used by international destinations as explained previously. If the destination is US/CA this parameter will be ignored.
```js
 cc_send_sms(l_dest_number,
   "Telnyx OTP", 
  'Your Telnyx token is ' + l_token, 
     function(sms_err, sms_res){
    if (sms_res)
        res.writeHead(302,
             {'Location':’DOMAIN/token.html'});
    else 
        res.writeHead(302, 
              {'Location': ’DOMAIN/nok.html'});
res.end();
});
```
Also, not that we’re consuming the SMS attempt result and returning different results as responses. Assuming you’ll be working with static HTML web-pages one could point to: (1) the Token validation web-page if successful, (2) or to the Error page if applicable. (3) You should receive the SMS Token as follows:

<p align="center">
    <img src="https://raw.githubusercontent.com/team-telnyx/demo-otp-sms-node/master/examples/sms-otp-example.png" width="50%" height="50%" title="sms_otp_example">
</p>


## Validating Tokens

Once you have the token, the next step is the validation. For that we’ll follow a similar process as the previous, but this time receiving the Token to validate instead.

To exemplify this process we created a simple API call that abstract the request and can be integrated into any HTML static web-page with a form. For this we’ll use `express` again. With it we can create an API wrapper that uses HTTP GET to call our Validate Token method:
```js
rest.get('/'+g_appName+'/checktoken', function (req, res) {
    
   // Read Tokens File
   fs.readFile( "PATH_TO_JSON/tokens.json", 'utf8', function (err, data) {
       if (err) {
            return console.error(err.message);
         }

        var obj = {tokens: []};
        obj = JSON.parse(data); 
        
        //get token (to add)
        var l_token = req.query.token;

        // token is valid - yes
        if(obj.hasOwnProperty(l_token)){
           
            // delete token from db
            delete obj[l_token];
            var l_json = JSON.stringify(obj);

            fs.writeFile("PATH_TO_JSON/tokens.json", l_json, 'utf8', 
               function (err, data) {
               if (err) {
                  return console.error(err.message);
               }    

              res.writeHead(302, {'Location': ’DOMAIN/ok.html'});
              res.end();
            });
        } 
        
        // token is NOT valid 
        else {     
                res.writeHead(302, {'Location': ’DOMAIN/nok.html'});  
                res.end();   
            }            
    })
})
```

### Understanding the Check-Token method

There are several aspects of this method that deserve some attention:

Reading the Token’s JSON File: similar to get token, simply opening up the JSON file to be able to temporarily save the new token and destination number on it:
```js
fs.readFile( "PATH_TO_JSON/tokens.json", 'utf8', function (err, data) 
...
```

Getting the Token to Validate: this piece of code assumes the HTTP GET request will be having a `form` with the received Token introduced. So we will need to extract that value here:
```js
var l_dest_number  = req.query.number;
```

Validating the Token: once we have the token we will validate it. In this tutorial we made the process simple by simply checking if the Token value exists as a key in the temporary JSON file.
```js
if(obj.hasOwnProperty(l_token)){
...
```
If the number is successfully validated, there are two main actions to be taken. 
Eliminating the Token from the list:
```js
delete obj[l_token];
var l_json = JSON.stringify(obj);
fs.writeFile("PATH_TO_JSON/tokens.json", l_json, 'utf8', 
     function (err, data) {
                  if (err) {return console.error(err.message);}  
```
Returning the Token Successfully Validated page, following the same logic of having a static web-page:
```js
res.writeHead(302, {'Location': ’DOMAIN/ok.html'});
```
Otherwise it the action is simply to return the non-valid Token page:
```js
res.writeHead(302, {'Location': ’DOMAIN/nok.html'});
```

## Lightning-Up the Application

Finally the last piece of the puzzle is having your application listening and your HTML web-pages tackling your application:

```js
var server = rest.listen(8081, function () {
  var host = server.address().address
  var port = server.address().port
})
```

## Application Front-End

In this application source code we are making use of static HTML pages as the front end of our application. Through those pages the user can interact with the application by requesting the OTP token and submit it for validation.

Sample pages for this purpose can be found in [interface](https://github.com/team-telnyx/demo-otp-sms-node/tree/master/interface) directory.


<p align="center">
    <img src="https://raw.githubusercontent.com/team-telnyx/demo-otp-sms-node/master/examples/front-end.png" title="sms_otp_example">
</p>



