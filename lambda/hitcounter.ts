import { DynamoDB, Lambda } from "aws-sdk";

export const handler = async (event : any): Promise<any> =>
{
    console.log("request:", JSON.stringify(event, undefined, 2));
    
    const dynamo = new DynamoDB();
    const lambda = new Lambda();
    let strTablename : string = process.env.HITS_TABLE_NAME!;

    let updateParam : DynamoDB.UpdateItemInput = 
    {
        TableName : strTablename,
        Key: { path: { S: event.path } },
        UpdateExpression : 'ADD hits :incr',
        ExpressionAttributeValues : { ':incr': { N: '1' }}

    }

    await dynamo.updateItem
            (
                updateParam, 
                (err : Error, data : any) =>
                {
                    if(err)
                    {
                        console.log(err, err.stack);
                    }
                    else
                    {
                        console.log(data);
                    }
                }
            );

    console.log("Building invocation request");
    let invokeLambda : Lambda.InvocationRequest = 
    {
        FunctionName : process.env.DOWNSTREAM_FUNCTION_NAME!,
        Payload : JSON.stringify(event)
    };
    console.log("Invoking lambda, ", invokeLambda);
    return new Promise
        (
            async (resolve, reject) => 
            { 
                await lambda.invoke
                (
                    invokeLambda, 
                    (err, data) =>
                    {
                        if(err)
                        {
                            console.log(err, err.stack);
                            reject(err);
                        }
                        else
                        {
                            console.log("resolving: ", data);
                            resolve(JSON.parse(data.Payload?.toString()!));
                        }
                    }
                );
            }
        );
}
