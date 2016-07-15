var Config = require('../config/config');
var Twit = require('twit');
var Message = require('../models/message').Message;
var Hashtag = require('../models/hashtag').Hashtag;
var Program = require('../models/program').Program;
var Following = require('../models/following').Following;
var Poll = require('../models/poll').Poll;
var _ = require('lodash');
//var twitterStream = require('../services/twitter');
/*
** TWITTER stream
*/
var twitter = new Twit(Config.twitter);

var stream; 
var streamFollowings;
var startStream;
var startNotifying;
var startFollowing;
var twitterListsStream;
var isPoll = false;
module.exports = {
	twitterStream: function (socket) {
		if(stream) {
			stream.stop();
		}
		if(startStream) {
			clearTimeout(startStream);
		}
		startStream = setTimeout(function () {
			//stream.stop();
			Hashtag.find({ isActive: true }, function (err, hashtags) {
				if(err) {
					console.log(err);
					return;
				}
				var hashtagsPollsArray = [];
				Poll.find({}, function (err, polls) {
					if(err) {
						console.log(err);
						return;
					}

					var mergedArray = [];
					for (var i = polls.length - 1; i >= 0; i--) {
						hashtagsPollsArray.push(polls[i].hashtag_answers);
						mergedArray = [].concat.apply([], hashtagsPollsArray);
					}
					//console.log(mergedArray + '«««««««««««««««««««««««');
					var filterHashtagsByActive = _(hashtags)
						.filter(function (hashtag) {
								return hashtag.isActive == true;
							}).pluck('hashtag').value();

					var joinArrays = filterHashtagsByActive.concat(mergedArray);
					//console.log(joinArrays);
					var removeDuplicates = _.unique(joinArrays);
					console.log(removeDuplicates);

					if(removeDuplicates.length != 0 && removeDuplicates != undefined) {
						//stream.stop();
						stream = twitter.stream('statuses/filter', { track: removeDuplicates });
						console.log('stream started!!!');
					} else {
						//stream.stop();
						console.log('No hashatgs subscribed!!');
					}
					// BYPASS to set the number of events to infinit
					if(stream) {
						stream.setMaxListeners(0);
					}
					/*
					** Dictionary creation #hashtag: ['progId1', 'progId2', etc.]
					*/
					var hashtagProgs = {};
					for (var i = hashtags.length - 1; i >= 0; i--) {
						//hashtags[i].progID;
						if(!hashtagProgs[hashtags[i].hashtag]) {
							hashtagProgs[hashtags[i].hashtag] = [];
						}

						hashtagProgs[hashtags[i].hashtag].push(hashtags[i].progID);
					};
					//console.log(hashtagProgs);
					for (var i = polls.length - 1; i >= 0; i--) {
						for (var j = polls[i].hashtag_answers.length - 1; j >= 0; j--) {
							if(!hashtagProgs[polls[i].hashtag_answers[j]]) {
								hashtagProgs[polls[i].hashtag_answers[j]] = [];
							}
							hashtagProgs[polls[i].hashtag_answers[j]].push(polls[i].progID);
						}
					};
					console.log(hashtagProgs);

					//var progs = hashtags;
					var hashtagsSubscribed = false;
					if(stream) {
						stream.on('tweet', function (tweet) {
							setTimeout(function () {
								//console.log(tweet);
								//console.log(_.words(tweet.text.toLowerCase()));
								//console.log((tweet.text.split(" ")));
								var hashtagsStream = (tweet.text.split(" "));		
								var allProgs = [];
								for (var i = hashtagsStream.length - 1; i >= 0; i--) {
									var current = hashtagsStream[i].toLowerCase();
									/*
									** AVOIDING programs repetition
									*/
									if(hashtagProgs[current]) {
										var progsArray = allProgs.concat(hashtagProgs[current]);
									}
									if(current.substring(0,1) == '#') {
										var currentHashtag = hashtagsStream[i].toLowerCase();
										if((_.includes(removeDuplicates, currentHashtag)) == true) {
											var myHashtag = currentHashtag;
											hashtagsSubscribed = true;
										}
									}
								};
								if(polls) {
									_.forEach(polls, function (poll) {
										_.forEach(poll.hashtag_answers, function (pollHashtag) {
											if(pollHashtag == myHashtag) {
												isPoll = true;
											}
										});
										
									});
								}
								var progs = _.unique(progsArray);
								//console.log(progs + '*************************************************************');
								if(hashtagsSubscribed == true) {
									//console.log(hashtagsStream[i].toLowerCase() + '??????????????????????????????');
									_.forEach(progs, function (program) {
										var message = new Message(tweet);	
										//console.log(program + '************************************************************');
										if(socket) {
											//socket.emit('start stream', tweet);
											socket.emit('current prog', program);
										}
										//console.log(n.progName);
										//message.progName = n.progName;
										if(isPoll == true) {
											message.isPoll = true;
										}
										message.postId = tweet.id;
										message.progID = program;
										message.socialType = 'twitter';
										message.media = tweet.entities.media;
										if(tweet.extended_entities && tweet.extended_entities.media[0].type == 'video') {
											message.twitter_video = tweet.extended_entities;
											//console.log(tweet.extended_entities + '$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$');
										}
										message.user.profile_image_full_url = tweet.user.profile_image_url.replace('_normal', '').trim();
										message.hashtag = myHashtag;
										message.created_at = new Date();
										message.updated_at = new Date();
										message.text = tweet.text;
										Program.find({}, function (err, programs) {
											if(err) {
												console.log(err);
												return;
											}
											_.forEach(programs, function (n, key) {
												//console.log(n.deleteHashtags);
												if(message.progID == n._id) {
													message.progName = n.progName;
													message.updatedText = tweet.text;
													if(n.deleteHashtags) {
														message.updatedText = message.updatedText.replace(/#\S+/g, '').trim();
													}
													if(n.deleteUrls) {
														message.updatedText = message.updatedText.replace(/https\S+/g, '').trim();
														message.updatedText = message.updatedText.replace(/http\S+/g, '').trim();
													}
												}

												message.save(function (err, message) {
													if(err) {
														console.log(err);
														return;
													}
													//return reply(message);
													//console.log(message);
												});
												
											});

										});

									});
								}

							}, 1000);
							
						});
					}

				});

			});

		}, 1000*5);
	},

	twitterStreamNotifications: function (socket) {
		if(startNotifying) {
			clearTimeout(startNotifying);
		}
		startNotifying = setTimeout(function () {
			Hashtag.find({ isActive: true }, function (err, hashtags) {
				if(err) {
					console.log(err);
					return;
				}
				var hashtagsPollsArray = [];
				Poll.find({}, function (err, polls) {
					if(err) {
						console.log(err);
						return;
					}

					var mergedArray = [];
					for (var i = polls.length - 1; i >= 0; i--) {
						hashtagsPollsArray.push(polls[i].hashtag_answers);
						mergedArray = [].concat.apply([], hashtagsPollsArray);
					}
					//console.log(mergedArray + '«««««««««««««««««««««««');

					var filterHashtagsByActive = _(hashtags)
						.filter(function (hashtag) {
								return hashtag.isActive == true;
							}).pluck('hashtag').value();

					var joinArrays = filterHashtagsByActive.concat(mergedArray);
					//console.log(joinArrays);
					var removeDuplicates = _.unique(joinArrays);
					//console.log(removeDuplicates);
					/*
					** Dictionary creation #hashtag: ['progId1', 'progId2', etc.]
					*/
					var hashtagProgs = {};
					for (var i = hashtags.length - 1; i >= 0; i--) {
						//hashtags[i].progID;
						if(!hashtagProgs[hashtags[i].hashtag]) {
							hashtagProgs[hashtags[i].hashtag] = [];
						}

						hashtagProgs[hashtags[i].hashtag].push(hashtags[i].progID);
					};
					//console.log(hashtagProgs);
					for (var i = polls.length - 1; i >= 0; i--) {
						for (var j = polls[i].hashtag_answers.length - 1; j >= 0; j--) {
							if(!hashtagProgs[polls[i].hashtag_answers[j]]) {
								hashtagProgs[polls[i].hashtag_answers[j]] = [];
							}
							hashtagProgs[polls[i].hashtag_answers[j]].push(polls[i].progID);
						}
					};
					//console.log(hashtagProgs);
					
					console.log('start notifying!!');
					var hashtagsSubscribed = false;
					if(stream) {
						stream.on('tweet', function (tweet) {
							var hashtagsStream = (tweet.text.split(" "));		
							var allProgs = [];
							for (var i = hashtagsStream.length - 1; i >= 0; i--) {
								var current = hashtagsStream[i].toLowerCase();
								/*
								** AVOIDING programs repetition
								*/
								if(hashtagProgs[current]) {
									var progsArray = allProgs.concat(hashtagProgs[current]);
								}
								if(current.substring(0,1) == '#') {
									var currentHashtag = hashtagsStream[i].toLowerCase();
									if((_.includes(removeDuplicates, currentHashtag)) == true) {
										var myHashtag = currentHashtag;
										hashtagsSubscribed = true;
									}
								}
							};
							var progs = _.unique(progsArray);
							if(hashtagsSubscribed == true) {
								_.forEach(progs, function (program) {
									//console.log(program);
									socket.emit('start stream', tweet);
									socket.emit('current prog', program);

								});
							}

						});
					}

				});	
			});

		}, 1000);
	},

	// https://api.twitter.com/1.1/users/show.json?screen_name=Cristiano
	twitterCreateFollowing: function (socket) {
		/*
		** SUBSCRIBE a new following
		*/
		var progName;
		socket.on('twitter user subscribed', function (follow) {
			Program.findOne({ _id: follow.progID }, function (err, program) {
				if(err) {
					console.log(err);
					return;
				}
				progName = program.progName;

			}).then(function () {
				twitter.get('users/show', { screen_name: follow.username }, function (err, data, response) {
					if(err) {
						console.log(err);
						socket.emit('user data', 'wrong username');
						//return;
					}
					//console.log(JSON.stringify(data, null, 4) + '===========================================');
					var alreadyFollowing = false;
					var following = new Following();

					if(data.id) {
						Following.find({ progID: follow.progID, social_network: 'twitter' }, function (err, followedUsers) {
							for (var i = followedUsers.length - 1; i >= 0; i--) {
					 			//console.log(followedUsers + '============');
					 			if(followedUsers[i].userId == data.id) {
					 				alreadyFollowing = true;
					 			}
					 		}

					 		if(alreadyFollowing == false) {
								following.userId = data.id;
								following.social_network = follow.social_network;
								following.progID = follow.progID;
								following.progName = progName;
								following.name = data.name;
								following.profile_picture = data.profile_image_url;
								following.profile_picture_full_url = data.profile_image_url.replace('_normal', '').trim();
								socket.emit('user data', data);

								following.save(function (err, following) {
									if(err) {
										console.log(err);
										return;
									}
									console.log('twitter following saved!');
									return following;

								});
							} else {
								socket.emit('user data', 'alreadyExists');
							}

						});
					}

				});

			});

		});

	},

	twitterStartFollowing: function (socket) {
		if(streamFollowings) {
			streamFollowings.stop();
		}
		if(startFollowing) {
			clearTimeout(startFollowing);
		}
		startFollowing = setTimeout(function () {
			Following.find({ isActive: true, social_network: 'twitter' }, function (err, followings) {
				if(err) {
					console.log(err);
					return;
				}
				var filterFollowingsIdsByActive = _(followings)
					.filter(function (following) {
							return following.isActive == true;
						}).pluck('userId').value();

				//console.log(filterFollowingsIdsByActive);

				if(filterFollowingsIdsByActive.length != 0 && filterFollowingsIdsByActive != undefined) {
						streamFollowings = twitter.stream('statuses/filter', { follow: filterFollowingsIdsByActive });
				} else {
					console.log('No followings subscribed!');
				}
				if(streamFollowings) {
					streamFollowings.on('message', function (eventMessage) {
						//console.log(eventMessage);

						var message = new Message(eventMessage);
						if(eventMessage.text) {
							for (var i = followings.length - 1; i >= 0; i--) {
								if(followings[i].userId == eventMessage.user.id) {
									message.progID = followings[i].progID;
									message.progName = followings[i].progName;
									socket.emit('current prog', message.progID);
								}
							};
							message.socialType = 'twitter';
							message.media = eventMessage.entities.media;
							message.user.profile_image_full_url = eventMessage.user.profile_image_url.replace('_normal', '').trim();
							message.created_at = new Date();
							message.updated_at = new Date();
							message.text = eventMessage.text;

							Program.find({}, function (err, programs) {
								if(err) {
									console.log(err);
									return;
								}
								_.forEach(programs, function (n, key) {
									//console.log(n.deleteHashtags);
									if(message.progID == n._id) {
										message.updatedText = eventMessage.text;
										if(n.deleteHashtags) {
											message.updatedText = message.updatedText.replace(/#\S+/g, '').trim();
										}
										if(n.deleteUrls) {
											message.updatedText = message.updatedText.replace(/https\S+/g, '').trim();
											message.updatedText = message.updatedText.replace(/http\S+/g, '').trim();
										}
									}
									message.save(function (err, message) {
										if(err) {
											console.log(err);
											return;
										}
										//console.log(message);
									});

								});

							});
						}

					});
				}
				
			});

		}, 1000*5);

	},

	twitterSubscribeList: function (socket) {
		/*
		** SUBSCRIBE a new list
		*/
		var progName;
		socket.on('twitter list subscribed', function (follow) {
			Program.findOne({ _id: follow.progID }, function (err, program) {
				if(err) {
					console.log(err);
					return;
				}
				progName = program.progName;

			}).then(function () {
				twitter.get('lists/show', { owner_screen_name: follow.username, slug: follow.list }, function (err, data, response) {
					if(err) {
						console.log(err);
						socket.emit('list data', 'wrong list data');
						//return;
					}
					//console.log(JSON.stringify(data, null, 4) + '===========================================');
					var alreadyFollowing = false;
					var following = new Following();

					if(data.id) {
						Following.find({ progID: follow.progID, social_network: 'twitter_list' }, function (err, followedUsers) {
							for (var i = followedUsers.length - 1; i >= 0; i--) {
					 			//console.log(followedUsers + '============');
					 			if(followedUsers[i].listId == data.id) {
					 				alreadyFollowing = true;
					 			}
					 		}

							if(alreadyFollowing == false) {
								following.userId = data.user.id;
								following.listId = data.id;
								following.social_network = follow.social_network;
								following.progID = follow.progID;
								following.progName = progName;
								following.name = data.name;
								following.profile_picture = data.user.profile_image_url;
								following.profile_picture_full_url = data.user.profile_image_url.replace('_normal', '').trim();
								socket.emit('list data', data);

								following.save(function (err, following) {
									if(err) {
										console.log(err);
										return;
									}
									console.log('twitter following saved!');
									return following;

								});
							} else {
								socket.emit('list data', 'alreadyExists');
							}

						});
					}

				});

			});

		});

	},

	twitterStartFollowingList: function (socket) {
		var updateListsStream = function () {
			Following.find({ isActive: true, social_network: 'twitter_list' }).sort({ lastRefresh: 1 }).limit(1).exec(function (err, following) {
				if(err) {
					console.log(err);
					return;
				}

				if(following.length == 1) {
					Program.findOne({ _id: following[0].progID }, function (err, program) {
						if(err) {
							console.log(err);
							return;
						}

						Message.find({ 'following.listId': following[0].listId, socialType: 'twitter_list', progID: following[0].progID }).sort({ 'following.twitter_list_original_creation_date': -1 }).limit(1).exec(function (err, messageToCompare) {
							if(err) {
								console.log(err);
								return;
							}
							var query;
							//console.log(messageToCompare);
							if(messageToCompare[0]) {
								//console.log('here!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
								query = { list_id: following[0].listId, since_id: messageToCompare[0].postId, include_rts: false };
							} else {
								query = { list_id: following[0].listId };
							}
							twitter.get('lists/statuses', query, function (err, listsData) {
								if(err) {
									console.log(err);
									return;
								}
								//console.log(listsData);
								if(listsData) {
									_.forEach(listsData, function (listsMessage) {

										if(messageToCompare[0] == undefined || (messageToCompare[0] != undefined && messageToCompare[0].postId < listsMessage.id)) {
											var message = new Message(listsMessage);

											message.postId = listsMessage.id;
											message.following.listId = following[0].listId; 
											message.socialType = 'twitter_list';
											message.media = listsMessage.entities.media;
											message.user.profile_image_full_url = listsMessage.user.profile_image_url.replace('_normal', '').trim();
											message.following.twitter_list_original_creation_date = listsMessage.created_at;
											message.following.listId = following[0].listId;
											message.created_at = new Date();
											message.updated_at = new Date();
											message.text = listsMessage.text;
											message.updatedText = listsMessage.text;
											message.progID = following[0].progID;
											message.progName = program.progName;

											if(program.deleteHashtags) {
												message.updatedText = message.updatedText.replace(/#\S+/g, '').trim();
											}
											if(program.deleteUrls) {
												message.updatedText = message.updatedText.replace(/https\S+/g, '').trim();
												message.updatedText = message.updatedText.replace(/http\S+/g, '').trim();
											}

											message.save(function (err, message) {
												if(err) {
													console.log(err);
													return;
												}
												console.log('saved message from twitter list.');
												socket.emit('current prog', message.progID);

											});
										}

									});
								}

							});

							Following.findByIdAndUpdate({ _id: following[0]._id }, { lastRefresh: new Date() }, function (err, followingData) {
								if(err) {
									console.log(err);
								}
								console.log('updated lastRefresh for twitter lists: ' + followingData.name);

							});

						});

					});
				}

			});

		};
		if(twitterListsStream) {
			clearInterval(twitterListsStream);
		}
		twitterListsStream = setInterval(function () {
			updateListsStream();

		}, 1000*5);

		socket.on('disconnect', function (args) {
			console.log('twitter got disconnected.');
			clearInterval(twitterListsStream);

		});
	}

}