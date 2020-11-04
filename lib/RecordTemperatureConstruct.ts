import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as dynamodb from '@aws-cdk/aws-dynamodb'
import * as apigateway from '@aws-cdk/aws-apigateway';
import { Iot } from 'aws-sdk';

import { IotToLambdaProps, IotToLambda } from '@aws-solutions-constructs/aws-iot-lambda';

export interface RecordTemperatureProps
{
    downstream : lambda.IFunction;
}

// Construct the infrastructure around reading the machine temperature from the iot MQTT
// Adds 2 DynamoDB tables to maintain the recorded temperature 'DeviceTemperature' and 
// status, 'DeviceStatus'
// Both tables use the time field for a primary key
// These are required to grant access to the lambda that will recieve the temperature date.
// To bind the lambda to the iot topic the construct uses the IotToLambda construct.
// Additionally the control lambda construct is made here, for convenience. It is not
// related to any of the other constructs.

export class RecordTemperature extends cdk.Construct
{
    public readonly handler: lambda.Function;
    public readonly iotHandler : IotToLambda;

    constructor(scope : cdk.Construct, id: string, props: RecordTemperatureProps)
    {
        super(scope, id);
        
        // Construct the table to record the temperatures

        const tableTemperature = new dynamodb.Table
        (
            this,
            'DeviceTemperatures',
            {
                partitionKey: 
                {
                    name: 'time', 
                    type: dynamodb.AttributeType.STRING 
                }
            }
        );

        // Construct the table to record the device status

        const tableStatus = new dynamodb.Table
        (
            this,
            'DeviceStatus',
            {
                partitionKey: 
                {
                    name: 'time', 
                    type: dynamodb.AttributeType.STRING 
                }
            }
        );

        // Construct the lambda bound to the iot MQTT topic machine/temperature

        const iotLambdaProps: IotToLambdaProps = 
        {
            lambdaFunctionProps: 
            {
                code: lambda.Code.fromAsset(`lambda`),
                runtime: lambda.Runtime.NODEJS_12_X,
                handler: 'RecordTemperatures.handler',
                environment : 
                {
                    DOWNSTREAM_FUNCTION_NAME: props.downstream.functionName,
                    TEMPERATURE_TABLE_NAME: tableTemperature.tableName,
                    STATUS_TABLE_NAME: tableStatus.tableName
                }
            },
            iotTopicRuleProps: 
            {
                topicRulePayload: {
                    ruleDisabled: false,
                    description: "Processing temperature from IoT device.",
                    sql: "SELECT * from 'machine/temperature'",
                    actions: []
                }
            }
        };

        this.iotHandler = new IotToLambda
        (
            this,
            'TemperatureFromIoT',
            iotLambdaProps
        )

        // Attempt to access the iot endpoint (this does not work)

        let iotEndpointUrl: string = "";
        new Iot().describeEndpoint
        (
            { endpointType: "iot:Data-ATS" },
            (err, data) =>
            {
                iotEndpointUrl = data.endpointAddress ? data.endpointAddress : "";
            }
        )

        // Construct the control lambda and bind to the MachineControl api gateway

        const lambdaFn = new lambda.Function
        (
            this,
            'StartStopHandler',
            {
                runtime : lambda.Runtime.NODEJS_12_X,
                code : lambda.Code.fromAsset('lambda'),
                handler : 'ControlDevice.handler',
                environment : 
                {
                    DEVICE_CONTROL_ENDPOINT: iotEndpointUrl
                }
            }

        )
        
        new apigateway.LambdaRestApi
        (
            this,
            "MachineControl",
            {
                handler: lambdaFn
            }
        );
        
        // Grant access to the tables from the iot bound lambda

        tableTemperature.grantReadWriteData(this.iotHandler.lambdaFunction);
        tableStatus.grantReadWriteData(this.iotHandler.lambdaFunction);

        // Grant invoke on some downstream lambda to the iot bound lambda

        props.downstream.grantInvoke(this.iotHandler.lambdaFunction);
    }
}