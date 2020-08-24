import React, { useState, useEffect } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Select from '@material-ui/core/Select';
import Chip from '@material-ui/core/Chip';
import Input from '@material-ui/core/Input';
import MenuItem from '@material-ui/core/MenuItem';
import Grid from '@material-ui/core/Grid';
import { InputLabel, FormControl } from '@material-ui/core';
import Plot from 'react-plotly.js';
import { ApolloProvider, ApolloClient, InMemoryCache, useQuery, gql, split, HttpLink } from '@apollo/client';
import { WebSocketLink } from '@apollo/client/link/ws';
import { getMainDefinition } from '@apollo/client/utilities';

const wsLink = new WebSocketLink({
  uri: `ws://react.eogresources.com/graphql`,
  options: {
    reconnect: true
  }
});

const httpLink = new HttpLink({
  uri: 'https://react.eogresources.com/graphql',
});

const client = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache()
});

const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,
  httpLink,
);

const MetricsQuery = gql`
query {
  getMetrics 
}
`;

const MultipleMesaurements = gql`
 query ($input: [MeasurementQuery]) {
   getMultipleMeasurements (input: $input) {
        measurements {
            metric
            at
            unit
            value
        }
      }
 }`;

const NEW_SUBSCRIPTION = gql`
  subscription onNewMeasurement {
    newMeasurement {
      metric
      at
      unit
      value
    }
  }
`;


const useStyles = makeStyles((theme: any) => ({
  formControl: {
    minWidth: 200,
    maxWidth: 300,
    marginRight: '2em'
  },
  chips: {
    display: 'flex',
    flexWrap: 'wrap',
  },
  chip: {
    margin: 2,
  }
}));

export default () => {
  const [selected, setSelected] = useState([]);


  function setSelectedValues(e: any) {
    setSelected(e);
  }
  return (
    <ApolloProvider client={client}>
      <Display setSelectedValues={(e: any) => setSelectedValues(e)} />
      <GetMeasuredData selected={selected} />
    </ApolloProvider>
  );
};


export function Display(props: any) {
  const [selectedValues, setSelectedValues] = useState([]);
  const { loading, error, data } = useQuery(MetricsQuery);

  const classes = useStyles(props);
  function handleChange(event: any) {
    setSelectedValues(event.target.value);
    if (props.setSelectedValues) props.setSelectedValues(event.target.value);
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Oh no... {error.message}</p>;

  return (
    <Grid
      container
      direction="row"
      justify="flex-end"
      alignItems="center">
      <FormControl className={classes.formControl}>
        <InputLabel>Select Metric </InputLabel>

        <Select
          labelId="demo-mutiple-chip-label"
          id="demo-mutiple-chip"
          multiple
          value={selectedValues}
          onChange={(e: any) => handleChange(e)}
          input={<Input id="select-multiple-chip" />}
          renderValue={(selected: any) => (
            <div className={classes.chips}>
              {selected.map((value: any) => (
                <Chip key={value} label={value} className={classes.chip} />
              ))}
            </div>
          )}
        >
          {data.getMetrics.map((metric: any) => (
            <MenuItem key={metric} value={metric}>
              {metric}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Grid>
  )
}

export function GetMeasuredData(props: any) {
  const MS_PER_MINUTE = 60000;
  const [afterDate, setAfterDate] = useState(0);
  const [graphVals, setGraphVals] = useState([]);
  const [input, setInput] = useState([]);

  const { loading, data } = useQuery(MultipleMesaurements, {
    variables: { input },
    fetchPolicy: 'cache-and-network'
  });

  setInterval(() => {
    setAfterDate(Math.floor(new Date(Date.now() - 30 * MS_PER_MINUTE).getTime() / 1000));
  }, 1300)

  useEffect(() => {
    if (props.selected) {
      let inputData = props.selected.map((sel: String) => {
        return {
          metricName: sel,
          after: Math.floor(new Date(Date.now() - 30 * MS_PER_MINUTE).getTime() / 1000),
          before: Math.floor(new Date().getTime() / 1000)
        }
      })
      setInput(inputData)
    }
  }, [props.selected, afterDate])
  useEffect(() => {
    if (data !== undefined) {

      const val = data.getMultipleMeasurements.map((metric: any) => {
        if (metric.measurements[0].unit === 'F') {
          let xValues = metric.measurements.map((a: any) => new Date(a.at).toLocaleTimeString('en-US', { hour12: false }));
          let yValues = metric.measurements.map((b: any) => b.value);
          const trace = {
            x: xValues,
            y: yValues,
            type: 'scatter',
            name: metric.metric,
            mode: 'lines',
          }
          return trace;
        } else {
          let xValues = metric.measurements.map((a: any) => new Date(a.at).toLocaleTimeString('en-US', { hour12: false }));
          let yValues = metric.measurements.map((b: any) => b.value);
          const trace = {
            x: xValues,
            y: yValues,
            type: 'scatter',
            name: metric.metric,
            yaxis: 'y2',
            mode: 'lines',
          }
          return trace;
        }
      })

      setGraphVals(val)
    }
  }, [data])

  return (
    <div>
      <Plot
        data={graphVals}
        layout={{ width: 800, height: 700, title: 'Plot', xaxis: { nticks: 6 }, yaxis: { title: 'F' }, yaxis2: { title: 'PSI', side: 'left', overlaying: 'y', zeroline: false } }}
      />
    </div>
  )
}