import { Meteor } from "meteor/meteor";
import { withTracker } from "meteor/react-meteor-data";
import UsersPage from "/imports/ui/pages/admin/users/UsersPage.jsx";

export default withTracker(() => {
  const subsHandle = Meteor.subscribe("users.all");
  const loading = !subsHandle.ready();

  const users = subsHandle.ready() ? Meteor.users.find().fetch() : [];

  return {
    loading,
    users
  };
})(UsersPage);