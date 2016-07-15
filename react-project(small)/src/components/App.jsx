import React, {Component} from 'react';
import ReactDOM from 'react-dom';
import Profile from './github/Profile.jsx';
import Search from './github/Search.jsx';

class App extends Component {
	constructor (props) {
		super(props);
		this.state = {
			username: 'TGarcia15',
			userData: [],
			userRepos: [],
			perPage: 5
		}
	}

	// GET user data from github
	getUserData () {
		$.ajax({
			url: 'https://api.github.com/users/' + this.state.username + '?client_id=' + this.props.clientId + '&client_secret=' + this.props.clientSecret,
			dataType: 'json',
			cache: false,
			success: function (data) {
				this.setState({
					userData: data
				});
				console.log(data);
			}.bind(this),
			error: function (xhr, status, err) {
				this.setState({
					username: null
				});
				console.log(err);
			}.bind(this)
		});
	}

	// GET user repos data from github
	getUserRepos () {
		$.ajax({
			url: 'https://api.github.com/users/' + this.state.username + '/repos?per_page=' + this.state.perPage + '&client_id=' + this.props.clientId + '&client_secret=' + this.props.clientSecret + '&sort=created',
			dataType: 'json',
			cache: false,
			success: function (data) {
				this.setState({
					userRepos: data
				});
				console.log(data);
			}.bind(this),
			error: function (xhr, status, err) {
				this.setState({
					username: null
				});
				console.log(err);
			}.bind(this)
		});
	}

	handleFormsSubmit(username) {
		this.setState({username: username}, function () {
			this.getUserData();
			this.getUserRepos();
		})
	}

	componentDidMount () {
		this.getUserData();
		this.getUserRepos();
	}

	render () {
		return (
			<div>
				<Search onFormSubmit={this.handleFormsSubmit.bind(this)} />
				<Profile
					 {...this.state}
				/>
			</div>
		)
	}
}

App.propTypes = {
	clientId: React.PropTypes.string,
	clientSecret: React.PropTypes.string
};

App.defaultProps = {
	clientId: '26d2ef1ca70012d69fa7',
	clientSecret: 'e9c35af01c6799e8844b88de73c4dc31acbe08b6'
}

export default App;