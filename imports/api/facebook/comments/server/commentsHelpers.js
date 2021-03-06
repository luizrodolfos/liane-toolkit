import { Promise } from "meteor/promise";
import { Comments } from "/imports/api/facebook/comments/comments.js";
import { People } from "/imports/api/facebook/people/people.js";
import { FacebookAccountsHelpers } from "/imports/api/facebook/accounts/server/accountsHelpers.js";
import { HTTP } from "meteor/http";
import { Random } from "meteor/random";
import _ from "underscore";

const rawComments = Comments.rawCollection();
rawComments.distinctAsync = Meteor.wrapAsync(rawComments.distinct);
rawComments.aggregateAsync = Meteor.wrapAsync(rawComments.aggregate);

const _fetchFacebookPageData = ({ url }) => {
  check(url, String);
  let response;
  try {
    response = HTTP.get(url);
  } catch (error) {
    throw new Meteor.Error(error);
  }
  return response;
};

const CommentsHelpers = {
  updatePeopleCommentsCountByEntry({ campaignId, facebookAccountId, entryId }) {
    check(campaignId, String);
    check(facebookAccountId, String);
    check(entryId, String);

    const commentedPeople = Comments.find({
      facebookAccountId,
      entryId
    }).map(comment => {
      return {
        id: comment.personId,
        name: comment.name
      };
    });

    if (commentedPeople.length) {
      this.updatePeopleCommentsCount({
        campaignId,
        facebookAccountId,
        commentedPeople
      });
    }
  },
  updatePeopleCommentsCount({
    campaignId,
    facebookAccountId,
    commentedPeople
  }) {
    check(campaignId, String);
    check(facebookAccountId, String);

    const accountCampaigns = FacebookAccountsHelpers.getAccountCampaigns({
      facebookId: facebookAccountId
    });

    if (commentedPeople.length) {
      const peopleBulk = People.rawCollection().initializeUnorderedBulkOp();
      for (const commentedPerson of commentedPeople) {
        const commentsCount = Comments.find({
          personId: commentedPerson.id,
          facebookAccountId: facebookAccountId
        }).count();
        let set = {
          updatedAt: new Date()
        };
        // let lastInteraction = {
        //   facebookId: facebookAccountId
        // };
        // if (commentedPerson.comment.created_time) {
        //   lastInteraction["date"] = {
        //     $max: commentedPerson.comment.created_time
        //   };
        //   lastInteraction["estimate"] = false;
        // }
        set["name"] = commentedPerson.name;
        set[`counts.${facebookAccountId}.comments`] = commentsCount;
        // set["lastInteraction"] = lastInteraction;

        for (const campaign of accountCampaigns) {
          // Person has the last interaction populated
          // peopleBulk
          //   .find({
          //     campaignId: campaign._id,
          //     facebookId: commentedPerson.id,
          //     "lastInteractions.facebookId": facebookAccountId
          //   })
          //   .update({
          //     $setOnInsert: {
          //       _id: Random.id(),
          //       createdAt: new Date()
          //     },
          //     $set: { ...set, "lastInteractions.$": lastInteraction },
          //     $addToSet: {
          //       facebookAccounts: facebookAccountId
          //     }
          //   });

          // Person does not have the last interaction populated
          peopleBulk
            .find({
              campaignId: campaign._id,
              facebookId: commentedPerson.id
            })
            .upsert()
            .update({
              $setOnInsert: {
                _id: Random.id(),
                createdAt: new Date()
              },
              $set: set,
              $max: {
                lastInteractionDate: new Date(
                  commentedPerson.comment.created_time || 0
                )
              },
              $addToSet: {
                facebookAccounts: facebookAccountId
                // lastInteractions: lastInteraction
              }
            });
        }
      }
      peopleBulk.execute();
    }
  },
  getEntryComments({ campaignId, facebookAccountId, entryId, accessToken }) {
    check(campaignId, String);
    check(facebookAccountId, String);
    check(entryId, String);
    check(accessToken, String);

    logger.debug("CommentsHelpers.getEntryComments called", {
      entryId
    });

    let response;
    try {
      response = Promise.await(
        FB.api(`${entryId}/comments`, {
          fields: [
            "id",
            "from",
            "message",
            "message_tags",
            "comment_count",
            "like_count",
            "created_time"
          ],
          limit: 1000,
          access_token: accessToken
        })
      );
    } catch (error) {
      throw new Meteor.Error(error);
    }

    const _insertBulk = ({ data }) => {
      const bulk = Comments.rawCollection().initializeUnorderedBulkOp();
      const commentedPeople = [];
      for (const comment of data) {
        if (comment.from) {
          commentedPeople.push({ ...comment.from, comment });
          comment.personId = comment.from.id;
          comment.name = comment.from.name;
          comment.entryId = entryId;
          comment.facebookAccountId = facebookAccountId;
          const commentId = comment.id;
          delete comment.id;
          delete comment.from;
          bulk
            .find({ _id: commentId })
            .upsert()
            .update({
              $set: comment
            });
        }
      }

      bulk.execute(
        Meteor.bindEnvironment((e, result) => {
          this.updatePeopleCommentsCount({
            campaignId,
            facebookAccountId,
            commentedPeople
          });
        })
      );
    };

    if (response.data.length) {
      _insertBulk({ data: response.data });
      let next = response.paging.next;
      while (next !== undefined) {
        let nextPage = _fetchFacebookPageData({ url: next });
        next = nextPage.data.paging ? nextPage.data.paging.next : undefined;
        if (nextPage.statusCode == 200 && nextPage.data.data.length) {
          _insertBulk({ data: nextPage.data.data });
        }
      }
    }

    return;
  }
};

exports.CommentsHelpers = CommentsHelpers;
