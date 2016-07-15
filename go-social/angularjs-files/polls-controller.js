'use strict';

angular.module('GoSocial')
	.controller('pollsController', ['$scope', '$rootScope', '$interval', '$timeout', 'Notification', 'PollsService', 'PollsResultsService', 'MessagesService', '$stateParams', function ($scope, $rootScope, $interval, $timeout, Notification, PollsService, PollsResultsService, MessagesService, $stateParams) {
		// hide bell notifications
		$rootScope.counterVisible = 'show';
		if(getPollsResultsInterval) {
			$interval.cancel(getPollsResultsInterval);
		}

		var intervalActive = false;
		$scope.$on('$locationChangeStart', function (event, next) {
			if(getPollsResultsInterval && intervalActive == true) {
				console.log('stopping results interval on state change.');
				$interval.cancel(getPollsResultsInterval);
			}

		});
		/*if(getPollsResultsInterval) {
			$interval.cancel(getPollsResultsInterval);
		}*/
		/*
		** POLLS results
		*/
		$scope.resultsFromPoll = {};
		var showResults = function () {
			$scope.pollsResults.$promise.then(function (results) {
				$scope.polls.$promise.then(function (pollsData) {
					_.forEach(pollsData, function (poll) {
						$scope.resultsFromPoll[poll._id] = [];
						$scope.resultsFromPoll[poll._id]['total'] = 0;
						_.forEach(poll.hashtag_answers, function (answer) {
							console.log(answer);
							for (var i = results.length - 1; i >= 0; i--) {
								if(answer == results[i]._id) {
									console.log(results[i].count);
									$scope.resultsFromPoll[poll._id].push(results[i]);
									$scope.resultsFromPoll[poll._id]['total'] += results[i].count;
								}
							};
						});

					});

				});

			}).then(function () {
				//console.log($scope.total);
				//console.log($scope.resultsFromPoll);	
			});
		}
		$scope.editingPoll = false;
		$scope.trashActive = false;
		/*
		** ACCESSS methods in program service
		*/
		$scope.poll = new PollsService();
		$scope.pollsResults = new PollsResultsService();
		$scope.poll.options = ['']; 
		/*
		** GET all programs
		*/
		$scope.polls = PollsService.query({ progID: $stateParams.progID });
		$scope.pollsResults = PollsResultsService.query({ progID: $stateParams.progID });
		showResults();
		$timeout(function () {
			intervalActive = true;
		}, 800);

		var getPollsResultsInterval = $interval(function () {
			$scope.pollsResults = PollsResultsService.query({ progID: $stateParams.progID });
			showResults();
			intervalActive = true;

		}, 1000*3);
		/*
		** SAVE poll
		*/
		var hashtagIncluded = true;
		$scope.savePoll = function () {
			_.forEach($scope.poll.options, function (hashtag) {
				if(hashtag.substring(0,1) != '#') {
					hashtagIncluded = false;
				}
			});
			if(hashtagIncluded == true) {
				$scope.poll.$save({ progID: $stateParams.progID }).then(function (response) {
					console.log(response);
					$scope.polls.push(response);
				});
				$scope.poll = new PollsService();
				$scope.poll.options = [''];
				$scope.editingPoll = false;
				$scope.trashActive = false;
				$scope.socket.emit('addHashtag', 'Poll added!');
			} else {
				Notification.error({message: 'Please use <strong>#</strong> symbol in every answer field. <br /><u>Click here to close.</u>', delay: null});
			}
			hashtagIncluded = true;

		};

		var pollId;
		$scope.updatePoll = function() {
			//console.log($scope.poll.options);
			_.forEach($scope.poll.options, function (answer) {
				$timeout(function () {
					//console.log(answer + '*******************************');
					PollsService.update({ progID: $stateParams.progID, id: pollId, pollName: $scope.poll.pollName, question: $scope.poll.question, answer: answer });
				}, 1000);

			});
			$scope.editingPollMode = 'newPoll';
			$scope.editingPoll = false;

		}

		$scope.deletePoll = function (poll) {
			PollsService.delete({ progID: $stateParams.progID, id: poll._id }, poll);
			_.remove($scope.polls, poll);
			$scope.socket.emit('removeHashtag', 'Poll removed!');
		}

		$scope.editingPollMode = 'newPoll';
		$scope.editMode = function (poll) {
			$scope.editingPoll = true;
			if(poll) {
				console.log(poll.question);
				$scope.editingPollMode = 'editExistingPoll';
				$scope.poll = poll;
				$scope.poll.options = poll.hashtag_answers;
				pollId = poll._id;
			}

		}

		$scope.cancelEditMode = function () {
			$scope.editingPoll = false;
			if($scope.editingPollMode == 'editExistingPoll') {
				pollId = '';
				$scope.editingPollMode = 'newPoll';
			}

		}

		$scope.removeOption = function (index) {
			$scope.poll.options.splice(index, 1);

		}

		$scope.addOption = function() {
			$scope.poll.options.push('');
			console.log($scope.poll);


		}

		$scope.trashModeActive = function () {
			if($scope.trashActive == true) {
				$scope.trashActive = false;
			} else {
				$scope.trashActive = true;
			}

		}

		$scope.resetPoll = function (poll) {
			console.log(poll);
			$scope.resultsFromPoll[poll._id] = [];
			_.forEach(poll.hashtag_answers, function (hashtag) {
				console.log(hashtag);
				MessagesService.delete({ progID: $stateParams.progID, hashtag: hashtag, following: 'resetPoll' });

			});

		}

	}]);