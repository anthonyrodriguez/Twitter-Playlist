/**
 * This is an example of a basic node.js script that performs
 * the Authorization Code oAuth2 flow to authenticate against
 * the Spotify Accounts.
 *
 * For more information, read
 * https://developer.spotify.com/web-api/authorization-guide/#authorization_code_flow
 */

var express = require('express'); // Express web server framework
var request = require('request'); // "Request" library
var querystring = require('querystring');
var cookieParser = require('cookie-parser');

var client_id = '4ef013b9023c404ba497f8b3cadf4c45'; // Your client id
var client_secret = '92904c113de14c02911640d0723a87d6'; // Your client secret
var redirect_uri = 'http://localhost:8888/callback'; // Your redirect uri

var Twitter = require('twitter');
var twit = new Twitter({
        consumer_key: '9lW1GFRuGteLqyK5zspP1LFGV',
        consumer_secret: 'AzHnRbM2n82Dsmzf5UBYmaLFDJmnq0zDGZYELzBgtfPkFUXauz',
        access_token_key: '3696735733-R7RcuvkMjiu5Tq3oG2ZUMMC6YiXayqE20f6WkyR',
        access_token_secret: 'k46LXk8aGlalP0SY1TtRLS4hstVuwVPtZgJyfaODWMj6v'
});

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
var generateRandomString = function(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

var stateKey = 'spotify_auth_state';

var app = express();

app.use(express.static(__dirname + '/public'))
   .use(cookieParser());

app.get('/twitter', function(req, res) {
  console.log(req.query.twitter_handle); 
  var params = {screen_name: req.query.twitter_handle};
  var hashtags = [];
  twit.get('statuses/user_timeline', params, function(error, tweets, response) {
    if (!error) {
      var i;
      var hash_index;
      var words;
      var j;
      for (i = 0; i < tweets.length; i++) {
        hash_index = tweets[i].text.search('#');
        words = tweets[i].text.split(/[\s,\n]+/);
        for (j = 0; j < words.length; j++)
        {
          if (words[j].indexOf('#') > -1)
          {
            hashtags.push(words[j].substring(words[j].indexOf('#')+1));
          }
        }
      }
    }
    else 
    {
      console.log(error);
    }
    console.log(hashtags);
  });
});

app.get('/login', function(req, res) {

  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  var scope = 'user-read-private user-read-email user-library-read';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));
});

app.get('/callback', function(req, res) {

  // your application requests refresh and access tokens
  // after checking the state parameter

  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    res.clearCookie(stateKey);
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
      },
      json: true
    };

    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {

        var access_token = body.access_token,
            refresh_token = body.refresh_token;

        var options = {
          url: 'https://api.spotify.com/v1/me',
          headers: { 'Authorization': 'Bearer ' + access_token },
          json: true
        };

	    var userID;

        // use the access token to access the Spotify Web API
        request.get(options, function(error, response, body) {
            if (error) {
                console.log('-------------------------2--------------------' + error);
            }
            else {
                userID = body.id;
	            console.log(userID);

	            var playlistOptions = {
	                url: 'https://api.spotify.com/v1/users/' + userID + '/playlists',
	                headers: { 'Authorization': 'Bearer ' + access_token },
	                json: true
	            };

	            console.log(playlistOptions.url);

	            request.get(playlistOptions, function(error, response, body) {
		            console.log(body);
	            });
	         }
        });


        // we can also pass the token to the browser to make requests from there
        res.redirect('/#' +
          querystring.stringify({
            access_token: access_token,
            refresh_token: refresh_token
          }));
      } else {
        res.redirect('/#' +
          querystring.stringify({
            error: 'invalid_token'
          }));
      }
    });
  }
});

app.get('/refresh_token', function(req, res) {

  // requesting access token from refresh token
  var refresh_token = req.query.refresh_token;
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token;
      res.send({
        'access_token': access_token
      });
    }
  });
});

console.log('Listening on 8888');
app.listen(8888);
