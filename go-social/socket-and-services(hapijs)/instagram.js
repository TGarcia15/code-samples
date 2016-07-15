var Config = require('../config/config');
var Program = require('../models/program').Program;
var Hashtag = require('../models/hashtag').Hashtag;
var Message = require('../models/message').Message;
var Following = require('../models/following').Following;
var _ = require('lodash');
var request = require('request');

//var hashtagsFromDb = [];
var byEntityFollowings = {};
var byEntity = {};
var index = 1;
timer = {};
var getNewEntitiesInterval;
var nextHashtagInterval;
var getNewEntitiesIntervalFollowing;
var nextFollowingInterval;
var params = { access_token: Config.InstagramAccessToken };
//var timerName;
module.exports = {
	instagramStream: function (socket) {
		timerCreated = false;
		function getNewEntities() {
				console.log('getting new entities');
				//console.log(JSON.stringify(hashtags) + '??????????????????????????????');
				Hashtag.find({ instagramActive: true, isActive: true }, function (err, hashtags) {
					if(err) {
						console.log(err);
						return;
					}
					//console.log(JSON.stringify(hashtags));
					byEntity = _.groupBy(hashtags, function(value) { return value.entity });

				});

		}

		function nextEntity() {
			var len = Object.keys(byEntity).length;
			index = (index + 1) % len;
			//console.log(index);
			if(isNaN(index) == true) {
				index = 0;
			}
			var entityKey = Object.keys(byEntity)[index];
			//console.log(entityKey + ' 1234345435658357934587');
			return byEntity[entityKey];

		}

		function nextHashtag() {
			//console.log('it gets here');
			var nextEntitiesHashes = nextEntity();
			//console.log(nextEntitiesHashes);
			if(nextEntitiesHashes != undefined) {
					//console.log(nextEntitiesHashes);
				nextEntitiesHashes.sort(function(a, b) {
					var datea = new Date(a.lastRefresh);
					var dateb = new Date(b.lastRefresh);

					return datea - dateb;
				});
				/*
				** UPDATE hashtag last refresh
				*/
				nextEntitiesHashes[0].lastRefresh = new Date();
				Hashtag.findByIdAndUpdate({ _id: nextEntitiesHashes[0]._id }, { lastRefresh: nextEntitiesHashes[0].lastRefresh }, function (err, hashtag) {
					if(err) {
						console.log(err);
					}
					console.log('hashtag updated');
				});
				/*
				** SAVE messages to DB
				*/
				//console.log(nextEntitiesHashes[0] + '???????????????????????????????????????????????????????????');
				//params.min_tag_id = nextEntitiesHashes[0].lastMessageID;
				request.get({ url: 'https://api.instagram.com/v1/tags/' + nextEntitiesHashes[0].hashtag.substring(1).trim() + '/media/recent', qs: params }, function (err, response, body) {
					//console.log('url: ' + 'https://api.instagram.com/v1/tags/' + nextEntitiesHashes[0].hashtag.trim() + '/media/recent');					
					if(err) {
						console.log(err);
						return;
					}
					var respObj = JSON.parse(body);
					//console.log('instagram response working========================================' + JSON.stringify(respObj));
					/*
					** Look for matching hashtag program
					*/
					Program.findOne({ _id: nextEntitiesHashes[0].progID }, function (err, program) {
						if(err) {
							console.log(err);
							return;
						}

					}).then(function (program) {
						/*
						** CREATE timeout
						*/
						if(program) {
							timerName = program._id;
						}
						if(!timer[timerName]) {
							timerCreated = true;
							console.log('created timeout for ' + program.progName);
							timer[timerName] = setTimeout(function () {
								console.log('time over for program' + program.progName);
								Hashtag.update({ progID: program._id }, { instagramActive: false }, { multi: true }, function (err, hashtag) {
									if(err) {
										console.log(err);
										return;
									}
									console.log(program.progName + ' is now stoped for instagram');
									//console.log(socket.client.id);
									//socket.emit('notification', program);
									/*
									** NOTIFYING user by socket (func on socket plugin)
									*/
									programStoped(program);
									//timer[timerName] = false;
									getNewEntities();
									return hashtag;

								});

							}, 1000*60*60*2);
						}
						stopTimerOnActivity = function (request) {
						    //console.log(request.info.remoteAddress + ': ' + request.method.toUpperCase() + ' ' + request.url.path + ' --> ' + request.response.statusCode);
						    var check = _.includes(request.url.path, program._id);
						    //console.log(check + '((((((((()))))))))))))))((((((((((())))))))))))))(((((((((()))))))))))))(((((()))');
						    if(check == true) {
						    	//console.log('more time   ()()()()()()()(()()(()' + program.progName);
						    	timerName = program._id;
					    		clearTimeout(timer[timerName]);
					    		timer[timerName] = false;					    		
				    			//console.log('more time   ()()()()()()()(()()(()' + program.progName);					
						    }

						}
						Message.find({ socialType: 'instagram', progID: program._id }).sort({ 'media.created_time': -1 }).limit(1).exec(function (err, messageToCompare) {
							if(err) {
								console.log(err);
								return;
							}
							if(respObj.data != undefined && respObj.data.length != 0) {
								//console.log(respObj.pagination.min_tag_id);
								var lastMessageID = respObj.pagination.min_tag_id;
								//console.log(JSON.stringify(respObj.data[0].user, null, 4) + 'message here////////////////////********************************');
								/*
								** SAVE messages
								*/
								for (var i = 0; i < respObj.data.length; i++) {
									if(messageToCompare[0] != undefined && messageToCompare[0].media.id == respObj.data[0].id) {
										console.log('get out and stop+++++++++++++++++++++++++++++++++');
										break;
										
									} else if(messageToCompare[0] == undefined || (messageToCompare[0] != undefined && parseInt(messageToCompare[0].media.created_time) < parseInt(respObj.data[i].created_time))) {
										//console.log(i);
										var message = new Message();
										//message.hashtag = nextEntitiesHashes[0].hashtag;
										message.socialType = 'instagram';
										message.progID = nextEntitiesHashes[0].progID;
										message.progName = program.progName;
										message.media = respObj.data[i];
										if(respObj.data[i].caption) {
											message.text = respObj.data[i].caption.text;
											message.updatedText = respObj.data[i].caption.text;

											if(program.deleteHashtags) {
												message.updatedText = message.updatedText.replace(/#\S+/g, '').trim();
											}
											if(program.deleteUrls) {
												message.updatedText = message.updatedText.replace(/https\S+/g, '').trim();
												message.updatedText = message.updatedText.replace(/http\S+/g, '').trim();
											}
										}

										message.user.id_str = respObj.data[i].user.id;
										message.user.name = respObj.data[i].user.full_name;
										message.user.screen_name = respObj.data[i].user.username;
										message.user.profile_image_full_url = respObj.data[i].user.profile_picture;
										message.user.profile_image_url = respObj.data[i].user.profile_picture;
										message.save(function (err, messageForDb) {
											if(err) {
												console.log(err);
												return;
											}
											//return reply(messageForDb);
											//console.log(messageForDb);
											console.log('message saved==========================');					
											socket.emit('current prog', messageForDb.progID);

										});
										/*
										** UPDATE hashtag last messade id (for instagram request)
										*/
										/*nextEntitiesHashes[0].lastMessageID = lastMessageID;
										Following.findByIdAndUpdate({ _id: nextEntitiesHashes[0]._id }, { lastMessageID: lastMessageID }, function(err, hashtag) {
											if (err) {
												console.log(err);
												return; 
											} 
											console.log(hashtag + 'id updated//////////////////');

										});*/
									}
								};

							}

						});

					});

				});
				//console.log(nextEntitiesHashes[0].entity, nextEntitiesHashes[0].hashtag);
				return nextEntitiesHashes[0];
			}

		}
		/*
		** START instagram stream	
		*/
		if(getNewEntitiesInterval) {
			clearInterval(getNewEntitiesInterval);
		}
		if(nextHashtagInterval) {
			clearInterval(nextHashtagInterval);
		}
		getNewEntitiesInterval = setInterval(getNewEntities, 1000*5);
		nextHashtagInterval = setInterval(function() {
			var ht = nextHashtag();
			if(ht != undefined) {
				console.log(ht.hashtag, ht.entity);
			}

		}, 1000*10);

		socket.on('disconnect', function (args) {
			console.log('instagram got disconnected.');
			clearInterval(nextHashtagInterval);
			clearInterval(getNewEntitiesInterval);
			if(timerCreated) {
				//console.log('now ok----------------*********************************');
				clearTimeout(timer[timerName]);
				timer[timerName] = false;
			}

		});

	},

	instagramCreateFollowing: function (socket) {
		/*
		** SUBSCRIBE a new following
		*/
		var progName;
		var entity;
		var checkUsername = false;
		var userId;
		socket.on('instagram user subscribed', function (follow) {
			Program.findOne({ _id: follow.progID }, function (err, program) {
				if(err) {
					console.log(err);
					return;
				}
				progName = program.progName;
				entity = program.entity;

			}).then(function () {
				request.get({ url: 'https://api.instagram.com/v1/users/search?q=' + follow.username, qs: params }, function (err, response, body) {
					//console.log(JSON.stringify(data));
					var respObj = JSON.parse(body);
					if(err) {
						console.log(err);
						//socket.emit('user data', 'wrong username');
						return;
					}
					_.forEach(respObj.data, function (usersData) {
						if(follow.username == usersData.username) {
							checkUsername = true;
							userId = usersData.id;
						}

					});
					if(checkUsername) {
						getUserInfo(userId, follow);
					} else {
						socket.emit('user data', 'wrong username');
					}

				});

			});

		});

		var getUserInfo = function (userId, follow) {
			request.get({ url: 'https://api.instagram.com/v1/users/' + userId, qs: params }, function (err, response, body) {
				if(err) {
					console.log(err);
					return;
				}
				var respObj = JSON.parse(body);
				//console.log(JSON.stringify(respObj, null, 4) + '===========================================');
				var alreadyFollowing = false;
				var following = new Following();

				if(userId) {
					Following.find({ progID: follow.progID, social_network: 'twitter' }, function (err, followedUsers) {
						for (var i = followedUsers.length - 1; i >= 0; i--) {
				 			//console.log(followedUsers + '============');
				 			if(followedUsers[i].userId == data.id) {
				 				alreadyFollowing = true;
				 			}
				 		}

				 		if(alreadyFollowing == false) {
							following.userId = respObj.data.id;
							following.social_network = follow.social_network;
							following.entity = entity;
							following.progID = follow.progID;
							following.progName = progName;
							following.name = respObj.data.full_name;
							following.profile_picture = respObj.data.profile_picture;
							//following.profile_picture_full_url = respObj.profile_image_url.replace('_normal', '').trim();
							socket.emit('user data', respObj.data);

							following.save(function (err, following) {
								if(err) {
									console.log(err);
									return;
								}
								console.log('instagram following saved!');
								return following;

							});
						} else {
							socket.emit('user data', 'alreadyExists');
						}

					});
				}

			});
		}

	},

	instagramStartFollowing: function (socket) {
		timerCreated = false;
		function getNewEntitiesFollowings() {
				//console.log('getting new entities');
				//console.log(JSON.stringify(hashtags) + '??????????????????????????????');
				Following.find({ social_network: 'instagram', isActive: true }, function (err, followings) {
					if(err) {
						console.log(err);
						return;
					}
					//console.log(JSON.stringify(followings));
					byEntityFollowings = _.groupBy(followings, function(value) { return value.entity });

				});

		}

		function nextEntityFollowings() {
			var len = Object.keys(byEntityFollowings).length;
			index = (index + 1) % len;
			//console.log(index);
			if(isNaN(index) == true) {
				index = 0;
			}
			var entityKey = Object.keys(byEntityFollowings)[index];
			//console.log(entityKey + ' 1234345435658357934587');
			return byEntityFollowings[entityKey];

		}

		function nextFollowing() {
			//console.log('it gets here');
			var nextEntitiesHashes = nextEntityFollowings();
			//console.log(nextEntitiesHashes);
			if(nextEntitiesHashes != undefined) {
					//console.log(nextEntitiesHashes);
				nextEntitiesHashes.sort(function(a, b) {
					var datea = new Date(a.lastRefresh);
					var dateb = new Date(b.lastRefresh);

					return datea - dateb;
				});
				/*
				** UPDATE following last refresh
				*/
				nextEntitiesHashes[0].lastRefresh = new Date();
				Following.findByIdAndUpdate({ _id: nextEntitiesHashes[0]._id }, { lastRefresh: nextEntitiesHashes[0].lastRefresh }, function (err, following) {
					if(err) {
						console.log(err);
					}
					console.log('following updated');
				});
				/*
				** SAVE messages to DB
				*/
				//params.min_tag_id = nextEntitiesHashes[0].lastMessageID;
				request.get({ url: 'https://api.instagram.com/v1/users/' + nextEntitiesHashes[0].userId + '/media/recent', qs: params }, function (err, response, body) {					
					if(err) {
						console.log(err);
						return;
					}
					var respObj = JSON.parse(body);
					//console.log('instagram response working========================================' + JSON.stringify(respObj));
					/*
					** Look for matching hashtag program
					*/
					Program.findOne({ _id: nextEntitiesHashes[0].progID }, function (err, program) {
						if(err) {
							console.log(err);
							return;
						}

					}).then(function (program) {
						/*
						** CREATE timeout
						*/
						if(program) {
							timerName = program._id;
						}
						if(!timer[timerName]) {
							timerCreated = true;
							console.log('created timeout for ' + program.progName);
							timer[timerName] = setTimeout(function () {
								console.log('time over for program' + program.progName);
								Following.update({ progID: program._id }, { instagramActive: false }, { multi: true }, function (err, following) {
									if(err) {
										console.log(err);
										return;
									}
									console.log(program.progName + ' is now stoped for instagram');
									//console.log(socket.client.id);
									//socket.emit('notification', program);
									/*
									** NOTIFYING user by socket (func on socket plugin)
									*/
									programStoped(program);
									//timer[timerName] = false;
									getNewEntitiesFollowings();
									return following;

								});

							}, 1000*60*60*2);
						}
						stopTimerOnActivity = function (request) {
						    //console.log(request.info.remoteAddress + ': ' + request.method.toUpperCase() + ' ' + request.url.path + ' --> ' + request.response.statusCode);
						    var check = _.includes(request.url.path, program._id);
						    //console.log(check + '((((((((()))))))))))))))((((((((((())))))))))))))(((((((((()))))))))))))(((((()))');
						    if(check == true) {
						    	//console.log('more time   ()()()()()()()(()()(()' + program.progName);
						    	timerName = program._id;
					    		clearTimeout(timer[timerName]);
					    		timer[timerName] = false;					    		
				    			//console.log('more time   ()()()()()()()(()()(()' + program.progName);					
						    }

						}
						Message.find({ socialType: 'instagram', progID: program._id }).sort({ 'media.created_time': -1 }).limit(1).exec(function (err, messageToCompare) {
							if(err) {
								console.log(err);
								return;
							}
							if(respObj.data != undefined && respObj.data.length != 0) {
								//console.log(respObj.pagination.min_tag_id);
								var lastMessageID = respObj.pagination.min_tag_id;
								//console.log(JSON.stringify(respObj.data[0].user, null, 4) + 'message here////////////////////********************************');
								/*
								** SAVE messages
								*/
								for (var i = 0; i < respObj.data.length; i++) {
									if(messageToCompare[0] != undefined && messageToCompare[0].media.id == respObj.data[0].id) {
										console.log('get out and stop+++++++++++++++++++++++++++++++++');
										break;
										
									} else if(messageToCompare[0] == undefined || (messageToCompare[0] != undefined && parseInt(messageToCompare[0].media.created_time) < parseInt(respObj.data[i].created_time))) {
										//console.log(i);
										var message = new Message();
										//message.hashtag = nextEntitiesHashes[0].hashtag;
										message.socialType = 'instagram';
										message.progID = nextEntitiesHashes[0].progID;
										message.progName = program.progName;
										message.media = respObj.data[i];
										if(respObj.data[i].caption) {
											message.text = respObj.data[i].caption.text;
											message.updatedText = respObj.data[i].caption.text;

											if(program.deleteHashtags) {
												message.updatedText = message.updatedText.replace(/#\S+/g, '').trim();
											}
											if(program.deleteUrls) {
												message.updatedText = message.updatedText.replace(/https\S+/g, '').trim();
												message.updatedText = message.updatedText.replace(/http\S+/g, '').trim();
											}
										}

										message.user.id_str = respObj.data[i].user.id;
										message.user.name = respObj.data[i].user.full_name;
										message.user.screen_name = respObj.data[i].user.username;
										message.user.profile_image_full_url = respObj.data[i].user.profile_picture;
										message.user.profile_image_url = respObj.data[i].user.profile_picture;
										message.save(function (err, messageForDb) {
											if(err) {
												console.log(err);
												return;
											}
											//return reply(messageForDb);
											//console.log(messageForDb);
											console.log('message saved==========================');					
											socket.emit('current prog', messageForDb.progID);

										});
										/*
										** UPDATE hashtag last messade id (for instagram request)
										*/
										/*nextEntitiesHashes[0].lastMessageID = lastMessageID;
										Following.findByIdAndUpdate({ _id: nextEntitiesHashes[0]._id }, { lastMessageID: lastMessageID }, function(err, hashtag) {
											if (err) {
												console.log(err);
												return; 
											} 
											console.log(hashtag + 'id updated//////////////////');

										});*/
									}
								};

							}

						});

					});

				});
				//console.log(nextEntitiesHashes[0].entity, nextEntitiesHashes[0].hashtag);
				return nextEntitiesHashes[0];
			}

		}
		/*
		** START instagram stream	
		*/
		if(getNewEntitiesIntervalFollowing) {
			clearInterval(getNewEntitiesIntervalFollowing);
		}
		if(nextFollowingInterval) {
			clearInterval(nextFollowingIntervalFollowing);
		}
		getNewEntitiesIntervalFollowing = setInterval(getNewEntitiesFollowings, 1000*5);
		nextFollowingIntervalFollowing = setInterval(function() {
			var ht = nextFollowing();
			if(ht != undefined) {
				console.log(ht.hashtag, ht.entity);
			}

		}, 1000*10);

		socket.on('disconnect', function (args) {
			console.log('instagram got disconnected.');
			clearInterval(nextFollowingInterval);
			clearInterval(getNewEntitiesInterval);
			if(timerCreated) {
				//console.log('now ok----------------*********************************');
				clearTimeout(timer[timerName]);
				timer[timerName] = false;
			}
		});

	},

	instagramGenerateToken: function (loginData) {
		//console.log(JSON.stringify(loginData));
		//console.log(loginData.code);
		var options = {
			transport_method : 'body',
			client_id: '067361054bef4436898a24dd82eaf5f5',
			client_secret: '7ea9c8edd8c14995b943f36aba6472c8',
			grant_type: 'authorization_code',
			redirect_uri: 'http://127.0.0.1:3000/app/?progID=' + loginData.progID,
			code: loginData.code
		}

		request.post({ url: 'https://api.instagram.com/oauth/access_token', form:options }, function (err, response, body) {
			if(err) {
				console.log(err);
				return;
			}
			var respObj = JSON.parse(body);
			Program.findByIdAndUpdate({ _id: loginData.progID }, { instagramAccessToken: respObj }, function (err, program) {
				if(err) {
					console.log(err);
					return;
				}
				return program;

			});

		});

	}	
}