import {Client, Databases, Query} from "node-appwrite";


const client = new Client()
.setEndpoint("https://cloud.appwrite.io/v1")
.setProject("")
.setKey("");

const db = new Databases(client);


const main = async () => {
    console.log("AppwriteHelper.js");
    try {
        const result = await db.listDocuments("68adceb9000bb9b8310b", "questions", 
            [ Query.equal("contest_id", ["6905d2b80f2671e4f54e"])  ]);
        console.log(result);
    } catch (error) {
        console.log(error);
        
  }
}
main();
