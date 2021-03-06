import SimpleSchema from "simpl-schema";
import crypto from "crypto";
import redisClient from "/imports/startup/server/redis";
import { Campaigns } from "/imports/api/campaigns/campaigns.js";
import { Contexts } from "/imports/api/contexts/contexts.js";
import { Geolocations } from "/imports/api/geolocations/geolocations.js";
import { FacebookAccounts } from "/imports/api/facebook/accounts/accounts.js";
import { AudienceCategories } from "/imports/api/audienceCategories/audienceCategories.js";
import { FacebookAudiences } from "/imports/api/facebook/audiences/audiences.js";
import { ValidatedMethod } from "meteor/mdg:validated-method";

const geolocationFields = {
  name: 1
};

export const accountAudienceItem = new ValidatedMethod({
  name: "audiences.accountAudienceItem",
  validate: new SimpleSchema({
    campaignId: {
      type: String
    },
    audienceCategoryId: {
      type: String
    },
    facebookAccountId: {
      type: String
    },
    geolocationId: {
      type: String
    }
  }).validator(),
  run({ campaignId, audienceCategoryId, facebookAccountId, geolocationId }) {
    this.unblock();
    logger.debug("audiences.accountAudienceItem", {
      campaignId,
      facebookAccountId,
      geolocationId
    });

    const userId = Meteor.userId();
    if (!userId) {
      throw new Meteor.Error(401, "You need to login");
    }

    const campaign = Campaigns.findOne(campaignId);

    if (!_.findWhere(campaign.users, { userId })) {
      throw new Meteor.Error(401, "You are not part of this campaign");
    }

    return FacebookAudiences.findOne(
      {
        campaignId,
        audienceCategoryId,
        facebookAccountId,
        geolocationId
      },
      {
        sort: { createdAt: -1 }
      }
    );
  }
});

export const accountAudienceGeolocationSummary = new ValidatedMethod({
  name: "audiences.accountGeolocationSummary",
  validate: new SimpleSchema({
    campaignId: {
      type: String
    },
    facebookAccountId: {
      type: String
    }
  }).validator(),
  run({ campaignId, facebookAccountId }) {
    this.unblock();
    logger.debug("audiences.accountGeolocationSummary", {
      campaignId,
      facebookAccountId
    });

    const userId = Meteor.userId();
    if (!userId) {
      throw new Meteor.Error(401, "You need to login");
    }

    const campaign = Campaigns.findOne(campaignId);

    if (!_.findWhere(campaign.users, { userId })) {
      throw new Meteor.Error(401, "You are not part of this campaign");
    }

    // Cache setup
    const hash = crypto
      .createHash("sha1")
      .update(campaignId + facebookAccountId)
      .digest("hex");
    const redisKey = `audiences::result::${hash}::accountGeolocationSummary`;

    let result = redisClient.getSync(redisKey);
    if (result) {
      return JSON.parse(result);
    } else {
      let facebookAccount = FacebookAccounts.findOne({
        facebookId: facebookAccountId
      });

      if (!facebookAccount) {
        facebookAccount = campaign.audienceAccounts.find(
          acc => acc.facebookId == facebookAccountId
        );
      }

      const context = Contexts.findOne(campaign.contextId);

      let result = {
        facebookAccount,
        data: []
      };

      if (context.mainGeolocationId) {
        result.mainGeolocation = Geolocations.findOne(
          context.mainGeolocationId,
          {
            fields: {
              ...geolocationFields,
              center: 1,
              geojson: 1,
              type: 1
            }
          }
        );
        const mainLocAudience = FacebookAudiences.findOne(
          {
            campaignId,
            facebookAccountId,
            geolocationId: context.mainGeolocationId
          },
          { sort: { createdAt: -1 } }
        );
        if (mainLocAudience) {
          result.mainGeolocation.audience = {
            estimate: mainLocAudience.total,
            fanCount: mainLocAudience.fan_count
          };
        }
      }

      const geolocations = Geolocations.find(
        {
          _id: { $in: context.geolocations }
        },
        {
          fields: {
            ...geolocationFields,
            center: 1,
            geojson: 1,
            type: 1
          }
        }
      ).fetch();

      geolocations.forEach(geolocation => {
        let geolocationData = { geolocation };
        const audience = FacebookAudiences.findOne(
          {
            campaignId,
            facebookAccountId,
            geolocationId: geolocation._id
          },
          { sort: { createdAt: -1 } }
        );
        if (audience) {
          geolocationData.audience = {
            estimate: audience.total,
            fanCount: audience.fan_count
          };
          result.data.push(geolocationData);
        }
      });

      redisClient.setSync(redisKey, JSON.stringify(result));

      return result;
    }
  }
});

export const accountAudienceSummary = new ValidatedMethod({
  name: "audiences.accountSummary",
  validate: new SimpleSchema({
    campaignId: {
      type: String
    },
    facebookAccountId: {
      type: String
    }
  }).validator(),
  run({ campaignId, facebookAccountId }) {
    this.unblock();
    logger.debug("audiences.accountSummary", { campaignId, facebookAccountId });

    const userId = Meteor.userId();
    if (!userId) {
      throw new Meteor.Error(401, "You need to login");
    }

    const campaign = Campaigns.findOne(campaignId);

    if (!_.findWhere(campaign.users, { userId })) {
      throw new Meteor.Error(401, "You are not part of this campaign");
    }

    // Cache setup
    const hash = crypto
      .createHash("sha1")
      .update(campaignId + facebookAccountId)
      .digest("hex");
    const redisKey = `audiences::result::${hash}::accountSummary`;

    let result = redisClient.getSync(redisKey);
    if (result) {
      return JSON.parse(result);
    } else {
      const context = Contexts.findOne(campaign.contextId);

      const categories = AudienceCategories.find({
        _id: { $in: context.audienceCategories }
      }).fetch();
      const geolocations = Geolocations.find(
        {
          _id: { $in: context.geolocations }
        },
        {
          fields: geolocationFields
        }
      ).fetch();

      let result = [];

      categories.forEach(category => {
        let catData = {
          category,
          geolocations: [],
          audience: FacebookAudiences.findOne(
            {
              campaignId,
              facebookAccountId,
              audienceCategoryId: category._id,
              geolocationId: context.mainGeolocationId
            },
            { sort: { createdAt: -1 } }
          )
        };
        geolocations.forEach(geolocation => {
          const audience = FacebookAudiences.findOne(
            {
              campaignId,
              facebookAccountId,
              audienceCategoryId: category._id,
              geolocationId: geolocation._id
            },
            { sort: { createdAt: -1 } }
          );
          catData.geolocations.push({ geolocation, audience });
        });
        result.push(catData);
      });

      redisClient.setSync(redisKey, JSON.stringify(result));

      return result;
    }
  }
});

export const accountAudienceByCategory = new ValidatedMethod({
  name: "audiences.byCategory",
  validate: new SimpleSchema({
    campaignId: {
      type: String
    },
    facebookAccountId: {
      type: String
    },
    audienceCategoryId: {
      type: String
    }
  }).validator(),
  run({ campaignId, facebookAccountId, audienceCategoryId }) {
    this.unblock();
    logger.debug("audiences.byCategory", {
      campaignId,
      facebookAccountId,
      audienceCategoryId
    });

    const userId = Meteor.userId();
    if (!userId) {
      throw new Meteor.Error(401, "You need to login");
    }

    const campaign = Campaigns.findOne(campaignId);

    if (!_.findWhere(campaign.users, { userId })) {
      throw new Meteor.Error(401, "You are not part of this campaign");
    }

    // Cache setup
    const hash = crypto
      .createHash("sha1")
      .update(campaignId + facebookAccountId + audienceCategoryId)
      .digest("hex");
    const redisKey = `audiences::result::${hash}::byCategory`;

    let result = redisClient.getSync(redisKey);
    if (result) {
      return JSON.parse(result);
    } else {
      const context = Contexts.findOne(campaign.contextId);

      const category = AudienceCategories.findOne(audienceCategoryId);
      const geolocations = Geolocations.find({
        _id: { $in: context.geolocations }
      }).fetch();

      let result = { category, geolocations: [] };

      if (context.mainGeolocationId) {
        result.mainGeolocation = Geolocations.findOne(
          context.mainGeolocationId
        );
        const mainLocAudience = FacebookAudiences.findOne(
          {
            campaignId,
            facebookAccountId,
            geolocationId: context.mainGeolocationId
          },
          { sort: { createdAt: -1 } }
        );
        if (mainLocAudience) {
          result.mainGeolocation.audience = {
            estimate: mainLocAudience.total,
            fanCount: mainLocAudience.fan_count
          };
        }
      }

      geolocations.forEach(geolocation => {
        const audiences = FacebookAudiences.find(
          {
            campaignId,
            facebookAccountId,
            audienceCategoryId: category._id,
            geolocationId: geolocation._id
          },
          { sort: { createdAt: 1 } }
        ).fetch();
        result.geolocations.push({ geolocation, audiences });
      });

      redisClient.setSync(redisKey, JSON.stringify(result));

      return result;
    }
  }
});

export const accountAudienceByGeolocation = new ValidatedMethod({
  name: "audiences.byGeolocation",
  validate: new SimpleSchema({
    campaignId: {
      type: String
    },
    facebookAccountId: {
      type: String
    },
    geolocationId: {
      type: String
    }
  }).validator(),
  run({ campaignId, facebookAccountId, geolocationId }) {
    this.unblock();
    logger.debug("audiences.byCategory", {
      campaignId,
      facebookAccountId,
      geolocationId
    });

    const userId = Meteor.userId();
    if (!userId) {
      throw new Meteor.Error(401, "You need to login");
    }

    const campaign = Campaigns.findOne(campaignId);

    if (!_.findWhere(campaign.users, { userId })) {
      throw new Meteor.Error(401, "You are not part of this campaign");
    }

    // Cache setup
    const hash = crypto
      .createHash("sha1")
      .update(campaignId + facebookAccountId + geolocationId)
      .digest("hex");
    const redisKey = `audiences::result::${hash}::byGeolocation`;

    let result = redisClient.getSync(redisKey);
    if (result) {
      return JSON.parse(result);
    } else {
      const context = Contexts.findOne(campaign.contextId);

      const geolocation = Geolocations.findOne(geolocationId);

      const audienceCategories = AudienceCategories.find({
        _id: { $in: context.audienceCategories }
      }).fetch();

      let result = { geolocation, audienceCategories: [] };

      if (context.mainGeolocationId) {
        result.mainGeolocation = Geolocations.findOne(
          context.mainGeolocationId
        );
        const mainLocAudience = FacebookAudiences.findOne(
          {
            campaignId,
            facebookAccountId,
            geolocationId: context.mainGeolocationId
          },
          { sort: { createdAt: 1 } }
        );
        if (mainLocAudience) {
          result.mainGeolocation.audience = {
            estimate: mainLocAudience.total,
            fanCount: mainLocAudience.fan_count
          };
        }
      }

      audienceCategories.forEach(category => {
        const audiences = FacebookAudiences.find(
          {
            campaignId,
            facebookAccountId,
            geolocationId: geolocation._id,
            audienceCategoryId: category._id
          },
          { sort: { createdAt: 1 } }
        ).fetch();
        result.audienceCategories.push({ category, audiences });
      });

      redisClient.setSync(redisKey, JSON.stringify(result));

      return result;
    }
  }
});
