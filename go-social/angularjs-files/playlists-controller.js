'use strict';

angular.module('GoSocial')
	.controller('playlistController', ['PlaylistsService', 'MessagesService', 'MessagesUpdateService', '$scope', '$rootScope', '$stateParams', '$q', 'Notification', '$http', '$window', '$timeout', function (PlaylistsService, MessagesService, MessagesUpdateService, $scope, $rootScope, $stateParams, $q, Notification, $http, $window, $timeout) {
		/*
		** ACCESSS methods in playlist service
		*/
		$scope.playlist = PlaylistsService.ObjectResource();
		//console.log($scope.playlist);

		$scope.progID = $stateParams.progID;
		/*
		** GET all playlists
		*/
		$scope.playlists = PlaylistsService.getResource().query({ progID: $stateParams.progID });
		console.log($stateParams.progID);
		/*
		** EDIT playlist
		*/
		//$scope.editing = false;
		$scope.edit = function (playlist) {
			//$scope.playlist = playlist;
			$scope.editing = true;
			//console.log($scope.playlist);
		}

		$scope.cancel = function () {
			$scope.playlist = new PlaylistsService.ObjectResource();
			$scope.editing = false;
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
		         .replace(/"/g, "")
		         .replace(/'/g, "")
		         .replace(/br.*.br/g, "")
		         .replace(/div.*.div/g, "")
		         .replace(/\t/g, '')
		         .replace(/\n/g, '');
		}
		/*
		** UPDATE playlist
		*/
		$scope.updatePlaylistName = function (playlist) {
			//console.log(playlist.name);
			var cleanHTML = unescapeHtml(playlist.name);
			console.log(cleanHTML);
			//playlist.name = cleanHTML;
			playlist.playlistName = cleanHTML;
			for (var i = countResults.length - 1; i >= 0; i--) {
				if(countResults[i]._id == playlist._id) {
					countResults[i].playlistName = cleanHTML;
				}
			}
			$scope.countResults = countResults;
			//console.log(countResults);		
			PlaylistsService.getResource().update({ progID: $stateParams.progID, id: playlist._id, playlistName: cleanHTML });

		}
		$scope.updateMesssagesForPlaylists = function (status) {
			$scope.messages = MessagesService.query({ progID: $stateParams.progID, messageStatus: status });
			//$scope.playlists = PlaylistsService.query({ progID: $stateParams.progID });
			console.log($stateParams);
			$scope.editingMessage = false;
			$scope.activeClass = false;

		}
		$scope.updatePlaylistNameInMessages = function (playlist) {
				var previousName = playlist.playlistName;
				console.log(previousName);
				$scope.checkForEvent = function (event, playlist) {
					if(event.keyCode == 13) {
						event.preventDefault();
						$scope.updatePlaylistName(playlist);
						var cleanHTML = unescapeHtml(playlist.name);
						console.log(cleanHTML);
						MessagesUpdateService.update({ progID: $stateParams.progID, previousPlaylistName: previousName, updatedPlaylistName: cleanHTML });
						$scope.message = new MessagesUpdateService();
						console.log($scope.messages);
						
					}

				}

		}

		/*$scope.update = function (playlist) {
			console.log($scope.playlist.progID);
			PlaylistsService.getResource().update({ id: $scope.playlist._id, progID: $scope.playlist.progID });
			$scope.playlist = new PlaylistsService();
			$scope.editing = false;
		}*/
		/*
		** SAVE playlist
		*/		
		$scope.programs.$promise.then(function (progData) {
			/*
			** PROGID will be used to update playlist.progName when a program name is updated 
			*/
			for (var i = progData.length - 1; i >= 0; i--) {
				if(progData[i]._id == $stateParams.progID) {
					var progID = progData[i]._id;
					var progName = progData[i].progName;
					console.log(progData[i]._id);
				}
			};
			/*
			** PREVENTING playlists with the same name
			*/
			$scope.save = function () {
				var alreadyExists = false;
				console.log(progName);
				console.log($scope.playlist.playlistName);
				$scope.playlists.$promise.then(function (playlistsData) {
					console.log(playlistsData);
					_.forEach(playlistsData, function (playlists) {
						if(playlists.playlistName == $scope.playlist.playlistName) {
							alreadyExists = true;
						}
					});
				}).then(function () {
					if(alreadyExists == false) {
						$scope.playlist.$save({ progID: $stateParams.progID, progName: progName }).then(function (response) {
							response.$promise = $q.resolve();
							response.$promise.$$state.value = {
								__v: response.__v,
								progID: response.progID,
								playlistName: response.playlistName,
								progName: response.progName,
								_id: response._id
						  	};					  						 	  					
						  	//response.count = 0;
							$scope.playlists.push(response);						
							
						});
						/*console.log($scope.playlist);
						PlaylistsService.savePlaylist($stateParams.progID, $scope.playlist);*/
						$scope.playlist = new PlaylistsService.ObjectResource();
					} else {
						Notification.error({ message: 'Error: Playlist already exists! <br /> <u>Please select a different name</u>.' });
					}

				});

			};
		});
		/*
		** DELETE playlist
		*/
		$scope.delete = function (playlist) {
			PlaylistsService.getResource().delete({ id: playlist._id }, playlist);
			_.remove($scope.playlists, playlist);
			_.remove($scope.countResults, playlist);
			$scope.currentPlaylistID = playlist._id;
			MessagesService.update({ progID: $stateParams.progID, id: $stateParams.progID, playlistID: $scope.currentPlaylistID, messageStatus: 'whatever' });
			//console.log(playlist._id);
			//$scope.editing = false;
			$scope.playlist = new PlaylistsService.ObjectResource();
		}
		$scope.clean = function () {
			$scope.playlist = new PlaylistsService.ObjectResource();
		}

		$scope.isSelected = function (playlist) {
			for (var i = $scope.playlists.length - 1; i >= 0; i--) {
				if($scope.playlists[i].playlistName == playlist.playlistName) {
					//console.log(i);
					$scope.currentIndex = i;
				}
				playlist.isSelected = true;
				$scope.playlistSelected = true;
				$scope.disablePlaylistClass = false;
			};
			$scope.currentPlaylistID = playlist._id;

		}
		$scope.clearPlaylistSelection = function () {
			//$rootScope.disablePlaylistClass = true;
			$scope.disablePlaylistClass = true;
			$scope.playlistSelected = false;
			$scope.currentPlaylistID = null;

		}

		$scope.currentPlaylistId = '';
		$scope.selectMenuPlaylist = function (playlist) {
			console.log(playlist._id);
			console.log(playlist.playlistName);
			$scope.currentPlaylist = playlist.playlistName;
			$scope.nameOfPlaylist = playlist.playlistName;
			$scope.disableFilter = false;
			//$scope.playlistid = playlist._id;
			$scope.currentPlaylistId = playlist._id;

			for (var i = $scope.playlists.length - 1; i >= 0; i--) {
				if($scope.playlists[i]._id == playlist._id) {
					//console.log(i);
					$scope.currentPlaylistID = $scope.playlists[i]._id;
				}
				playlist.isActive = true;
				playlist.isSelected = false;
				$scope.disablePlaylistClass = true;
			};
			$scope.currentPlaylistID = null;
			
		}

		$scope.disableFilterFunc = function () {
			$scope.disableFilter = true;
			//$scope.currentPlaylistID = null;
			$scope.currentPlaylistId = '';
			$scope.nameOfPlaylist = null;
			$scope.playlistSelected = false;
			
		}
		/*
		** SAVE message to playlist
		*/
		var countResults = [];
		$scope.selectPlaylist = function (playlist) {
			for (var i = $scope.playlists.length - 1; i >= 0; i--) {
				if($scope.playlists[i].playlistName == playlist.playlistName) {
					//console.log(playlist);
					$scope.currentPlaylistID = playlist._id;
					$scope.saveToPlaylist = function (message) {
						if(playlist.isSelected == true && $scope.disablePlaylistClass == false) {
							//console.log(message);
							MessagesService.update({ progID: $stateParams.progID, id: message._id, playlistID: playlist._id, messageStatus: 'approved' });
							for (var i = $scope.messages.length - 1; i >= 0; i--) {
								if($scope.messages[i]._id == message._id) {
									//$scope.messages.splice(i, 1, message);
									_.remove($scope.messages, message);
								}
							};
							$scope.$on('$locationChangeStart', function (event, next) {
								event.preventDefault();
							});
							Notification.success('message added to Playlist: ' + playlist.playlistName);
						} else {
							console.log('No playlist is selected');
							//Notification.error({ message: 'No playlist is selected!' });
						}
					}; 
				}
			};
		}
		/*
		** COMMENTS
		*/
		$scope.active = true;

		$scope.approveComment = function (message, comment) {
			comment.savedAsMessage = true;
			$scope.socket.emit('comment to save as message', { message: message, comment: comment });
			Notification.success('Message successfully approved!');
			$scope.socket.removeListener('comment as message');
			$scope.socket.on('comment as message', function (message) {
				//console.log(message);
				$scope.saveToPlaylist(message);
				$scope.updateCounter('approve', message);
			});
		}

		//console.log($stateParams.progID);
		$http.get('/api/program/' + $stateParams.progID + '/countMessagesByPlaylist').then(function(response) {
			console.log(response);
		    $scope.countMessagesByPlaylist = response.data;
		    //PlaylistsService.query({progID: $stateParams.progID}).$promise.then(function(playlists) {
		    PlaylistsService.getResource().query({ progID: $stateParams.progID }).$promise.then(function(playlists) {
		          //console.log(response.data);
		          //var countResults = [];
		        _.forEach(playlists, function(result) {		        	      		    
	                _.forEach(response.data, function (item) {	                 
	                	//console.log(item);	            
                      	if(item._id == result._id) {               
                            item.playlistName = result.playlistName;                      
                            countResults.push(item);
                            $scope.countResults = countResults;
                            //console.log($scope.countResults);
                      	}
	                });
		        });		       
		    });
		});

		$scope.selectPlaylistForCounter = function (playlist) {
        	if(playlist) {
        		$scope.updateCounter = function (check, message) {
	        		if(check == 'approve') {
	        			for (var i = countResults.length - 1; i >= 0; i--) {
		        		 	if(countResults[i]._id == playlist._id) {
		        		 		countResults[i].count += 1;
		        		 		var found = true;
		        		 		break;
		        		 	}
		        		}
	        		} else {
	        			for (var i = countResults.length - 1; i >= 0; i--) {
		        		 	if(countResults[i]._id == playlist._id) {
		        		 		countResults[i].count -= 1;
		        		 		var found = true;
		        		 		break;
		        		 	}
		        		}
		        		/*
						** DELETE current Playlist from message
		        		*/
		        		MessagesService.update({ progID: $stateParams.progID, id: message._id, playlistID: playlist._id, messageStatus: 'whatever', lastItemID: 'deleteOne' });
		        		_.remove($scope.messages, message);
	        		}
	        		if(!found || countResults.length == 0) {
	        			playlist.count = 1;
	        		 	countResults.push(playlist);
	        		 	$scope.countResults = countResults;
	        		}
	        	}
        	} /*else {
        		console.log('No playlist is selected!!!!!!!!');
        	}*/						 
	    }

		$scope.deleteMenuPlaylist = function (playlist) {
			_.forEach(countResults, function (result) {
				if(playlist != undefined && result != undefined) {
					if(result._id == playlist._id) {
						_.remove(countResults, result);
						$scope.countResults = countResults;
					}
				}
			});

        }
        /*
		** IF an hashtag is deleted all messages refering to that hashtag are also deleted
		*/
		$scope.deleteMessages = function (hashtag) {
			console.log(hashtag.hashtag + ' messages deleted!!!!');
			//$scope.messages = MessagesService.query({ progID: $stateParams.progID, messageStatus: 'approved' });
			/*
			** REMOVE messages from playlists and update counter
			*/
			if(hashtag.isActive != true) {
				$http.get('/api/program/' + $stateParams.progID + '/messages/allMessagesInPlaylists').then(function(response) {
					var messages = response.data;
					_.forEach(messages, function (message) {
						if(message.hashtag == hashtag.hashtag) {
							console.log(message);
							_.forEach(message.playlists, function (playlistsId) {
								console.log(playlistsId + '????????????????????????????????????');
								for (var i = countResults.length - 1; i >= 0; i--) {
									if(countResults[i]._id == playlistsId) {
										console.log(countResults[i].count);
										countResults[i].count -= 1;
										_.remove($scope.messages, message);
									}
								};
							});

						}
					});
					
				}).then(function () {
					MessagesService.delete({ progID: $stateParams.progID, hashtag: hashtag.hashtag, following: 'dummy' });
					/*
					** INSTAGRAM service for streaming only updates hashatgs info every 5 seconds, this timeout is to make sure that all messages related to this hashtag are deleted 
					*/
					$timeout(function () {
						console.log(hashtag.hashtag);
						MessagesService.delete({ progID: $stateParams.progID, hashtag: hashtag.hashtag });
					}, 5000);
				});
			} else {
				Notification.error({message: 'Error: This hashtag: ' + '<u>' + hashtag.hashtag + '</u> has an active Stream. Please stop it before proceeding.<br><u>Click to close.</u>', delay: null});
			}

		}

		$scope.deleteMessagesFollowing = function (following) {
			/*
			** REMOVE messages from playlists and update counter
			*/
			if(following.isActive != true) {
				$http.get('/api/program/' + $stateParams.progID + '/messages/allMessagesInPlaylists').then(function(response) {
					var messages = response.data;
					_.forEach(messages, function (message) {
						//console.log(message);
						if(message.user.id_str == following.userId || (message.following && following.listId && message.following.listId == following.listId)) {
							_.forEach(message.playlists, function (playlistsId) {
								//console.log(playlistsId + '????????????????????????????????????');
								for (var i = countResults.length - 1; i >= 0; i--) {
									if(countResults[i]._id == playlistsId) {
										console.log(countResults[i].count);
										countResults[i].count -= 1;
										_.remove($scope.messages, message);
									}
								};
							});
						}
					});
					
				}).then(function () {
					MessagesService.delete({ progID: $stateParams.progID, hashtag: 'dummy', following: following.userId, followingList: following.listId });
				});
			} else {
				Notification.error({message: 'Error: This user: ' + '<u>' + following.name + '</u> has an active Stream. Please stop it before proceeding.<br><u>Click to close.</u>', delay: null});
			}

		}
		/*
		** DELETE all messages in a playlist
		*/
		$scope.deleteMessagesFromPlaylist = function (playlist) {
			$http.get('/api/program/' + $stateParams.progID + '/messages/allMessagesInPlaylists').then(function(response) {
				var messages = response.data;
				_.forEach(messages, function (message) {
					//console.log(message);
					_.forEach(message.playlists, function (playlistsId) {
						//console.log(playlistsId + '1274237437858585==============');
						for (var i = countResults.length - 1; i >= 0; i--) {
							if(countResults[i]._id == playlist._id && playlistsId == playlist._id) {
								console.log(countResults[i].count);
								countResults[i].count -= 1;
								_.remove($scope.messages, message);
							}
						};
					});
				});
				
			}).then(function () {
				MessagesService.update({ progID: $stateParams.progID, id: $stateParams.progID, playlistID: playlist._id, messageStatus: 'whatever' });
			});
			
		}

		$scope.order = '-created_at';
        $scope.filterByPlaylist = function (playlist) {
        	$scope.filter = { playlists: playlist._id, status: 'approved' };
        	$scope.order = '-updated_at';

        }

        $scope.filterMessages = function (status) {
        	$scope.filter = status;
        	$scope.currentPlaylist = null;
        	$scope.order = '-created_at';

        }

	}]);