var Config = require('../config/config');
var Following = require('../models/following').Following;
var Message = require('../models/message').Message;
var Program = require('../models/program').Program;
var graph = require('fbgraph');
var _ = require('lodash');

var getCommentsUserData = function (messageComments, messageId, socket) {
	_.forEach(messageComments, function (commentsUserData) {
		//console.log(commentsUserData.id + 'ttttttttttttttttttttttttttttttttttttttt');
		graph.get(commentsUserData.from.id + '?fields=id,name,picture', function (err, userData) {
			if(err) {
				console.log(err);
				return;
			}
			//console.log(userData.id);

			Message.update({ _id: messageId, "comments.data.id": commentsUserData.id }, { "comments.data.$.from": userData }, function (err, message) {
				if(err) {
					console.log(err);
					return;
				}
				//console.log('comments info savedddddddddddddddddddddddddd');
				return message;

			});

			if(socket) {
				var obj = {};
				obj.messageId = messageId;
				Message.findOne({ _id: messageId, socialType: 'facebook' }, function (err, message) {
					if(err) {
						console.log(err);
						return;
					}
					_.forEach(message.comments.data, function (comment, index) {
						if(comment.from.id == userData.id) {
							comment.from = userData;
							obj.comment = comment;
							socket.emit('return comments', obj); 
						}

					});

				});
			}

		});

	});

}

var facebookStream;
/*
** using USERNAME alscosta returns...
*/
//https://graph.facebook.com/alscosta?fields=id,name,picture,posts&access_token=468139066714619|8Uy-w2R17RH2qIoeQi9hAlMoDIM
/*
** NOW with posts (or feed) id, you can use this to obtain info about that post
*/
//https://graph.facebook.com/1462957374004775_1531896497110862?fields=type,source,shares,full_picture,comments.order(reverse_chronological)&access_token=468139066714619|8Uy-w2R17RH2qIoeQi9hAlMoDIM

module.exports = {
	facebookCreateFollowing: function (socket) {
		graph.setAccessToken(Config.facebook.appToken);

		var progName;
		socket.on('user following subscription', function (follow) {
			Program.findOne({ _id: follow.progID }, function (err, program) {
				if(err) {
					console.log(err);
					return;
				}
				progName = program.progName;

			});

		 	//console.log(follow.username);
		 	graph.get(follow.username + '?fields=id,name,picture.width(100)' , function (err, user) {
		 		var alreadyFollowing = false;
			 	if(err) {
			 		console.log(err);
			 		socket.emit('following name', 'wrong username');
			 		//return;
			 	}
			 	if(user.id != undefined) {
				 	Following.find({ progID: follow.progID, social_network: 'facebook' }, function (err, followedUsers) {
				 		for (var i = followedUsers.length - 1; i >= 0; i--) {
				 			//console.log(followedUsers + '============');
				 			if(followedUsers[i].userId == user.id) {
				 				alreadyFollowing = true;
				 			}
				 		}
				 		if(alreadyFollowing == false) {
				 			//console.log(alreadyFollowing + 'it gets here??');
				 			var following = new Following();

						 	following.userId = user.id;
						 	following.name = user.name;
						 	following.progID = follow.progID;
						 	following.progName = progName;
						 	following.social_network = follow.social_network;
						 	following.profile_picture = user.picture.data.url;
						 	socket.emit('following name', user);
						 	//following.userName = user.username;

						 	following.save(function (err, followingData) {
						 		if(err) {
						 			console.log(err);
						 			return;
						 		}
						 		console.log('user info saved!!!!');
						 		return followingData;

						 	});
				 		} else {
				 			socket.emit('following name', 'alreadyExists');
				 		}

				 	});
			 	}

			});

		});

	},

	facebookStartStreaming: function (socket) {
		var getNewPosts = function () {
			Following.find({ isActive: true, social_network: 'facebook' }).sort({ lastRefresh: 1 }).limit(1).exec(function (err, following) {
				if(err) {
					console.log(err);
					return;
				}

				if(following.length == 1) {
					console.log(following[0].progID);

					Program.findOne({ _id: following[0].progID }, function (err, program) {
						if(err) {
							console.log(err);
							return;
						}

						//console.log(following[0].userId);
						Message.find({ 'user.id_str': following[0].userId, socialType: 'facebook', progID: following[0].progID }).sort({ 'facebook_media.created_time': -1 }).limit(1).exec(function (err, messageToCompare) {
							if(err) {
								console.log(err);
								return;
							}
							//console.log(messageToCompare[0] + 'qwuigdsabsabd=====================================');
							graph.get(following[0].userId + '?fields=id,name,picture.width(100),posts', function (err, postsObj) {
								if(err) {
									console.log(err);
								}
								if(postsObj && postsObj.posts) {
									var objs = _.sortBy(postsObj.posts.data, 'created_time');
									//console.log(postsObj.posts.data + '««««««««««««««««««««««««««««««««««««««««««««««««««««««');
									_.forEach(objs, function (userPosts) {
										//console.log(userPosts.created_time);
										//console.log(messageToCompare[0].created_at);								
										if(messageToCompare[0] == undefined || (messageToCompare[0] != undefined && parseInt(Date.parse(messageToCompare[0].facebook_media.created_time)) < parseInt(Date.parse(userPosts.created_time)))) {
											graph.get(userPosts.id + '?fields=type,message,source,shares,full_picture,comments.order(reverse_chronological)', function (err, data) {
												if(err) {
													console.log(err);
												}

												//console.log(data + 'how many times??????????????');
												var message = new Message();

												message.postId = userPosts.id;
												if(data != null && data != undefined && data.type) {
													if(data.shares) {
														message.shares = data.shares.count;
													}					
													message.facebook_media.mediaType = data.type;
													message.facebook_media.postPicture = data.full_picture;
													message.facebook_media.url = data.source;
													message.text = data.message;
													message.updatedText = data.message;

												}
												message.facebook_media.created_time = userPosts.created_time;
												message.socialType = 'facebook';
												message.user.name = postsObj.name;

												if(program.deleteHashtags && message.updatedText) {
													message.updatedText = message.updatedText.replace(/#\S+/g, '').trim();
												}
												if(program.deleteUrls && message.updatedText) {
													//console.log(message.updatedText + '««««««««««««««««««««««««««««»»»»»»»»»»»»»»»»»»»»»»»»»»»»');
													message.updatedText = message.updatedText.replace(/https\S+/g, '').trim();
													message.updatedText = message.updatedText.replace(/http\S+/g, '').trim();
												}

												message.user.profile_image_url = postsObj.picture.data.url;
												message.user.id_str = postsObj.id;
												message.progID = following[0].progID;
												message.progName = program.progName;
												message.comments = data.comments;																								

												message.save(function (err, messageForDb) {
													if(err) {
														console.log(err);
														return;
													}
													console.log('facebook message saved ' + messageForDb.progID);
													socket.emit('current prog', messageForDb.progID);
													if(data.comments) {
														getCommentsUserData(data.comments.data, messageForDb._id);
													}

													return messageForDb;

												});

											});
										}

									});
								}

							});

							Following.findByIdAndUpdate({ _id: following[0]._id }, { lastRefresh: new Date() }, function (err, followingData) {
								if(err) {
									console.log(err);
								}
								console.log('updated lastRefresh=======');

							});

						});

					});
					
				} else {
					console.log('Nothing to follow on facebook');
				}


			});

		}

		if(facebookStream) {
			clearInterval(facebookStream);
		}
		facebookStream = setInterval(function () {
			getNewPosts();

		}, 1000*3);

		socket.on('disconnect', function (args) {
			console.log('facebook got disconnected.');
			clearInterval(facebookStream);
		});

	},

	saveCommentAsMessage: function (obj, socket) {
		var isComment = {};
		isComment.confirm = true;
		Message.update({ _id: obj.message._id, "comments.data.id": obj.comment.id }, { "comments.data.$.savedAsMessage": true }, function (err, commentAsMessage) {
			if(err) {
				console.log(err);
				return;
			}
			console.log('comment updated!!!!');
			return commentAsMessage;
		});
		var message = new Message();
		/*
		** POSTID still refers to original post to which this comment is related with
		*/
		message.postId = obj.message.postId;
		message.socialType = 'facebook';
		message.text = obj.comment.message;
		message.updatedText = obj.comment.message;
		message.facebook_media.mediaType = 'comment';
		message.facebook_media.url = 'comment';
		message.facebook_media.postPicture = 'comment';
		message.comments = isComment.confirm;
		message.progID = obj.message.progID;
		message.status = 'approved';
		message.user.id_str = obj.comment.from.id;
		message.user.name = obj.comment.from.name;
		message.user.profile_image_url = obj.comment.from.picture.data.url;

		message.save(function (err, message) {
			if(err) {
				console.log(err);
				return;
			}
			console.log('comment saved as message!!!!!!!!!!!!!!!');
			setTimeout(function () {
				socket.emit('comment as message', message);
			}, 1000);
			return message;
		});

	},

	updateFacebookComments: function (facebookPostId, messageId, socket) {
		//console.log(facebookPostId + '??????????????????????????????????????');
		socket.emit('comments loading');
		var newComments = [];
		var sortedComments = [];
		var commentToCompare;
		graph.get(facebookPostId + '?fields=comments.order(reverse_chronological)', function (err, data) {
			if(err) {
				console.log(err);
				return;
			}
			if(data.comments) {
				Message.findOne({ _id: messageId, socialType: 'facebook' }, function (err, message) {
					if(err) {
						console.log(err);
						return;
					}
					sortedComments = _.sortBy(message.comments.data, 'created_time');
					sortedComments = sortedComments.reverse();
					commentToCompare = sortedComments[0].created_time;
					//console.log(JSON.stringify(commentToCompare) + '00000000000000000000000000000000');

				}).then(function () {
					console.log(commentToCompare + '??????????????????????????????????????');
					_.forEach(data.comments.data, function (comment) {
						//console.log(parseInt(Date.parse(comment.created_time)) + '??????????????');
						//console.log(parseInt(Date.parse(commentToCompare)));
						if(commentToCompare == undefined || (commentToCompare != undefined && parseInt(Date.parse(commentToCompare)) < parseInt(Date.parse(comment.created_time)))) {
							Message.findByIdAndUpdate({ _id: messageId }, { $addToSet: { "comments.data": comment } }, function (err, message) {
								if(err) {
									console.log(err);
									return;
								}
								console.log('comments saved');
								//console.log(comment + '=========================');
								return message;

							});
							newComments.push(comment);
						}
	
					}); 

				}).then(function () {
					console.log(newComments);
					if(newComments.length == 0) {
						socket.emit('no new comments', 'There are no new comments!');
					} else {
						getCommentsUserData(newComments, messageId, socket);
					}

				});

			} else {
				socket.emit('no new comments', 'There are no new comments!');
			}			

		});			
	}
}