import React, {Component} from 'react';

class Repo extends Component {
	render () {
		const {repo} = this.props;
		let description;

		if(!repo.description) {
			description = 'no-description-available';
		} else {
			description = repo.description;
		}

		return (
			<li className="list-group-item">
				<a href={repo.html_url}>
					{repo.name}
				</a> : {description}
			</li>
		)
	}
}

export default Repo;