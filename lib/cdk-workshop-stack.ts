import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import { RecordTemperature } from './RecordTemperatureConstruct';

export class CdkWorkshopStack extends cdk.Stack
{
    constructor(scope: cdk.App, id: string, props?: cdk.StackProps)
    {
        super(scope, id, props);

        // Construct a 'chained' lambda - this will be called from a lambda in the 
        // RecordTemperature construct

        const hello = new lambda.Function
        (
            this,
            'HelloHandler',
            {
                runtime : lambda.Runtime.NODEJS_12_X,
                code : lambda.Code.fromAsset('lambda'),
                handler : 'hello.handler'
            }
        );

        // Construct the RecordTemperature infrastructure.
        // Probably deserves a better name...

        const recordTemperature = new RecordTemperature
        (
            this, 
            'RecordTemperatureStack',
            {
                downstream : hello
            }
        );
    }
}
