const React = require('react');
const orwell = require('orwell');
const either = require('react-either');

const {NOT_SET, paths} = require('store/constants');

// components
// const Spinner = require('components/spinner'); // TODO: remove
const DeckChildren = require('./children');
const DecksListControls = require('./listcontrols');
const DeckSettings = require('./settings');
const DeckInfo = require('./deckinfo');

const DecksDashboard = React.createClass({

    propTypes: {
        editingDeck: React.PropTypes.bool.isRequired
    },

    render() {

        const {editingDeck} = this.props;

        // components for when editing
        const editingHeader = (function() {
            if (!editingDeck) {
                return null;
            }
            return (
                <div className="card-header">
                    <strong>{"Editing Name & Description"}</strong>
                </div>
            );
        }());

        return (
            <div className="card">
                {editingHeader}
                <div className="card-block">
                    <DeckInfo />
                    <DecksListControls />
                </div>
                <DeckChildren />
                <DeckSettings />
            </div>
        );
    }
});

// don't show until all data dependencies are satisfied
const DecksDashboardOcclusion = either(DecksDashboard, null, function(props) {

    if(NOT_SET === props.deck) {
        return false;
    }

    if(NOT_SET === props.currentChildrenCursor.deref()) {
        return false;
    }

    return true;
});

module.exports = orwell(DecksDashboardOcclusion, {
    watchCursors(props, manual, context) {

        const state = context.store.state();

        return [
            state.cursor(paths.deck.children),
            state.cursor(paths.deck.self),
            state.cursor(paths.dashboard.decks.editing)
        ];
    },
    assignNewProps(props, context) {

        const state = context.store.state();

        return {
            deck: state.cursor(paths.deck.self).deref(),
            currentChildrenCursor: state.cursor(paths.deck.children),
            editingDeck: state.cursor(paths.dashboard.decks.editing).deref()
        };
    }
}).inject({
    contextTypes: {
        store: React.PropTypes.object.isRequired
    }
});
