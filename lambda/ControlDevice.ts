import { IotData, Iot } from "aws-sdk";

// API gateway handler to enable simple control of the machine or device
// If the path contains '/stop' the lambda will attempt to stop the device
// If the path contains '/start' the lambda will start the device

export const handler = async (event: any) =>
{
    console.log("request:", JSON.stringify(event, undefined, 2));
    console.log(process.env.DEVICE_CONTROL_ENDPOINT!);

    // Yet another attempt to resolve the iot endpoint url

    let iotTopicUrl: string = process.env.DEVICE_CONTROL_ENDPOINT ? process.env.DEVICE_CONTROL_ENDPOINT : "";
    if(!process.env.DEVICE_CONTROL_ENDPOINT)
    {
        new Iot().describeEndpoint
        (
            { endpointType: "iot:Data-ATS" },
            (err, data) =>
            {
                if(err)
                {
                    console.log("describeEndpoint error: " + err);
                }
                else
                {
                    iotTopicUrl = data.endpointAddress ? data.endpointAddress : "";
                }
            }
        )
    }
    let payload: any = {};
    let response: string = "Unknown API";

    // Determine what to do...

    if(event.path == "/stop")
    {
        response = "Stopping machine";
        console.log(response);
        payload = { "send" : 0 };
    }
    else if (event.path == "/start")
    {
        response = "Starting machine";
        console.log(response);
        payload = { "send" : 1 };
    }
    else
    {
        console.log("Unknown API method " + event.path);
        return {
            statusCode : 400,
            headers: { "Content-Type" : "text/plain" },
            body: "Bad path, only stop and start are supported"
        };
    }

    // Attempt to publish the control command to the iot topic "machine/control"
    // This does not work...

    let iotTopic: IotData = new IotData( { endpoint : iotTopicUrl });

    await iotTopic.publish({ topic : "machine/control", payload : payload, qos: 0});

    return {
        statusCode : 200,
        headers: { "Content-Type" : "text/plain" },
        body: response
    };
}