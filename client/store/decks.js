const Immutable = require('immutable');
const co = require('co');
const _ = require('lodash');

const {paths} = require('store/constants');
const superhot = require('store/superhot');
const {toDeck, redirectToDeck} = require('store/route');

const {setNewDeck} = require('./dashboard');

const transforms = {
    navigateChildDeck(state, childDeck) {
        state.cursor(paths.deck.self).update(function() {
            return childDeck;
        });

        const deckID = childDeck.get('id');

        transforms.loadChildren(state, deckID);
        transforms.pushOntoBreadcrumb(state, childDeck);

        toDeck(state, childDeck);
    },

    navigateParentDeck(state, parentDeck) {
        state.cursor(paths.deck.self).update(function() {
            return parentDeck;
        });

        transforms.loadChildren(state, parentDeck.get('id'));

        transforms.popFromBreadcrumb(state, parentDeck);

        toDeck(state, parentDeck);
    },

    pushOntoBreadcrumb(state, deck) {
        state.cursor(paths.deck.breadcrumb).update(function(lst) {
            return lst.push(deck);
        });
    },

    popFromBreadcrumb(state, deck) {
        state.cursor(paths.deck.breadcrumb).update(function(lst) {

            if(lst.size <= 0) {
                return lst;
            }

            const id = deck.get('id');

            let current = lst.last().get('id');
            while(lst.size > 0 && current != id) {
                lst = lst.pop();
                current = lst.last().get('id');
            }

            return lst;
        });
    },

    loadChildren: co.wrap(function*(state, deckID) {
        const children = yield new Promise(function(resolve, reject) {
            superhot
                .get(`/decks/${deckID}/children`)
                .end(function(err, res){

                    // no children
                    if (res.status === 404) {
                        return resolve(Immutable.List());
                    }

                    if (res.status === 200) {
                        resolve(Immutable.fromJS(res.body));
                    }

                    // TODO: error handling
                    reject(err);
                });
        });

        state.cursor(paths.deck.children).update(function() {
            return children;
        });
    }),

    createNewDeck(state, name) {

        // fetch parent
        const parentID = state.cursor(paths.deck.self).deref().get('id');

        // optimistic update
        let oldChildren;
        state.cursor(paths.deck.children).update(function(lst) {
            oldChildren = lst;
            return lst.push(Immutable.fromJS({
                name: name,
                description: ''
            }));
        });

        superhot
            .post(`/decks`)
            .type('json')
            .send({
                name: name,
                parent: parentID
            })
            .end(function(err, res) {

                // TODO: error handling
                if(res.status !== 201) {

                    // revert optimistic update
                    state.cursor(paths.deck.children).update(function() {
                        return oldChildren;
                    });
                    return;
                }

                state.cursor(paths.deck.children).update(function() {
                    return oldChildren.push(Immutable.fromJS(res.body));
                });

                state.cursor(paths.deck.self).cursor('children').update(function(lst) {
                    return lst.push(res.body.id);
                });
            });

        setNewDeck(state, false);
    },

    saveDeck: co.wrap(function*(state, patchDeck) {

        if(!_.isPlainObject(patchDeck)) {
            // TODO: error here
            return;
        }

        const deckID = state.cursor(paths.deck.self).deref().get('id');

        let willChange = true;

        // optimistic update
        state.cursor(paths.deck.self).update(function(deck) {

            const oldDeck = deck;

            if(_.has(patchDeck, 'name')) {
                deck = deck.update('name', function() {
                    return patchDeck.name;
                });
            }

            if(_.has(patchDeck, 'description')) {
                deck = deck.update('description', function() {
                    return patchDeck.description;
                });
            }

            willChange = oldDeck != deck;

            return deck;
        });

        if(!willChange) {

            // get out of editing mode
            toDeck(state);
            return;
        }

        // save deck
        const {response} = yield new Promise(function(resolve) {
            superhot
                .patch(`/decks/${deckID}`)
                .send(patchDeck)
                .end(function(err_, res_){
                    resolve({err: err_, response: res_});
                });
        });

        // TODO: error handling here
        if(response.status != 200) {
            console.error('omg error');

            // TODO: revert optimistic update
        }

        // get out of editing mode
        toDeck(state);
    }),

    deleteDeck: co.wrap(function*(state, bool) {
        if(!bool) {
            return;
        }

        const deck = state.cursor(paths.deck.self).deref();

        // fetch parent
        if(!deck.get('hasParent', false)) {
            return;
        }

        const deckID = deck.get('id');
        const parentID = deck.get('parent');


        yield new Promise(function(resolve) {
            superhot
                .del(`/decks/${deckID}`)
                .end(function() {
                    resolve();
                });
        });

        // go to parent
        const breadcrumb = state.cursor(paths.deck.breadcrumb).deref();
        const parentDeck = breadcrumb.get(-2);

        transforms.popFromBreadcrumb(state, parentDeck);

        redirectToDeck(state, parentDeck, parentID);
    })
};

module.exports = transforms;
