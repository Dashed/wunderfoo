const React = require('react');
const {Probe} = require('minitrue');

const ReviewCardSides = require('./sides');
const ReviewControls = require('./controls');

const ReviewEntries = React.createClass({

    propTypes: {
        title: React.PropTypes.string.isRequired,
        front: React.PropTypes.string.isRequired,
        back: React.PropTypes.string.isRequired,
        localstate: React.PropTypes.instanceOf(Probe).isRequired
    },

    render() {

        const {title, front, back, localstate} = this.props;

        const sides = {
            front,
            back
        };

        return (
            <div>
                <div className="row">
                    <div className="col-sm-12">
                        <div className="card m-y-0">
                            <div className="card-block p-b-0">
                                <h4 className="card-title m-y-0">{title}</h4>
                                <hr/>
                            </div>
                            <ReviewCardSides
                                localstate={localstate}
                                sides={sides}
                            />
                        </div>
                    </div>
                </div>
                <div className="row m-y">
                    <div className="col-sm-12">
                        <ReviewControls localstate={localstate} />
                    </div>
                </div>
            </div>
        );
    }
});

module.exports = ReviewEntries;
