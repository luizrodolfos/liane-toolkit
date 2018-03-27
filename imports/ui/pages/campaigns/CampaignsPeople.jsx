import React from "react";
import PageHeader from "/imports/ui/components/app/PageHeader.jsx";
import Loading from "/imports/ui/components/utils/Loading.jsx";
import { Alerts } from "/imports/ui/utils/Alerts.js";
import PeopleTable from "/imports/ui/components/people/PeopleTable.jsx";
import PeopleSearch from "/imports/ui/components/people/PeopleSearch.jsx";
import PeopleSummary from "/imports/ui/components/people/PeopleSummary.jsx";

import { Grid, Header, Menu, List, Button, Icon } from "semantic-ui-react";

export default class CampaignsPeople extends React.Component {
  constructor(props) {
    super(props);
    this._handleExport = this._handleExport.bind(this);
  }
  _handleExport(ev) {
    ev.preventDefault();
    const { campaign } = this.props;
    Meteor.call(
      "people.export",
      { campaignId: campaign._id },
      (error, result) => {
        if (error) {
          console.log(error);
          Alerts.error(error);
        } else {
          const blob = new Blob([result], { type: "text/csv;charset=utf-8" });
          saveAs(blob, `${campaign.name}-people.csv`);
        }
      }
    );
  }
  render() {
    let { facebookId } = this.props;
    const { loading, campaign, account } = this.props;
    const { accounts } = campaign;
    return (
      <div>
        <PageHeader
          title={`Campaign: ${campaign ? campaign.name : ""}`}
          titleTo={FlowRouter.path("App.campaignDetail", {
            campaignId: campaign ? campaign._id : ""
          })}
          subTitle="People"
        />
        <section className="content">
          {loading ? (
            <Loading />
          ) : (
            <Grid>
              {accounts.length > 1 ? (
                <Grid.Row>
                  <Grid.Column>
                    <Menu>
                      {accounts.map(acc => (
                        <Menu.Item
                          key={`account-${acc._id}`}
                          active={
                            account && acc.facebookId == account.facebookId
                          }
                          href={FlowRouter.path("App.campaignPeople", {
                            campaignId: campaign._id,
                            facebookId: acc.facebookId
                          })}
                        >
                          {acc.name}
                        </Menu.Item>
                      ))}
                      <Menu.Menu position="right">
                        <Menu.Item onClick={this._handleExport}>
                          <Icon name="download" /> Export CSV
                        </Menu.Item>
                      </Menu.Menu>
                    </Menu>
                  </Grid.Column>
                </Grid.Row>
              ) : null}
              <Grid.Row>
                <Grid.Column>
                  {account ? (
                    <PeopleSearch
                      campaignId={campaign._id}
                      facebookId={account.facebookId}
                    />
                  ) : null}
                  {/* <PeopleSummary
                    facebookId={facebookId}
                    campaignId={campaign._id}
                    peopleSummary={peopleSummary}
                  /> */}
                </Grid.Column>
              </Grid.Row>
            </Grid>
          )}
        </section>
      </div>
    );
  }
}
