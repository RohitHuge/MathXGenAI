import {Client, Databases, Query} from "node-appwrite";


const client = new Client()
.setEndpoint("https://cloud.appwrite.io/v1")
.setProject("68adcd200033ee482eba")
.setKey("standard_6bfea54dd9a6e7100c2bbc4e753bc07bc6cb60bb5cc731a32d1482ea1ac99e7ca7580905e7469b142d5780644d47963567f5ce442baf4e45cdfb22c57d2bf18dcaf71c61db523b812842fa8a203323b5ac56975f9109b839b34b3d32b6d5a9a2643e7906f41eecdaf4d079db8c28e1a239424c7972c5bc94f76628205e073363");

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
