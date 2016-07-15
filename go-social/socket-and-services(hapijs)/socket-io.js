var twitter = require('../services/twitter');
var tokenRequest = require('../services/tokenRequest');
var profilePictureChanger = require('../services/changeProfilePicture');
var instagram = require('../services/instagram_update');
var facebook = require('../services/facebook');
var Program = require('../models/program').Program;
var Hashtag = require('../models/hashtag').Hashtag;
var _ = require('lodash');

var obtainDomain = function (emailToDomain) {
	return emailToDomain.replace(/.*@/, ""); 
}

exports.register = function (server, options, next) {

	twitter.twitterStream();

	var io = require('socket.io')(server.listener);

	io.sockets.on('connection', function (socket) {

		socket.on('enterRoom', function (room) {
			console.log('Entered room: ' + room);
			socket.join(room);
			
		});

		socket.on('loginInsta', function (loginData) {
			//console.log(loginData);
			instagram.instagramGenerateToken(loginData);

		});

		socket.on('startCountingTweets', function () {
			twitter.twitterStreamNotifications(socket);
			socket.removeAllListeners('startCountingTweets');

		});

		socket.on('addHashtag', function (report) {
			console.log(report);
			twitter.twitterStream(socket);

		});

		socket.on('removeHashtag', function (report) {
			console.log(report);
			twitter.twitterStream(socket);

		});

		socket.on('comment to save as message', function (obj) {
			//console.log(obj.comment);
			//console.log(obj.message);
			facebook.saveCommentAsMessage(obj, socket);

		});

		socket.on('update facebook comments', function (obj) {
			facebook.updateFacebookComments(obj.facebookPostId, obj.messageId, socket);
			
		});

		socket.on('activate prog', function (programId) {
			/*
			** UPDATE program to instagramActive(true)
			*/
			Hashtag.update({ progID: programId }, { instagramActive: true }, { multi: true }, function (err, hashtagUpdated) {
				if(err) {
					console.log(err);
					return;
				}
				console.log(JSON.stringify(hashtagUpdated) + ' is now active for instagram');

			});
			/*
			** IF timeout for this program is still active and user select's it again
			*/
			timerName = programId;
			if(timer[timerName]) {
				clearTimeout(timer[timerName]);
			}

		});
		/*
		** START instagram stream
		*/
		instagram.instagramStream(socket);
		/*
		** INSTAGRAM followings
		*/
		instagram.instagramCreateFollowing(socket);
		instagram.instagramStartFollowing(socket);
		/*
		** FACEBOOK
		*/
		facebook.facebookCreateFollowing(socket);

		facebook.facebookStartStreaming(socket);
		/*
		** TWITTER followings
		*/
		twitter.twitterCreateFollowing(socket);
		twitter.twitterStartFollowing(socket);
		twitter.twitterSubscribeList(socket);
		twitter.twitterStartFollowingList(socket);

		/*socket.on('start following on twitter', function (following) {
			if(following.isActive == true) {
				console.log('start following ' + following.name + ' on twitter.');
			} else {
				console.log('stop following ' + following.name + ' on twitter.');
			}
			if(following.userId != 'dummy') {
				twitter.twitterStartFollowing(socket);
				instagram.instagramStartFollowing(socket);
			} /*else {
				twitter.twitterStartFollowingList(socket);
			}
		});*/

		var room;
		var onlyOnce = false;
		server.on('response', function (request) {
			if(!room && !onlyOnce && request.auth.credentials) {
				//console.log('how many????????????????????????????????????????????');
				onlyOnce = true;
				try {
					room = obtainDomain(request.auth.credentials.profile.emails[0].value);
					socket.join(room);
				} catch(err) {
					return;
				}
			}
			//console.log(request.url.path);
			if(!timerCreated) {
				//console.log('no timer created yet');
				try {
					timer[timerName] = false;
				} catch(err) {
					//console.log(err);
					return;
				}
			} else {
				stopTimerOnActivity(request);
			}

		});

		programStoped = function (programObj) {
			io.to(programObj.entity).emit('notification', programObj);

		}

		/*
		** TOKEN generator
		*/
		tokenRequest.requestToken(socket);
		tokenRequest.generateNewToken(socket);
		profilePictureChanger.changeProfilePicture(socket);

		/*
		** ON RESRART prevent server and soket from creating more than one listener
		*/
		socket.on('disconnect', function (args) {
			console.log('got disconnected');
			socket.removeAllListeners('activate prog');
			socket.removeAllListeners('startCountingTweets');
			socket.removeAllListeners('addHashtag');
			socket.removeAllListeners('removeHashtag');
			socket.removeAllListeners('start following on twitter');
			server.removeAllListeners('response');

		});

	});

	next();

};

exports.register.attributes = {
	name: 'socket-io',
	version: '0.0.1'
};