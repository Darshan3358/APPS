const { MongoClient, ObjectId } = require('mongodb');
const MONGO_URI = "mongodb+srv://zarwebcoders:zarwebcoders@cluster0.lqgakzj.mongodb.net/gigdialapp";

async function main() {
  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    const db = client.db();
    
    const email = 'darshanthanki77@gmail.com';
    
    // Check in users collection
    const user = await db.collection('users').findOne({ email });
    console.log("=== USER FOUND IN users collection ===");
    console.log(JSON.stringify(user, null, 2));
    
    // Check in workers collection
    const worker = await db.collection('workers').findOne({ email });
    console.log("\n=== WORKER FOUND IN workers collection ===");
    console.log(JSON.stringify(worker, null, 2));

    let workerByUid = null;
    if (user) {
      workerByUid = await db.collection('workers').findOne({ uid: user._id.toString() });
    }
    console.log("\n=== WORKER FOUND BY UID IN workers collection ===");
    console.log(JSON.stringify(workerByUid, null, 2));
    
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}
main();
