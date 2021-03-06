import React from "react";
import PageHeader from "/imports/ui/components/app/PageHeader.jsx";
import Loading from "/imports/ui/components/utils/Loading.jsx";

import { Grid, Segment, Table, Icon, Button, Divider } from "semantic-ui-react";

import moment from "moment";

export default class GeolocationsPage extends React.Component {
  static defaultProps = {
    geolocations: []
  };
  render() {
    const { loading, geolocations, currentUser } = this.props;
    return (
      <div>
        <PageHeader title="Geolocations" />
        <section className="content">
          {loading ? (
            <Loading />
          ) : (
            <Grid>
              <Grid.Row>
                <Grid.Column>
                  <Button
                    as="a"
                    href={FlowRouter.path("App.admin.geolocations.edit")}
                    floated="right"
                  >
                    <Icon name="plus" />
                    New Geolocation
                  </Button>
                  <Divider hidden clearing />
                  <Table>
                    <Table.Header>
                      <Table.Row>
                        <Table.HeaderCell>Name</Table.HeaderCell>
                        <Table.HeaderCell collapsing>Actions</Table.HeaderCell>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {geolocations.map(geolocation => (
                        <Table.Row key={geolocation._id}>
                          <Table.Cell>{geolocation.name}</Table.Cell>
                          <Table.Cell collapsing>
                            <a
                              href={FlowRouter.path(
                                "App.admin.geolocations.edit",
                                {
                                  geolocationId: geolocation._id
                                }
                              )}
                            >
                              Edit
                            </a>
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table>
                </Grid.Column>
              </Grid.Row>
            </Grid>
          )}
        </section>
      </div>
    );
  }
}
