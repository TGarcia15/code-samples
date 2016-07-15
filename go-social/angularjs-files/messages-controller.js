'use strict';

angular.module('GoSocial')
	.controller('messagesController', ['$scope', '$http', '$window', '$state', '$location', 'MessagesService', 'PlaylistsService', 'HashtagsService', '$stateParams', '$timeout', '$rootScope', '$anchorScroll', 'Notification', function ($scope, $http, $window, $state, $location, MessagesService, PlaylistsService, HashtagsService, $stateParams, $timeout, $rootScope, $anchorScroll, Notification) {
		/*
		** SOCKET.io
		*/
		$scope.loadingMessages = true;
		console.log($stateParams);
		$scope.messageStatus = $stateParams.messageStatus;
		//var socket = io.connect();
		/*
		** ACCESSS methods in message and hashtag service
		*/
		$scope.hastag = new HashtagsService();
		$scope.message = new MessagesService();
		//$scope.playlist = new PlaylistsService.ObjectResource();

		$scope.progID = $stateParams.progID;
		$scope.programs.$promise.then(function (progData) {
			/*
			** PROGID will be used to update playlist.progName when a program name is updated 
			*/
			for (var i = progData.length - 1; i >= 0; i--) {
				if(progData[i]._id == $stateParams.progID) {
					/*
					** CATCH progName
					*/
					$scope.program.progName = progData[i].progName;
					console.log($scope.program.progName);
				}
			};
		});
		/*
		** GET all hashtags and messages
		*/
		$scope.hashtags = HashtagsService.query({ progID: $stateParams.progID });
		//console.log($stateParams.messageStatus);
		if($stateParams.messageStatus == '') {
			$stateParams.messageStatus = 'pending';
			$scope.messageStatus = 'pending';
			$scope.activeClass = true;
		}
		$scope.messages = MessagesService.query({ progID: $stateParams.progID, messageStatus: $stateParams.messageStatus });
		$scope.messages.$promise.then(function () {
			$scope.loadingMessages = false;
		});
		//TODO: test cache here
		//$scope.playlists = PlaylistsService.getResource().query({ progID: $stateParams.progID });
		$scope.playlists = PlaylistsService.getResource().query({ progID: $stateParams.progID }); //get from cache rather than resource
		/*
		** MESSAGE: approve or reject
		*/
		$scope.approve = function (message) {
			//console.log('No playlist is selected');
			MessagesService.update({ progID: $stateParams.progID, id: message._id, playlistID: 'dummy', messageStatus: 'approved' });
			//$scope.deleteHashtags(message);
			_.remove($scope.messages, message);
			Notification.success('Message successfully approved!');
			//MessagesService.update({ id: message._id, playlistID: message.text });
			$scope.$on('$locationChangeStart', function (event, next) {
				event.preventDefault();
			});

		};
		$scope.reject = function (message) {
			console.log('No playlist is selected');
			MessagesService.update({ progID: $stateParams.progID, id: message._id, playlistID: 'dummy', messageStatus: 'rejected' });
			_.remove($scope.messages, message);
			Notification.error({ message: 'Message rejected!' });
			$scope.$on('$locationChangeStart', function (event, next) {
				event.preventDefault();
			});

		};
		/*
		** BELL notifications visibility
		*/
		$rootScope.counterVisible = 'hide';
		/*
		** AFTER saving Messages they have to be updated
		*/
		$scope.updateMesssages = function (status) {
			$scope.messageStatus = status;
			if($scope.messageStatus == 'pending') {
				$rootScope.counterVisible = 'hide';
				$rootScope.messageCount = 0;
			} else {
				$rootScope.counterVisible = 'show';
			}
			$scope.messages = MessagesService.query({ progID: $stateParams.progID, messageStatus: status });
			//$scope.playlists = PlaylistsService.query({ progID: $stateParams.progID });
			//console.log($scope.messages);
			//console.log($stateParams);
			$scope.editingMessage = false;
			$scope.editPlaylistsActive = false;
			$scope.activePlaylist = false;
			$scope.goToTop();
			//console.log($scope.messages);
			/*if($scope.messages[0] != undefined) {
				$scope.messages.$promise.then(function (messagesData) {
					firstItemID = messagesData[0]._id;
				});
			}*/
		}
		$scope.editPlaylistsActive = false;
		$scope.activePlaylist = false;
		$scope.changeToPlaylistMenu = function () {
			$scope.activePlaylist = true;
		}
		$scope.changeToEditPlaylists = function () {
			$scope.editPlaylistsActive = true;
		}
		$scope.changeMessageStatus = function (status) {
			$scope.messageStatus = status;
		}
		/*
		** ADD new messages into $scope.messages Array
		*/
		var firstItemID;
		$rootScope.showMesssages = function () {
			/*$scope.$on('$locationChangeStart', function (event, next) {
				event.preventDefault();

			});*/
			$stateParams.messageStatus = 'pending';
			$scope.messageStatus = 'pending';
			$scope.activeClass = true;

			if($rootScope.messageCount <= 25 && $scope.messages.length <= 200 && $scope.messages.length != 0) {
				console.log('Before');
				$scope.messages.$promise.then(function (messagesData) {
					firstItemID = messagesData[0]._id;
					console.log(firstItemID);
					//console.log(firstItemID);
					MessagesService.query({ progID: $stateParams.progID, messageStatus: false, firstItemID: firstItemID }).$promise.then(function(newMessages) {
						//console.log(newMessages);
						_.forEach(newMessages, function (newM, index) {
							if(newM._id > firstItemID) {
								console.log('how many times???????????????');
								messagesData.splice(index, 0, newM);
							}

						});

						//firstItemID = messagesData[0]._id;
					});
				});
				$rootScope.messageCount = 0;
			} else {
				console.log('After');
				$scope.updateMesssages('pending');
				$rootScope.messageCount = 0;
			}

			$scope.goToTop();
			//console.log($scope.messages);

		}
		
		$scope.startStreaming = function (hashtag) {
			HashtagsService.update({ progID: $stateParams.progID, id: hashtag._id, isActive: true });
			hashtag.isActive = true;

			$scope.socket.emit('addHashtag', 'Hashtag added!');
			//$scope.hashtags.push(hashtag);

		}
		$scope.stopStreaming = function (hashtag) {
			HashtagsService.update({ progID: $stateParams.progID, id: hashtag._id, isActive: false });
			hashtag.isActive = false;

			$scope.socket.emit('removeHashtag', 'Hashtag removed!');

			//console.log($scope.activeHashtags);
		}
		/*
		** EDIT messages text
		*/
		$scope.editingText = false;
		$scope.showTextEditMode = function (message, index) {
			$scope.editingText = true;
			$scope.currentIndex = index;

		}
		/*
		** RETRIEVE contenteditable html
		*/
		function unescapeHtml(unsafe) {
		    return unsafe
		    	 .replace(/&nbsp;/g, "")
		         .replace(/&/g, "")
		         .replace(/</g, "")
		         .replace(/>/g, "")
		         //.replace(/"/g, "")
		         //.replace(/'/g, "")
		         .replace(/br.*.br/g, "")
		         .replace(/div.*.div/g, "");
		}
		$scope.updateTextMessage = function (message, index) {
			var updateText;
			//console.log(message.changeText);
			//console.log(message.changeUpdaTedtext);
			if(message.changeText) {
				updateText = unescapeHtml(message.changeText);
				message.updatedText = unescapeHtml(message.changeText);
			}
			/*if(message.changeUpdatedText) {
				updateText = unescapeHtml(message.changeUpdatedText);
				message.updatedText = unescapeHtml(message.changeUpdatedText);
			}*/
			$scope.messages.splice(index, 1, message);
			MessagesService.update({ progID: $stateParams.progID, id: message._id, playlistID: '@' + updateText, messageStatus: 'whatever' });
			$scope.editingText = false;

		}
		$scope.cancelEditTextMessage = function (message, index) {
			console.log(message);
			message.changeText = message.updatedText;
			$scope.messages.splice(index, 1, message);
			$scope.editingText = false;
			//message.isActive = false;
			
		}
		$scope.changeToOriginalText = function (message, index) {
			console.log(message);
			message.updatedText = message.text;
			message.changeText = message.updatedText;
			$scope.messages.splice(index, 1, message);
			MessagesService.update({ progID: $stateParams.progID, id: message._id, playlistID: '@' + message.text, messageStatus: 'whatever' });
			$scope.editingText = false;
		}
		/*
		** IF an hashtag is deleted all messages refering to that hashtag are also deleted
		*/
		/*$scope.deleteMessages = function (hashtag) {
			MessagesService.delete({ progID: $stateParams.progID, hashtag: hashtag.hashtag });
			console.log(hashtag.hashtag + ' messages deleted!!!!');
			$scope.messages = MessagesService.query({ progID: $stateParams.progID });
		}*/
		/*
		** IMAGES	
		*/
		$scope.amplifyIsActive = false;
		$scope.amplify = function (message) {
			$scope.amplifyIsActive = true;
			message.imageActive = true;
		}
		$scope.minify = function (message) {
			$scope.amplifyIsActive = false;
			message.imageActive = false;
		}
		$scope.date = new Date();
	    /*
		** GOTOTOP logic
	    */
	    var count = 0;
	    $window.onscroll = function () {
	    	count += 1;
	    	//console.log(count);
	    	if(count > 10) {
	    		$scope.goTop = true;
	    	}
	    	if(document.body.scrollTop < 200) {
	    		$scope.goTop = false;
	    		count = 0;
	    	}
	    	$scope.$apply();
	    }

	    $scope.goToTop = function () {
   			$scope.goTop = false;
    		$location.hash('top');
    		$anchorScroll();
    		$scope.$on('$locationChangeStart', function (event, next) {
				event.preventDefault();
			});
			count = 0;

	    }
		/*
		** SOCKET.io counting tweets
		*/
		/*$scope.socket.on('Something', function (data) {
			console.log(data);
		});*/
		
		$scope.socket.emit('startCountingTweets', $stateParams.progID);

		$scope.resetMessageCount = function () {
			$rootScope.messageCount = 0;
		}

		$rootScope.messageCount = 0;
		//$scope.socket.on('start stream', function (tweet) {
			//console.log(tweet);
		$scope.socket.removeListener('current prog');
		$scope.socket.on('current prog', function (progID) {
			console.log(progID);
			if(progID == $stateParams.progID) {
				//console.log(tweet);
				$rootScope.messageCount++;
				//console.log($rootScope.messageCount);
				$rootScope.$apply();
			}
		});
		//});
		/*
		** CHANGE profile picture
		*/
		var image;
		$scope.changeProfilePicture = function (message) {
			if(message.socialType == 'twitter' || message.socialType == 'twitter_list') {
				image = '/images/Twitter_logo_blue.png';  
			} else if(message.socialType == 'facebook') {
				image = '/images/facebook.png';
			} else if(message.socialType == 'instagram') {
				image = '/images/instagram.png';
			}
			$scope.socket.emit('changeProfilePicture', message);
			message.user.profile_image_url = image;
			//console.log(message.user.profile_image_url);
		}
		$scope.toggle = function (message) {
			if(message.toggleText == true) {
				message.toggleText = false;
			} else {
				message.toggleText = true;
			}

		}
		/*
		** KEYSPACE event for space bar on text update
		*/
		$scope.checkEvent = function (event, message, index) {
			//console.log(event);
			if(event.keyCode == 32) {
				event.stopPropagation();
				//console.log(event);
			} else if (event.keyCode == 13) {
				event.preventDefault();
				$scope.updateTextMessage(message, index);
				$window.getSelection().removeAllRanges();
			}
			
		}

		var currentPlaylistId;
		$scope.playlistScrollActive = function (playlist) {
			console.log(playlist);
			if(playlist) {
				currentPlaylistId = playlist._id;
			} else {
				currentPlaylistId = undefined;
			}
		}
		var getSearchResults;
		var url;
		var socialNetworkControl;
		var statusControl;
		var textControl;
		$scope.loadingFilter = false;
		$scope.filterText = function (text, status, socialType) {
			$scope.dataLoading = false;
			$scope.loadingFilter = true;

			console.log(socialType);
			socialNetworkControl = socialType;
			textControl = text;

			$rootScope.counterVisible = 'show';
			if(getSearchResults) {
				$timeout.cancel(getSearchResults);
			}
			getSearchResults = $timeout(function () {
				if(status == undefined) {
					status = 'pending';
				}

				statusControl = status;

				if(text) {
					if(text.substring(0,1) == '#') {
						text = text.substr(1);
					}
					if(socialType) {
						url = '/api/program/' + $stateParams.progID + '/textSearch/' + text + '/' + status + '/' + socialType;
					} else {
						url = '/api/program/' + $stateParams.progID + '/textSearch/' + text + '/' + status + '/' + 'dummy';
					}
					$http.get(url).then(function(response) {
						console.log(text + '«««««««««««««««»»»»»»»»»»');
						console.log(status);
						$scope.messages = [];
						$scope.messages = [].concat.apply([], response.data);
						//mergedArray = [].concat.apply([], hashtagsPollsArray);
					}).then(function () {
						$scope.loadingFilter = false;
					});

					$scope.goToTop();
				} else if(socialType != 'all') {
					url = '/api/program/' + $stateParams.progID + '/textSearch/' + 'dummy' + '/' + status + '/' + socialType;

					$http.get(url).then(function(response) {
						console.log(text + '«««««««««««««««»»»»»»»»»»');
						console.log(status);
						$scope.messages = [];
						$scope.messages = [].concat.apply([], response.data);
						//mergedArray = [].concat.apply([], hashtagsPollsArray);
					}).then(function () {
						$scope.loadingFilter = false;
					});

					$scope.goToTop();
				} else {
					//$scope.messages = [];
					$rootScope.messageCount = 0;
					$rootScope.counterVisible = 'hide';
					$scope.messages = MessagesService.query({ progID: $stateParams.progID, messageStatus: status });
					$scope.messages.$promise.then(function () {
						$scope.loadingFilter = false;
						
					});

					$scope.goToTop();

				}

			}, 500);

		}
		/*
		** INFINITE scroll pagination
	    */
	    var lastItemID;
	    $scope.nextPage = function () {
	    	/*
			** THIS boolean is used to prevent infinite scroll from calling this function when it's not needed
	    	*/
	    	$scope.dataLoading = true;
	    	console.log(socialNetworkControl);
	    	console.log(currentPlaylistId);
	    	/*
			** THIS is used when no filter has been applied to messages and in this case we're using angular resource
	    	*/
	    	if($scope.messages.$promise && !currentPlaylistId) {
	    		$scope.messages.$promise.then(function (messagesData) {
					/*
					** FIND lastItemID for query
					*/
					if($scope.messages.length >= 5) {
						lastItemID = $scope.messages[$scope.messages.length - 1]._id;
						MessagesService.query({ progID: $stateParams.progID, messageStatus: false, lastItemID: lastItemID }).$promise.then(function(newMessages) {
							//console.log(newMessages);
							if(newMessages.length != 0) {
								Array.prototype.push.apply($scope.messages, newMessages);
								//console.log($scope.messages);
								$scope.dataLoading = false;
							} else {
								$scope.dataLoading = true;
							}

						});
					} else {
						$scope.dataLoading = true;
					}
				});
		    	//console.log($scope.messages);
		    /*
			** THIS is used when a filter has been applied to messages and in this case we're not using angular resource
	    	*/
	    	} else if(currentPlaylistId) {
	    		$timeout(function () {
	    			lastItemID = $scope.messages[$scope.messages.length - 1]._id;
	    			url = '/api/program/' + $stateParams.progID + '/messagesInPlaylists/' + currentPlaylistId + '/' + lastItemID;

		    		$http.get(url).then(function(response) {
		    			console.log(response);
						Array.prototype.push.apply($scope.messages, response.data);
						//mergedArray = [].concat.apply([], hashtagsPollsArray);
						$scope.dataLoading = false;
					});
	    			
	    		}, 1500);
	    	} else if(socialNetworkControl == 'all' && textControl && statusControl) {
	    		console.log('here all with text');
	    		if($scope.messages.length != 0) {
	    			lastItemID = $scope.messages[$scope.messages.length - 1]._id;
		    		url = '/api/program/' + $stateParams.progID + '/textSearch/' + textControl + '/' + statusControl + '/' + socialNetworkControl + '/' + lastItemID;

					$http.get(url).then(function(response) {
						Array.prototype.push.apply($scope.messages, response.data);
						//mergedArray = [].concat.apply([], hashtagsPollsArray);
						$scope.dataLoading = false;
					});
	    		}
	    	} else if(socialNetworkControl && socialNetworkControl == 'all') {
	    		console.log('here all');
	    		if($scope.messages.length != 0) {
					lastItemID = $scope.messages[$scope.messages.length - 1]._id;
					MessagesService.query({ progID: $stateParams.progID, messageStatus: false, lastItemID: lastItemID }).$promise.then(function(newMessages) {
						//console.log(newMessages);
						Array.prototype.push.apply($scope.messages, newMessages);
						//console.log($scope.messages);
						$scope.dataLoading = false;
					});
				}
	    	} else if(socialNetworkControl != 'all' && textControl && statusControl) {
	    		if($scope.messages.length != 0) {
	    			lastItemID = $scope.messages[$scope.messages.length - 1]._id;
		    		url = '/api/program/' + $stateParams.progID + '/textSearch/' + textControl + '/' + statusControl + '/' + socialNetworkControl + '/' + lastItemID;

					$http.get(url).then(function(response) {
						Array.prototype.push.apply($scope.messages, response.data);
						//mergedArray = [].concat.apply([], hashtagsPollsArray);
						$scope.dataLoading = false;
					});
	    		}
	    	} else if(!socialNetworkControl || socialNetworkControl != 'all' && statusControl) {
	    		if($scope.messages.length != 0) {
	    			lastItemID = $scope.messages[$scope.messages.length - 1]._id;
		    		url = '/api/program/' + $stateParams.progID + '/textSearch/' + 'dummy' + '/' + statusControl + '/' + socialNetworkControl + '/' + lastItemID;

					$http.get(url).then(function(response) {
						Array.prototype.push.apply($scope.messages, response.data);
						//mergedArray = [].concat.apply([], hashtagsPollsArray);
						$scope.dataLoading = false;
					});
	    		}
			}
			/*$timeout(function () {
				//console.log('now you can');
				$scope.dataLoading = false;
				if($scope.messages.length <= 25) {
		    		$scope.dataLoading = true;
		    	}
			}, 2500);*/

	    }

        $scope.changeToAll = function () {
        	$scope.dataLoading = false;
        	console.log($stateParams);
        	if($stateParams.messageStatus && $stateParams.messageStatus == undefined || $stateParams.messageStatus == '') {
        		$stateParams.messageStatus = 'pending';
        	}
        	if($stateParams.messageStatus == 'pending') {
	    		$state.transitionTo($state.current, $stateParams, {
				    reload: true,
				    inherit: false,
				    notify: true
				});
	    	}

        }

        $scope.updateFacebookComments = function (message) {
        	$scope.socket.emit('update facebook comments', { facebookPostId: message.postId, messageId: message._id });
        	console.log(message);
        	
        }
        $scope.socket.removeListener('comment loading');
        $scope.socket.removeListener('no new comments');
        $scope.socket.removeListener('return comments');

        $scope.socket.on('comments loading', function () {
        	$scope.commentsLoading = true;
        	
        });

        $scope.socket.on('no new comments', function (warning) {
        	$scope.commentsLoading = false;
        	Notification.error({ message: warning });

        });

        $scope.socket.on('return comments', function (obj) {
        	//console.log(comment);
        	var control;
	        $scope.commentsLoading = false;
        	if(!control || control != obj.messageId) {
	        	_.forEach($scope.messages, function (message, messageIndex) {
	        		if(message._id == obj.messageId) {
	        			$scope.messages[messageIndex].comments.data.push(obj.comment);
	        		}
	        			
	        	});
	        	control = obj.messageId;        		
        	}

        });
		
	}]);