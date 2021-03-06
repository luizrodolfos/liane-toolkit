const { EntriesHelpers } = require("./entriesHelpers.js");
// import moment from "moment";
const {
  LikesHelpers
} = require("/imports/api/facebook/likes/server/likesHelpers.js");
const {
  CommentsHelpers
} = require("/imports/api/facebook/comments/server/commentsHelpers.js");

const EntriesJobs = {
  "entries.updateAccountEntries": {
    run({ job }) {
      logger.debug("entries.updateAccountEntries job: called");
      check(job && job.data && job.data.facebookId, String);
      check(job && job.data && job.data.accessToken, String);
      const campaignId = job.data.campaignId;
      const facebookId = job.data.facebookId;
      const accessToken = job.data.accessToken;
      const createdTs = new Date(job._doc.created).getTime();
      const todayTs = new Date().getTime();
      const DAY_IN_MS = 24 * 60 * 60 * 1000;
      const isRecent = todayTs - createdTs < DAY_IN_MS;
      const likeDateEstimate = job._doc.repeated > 0 && isRecent;
      let errored = false;
      try {
        EntriesHelpers.updateAccountEntries({
          campaignId,
          facebookId,
          accessToken,
          likeDateEstimate
        });
      } catch (error) {
        errored = true;
        return job.fail(error.message);
      } finally {
        if (!errored) {
          job.done();
          return job.remove();
        }
      }
    },

    workerOptions: {
      concurrency: 2,
      pollInterval: 2500
    },

    jobOptions() {
      const options = {
        retry: {
          retries: 1,
          wait: 5 * 60 * 1000
        },
        repeat: {
          wait: 2 * 60 * 60 * 1000
        }
      };
      return options;
    }
  },
  "entries.updateEntryInteractions": {
    run({ job }) {
      logger.debug("entries.updateEntryInteractions job: called");
      check(job && job.data && job.data.facebookAccountId, String);
      check(job && job.data && job.data.entryId, String);
      check(job && job.data && job.data.accessToken, String);
      check(job && job.data && job.data.likeDateEstimate, Boolean);

      const interactionTypes = job.data.interactionTypes;
      const facebookAccountId = job.data.facebookAccountId;
      const accessToken = job.data.accessToken;
      const entryId = job.data.entryId;
      const campaignId = job.data.campaignId;
      const likeDateEstimate = job.data.likeDateEstimate;

      let errored = false;
      try {
        EntriesHelpers.updateEntryInteractions({
          interactionTypes,
          facebookAccountId,
          accessToken,
          entryId,
          campaignId,
          likeDateEstimate
        });
      } catch (error) {
        errored = true;
        job.fail(error.message);
      } finally {
        if (!errored) {
          job.done();
          return job.remove();
        }
      }
    },

    workerOptions: {
      concurrency: 4,
      pollInterval: 2500
    },

    jobOptions({ jobData }) {
      const options = {
        retry: {
          retries: 4,
          wait: 5 * 60 * 1000
        }
      };
      return options;
    }
  },
  "entries.updatePeopleLikesCount": {
    run({ job }) {
      logger.debug("entries.updatePeopleLikesCount job:called");
      check(job && job.data && job.data.campaignId, String);
      check(job && job.data && job.data.facebookAccountId, String);
      check(job && job.data && job.data.entryId, String);
      const {
        campaignId,
        facebookAccountId,
        entryId
      } = job.data;
      LikesHelpers.updatePeopleLikesCountByEntry({
        campaignId,
        facebookAccountId,
        entryId
      });
      job.done();
      return job.remove();
    },
    workerOptions: {
      concurrency: 4,
      pollInterval: 2500
    },
    jobOptions({ jobData }) {
      return {
        retry: {
          retries: 4,
          wait: 30 * 1000 // wait 30 seconds
        }
      };
    }
  },
  "entries.updatePeopleCommentsCount": {
    run({ job }) {
      logger.debug("entries.updatePeopleCommentsCount job:called");
      check(job && job.data && job.data.campaignId, String);
      check(job && job.data && job.data.facebookAccountId, String);
      check(job && job.data && job.data.entryId, String);
      const { campaignId, facebookAccountId, entryId } = job.data;
      CommentsHelpers.updatePeopleCommentsCountByEntry({
        campaignId,
        facebookAccountId,
        entryId
      });
      job.done();
      return job.remove();
    },
    workerOptions: {
      concurrency: 4,
      pollInterval: 2500
    },
    jobOptions({ jobData }) {
      return {
        retry: {
          retries: 4,
          wait: 30 * 1000 // wait 30 seconds
        }
      };
    }
  }
};

exports.EntriesJobs = EntriesJobs;
