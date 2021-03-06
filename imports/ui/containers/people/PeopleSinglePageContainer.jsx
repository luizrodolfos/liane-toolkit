import { Meteor } from "meteor/meteor";
import { withTracker } from "meteor/react-meteor-data";
import { People } from "/imports/api/facebook/people/people.js";
import { Likes } from "/imports/api/facebook/likes/likes.js";
import { Comments } from "/imports/api/facebook/comments/comments.js";
import { Entries } from "/imports/api/facebook/entries/entries.js";
import PeopleSinglePage from "/imports/ui/pages/people/PeopleSinglePage.jsx";

const PersonSubs = new SubsManager();

export default withTracker(props => {
  const personHandle = PersonSubs.subscribe("people.detail", {
    personId: props.personId
  });
  const likesHandle = PersonSubs.subscribe("likes.byPerson", {
    personId: props.personId,
    campaignId: props.campaignId
  });
  const commentsHandle = PersonSubs.subscribe("comments.byPerson", {
    personId: props.personId,
    campaignId: props.campaignId
  });

  const entriesOptions = {
    transform: function(item) {
      item.entry = Entries.findOne(item.entryId);
      return item;
    }
  };

  const loading =
    !personHandle.ready() || !likesHandle.ready() || !commentsHandle.ready();

  const person = personHandle.ready() ? People.findOne(props.personId) : null;

  const likes =
    personHandle.ready() && likesHandle.ready()
      ? Likes.find(
          {
            personId: person.facebookId,
            facebookAccountId: {
              $in: props.campaign.accounts.map(a => a.facebookId)
            }
          },
          entriesOptions
        ).fetch()
      : null;
  const comments =
    personHandle.ready() && commentsHandle.ready()
      ? Comments.find(
          {
            personId: person.facebookId,
            facebookAccountId: {
              $in: props.campaign.accounts.map(a => a.facebookId)
            }
          },
          entriesOptions
        ).fetch()
      : null;

  console.log({ likes, comments });

  return {
    loading,
    person,
    likes,
    comments
  };
})(PeopleSinglePage);
