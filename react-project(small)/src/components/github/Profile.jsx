import React, {Component} from 'react';
import RepoList from './Repolists.jsx';

class Profile extends Component {
	render () {
		return (
			<div className="panel panel-default">
				<div className="panel-heading">
					<h3 className="panel-title">{this.props.userData.name}</h3>
				</div>
				<div className="panel-body">
					<div className="row">
						<div className="col-md-4">
							<img className="thumbnail" style={{width: "200px"}} src={this.props.userData.avatar_url} />
						</div>
						<div className="col-md-8">
							<div className="row">
								<div className="col-md-12">
									<span className="label label-primary">
										Repos: {this.props.userData.public_repos}
									</span>
									<span className="label label-success">
										Gists: {this.props.userData.public_gists}
									</span>
									<span className="label label-info">
										Followers: {this.props.userData.followers}
									</span>
									<span className="label label-danger">
										Following: {this.props.userData.following}
									</span>
								</div>
							</div>
							<hr />
							<div className="row">
								<div className="col-md-12">
									<ul className="list-group">
										<li className="list-group-item">
											<strong>Username:</strong> {this.props.userData.login}
										</li>
										<li className="list-group-item">
											<strong>
												Location: {this.props.userData.location}
											</strong>
										</li>
										<li className="list-group-item">
											<strong>Email:</strong> {this.props.userData.email}
										</li>
									</ul>
								</div>
							</div>
							<br />
							<a className="btn btn-primary" target="_blank" href={this.props.userData.html_url}>Visit Profile</a>
						</div>
					</div>
					<hr />
					<h3>User Repositories</h3>
					<RepoList userRepos={this.props.userRepos} />
				</div>
			</div>
		)
	}
}

export default Profile;