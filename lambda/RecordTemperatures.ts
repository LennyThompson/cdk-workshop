import { DynamoDB, Lambda } from "aws-sdk";

export const handler = async (event: any): Promise<any> =>
{
    console.log("event:", JSON.stringify(event, undefined, 2));
    
    const dynamo = new DynamoDB();
    const lambda = new Lambda();
    let strStatusname : string = process.env.STATUS_TABLE_NAME!;
    let strMachine = event.machine ? "unknown" : event.machine;
    let status: any = 
    {
        'machine' : { S : 'unknown' },
        'status' : { S: event.CPU ? 'RUNNING' : (event.message === 'Resume' ? 'STARTING' : 'STOPPED') },
        'time' : { S: event.time },
        'logged' : { S: new Date().toISOString() }
    };
    console.log("status:", JSON.stringify(status, undefined));

    let insertStatusParam : DynamoDB.PutItemInput = 
    {
        TableName : strStatusname,
        Item : status
    };

    await dynamo.putItem
    (
        insertStatusParam, 
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

    if(event.CPU)
    {
        let strTablename : string = process.env.TEMPERATURE_TABLE_NAME!;
        let temperatureItem: any = {
            'machine' : { S: 'unknown' },
            'temperature' : { N: event.CPU ? event.CPU.toString() : '0.0' },
            'time' : { S: event.time },
            'message' : { S : event.message }
        };
        console.log("temperature:", JSON.stringify(temperatureItem, undefined));
        let insertParam : DynamoDB.PutItemInput = 
        {
            TableName : strTablename,
            Item : temperatureItem
        };
        await dynamo.putItem
        (
            insertParam, 
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
    }

    console.log("Building invocation request");
    let invokeLambda : Lambda.InvocationRequest = 
    {
        FunctionName : process.env.DOWNSTREAM_FUNCTION_NAME!,
        Payload : JSON.stringify(event)
    };

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

    )
}