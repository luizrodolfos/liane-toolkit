import React from "react";
import PropTypes from "prop-types";
import PageHeader from "/imports/ui/components/app/PageHeader.jsx";
import Loading from "/imports/ui/components/utils/Loading.jsx";
import {
  Divider,
  Form,
  Grid,
  Button,
  Icon,
  Radio,
  Input,
  Checkbox,
  Select,
  Message
} from "semantic-ui-react";
import SimpleCurrencyInput from "react-simple-currency";
import { Alerts } from "/imports/ui/utils/Alerts.js";
import AudienceUtils from "/imports/ui/components/audiences/Utils.js";
import _ from "underscore";

const initialFields = {
  useConnection: true,
  adConfig: {
    billing_event: "IMPRESSIONS",
    optimization_goals: "IMPRESSIONS",
    bid_amount: 2,
    daily_budget: 100
  }
};

const billingEvents = {
  // APP_INSTALLS: "Pay when people install your app",
  // CLICKS: "Pay when people click anywhere in the ad", // UNAVAILABLE
  IMPRESSIONS: "Pay when the ads are shown to people",
  LINK_CLICKS: "Pay when people click on the link of the ad",
  // OFFER_CLAIMS: "Pay when people claim the offer",
  PAGE_LIKES: "Pay when people like your page",
  POST_ENGAGEMENT: "Pay when people engage with your post"
};

const optimizationGoals = {
  // APP_INSTALLS: "Will optimize for people more likely to install your app.",
  // AD_RECALL_LIFT:
  //   "Optimize for people more likely to remember seeing your ads. You cannot set bid_amount, and is_autobid must be true if this goal is used.",
  // ENGAGED_USERS:
  //   "Will optimize for people more likely to take a particular action in your app.",
  // EVENT_RESPONSES: "Will optimize for people more likely to attend your event.",
  IMPRESSIONS: "Will show the ads as many times as possible.",
  // LEAD_GENERATION:
  //   "Will optimize for people more likely to fill out a lead generation form.",
  LINK_CLICKS:
    "Will optimize for people more likely to click in the link of the ad.",
  // OFFER_CLAIMS: "Will optimize for people more likely to claim the offer.",
  // OFFSITE_CONVERSIONS:
  //   "Will optimize for people more likely to make a conversion in the site",
  PAGE_ENGAGEMENT:
    "Will optimize for people more likely to engage with your page.",
  PAGE_LIKES: "Will optimize for people more likely to like your page.",
  POST_ENGAGEMENT:
    "Will optimize for people more likely to engage with your post.",
  REACH:
    "Optimize to reach the most unique users of each day or interval specified in frequency_control_specs.",
  SOCIAL_IMPRESSIONS:
    "Increase the number of impressions with social context. I.e. with the names of one or more of the user's friends attached to the ad who have already liked the page or installed the app.",
  VIDEO_VIEWS: "Will optimize for people more likely to watch videos.",
  VALUE:
    "Will optimize for maximum total purchase value within the specified attribution window."
};

export default class AdsCreate extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isLoading: false,
      adCampaigns: [],
      fields: Object.assign({}, initialFields)
    };
    this._handleChange = this._handleChange.bind(this);
    this._handleBidAmountChange = this._handleBidAmountChange.bind(this);
    this._handleDailyBudgetChange = this._handleDailyBudgetChange.bind(this);
    this._handleSubmit = this._handleSubmit.bind(this);
  }
  componentDidMount() {
    const { campaignId } = this.props;
    Meteor.call("ads.getAdCampaigns", { campaignId }, (error, result) => {
      if (error) {
        Alerts.error(error);
      } else {
        this.setState({
          adCampaigns: result
        });
      }
    });
  }
  componentDidUpdate(prevProps, prevState) {
    const { fields } = this.state;
    const { campaignId, audienceCategoryId, audienceFacebookId } = this.props;
    if (prevState.fields.geolocationId !== fields.geolocationId) {
      Meteor.call(
        "audiences.accountAudienceItem",
        {
          campaignId,
          audienceCategoryId,
          facebookAccountId: audienceFacebookId,
          geolocationId: fields.geolocationId
        },
        (error, result) => {
          if (!error) {
            this.setState({
              estimate: result
            });
          } else {
            Alerts.error(error);
          }
        }
      );
    }
  }
  _handleBidAmountChange(value) {
    this.setState({
      fields: {
        ...this.state.fields,
        adConfig: {
          ...this.state.fields.adConfig,
          bid_amount: value
        }
      }
    });
  }
  _handleDailyBudgetChange(value) {
    this.setState({
      fields: {
        ...this.state.fields,
        adConfig: {
          ...this.state.fields.adConfig,
          daily_budget: value
        }
      }
    });
  }
  _handleChange = (e, { name, value }) => {
    if (name.indexOf("adConfig.") === 0) {
      this.setState({
        fields: {
          ...this.state.fields,
          adConfig: {
            ...this.state.fields.adConfig,
            [name.split(".")[1]]: value
          }
        }
      });
    } else {
      this.setState({
        fields: Object.assign({}, this.state.fields, { [name]: value })
      });
    }
  };
  _handleCheckbox = (e, { name, value }) => {
    const checked = this.state.fields[name];
    this.setState({
      fields: {
        ...this.state.fields,
        [name]: !checked
      }
    });
  };
  _handleSubmit(e) {
    const { audienceCategoryId, campaignId, audienceFacebookId } = this.props;
    const { fields } = this.state;
    this.setState({ isLoading: true });
    const data = {
      ...fields,
      campaignId,
      facebookAccountId: audienceFacebookId,
      audienceCategoryId
    };
    Meteor.call("ads.create", data, error => {
      this.setState({ isLoading: false });
      if (error) {
        Alerts.error(error.reason);
      } else {
        Alerts.success(
          "Adset created successfully. Access your Facebook Business Manager to create and manage your ads."
        );
        // {
        //   FlowRouter.go("App.campaignAudience", {
        //     campaignId,
        //     facebookId: audienceFacebookId
        //   });
        // }
      }
    });
  }
  _getEstimate() {
    const { estimate, fields } = this.state;
    if (estimate) {
      if (fields.useConnection) {
        return AudienceUtils.getValue(estimate.estimate);
      } else {
        return AudienceUtils.getValue(estimate.location_estimate);
      }
    }
    return false;
  }
  _getAdCampaignsOptions() {
    const { adCampaigns } = this.state;
    let options = [];
    return adCampaigns.map(adCampaign => {
      return {
        key: adCampaign.id,
        value: adCampaign.id,
        text: adCampaign.name
      };
    });
  }
  _getBillingOptions() {
    let options = [];
    for (const key in billingEvents) {
      options.push({
        key: key,
        value: key,
        text: billingEvents[key]
      });
    }
    return options;
  }
  _getOptGoalsOptions() {
    let options = [];
    for (const key in optimizationGoals) {
      options.push({
        key: key,
        value: key,
        text: optimizationGoals[key]
      });
    }
    return options;
  }
  render() {
    const {
      loading,
      audienceAccount,
      adAccount,
      audienceCategory,
      campaignId,
      audienceFacebookId,
      geolocations
    } = this.props;
    const { estimate, adCampaigns, fields, isLoading } = this.state;
    return (
      <div>
        <PageHeader
          title="Audience"
          titleTo={FlowRouter.path("App.campaignAudience", {
            campaignId: campaignId,
            facebookId: audienceFacebookId
          })}
          subTitle={!loading ? `Adset targeting ${audienceCategory.title}` : ""}
        />
        <section className="content">
          {loading ? (
            <Loading />
          ) : (
            <Grid>
              <Grid.Row>
                <Grid.Column>
                  <Form onSubmit={this._handleSubmit}>
                    {!adCampaigns.length ? (
                      <p>
                        You must have at least one Facebook Ad Campaign
                        available in order to create an adset.<br />
                        <a
                          href={`https://www.facebook.com/ads/manage/powereditor/manage/campaigns?act=${
                            adAccount._id
                          }`}
                          target="_blank"
                        >
                          Click here
                        </a>{" "}
                        to access your Ads Manager.
                      </p>
                    ) : (
                      <div>
                        <Form.Field
                          control={Select}
                          name="adConfig.campaign_id"
                          label="Adset campaign"
                          placeholder="Select the ad campaign for this adset"
                          options={this._getAdCampaignsOptions()}
                          onChange={this._handleChange}
                        />
                        <Form.Field
                          control={Input}
                          size="big"
                          label="Name"
                          placeholder="Name your adset"
                          name="name"
                          loading={isLoading}
                          value={fields.name}
                          onChange={this._handleChange}
                        />
                        <Divider />
                        <Form.Field>
                          <Form.Field label="Select the location target:" />
                          {geolocations.map(geolocation => (
                            <Form.Field
                              control={Checkbox}
                              radio
                              key={geolocation._id}
                              checked={fields.geolocationId == geolocation._id}
                              onChange={this._handleChange}
                              name="geolocationId"
                              value={geolocation._id}
                              label={geolocation.name}
                            />
                          ))}
                        </Form.Field>
                        <Divider />
                        <Form.Field
                          control={Checkbox}
                          checked={fields.useConnection}
                          onChange={this._handleCheckbox}
                          name="useConnection"
                          label={`Target people connected to ${
                            audienceAccount.name
                          }`}
                        />
                        <Divider />
                        <Form.Field
                          control={Select}
                          name="adConfig.optimization_goals"
                          label="Optimization goals"
                          placeholder="Select the optimization goals for this adset"
                          options={this._getOptGoalsOptions()}
                          onChange={this._handleChange}
                          value={fields.adConfig.optimization_goals}
                        />
                        <Form.Field
                          control={Select}
                          name="adConfig.billing_event"
                          label="Billing event"
                          placeholder="Select the billing event for this adset"
                          options={this._getBillingOptions()}
                          onChange={this._handleChange}
                          value={fields.adConfig.billing_event}
                        />
                        <Divider />
                        <Form.Field
                          control={SimpleCurrencyInput}
                          name="adConfig.bid_amount"
                          label="Bid amount"
                          unit={adAccount.currency}
                          onInputChange={this._handleBidAmountChange}
                          value={fields.adConfig.bid_amount}
                        />
                        <Form.Field
                          control={SimpleCurrencyInput}
                          name="adConfig.daily_budget"
                          label="Daily budget"
                          unit={adAccount.currency}
                          onInputChange={this._handleDailyBudgetChange}
                          value={fields.adConfig.daily_budget}
                        />
                        {estimate ? (
                          <Message>
                            The estimate reach for this ad is{" "}
                            {this._getEstimate()} people
                          </Message>
                        ) : null}
                        <Button primary>
                          <Icon name="save" />
                          Create ad
                        </Button>
                      </div>
                    )}
                  </Form>
                </Grid.Column>
              </Grid.Row>
            </Grid>
          )}
        </section>
      </div>
    );
  }
}

AdsCreate.contextTypes = {
  confirmStore: PropTypes.object
};
