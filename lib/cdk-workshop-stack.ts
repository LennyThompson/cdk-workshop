import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as elastic from '@aws-cdk/aws-elasticsearch';
import { RecordTemperature } from './RecordTemperatureConstruct';

export class CdkWorkshopStack extends cdk.Stack
{
    constructor(scope: cdk.App, id: string, props?: cdk.StackProps)
    {
        super(scope, id, props);

        // Construct a new elastic search instance at developer level...
        const elasticConstruct = new elastic.Domain
        (
            this, 
            'Domain', 
            {
                version: elastic.ElasticsearchVersion.V7_1,
            }
        );

        // Construct an 'chained' lambda - this will be called from a lambda in the 
        // RecordTemperature construct to forward messages to elastic search

        const elasticLambda = new lambda.Function
        (
            this,
            'ElasticWriter',
            {
                runtime : lambda.Runtime.NODEJS_12_X,
                code : lambda.Code.fromAsset('lambda'),
                handler : 'Elastic.handler',
                environment :
                {
                    ELASTICSEARCH_DOMAIN: elasticConstruct.domainEndpoint
                }
            }
        );

        // Construct the RecordTemperature infrastructure.
        // Probably deserves a better name...

        const recordTemperature = new RecordTemperature
        (
            this, 
            'RecordTemperatureStack',
            {
                downstream : elasticLambda
            }
        );
    }
}
