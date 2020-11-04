# Welcome to your CDK TypeScript project!

You should explore the contents of this project. It demonstrates a CDK app with an instance of a stack (`CdkWorkshopStack`)
which contains an Amazon SQS queue that is subscribed to an Amazon SNS topic.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `npm run test`    perform the jest unit tests
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template

 ## Temperature and Control Function Infrastructure

 Will construct a CloudFormation consisting of

 1. DynamoDB table to record temperatures from edge devices
 2. DynamoDB table to record status of edge devices
 3. Lambda bound to iot topic 'machine/temperature'
    * Records temperature and status as reported in messsages recieved
 4. API gateway endpoint lambda for control of the device(s)
 5. Lambda chained from the lambda in (3) to do something else with the message (event)

 ### DynamoDB Temperature Table

 Records time, machine, message, temperature
 TODO - add TTL on the records

 ### DynamoDB Status Table

 Records time, logged, machine, status
 TODO - add TTL on the records

### IOT Bound Lambda

Triggered by massage (event) on the topic 'machine/temperature'.

Records status to status table

Records temperature to temperature table

Forwards message (event) to downstream lambda

### API Gateway Control

Lambda triggered by API gateway to start or stop a device.

Publishes a start or stop message to listening devices on the MQTT queue.

TODO: target a specific device
TODO: make it work (currently fails to publish message successfully)

### Chained lambda

Intended to push events to elastic search.


## CI/CD

Has simple travis build defined.
TODO: add deploy on successful build. Hasnt been done due to latency in the travis build.

Deploy mechanism is still cdk deploy...

```bash
cdk deploy
```
