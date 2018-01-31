import React from "react";
import Loading from "/imports/ui/components/utils/Loading.jsx";
import { Card, Label } from "semantic-ui-react";

export default class AudienceCategoriesList extends React.Component {
  constructor(props) {
    super(props);
  }
  getRatio(audience) {
    if (audience.total < 100) {
      return "Not enough data";
    }
    let prefix, ratio;
    const local = audience.estimate / audience.total;
    const location = audience.location_estimate / audience.location_total;
    if(local > location) {
      prefix = "+";
      ratio = local / location;
    } else {
      prefix = "-";
      ratio = location / local;
    }
    return prefix + ratio.toFixed(2) + "x";
  }
  getPercentage(audience) {
    if (audience.total < 100) {
      return "";
    }
    let dif = Math.min(audience.estimate / audience.total, 0.99);
    return (dif * 100).toFixed(2) + "%";
  }
  render() {
    const { summary, campaignId, facebookAccountId } = this.props;
    if (summary.length) {
      return (
        <Card.Group>
          {summary.map(item => (
            <Card key={item.category._id}>
              <Card.Content>
                <Card.Header>
                  <a
                    href={FlowRouter.path("App.campaignAudience.category", {
                      campaignId,
                      facebookId: facebookAccountId,
                      categoryId: item.category._id
                    })}
                  >
                    {item.category.title}
                  </a>
                </Card.Header>
              </Card.Content>
              {item.geolocations.map(item => (
                <Card.Content key={item.geolocation._id}>
                  {item.geolocation.name}:{" "}
                  {item.audience ? (
                    <span>
                      <strong>{this.getPercentage(item.audience)} </strong>
                      <Label size="small">{this.getRatio(item.audience)}</Label>
                    </span>
                  ) : (
                    "Data not found"
                  )}
                </Card.Content>
              ))}
            </Card>
          ))}
        </Card.Group>
      );
    } else {
      return null;
    }
  }
}