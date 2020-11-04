import { DynamoDB, Lambda } from "aws-sdk";

// Handler for recording the machine temperature and status to dynamoDB.
// Triggered in response to published message on topic "machine/tempreature"
// presumably from a machine at the edge

export const handler = async (event: any): Promise<any> =>
{
    console.log("event:", JSON.stringify(event, undefined, 2));
    
    const dynamo = new DynamoDB();
    const lambda = new Lambda();
    
    // Build the status record and write to dynamodb table

    let strStatusname : string = process.env.STATUS_TABLE_NAME!;
    let status: any = 
    {
        'machine' : { S : event.machine ? event.machine : "unknown" },
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

    // If the message contains a CPU temperature, build the temperature record and write to dynamodb table

    if(event.CPU)
    {
        let strTablename : string = process.env.TEMPERATURE_TABLE_NAME!;
        let temperatureItem: any = {
            'machine' : { S: event.machine ? event.machine : "unknown" },
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

    // Send the event on to the next lambda

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