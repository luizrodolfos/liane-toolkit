import { Meteor } from "meteor/meteor";
import { withTracker } from "meteor/react-meteor-data";
import { People } from "/imports/api/facebook/people/people.js";
import PeopleEdit from "/imports/ui/pages/people/PeopleEdit.jsx";

const PeopleEditSubs = new SubsManager();

export default withTracker(props => {
  const personHandle = PeopleEditSubs.subscribe("people.detail", {
    personId: props.personId
  });

  const loading = !personHandle.ready();

  const person = personHandle.ready() ? People.findOne(props.personId) : null;

  return {
    loading,
    person
  };
})(PeopleEdit);
