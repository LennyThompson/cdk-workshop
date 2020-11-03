import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as dynamodb from '@aws-cdk/aws-dynamodb'
import { IotToLambdaProps, IotToLambda } from '@aws-solutions-constructs/aws-iot-lambda';

export interface RecordTemperatureProps
{
    downstream : lambda.IFunction;
}

export class RecordTemperature extends cdk.Construct
{
    public readonly handler: lambda.Function;
    public readonly iotHandler : IotToLambda;

    constructor(scope : cdk.Construct, id: string, props: RecordTemperatureProps)
    {
        super(scope, id);
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

        tableTemperature.grantReadWriteData(this.iotHandler.lambdaFunction);
        tableStatus.grantReadWriteData(this.iotHandler.lambdaFunction);

        props.downstream.grantInvoke(this.iotHandler.lambdaFunction);
    }
}